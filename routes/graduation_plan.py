from flask import Blueprint, request, render_template, jsonify
from flask_login import current_user
import ollama
import os
import tempfile

from config import MODEL_NAME
from models import Transcript
from utils import allowed_file, extract_text_from_pdf, normalize_transcript_text, resolve_plan_data_with_fallback
from werkzeug.utils import secure_filename

graduation_plan_bp = Blueprint('graduation_plan', __name__)

# ==============================
# SYSTEM PROMPT — GRADUATION PLAN
# ==============================
SYSTEM_PROMPT_GRADUATION_TEMPLATE = """You are ACADEMO — Academic Intelligence Engine.

Your goal is to analyze a student's transcript and generate a COMPLETE graduation plan roadmap from the student's current state until they finish the program.

========================================
GRADUATION PLAN (AUTHORITATIVE SOURCE)
========================================

{plan_data}

========================================
ADVISORY LOGIC & RULES
========================================

1. PARSE TRANSCRIPT: Identify COMPLETED courses (Grades: A, B+, B, C+, C, D, S).
2. IDENTIFY FAILED: Interpret (F, FA, FF) as NOT COMPLETED. These must be retaken.
3. PREREQUISITES: Strictly follow the prerequisite rules in the plan. Never recommend a course unless all prerequisites are passed.
4. ORDER: Follow the natural sequence of the graduation plan. Do not jump to senior years if junior courses are pending.
5. LOAD: Max load is 22 CH. Aim for 12-18 CH for a balanced path.
6. RISK ASSESSMENT: 
   High difficulty courses: M269, TM351, TM354, TM366.
   Include a risk assessment for each semester.

========================================
OUTPUT FORMAT (MANDATORY)
========================================

# ACADEMO Graduation Roadmap
(Use # for main title)

## Strategic Analysis
(Use ## for sections)
<p>Provide a deep, strategic, and personalized analysis of the student's path.</p>

### Semester X
(Use ### for EACH semester)

| Course Code | Course Name | Credit Hours | Recommendation Score | Level |
|---|---|---|---|---|

(Use Recommendation Levels: High Recommendation, Medium Recommendation, Low Recommendation)

<div class="risk-container">
    <div class="risk-label">Academic Workload Risk: LOW/MODERATE/HIGH</div>
    <div class="risk-bar">
        <div class="risk-fill" style="width: XX%"></div>
    </div>
</div>
(Progress bar rules: 0-1 difficult course: LOW 30%, 2: MODERATE 65%, 3+: HIGH 90%)

<p>Brief explanation for this semester's choices.</p>

### Final Academic Assessment
<p>Strategic advice on graduation timeline, workload, and risk management.</p>

========================================
STYLE RULES
========================================

- Use ONLY Markdown tables for all schedules. DO NOT use <table> tags.
- Use #, ##, ### for beautiful headers.
- Output MUST be in English.
- Avoid casual language; maintain a professional academic advisory tone.
"""

def build_system_prompt_graduation(plan_data):
    return SYSTEM_PROMPT_GRADUATION_TEMPLATE.format(plan_data=plan_data)

# ==============================
# CACHE
# ==============================
analysis_cache = {}

# ==============================
# PAGE ROUTE
# ==============================
@graduation_plan_bp.route("/graduation-plan")
def graduation_plan():
    return render_template("graduation_plan.html")

# ==============================
# API — GENERATE PLAN
# ==============================
@graduation_plan_bp.route("/api/plan", methods=["POST"])
def plan():
    try:
        use_json = bool(request.content_type and "application/json" in request.content_type and request.get_json(silent=True))
        if use_json:
            data = request.get_json() or {}
            input_type = data.get("type", "text")
            student_request = data.get("request", "")
            current_semester = data.get("current_semester", "")
            details = data.get("details", "")
            major = (data.get("major") or "").strip()
            raw_tr = data.get("transcript", "")
        else:
            input_type = request.form.get("type", "text")
            student_request = request.form.get("request", "")
            current_semester = request.form.get("current_semester", "")
            details = request.form.get("details", "")
            major = (request.form.get("major") or "").strip()
            raw_tr = request.form.get("transcript", "")

        transcript = ""

        if input_type == "text":
            transcript = normalize_transcript_text(raw_tr, major)

        elif input_type == "saved":
            if not current_user.is_authenticated:
                return jsonify({"error": "Login required to use saved transcript."}), 401
            row = Transcript.query.filter_by(user_id=current_user.id).first()
            if not row or not (row.raw_text or "").strip():
                return jsonify({"error": "No saved transcript found."}), 400
            transcript = normalize_transcript_text(row.raw_text, major)

        elif input_type == "pdf":
            pdf_file = request.files.get("file")
            if not pdf_file or not pdf_file.filename:
                return jsonify({"error": "No PDF file uploaded."}), 400
            filename = secure_filename(pdf_file.filename)
            if not allowed_file(filename):
                return jsonify({"error": "Invalid file type. Use PDF or image."}), 400
            temp_path = None
            try:
                ext = filename.rsplit(".", 1)[1].lower()
                with tempfile.NamedTemporaryFile(delete=False, suffix=f".{ext}") as temp_f:
                    temp_path = temp_f.name
                    pdf_file.save(temp_path)

                if ext == "pdf":
                    transcript = extract_text_from_pdf(temp_path, major=major)
                else:
                    from utils import extract_text_from_image

                    transcript = extract_text_from_image(temp_path)
                    if transcript:
                        transcript = normalize_transcript_text(transcript, major)
            except Exception as e:
                return jsonify({"error": f"File error: {str(e)}"}), 400
            finally:
                if temp_path and os.path.exists(temp_path):
                    os.remove(temp_path)
        else:
            return jsonify({"error": "Invalid transcript input type."}), 400

        if not transcript or not str(transcript).strip():
            return jsonify({"error": "Transcript is required"}), 400

        if not major:
            return jsonify({"error": "Please select a major before uploading or processing transcript."}), 400

        plan_data, plan_file, resolved_major, used_fallback = resolve_plan_data_with_fallback(major)
        if not plan_data:
            if plan_file:
                return jsonify({"error": f"Graduation plan file not found or unusable ({plan_file})."}), 400
            return jsonify({"error": "No usable graduation plan data found."}), 400

        messages = [
            {"role": "system", "content": build_system_prompt_graduation(plan_data)},
            {
                "role": "user",
                "content": (
                    f"Transcript:\n{transcript}\n\n"
                    f"Selected Major:\n{major}\n\n"
                    f"Plan Used:\n{resolved_major}{' (fallback applied)' if used_fallback else ''}\n\n"
                    f"Student Request:\n{student_request or 'None provided'}\n\n"
                    f"Current Semester:\n{current_semester}\n\n"
                    f"Additional Details:\n{details}\n\n"
                    "REMINDER: Generate the FULL plan until graduation. Use Markdown tables and headers for the report."
                )
            }
        ]

        response = ollama.chat(
            model=MODEL_NAME,
            messages=messages,
            options={"temperature": 0.2, "num_predict": 5000}
        )

        output = response.message.content
        analysis_cache["latest"] = output
        analysis_cache["raw_transcript"] = transcript

        return output

    except Exception as e:
        print(f"ERROR: {e}")
        return jsonify({"error": str(e)}), 500
