import os
import json
import re

from config import ALLOWED_EXTENSIONS

MAJOR_TO_FILE = {
    "computer science": "cs_plan.json",
    "computing with business": "cWb.json",
    "it": "it_plan.json",
    "network & security": "n&s_plan.json",
    "web development": "wd_paln.json",
}
DEFAULT_MAJOR_NAME = "Computer Science"


def allowed_file(filename):
    """Check if the uploaded file has an allowed extension."""
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS


SEMESTER_HEADER_RE = re.compile(r"(\d{4}\s*/\s*\d{4}).*(first|second|summer|spring|fall|semester)", re.IGNORECASE)
TRANSCRIPT_ROW_RE = re.compile(
    r"\b([A-Z]{1,5}-?\d{2,4}[A-Z]?)\b\s+(.+?)\s+([A-F][+]?|FA|FF|WF|W|I|S|P)\s+(\d{1,2}(?:\.\d{1,2})?)\b",
    re.IGNORECASE,
)


def _clean_line(line):
    return re.sub(r"\s+", " ", (line or "")).strip()


def _is_semester_header(line):
    return bool(SEMESTER_HEADER_RE.search(line))


def _major_course_codes(major):
    plan_data, _, _, _ = resolve_plan_data_with_fallback(major)
    if not plan_data:
        return set()
    try:
        parsed = json.loads(plan_data)
    except Exception:
        return set()
    return {str(item.get("code", "")).upper() for item in parsed if isinstance(item, dict) and item.get("code")}


def _records_from_lines(lines, major=None):
    """Build course records from cleaned transcript lines (shared by PDF and plain text)."""
    allowed_codes = _major_course_codes(major)
    records = []
    current_semester = "Unknown Semester"
    for line in lines:
        if _is_semester_header(line):
            current_semester = line
            continue

        for match in TRANSCRIPT_ROW_RE.finditer(line):
            code = match.group(1).upper()
            if allowed_codes and code not in allowed_codes:
                continue
            records.append(
                {
                    "semester": current_semester,
                    "code": code,
                    "title": match.group(2).strip(" -:"),
                    "grade": match.group(3).upper(),
                    "credit_hours": match.group(4),
                }
            )

    return records


def _format_records_as_normalized_text(records, fallback_lines):
    """Same structured output whether lines came from PDF extraction or paste/DB."""
    if not records:
        return "\n".join(fallback_lines)

    output_lines = []
    current_semester = None
    for rec in records:
        if rec["semester"] != current_semester:
            if current_semester is not None:
                output_lines.append("")
            output_lines.append(f"Semester: {rec['semester']}")
            current_semester = rec["semester"]
        output_lines.append(
            f"{rec['code']} | {rec['title']} | CH: {rec['credit_hours']} | Grade: {rec['grade']}"
        )

    return "\n".join(output_lines).strip()


def extract_transcript_data(file_path, major=None):
    """Parse transcript with coordinate-based split: left box then right box."""
    import pdfplumber

    chunks = []
    with pdfplumber.open(file_path) as pdf:
        for page in pdf.pages:
            width = page.width
            height = page.height

            # Required split strategy
            left_box = (0, 0, width / 2, height)
            right_box = (width / 2, 0, width, height)

            left_text = page.crop(left_box).extract_text(layout=True) or page.crop(left_box).extract_text() or ""
            right_text = page.crop(right_box).extract_text(layout=True) or page.crop(right_box).extract_text() or ""
            final_text = f"{left_text}\n{right_text}".strip()
            if final_text:
                chunks.append(final_text)

    merged_text = "\n".join(chunks)
    lines = [_clean_line(line) for line in merged_text.splitlines() if _clean_line(line)]
    records = _records_from_lines(lines, major=major)
    return records, lines


def normalize_transcript_text(raw_text, major=None):
    """Apply the same cleaning / regex course extraction as the PDF path to pasted or DB-saved text."""
    if raw_text is None:
        return ""
    lines = [_clean_line(line) for line in str(raw_text).splitlines() if _clean_line(line)]
    records = _records_from_lines(lines, major=major)
    return _format_records_as_normalized_text(records, lines)


def extract_text_from_pdf(file_path, major=None):
    """Extract and normalize transcript text from two-column PDF using coordinate crops."""
    try:
        records, lines = extract_transcript_data(file_path, major=major)
        return _format_records_as_normalized_text(records, lines)
    except Exception as e:
        print(f"Error extracting PDF: {e}")
        return None


def extract_text_from_image(file_path):
    """استخراج النص من صورة باستخدام OCR"""
    try:
        from PIL import Image
        import pytesseract

        # قراءة الصورة
        image = Image.open(file_path)

        # استخراج النص باستخدام Tesseract OCR
        text = pytesseract.image_to_string(image, lang='eng')

        return text
    except Exception as e:
        print(f"Error extracting image text: {e}")
        return None


def normalize_major_name(major):
    if major is None:
        return ""
    return str(major).strip().lower()


def get_plan_file_for_major(major):
    normalized = normalize_major_name(major)
    return MAJOR_TO_FILE.get(normalized)


def load_plan_data_for_major(major):
    plan_file = get_plan_file_for_major(major)
    if not plan_file:
        return None, None

    candidate_paths = [
        os.path.join("data", "c", plan_file),
        os.path.join("data", plan_file),
    ]

    first_existing_data = None
    for path in candidate_paths:
        if os.path.exists(path):
            with open(path, "r", encoding="utf-8") as f:
                plan_data = f.read()

            # Prefer the first usable plan if multiple copies exist.
            if is_plan_data_usable(plan_data):
                return plan_data, plan_file

            # Keep first existing file as fallback for error reporting.
            if first_existing_data is None:
                first_existing_data = plan_data

    if first_existing_data is not None:
        return first_existing_data, plan_file

    return None, plan_file


def is_plan_data_usable(plan_data):
    if not plan_data:
        return False
    try:
        parsed = json.loads(plan_data)
    except Exception:
        return False

    if not isinstance(parsed, list) or len(parsed) == 0:
        return False

    first_course = parsed[0] if isinstance(parsed[0], dict) else {}
    return bool(first_course.get("code"))


def resolve_plan_data_with_fallback(major):
    selected_major = major or DEFAULT_MAJOR_NAME
    selected_data, selected_file = load_plan_data_for_major(selected_major)
    if is_plan_data_usable(selected_data):
        return selected_data, selected_file, selected_major, False

    default_data, default_file = load_plan_data_for_major(DEFAULT_MAJOR_NAME)
    if is_plan_data_usable(default_data):
        return default_data, default_file, DEFAULT_MAJOR_NAME, True

    return None, selected_file or default_file, selected_major, False
