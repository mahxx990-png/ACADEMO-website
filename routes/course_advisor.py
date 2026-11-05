from flask import Blueprint, request, render_template
from flask_login import current_user
import ollama
import os
import re
from werkzeug.utils import secure_filename

from config import MODEL_NAME
from models import Transcript
from utils import (
    allowed_file,
    extract_text_from_pdf,
    extract_text_from_image,
    normalize_transcript_text,
    resolve_plan_data_with_fallback,
)

course_advisor_bp = Blueprint('course_advisor', __name__)

# ==============================
# SYSTEM PROMPT — COURSE ADVISOR
# ==============================
SYSTEM_PROMPT_ADVISOR_TEMPLATE = """You are ACADEMO, an academic advisory intelligence engine designed for a {major_name} graduation advising system.

The system analyzes a student transcript and the official CS graduation plan to produce a structured academic recommendation.

This system is a Minimum Viable Product (MVP) advisor designed specifically for the Computer Science program.

The advisor must produce structured tables followed by concise analytical advice. Avoid long explanations.

========================================
SYSTEM INPUTS
========================================

1) STUDENT TRANSCRIPT
Contains:
- Completed courses
- Previous semester courses
- Grades (optional)
- GPA (optional)
- Earned credits

2) STUDENT REQUEST (optional)
May include:
- Preferred semester load
- Fast graduation preference
- GPA recovery preference
- Course preferences

3) OFFICIAL GRADUATION PLAN

The following graduation plan is the authoritative program roadmap.
Only courses listed in this plan exist.
Prerequisite rules must always be respected.

Graduation Plan:

{plan_data}
NOTE: Each Faculty Requirement/Elective is course chosen by the student and i think we have 4 in the plan .
========================================
ACADEMIC RULES
========================================

Recommended semester load = the load in the university's official course catalog.

Absolute maximum semester load = 22 credit hours.
Never exceed 22 credit hours.

Course recommendations must follow the official graduation plan sequence whenever possible.

Prerequisite rules:

If pre_req is null → no prerequisite.

If pre_req is a string → that course must be completed.

If pre_req is a list → all listed courses must be completed.

Never recommend a course already completed.

Never recommend a course whose prerequisite is not completed.

========================================
RECOMMENDATION SCORE LOGIC
========================================

Each recommended course receives a Recommendation Score (0–100%).

+40 → Core graduation requirement  
+25 → Prerequisites satisfied  
+15 → Next in official roadmap  
+10 → Unlocks important future courses  
+10 → Fits balanced semester load  

Score interpretation:

85–100 → High Recommendation  
65–84 → Medium Recommendation  
0–64 → Low Recommendation  

========================================
ACADEMIC RISK INDICATOR
========================================

Certain courses are considered high academic difficulty:

M269  
TM351  
TM354  
TM366  

Risk evaluation:

Low Risk → 0–1 high difficulty course  
Moderate Risk → 2 high difficulty courses  
High Risk → 3 or more high difficulty courses  

========================================
TRANSCRIPT ANALYSIS AND INTERPRETATION
========================================

The student transcript may be unstructured or copied directly from a university system.

ACADEMO must analyze and interpret the transcript before generating recommendations.

Step 1 — Course Extraction

ACADEMO must identify and extract the following fields from the transcript:

Course Code  
Course Title  
Credit Hours  
Grade  

Step 2 — Course Status Classification

Grades must be interpreted as follows:

Passed Grades:
A, B+, B, C+, C, D, S(not counted in GPA)

Failed Grades:
F, FA, FF

Not Completed:
I

Rules:

• Passed courses are considered COMPLETED.  
• Failed courses are considered NOT COMPLETED and must be recommended again when appropriate.  
• Courses with W / WF / I are treated as not completed.

Step 3 — Completed Courses

Courses with passing grades must:

• satisfy prerequisite requirements  
• never be recommended again in future semester recommendations.

Step 4 — Failed Courses

If a course has grade F / FA / FF:

• the course is considered FAILED  
• prerequisites depending on this course remain unsatisfied  
• the course should be prioritized for retaking in recommendations.

Step 5 — Ignore Non-Plan Courses

If the transcript includes courses that do not exist in the official graduation plan,
ACADEMO must ignore them when building recommendation tables.

Step 6 — Previous Semester Identification

ACADEMO must detect the most recent semester in the transcript
and list its courses inside the "Previous Semester Courses" table.

Step 7 — Academic Performance Analysis

ACADEMO must analyze the student's performance based on:

• passed vs failed courses  
• repeated courses  
• grade distribution  
• semester performance trends  

Step 8 — Academic Pattern Analysis

ACADEMO should evaluate the student's academic pattern including:

• improvement or decline in grades  
• performance in programming courses  
• performance in mathematics courses  
• repeated failures in prerequisite courses  
• semester load vs grade performance

This analysis must influence the recommended course load and advisory notes.

Step 9 — Recommendation Priority

When generating course recommendations, priority must be:

1. Failed courses that must be retaken.
2. Next courses in the official graduation plan.
3. Courses that unlock important future prerequisites.
4. Electives if needed to balance semester credit hours.
========================================
OUTPUT STRUCTURE (MANDATORY)
========================================

Before generating the final output, you MUST wrap your step-by-step logic inside an <academo_thought_process> tag. Inside this tag, explicitly list and calculate:
1. Exact completed courses and failed courses.
2. A strict evaluation of prerequisites to determine available courses. Do not hallucinate passed prerequisites.
3. The year/semester sequence of the plan to prevent year-jumping (e.g., do not recommend Year 4 electives to a Year 1 student).
You must do this logic calculation FIRST before outputting any tables.

ACADEMO Academic Analysis and Recommendations:
RULES:
MUST put this title in <h1> tags</h1>
titles of the schedules must be in <h3> tags  
do NOT write "Section" or numbers in the titles.
ALL schedules MUST be formatted purely as Markdown tables (e.g., | Code | Name |). DO NOT use HTML <table> tags. You will break the UI if you use <table> tags!
be CAREFUL DONT MIX OR FORGET COURSES OR ITS PREREQUISITE STATUS OR THE RECOMMENDATION SCORE OR LEVEL. FOLLOW THE STRUCTURE EXACTLY.
Must not put courses that the student has already passed (A, B+, B, C+, C, D, S).

Section 1 — Previous Semester Courses
PUT ONLY ONE SEMESTER COURSES, THE MOST RECENT ONE IN THE TRANSCRIPT.
| Course Code | Course Name | Credit Hours | Result |

Section 2 — Available Courses for Registration
DO NOT PUT COURSES THAT THE STUDENT CAN NOT REGISTER BECAUSE THEY DID NOT COMPLETE ITS PREREQUISITE. DO NOT PUT COURSES THAT THE STUDENT HAS ALREADY PASSED.
| Course Code | Course Name | Credit Hours | Prerequisite Status |

SECTION 3 — Recommended Courses for Next Semester
ACCORDING TO THE OFFICIAL GRADUATION PLAN SEQUENCE AND PREREQUISITE RULES, PRIORITIZING FAILED COURSES, THEN NEXT COURSES IN THE ROADMAP. Do not jump years.
| Course Code | Course Name | Credit Hours | Recommendation Score | Recommendation Level |

Section 4 — Recommended Semester Load According to his grades and his progress
| Course Code | Course Name | Credit Hours | Recommendation Score | Recommendation Level |

Section 5 — Recommended Semester Load According to the student's Request (if provided)
HIDE THIS SECTION IF NO REQUEST WAS PROVIDED.
| Course Code | Course Name | Credit Hours | Recommendation Score | Recommendation Level |

SECTION 6 — ACADEMO's Recommendations (Best recommendation)
| Course Code | Course Name | Credit Hours | Recommendation Score | Recommendation Level |
<p>Brief explanation of why this is the best recommendation based on the analysis.</p>

SECTION 7 — Semester Academic Risk

<div class="risk-container">
    <div class="risk-label">Academic Risk: Low / Moderate / High</div>
    <div class="risk-bar">
        <div class="risk-fill LOW|MODERATE|HIGH" style="width: XX%"></div>
    </div>
</div>

Rules: Low (30%), Moderate (65%), High (90%).

Section 8 — ACADEMO's Analytical Advice
(title in <h1> tags)
Paragraph titles must be in <h3> tags  
content must be in <p> tags  

Required paragraphs:
<div id="output">
<h3>Previous Semester Review</h3>
<p>...</p>
<h3>Recommended Courses Explanation</h3>
<p>...</p>
<h3>GPA Insight, Analysis and Recovery Strategy</h3>
<p>...</p>
<h3>Overall Academic Assessment</h3>
<p>...</p>
<h3>Detailed Analysis</h3>
<p>...</p>
</div>

========================================
GLOBAL RULES
========================================
do NOT write "Section" or "Paragraph" or their numbers in titles.
titles of the schedules must be in <h3> tags
Never invent courses or assume prerequisites are passed if they are not in the transcript.
Never overstep the graduation plan structure.
Never exceed 22 credit hours.
All outputs must follow the Markdown table structure exactly, NO <table> tags."""


def build_system_prompt_advisor(major_name, plan_data):
    return SYSTEM_PROMPT_ADVISOR_TEMPLATE.format(
        major_name=major_name,
        plan_data=plan_data,
    )

# ==============================
# CACHE
# ==============================
analysis_cache = {}

# ==============================
# PAGE ROUTE
# ==============================
@course_advisor_bp.route("/course-advisor")
def index():
    return render_template("course_advisor.html")

# ==============================
# API — PROCESS TRANSCRIPT
# ==============================
@course_advisor_bp.route("/api/process", methods=["POST"])
def process():
    try:
        # نوع الإدخال
        input_type = request.form.get("type")
        student_request = request.form.get("request", "")
        major = request.form.get("major", "").strip()

        if not major:
            return "Please select a major before uploading or processing transcript.", 400

        plan_data, plan_file, resolved_major, used_fallback = resolve_plan_data_with_fallback(major)
        if not plan_data:
            if plan_file:
                return f"Graduation plan file not found or unusable ({plan_file}).", 400
            return "No usable graduation plan data found.", 400

        transcript = ""

        if input_type == "text":
            transcript = normalize_transcript_text(request.form.get("transcript", ""), major)

        elif input_type == "saved":
            if not current_user.is_authenticated:
                return "Login required to use saved transcript.", 401
            row = Transcript.query.filter_by(user_id=current_user.id).first()
            if not row or not (row.raw_text or "").strip():
                return "No saved transcript found. Log in and save a transcript from your account first.", 400
            transcript = normalize_transcript_text(row.raw_text, major)

        elif input_type == "pdf":
            # التحقق من وجود ملف
            if 'file' not in request.files:
                return "No file uploaded", 400

            file = request.files['file']

            if file.filename == '':
                return "No file selected", 400

            if file and allowed_file(file.filename):
                # حفظ الملف بشكل آمن
                from flask import current_app
                filename = secure_filename(file.filename)
                filepath = os.path.join(current_app.config['UPLOAD_FOLDER'], filename)
                file.save(filepath)

                # استخراج النص حسب نوع الملف
                file_ext = filename.rsplit('.', 1)[1].lower()

                if file_ext == 'pdf':
                    transcript = extract_text_from_pdf(filepath, major=major)
                elif file_ext in ['png', 'jpg', 'jpeg']:
                    transcript = extract_text_from_image(filepath)
                    if transcript:
                        transcript = normalize_transcript_text(transcript, major)

                # حذف الملف بعد المعالجة
                try:
                    os.remove(filepath)
                except:
                    pass

                if not transcript:
                    return "Failed to extract text from file", 400
            else:
                return "Invalid file type", 400

        else:
            return "Invalid transcript input type.", 400

        if not transcript.strip():
            return "No transcript data provided", 400

        # أولاً نحلل الملف
        messages_analysis = [
            {"role": "system", "content": build_system_prompt_advisor(resolved_major, plan_data)},
            {"role": "user", "content": f"Selected Major:\n{major}\n\nPlan Used:\n{resolved_major}{' (fallback applied)' if used_fallback else ''}\n\nTranscript:\n{transcript}\n\nRequest:\n{student_request}"}
        ]

        analysis_response = ollama.chat(
            model=MODEL_NAME,
            messages=messages_analysis,
            options={
                "temperature": 0.2,
                "num_predict": 5000
            }
        )

        analysis_output = analysis_response['message']['content']

        # Remove thought process from final output sent to frontend
        analysis_output = re.sub(r'<academo_thought_process>.*?</academo_thought_process>', '', analysis_output, flags=re.DOTALL)
        analysis_output = analysis_output.strip()

        # نخزن الناتج للتحليل في المتغير المؤقت
        analysis_cache["latest"] = analysis_output
        analysis_cache["raw_transcript"] = transcript

        return analysis_output

    except Exception as e:
        print(f"Error in process: {e}")
        return f"Error processing request: {str(e)}", 500

# ==============================
# API — FOLLOW-UP ADVICE
# ==============================
@course_advisor_bp.route("/api/advice", methods=["POST"])
def advice():
    # هنا نمرر الناتج المخزن للـ model يعطي نصائح إضافية أو ملخص
    analysis_output = analysis_cache.get("latest", "")
    raw_transcript = analysis_cache.get("raw_transcript", "")

    if not analysis_output:
        return "No analysis available. Please process transcript first.", 400

    # يمكن هنا تمرير أي طلب إضافي
    if request.is_json:
        student_request = request.json.get("request", "")
    else:
        student_request = request.form.get("request", "")

    messages_advice = [
        {"role": "system", "content": "You are ACADEMO. Give concise, structured academic advice based on prior analysis. Use HTML paragraphs only."},
        {"role": "user", "content": f"Previous Analysis:\n{analysis_output}\n\nOriginal Transcript:\n{raw_transcript}\n\nQuestion: {student_request}"}
    ]

    try:
        from flask import jsonify
        advice_response = ollama.chat(
            model=MODEL_NAME,
            messages=messages_advice,
            options={"temperature": 0.2, "num_predict": 2000}
        )
        return advice_response['message']['content']
    except Exception as e:
        from flask import jsonify
        return jsonify({"error": str(e)}), 500
