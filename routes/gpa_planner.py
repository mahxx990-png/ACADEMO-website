from flask import Blueprint, request, render_template, jsonify
from flask_login import current_user
import ollama
import json
import os
import tempfile

from config import MODEL_NAME
from models import Transcript
from utils import (
    allowed_file,
    extract_text_from_image,
    extract_text_from_pdf,
    normalize_transcript_text,
    resolve_plan_data_with_fallback,
    load_plan_data_for_major,
)
from werkzeug.utils import secure_filename

gpa_planner_bp = Blueprint('gpa_planner', __name__)

# ==============================
# API — FETCH MAJOR COURSES
# ==============================
@gpa_planner_bp.route("/api/major-courses")
def get_major_courses():
    major = request.args.get("major", "").strip()
    if not major:
        return jsonify({"error": "Major is required"}), 400
    
    plan_data, plan_file, resolved_major, used_fallback = resolve_plan_data_with_fallback(major)
    if not plan_data:
        return jsonify({"courses": []})
    
    try:
        courses = json.loads(plan_data)
        # Ensure it's a list
        if not isinstance(courses, list):
            return jsonify({"courses": []})
        return jsonify({
            "courses": courses,
            "resolved_major": resolved_major,
            "used_fallback": used_fallback
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ==============================
# SYSTEM PROMPT — GPA PLANNER
# ==============================
SYSTEM_PROMPT_GPA = """
You are ACADEMO GPA Advisor, an intelligent academic counselor specialized in GPA planning and academic performance analysis.

Your role is to:
1. Analyze student's current academic status
2. Evaluate planned courses for the current semester
3. Calculate expected GPA outcomes using 4.0 scale
4. Provide personalized recommendations and strategies
5. Generate comprehensive Markdown-formatted analysis with beautiful tables

========================================
GPA CALCULATION RULES (4.0 Scale)
==================================

Grade Point Mapping:
- A = 4.0 (Excellent)
- B+ = 3.5 (Very Good High)
- B = 3.0 (Very Good)
- C+ = 2.5 (Good High)
- C = 2.0 (Good)
- D = 1.0 (Pass)
- F = 0.0 (Fail)

GPA Calculation Formula:
New GPA = (Current QPTS + New QPTS) / (Current Credit Hours + New Credit Hours)

Where:
- QPTS (Quality Points) = Credit Hours × Grade Point Value
- Current QPTS = Current GPA × Current Credit Hours

========================================
ANALYSIS REQUIREMENTS
======================================

You MUST provide:

1. **Current Status Table** (Use Markdown Table format)
   - Show current GPA, earned hours, quality points
   - Academic standing classification

2. **Current Semester Courses Table** (Use Markdown Table format)
   - List each course with credit hours and expected grade
   - Use grades like A, B+, B, C+, C, D, F

3. **GPA Impact Summary Table** (Use Markdown Table format)
   - Current vs Expected comparison

4. **GPA Achievement Analysis Table** (Use Markdown Table format)
   - Desired GPA vs current/projected
   - Remaining hours needed to reach target
   - Quality points needed
   
   Table Headers: | Metric | Current/Target Value | Effort/Hours Needed |

5. **Risk Assessment Section**
   Use this EXACT HTML structure for the risk bar:
   <div class="risk-container">
       <div class="risk-label">Academic Workload Risk: LOW/MODERATE/HIGH</div>
       <div class="risk-bar">
           <div class="risk-fill" style="width: XX%"></div>
       </div>
   </div>
   (Rules: 0-1 difficult courses = LOW 30%, 2 = MODERATE 65%, 3+ = HIGH 90%)

6. **Actionable Recommendations**
   - Specific strategies for each course.
   - Use ### for course titles to trigger premium styling.

========================================
OUTPUT FORMAT (MARKDOWN + CUSTOM HTML)
========================================

* Use # for main title
* Use ## for major sections
* Use ### for minor sections or course names
* ALL tables MUST be formatted as Markdown tables (| Header |). DO NOT use <table> tags.
* Use <p> tags for analysis text for maximum compatibility.

========================================
OUTPUT RULES
============

* Include ALL calculations with step-by-step explanation
* Use 4.0 GPA scale ALWAYS
* Highlight any academic risks or alerts
* Provide actionable recommendations with specific study strategies
* ALL OUTPUT MUST BE IN ENGLISH LANGUAGE (Do not use Arabic)
* MUST include GPA Achievement Analysis Table
"""

# ==============================
# PAGE ROUTE
# ==============================
@gpa_planner_bp.route("/gpa-planner")
def gpa_planner():
    return render_template("gpa_planner.html")

# ==============================
# API — GPA CALCULATION
# ==============================
def _gpa_resolve_transcript_block(major, input_type, raw_tr=""):
    """Same normalization path as course advisor / graduation plan."""
    if input_type == "text":
        return normalize_transcript_text(raw_tr or "", major), None

    if input_type == "saved":
        if not current_user.is_authenticated:
            return None, "Login required to use saved transcript."
        row = Transcript.query.filter_by(user_id=current_user.id).first()
        if not row or not (row.raw_text or "").strip():
            return None, "No saved transcript found."
        return normalize_transcript_text(row.raw_text, major), None

    if input_type == "pdf":
        pdf_file = request.files.get("file")
        if not pdf_file or not pdf_file.filename:
            return None, "No file uploaded."
        filename = secure_filename(pdf_file.filename)
        if not allowed_file(filename):
            return None, "Invalid file type."
        ext = filename.rsplit(".", 1)[1].lower()
        temp_path = None
        try:
            with tempfile.NamedTemporaryFile(delete=False, suffix=f".{ext}") as temp_f:
                temp_path = temp_f.name
                pdf_file.save(temp_path)
            if ext == "pdf":
                text = extract_text_from_pdf(temp_path, major=major)
            else:
                text = extract_text_from_image(temp_path)
                if text:
                    text = normalize_transcript_text(text, major)
            if not text or not str(text).strip():
                return None, "Failed to extract text from file."
            return text, None
        except Exception as e:
            return None, str(e)
        finally:
            if temp_path and os.path.exists(temp_path):
                try:
                    os.remove(temp_path)
                except OSError:
                    pass

    return None, "Invalid transcript input type."


@gpa_planner_bp.route("/api/gpa-plan", methods=["POST"])
def gpa_plan():
    if request.content_type and "application/json" in request.content_type and request.get_json(silent=True):
        data = request.get_json() or {}
        input_type = data.get("type", "text")
        current_gpa = float(data.get("current_gpa", 0) or 0)
        earned_hours = int(data.get("earned_hours", 0) or 0)
        target_gpa = float(data.get("target_gpa", 0) or 0)
        courses = data.get("courses", [])
        major = str(data.get("major", "")).strip()
        raw_tr = data.get("transcript", "")
    else:
        input_type = request.form.get("type", "text")
        current_gpa = float(request.form.get("current_gpa", 0) or 0)
        earned_hours = int(request.form.get("earned_hours", 0) or 0)
        target_gpa = float(request.form.get("target_gpa", 0) or 0)
        major = str(request.form.get("major", "")).strip()
        raw_tr = request.form.get("transcript", "")
        try:
            courses = json.loads(request.form.get("courses") or "[]")
        except json.JSONDecodeError:
            courses = []

    if not major:
        return jsonify({"error": "Please select a major first."}), 400

    transcript_block, err = _gpa_resolve_transcript_block(major, input_type, raw_tr=raw_tr)
    if err:
        code = 401 if "Login required" in err else 400
        return jsonify({"error": err}), code

    plan_data, plan_file, resolved_major, used_fallback = resolve_plan_data_with_fallback(major)
    if not plan_data:
        if plan_file:
            return jsonify({"error": f"Graduation plan file not found or unusable ({plan_file})."}), 400
        return jsonify({"error": "No usable graduation plan data found."}), 400

    try:
        plan_courses = json.loads(plan_data)
        degree_total_hours = sum(int(item.get("ch", 0)) for item in plan_courses if isinstance(item, dict))
    except Exception:
        degree_total_hours = 132

    remaining_hours = max(degree_total_hours - earned_hours, 0)

    course_description = ""
    total_semester_hours = 0
    for i, course in enumerate(courses, 1):
        course_description += f"\n{i}. {course['name']} - {course['hours']} credit hours - Expected Grade: {course['grade']}"
        total_semester_hours += int(course['hours'])

    transcript_section = ""
    if transcript_block and str(transcript_block).strip():
        transcript_section = f"\nOfficial transcript context (normalized):\n{transcript_block}\n"

    messages = [
        {"role": "system", "content": SYSTEM_PROMPT_GPA},
        {"role": "user", "content": f"""
Student Academic Data:
======================

Current GPA: {current_gpa} / 4.0
Earned Credit Hours: {earned_hours}
Remaining Credit Hours: {remaining_hours}
Selected Major: {major}
Plan Used: {resolved_major}{' (fallback applied)' if used_fallback else ''}
Target GPA: {target_gpa if target_gpa > 0 else 'Not specified'} / 4.0
{transcript_section}
Current Semester Courses:
{course_description}

Total Semester Hours: {total_semester_hours}

Task:
=====
1. Calculate the new GPA after this semester using 4.0 scale
2. Grade Points: A=4.0, B+=3.5, B=3.0, C+=2.5, C=3.0, D=1.0, F=0.0
3. Create detailed calculation table showing each course
4. Analyze if student can reach target GPA
5. **CRITICAL**: Create the GPA Achievement Analysis Table showing:
   - Desired GPA: {target_gpa} / Effort needed (GPA points gap)
   - Your Semester Hours: {total_semester_hours} / Additional hours needed
   - Remaining Hours: {remaining_hours} / Message about hours to go
   - Hours for Full Points: (calculate based on total) / Points needed
   - QPTS: Current QPTS / Status or analysis
6. Calculate credit hours needed with perfect grades to reach target
7. Identify academic risks and opportunities
8. Provide detailed personalized recommendations

Important Requirements:
- All output MUST be in ENGLISH language
- Use 4.0 GPA scale (NOT 5.0)
- Include Markdown tables for current status and courses
- Show step-by-step GPA calculation
- **MUST include the GPA Achievement Analysis Table** (as shown in requirements)
- Highlight any academic risks or alerts
- Provide actionable recommendations with specific study strategies
- Include comprehensive analysis with visual structure
- Do not use Arabic language
"""}
    ]

    response = ollama.chat(
        model=MODEL_NAME,
        messages=messages,
        options={
            "temperature": 0.3,
            "max_tokens": 4000
        }
    )

    return response.message.content
