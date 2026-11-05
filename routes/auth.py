import os
import re
import uuid

from flask import Blueprint, render_template, request, redirect, url_for, flash, jsonify, get_flashed_messages, current_app
from flask_login import current_user, login_user, logout_user, login_required
from werkzeug.utils import secure_filename

from extensions import db
from models import User, Transcript
from utils import allowed_file, extract_text_from_image, extract_text_from_pdf, normalize_transcript_text

auth_bp = Blueprint("auth", __name__)

EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


def safe_next_path(target):
    """Only allow same-site relative redirects (open redirect protection)."""
    if not target or not isinstance(target, str):
        return None
    t = target.strip()
    if not t.startswith("/") or t.startswith("//"):
        return None
    return t


def _auth_bootstrap():
    """JSON-safe data for the unified React auth page."""
    tab = request.args.get("tab") or "login"
    if tab not in ("login", "register"):
        tab = "login"
    nxt = (request.args.get("next") or request.form.get("next") or "").strip()
    flashes = get_flashed_messages(with_categories=True)
    return {
        "initial_tab": tab,
        "flashes": [{"category": c, "message": m} for c, m in flashes],
        "next": nxt,
        "login_action": url_for("auth.login"),
        "register_action": url_for("auth.register"),
        "tools_home_url": url_for("tools_home"),
    }


def _find_user_by_login_id(login_id):
    """Login uses student ID; legacy rows may only have username set."""
    login_id = (login_id or "").strip()
    if not login_id:
        return None
    u = User.query.filter_by(student_id=login_id).first()
    if u:
        return u
    return User.query.filter_by(username=login_id).first()


def _save_transcript_file(transcript_file, student_id):
    """
    Persist the uploaded transcript file to UPLOAD_FOLDER with a unique name
    so it can be referenced later without re-uploading.

    Returns (saved_path, error_message).
    """
    if not transcript_file or not transcript_file.filename:
        return None, None

    filename = secure_filename(transcript_file.filename)
    if not allowed_file(filename):
        return None, "Invalid transcript file type. Use PDF, PNG, or JPG."

    ext = filename.rsplit(".", 1)[1].lower()
    # Build a unique, deterministic filename: <student_id>_<uuid4>.<ext>
    unique_name = f"{secure_filename(student_id)}_{uuid.uuid4().hex}.{ext}"
    upload_dir = current_app.config.get("UPLOAD_FOLDER", "uploads")
    os.makedirs(upload_dir, exist_ok=True)
    save_path = os.path.join(upload_dir, unique_name)
    transcript_file.save(save_path)
    return save_path, None


def _build_registration_transcript(major, transcript_file, pasted_raw, student_id):
    """
    Combine PDF/image extraction and pasted text using the same normalization as tools.

    The uploaded file is saved persistently to UPLOAD_FOLDER.
    Returns (combined_text, saved_file_path, error_message).
    """
    parts = []
    saved_file_path = None

    # ── Handle uploaded file ────────────────────────────────────────────────
    if transcript_file and transcript_file.filename:
        saved_path, file_err = _save_transcript_file(transcript_file, student_id)
        if file_err:
            return None, None, file_err

        if saved_path:
            saved_file_path = saved_path
            ext = saved_path.rsplit(".", 1)[1].lower()
            try:
                if ext == "pdf":
                    extracted = extract_text_from_pdf(saved_path, major=major)
                else:
                    extracted = extract_text_from_image(saved_path)
                    if extracted:
                        extracted = normalize_transcript_text(extracted, major)
            except Exception as exc:
                # Remove the file we just saved if extraction fails hard
                try:
                    os.remove(saved_path)
                except OSError:
                    pass
                return None, None, f"Could not process uploaded file: {exc}"

            if not extracted or not str(extracted).strip():
                # Keep the file anyway—user may have uploaded a valid PDF that
                # just has no machine-readable text yet; raw_text stays empty.
                parts.append("--- From uploaded transcript file ---\n[File saved, but no text could be extracted automatically. Please paste your transcript below.]")
            else:
                parts.append("--- From uploaded transcript file ---\n" + str(extracted).strip())

    # ── Handle pasted text ──────────────────────────────────────────────────
    pasted = (pasted_raw or "").strip()
    if pasted:
        parts.append(
            "--- From pasted transcript ---\n" + normalize_transcript_text(pasted, major)
        )

    combined = "\n\n".join(parts).strip()
    if not combined:
        return None, saved_file_path, None

    return combined, saved_file_path, None


@auth_bp.route("/login", methods=["GET", "POST"])
def login():
    if current_user.is_authenticated:
        return redirect(url_for("tools_home"))
    default_next = url_for("tools_home")
    if request.method == "POST":
        student_id = (request.form.get("student_id") or "").strip()
        password = request.form.get("password") or ""
        raw_next = request.form.get("next") or request.args.get("next")
        next_url = safe_next_path(raw_next) or default_next
        user = _find_user_by_login_id(student_id)
        if user and user.check_password(password):
            login_user(user, remember=True)
            return redirect(next_url)
        flash("Invalid student ID or password.", "error")
    return render_template("login.html", auth_bootstrap=_auth_bootstrap())


@auth_bp.route("/register", methods=["GET", "POST"])
def register():
    if current_user.is_authenticated:
        return redirect(url_for("tools_home"))
    default_next = url_for("tools_home")

    if request.method == "GET":
        nxt = request.args.get("next", "")
        return redirect(url_for("auth.login", tab="register", next=nxt))

    if request.method == "POST":
        student_id = (request.form.get("student_id") or "").strip()
        full_name = (request.form.get("full_name") or "").strip()
        email = (request.form.get("email") or "").strip().lower()
        phone = (request.form.get("phone") or "").strip() or None
        major = (request.form.get("major") or "Computer Science").strip()
        password = request.form.get("password") or ""
        confirm = request.form.get("confirm") or ""
        pasted = request.form.get("transcript_text") or ""
        transcript_file = request.files.get("transcript_pdf")
        raw_next = request.form.get("next") or request.args.get("next")
        next_url = safe_next_path(raw_next) or default_next

        err = None
        if len(student_id) < 2:
            err = "Please enter your student ID."
        elif len(full_name) < 2:
            err = "Please enter your full name."
        elif not email or not EMAIL_RE.match(email):
            err = "Please enter a valid email address."
        elif len(password) < 6:
            err = "Password must be at least 6 characters."
        elif password != confirm:
            err = "Passwords do not match."
        elif User.query.filter_by(student_id=student_id).first():
            err = "This student ID is already registered."
        elif User.query.filter_by(email=email).first():
            err = "That email is already registered."

        combined_transcript = None
        saved_file_path = None
        if not err:
            combined_transcript, saved_file_path, tex_err = _build_registration_transcript(
                major, transcript_file, pasted, student_id
            )
            if tex_err:
                err = tex_err

        if err:
            flash(err, "error")
            return redirect(
                url_for("auth.login", tab="register", next=(request.form.get("next") or ""))
            )

        # ── Persist user + transcript ────────────────────────────────────────
        user = User(
            username=student_id,
            student_id=student_id,
            full_name=full_name,
            email=email,
            phone=phone,
            specialization=major,
        )
        user.set_password(password)
        db.session.add(user)
        db.session.flush()  # get user.id before creating Transcript

        transcript_row = Transcript(
            user_id=user.id,
            raw_text=combined_transcript,
            file_path=saved_file_path,
        )
        db.session.add(transcript_row)
        db.session.commit()

        login_user(user, remember=True)
        return redirect(next_url)

    return redirect(url_for("auth.login"))


@auth_bp.route("/logout")
@login_required
def logout():
    logout_user()
    return redirect(url_for("auth.login"))


@auth_bp.route("/api/session/context")
def session_context():
    payload = {
        "is_authenticated": current_user.is_authenticated,
        "has_saved_transcript": False,
        "username": None,
        "display_name": None,
        "email": None,
        "student_id": None,
        "phone": None,
        "specialization": None,
        "optimization": {},
    }
    if current_user.is_authenticated:
        row = Transcript.query.filter_by(user_id=current_user.id).first()
        has_saved = bool(row and (row.raw_text or "").strip())
        payload["has_saved_transcript"] = has_saved
        sid = (current_user.student_id or current_user.username or "").strip()
        payload["username"] = sid
        payload["student_id"] = current_user.student_id
        fn = (current_user.full_name or "").strip()
        payload["display_name"] = fn or sid
        payload["email"] = current_user.email
        payload["phone"] = current_user.phone
        payload["specialization"] = current_user.specialization or ""
        payload["optimization"] = current_user.get_optimization()
    return jsonify(payload)


@auth_bp.route("/api/me/transcript", methods=["POST"])
@login_required
def save_my_transcript():
    data = request.get_json(silent=True) or {}
    raw = data.get("raw_text")
    if raw is None:
        return jsonify({"error": "raw_text is required"}), 400
    row = Transcript.query.filter_by(user_id=current_user.id).first()
    if not row:
        row = Transcript(user_id=current_user.id, raw_text=raw)
        db.session.add(row)
    else:
        row.raw_text = raw
    db.session.commit()
    return jsonify({"ok": True})


@auth_bp.route("/api/me/transcript/upload", methods=["POST"])
@login_required
def upload_transcript():
    """
    POST a PDF/image as multipart to replace the current user's saved transcript.
    The file is processed with the column-splitting logic and both the extracted
    text and the file path are persisted to the database.
    """
    transcript_file = request.files.get("transcript_pdf")
    major = (request.form.get("major") or "Computer Science").strip()

    if not transcript_file or not transcript_file.filename:
        return jsonify({"error": "No file uploaded."}), 400

    saved_path, file_err = _save_transcript_file(transcript_file, str(current_user.student_id or current_user.id))
    if file_err:
        return jsonify({"error": file_err}), 400

    ext = saved_path.rsplit(".", 1)[1].lower()
    try:
        if ext == "pdf":
            extracted = extract_text_from_pdf(saved_path, major=major)
        else:
            extracted = extract_text_from_image(saved_path)
            if extracted:
                extracted = normalize_transcript_text(extracted, major)
    except Exception as exc:
        try:
            os.remove(saved_path)
        except OSError:
            pass
        return jsonify({"error": f"Could not process file: {exc}"}), 500

    raw_text = str(extracted or "").strip()

    row = Transcript.query.filter_by(user_id=current_user.id).first()
    if row:
        # Remove old file if it exists and has changed
        if row.file_path and row.file_path != saved_path:
            try:
                os.remove(row.file_path)
            except OSError:
                pass
        row.raw_text = raw_text
        row.file_path = saved_path
    else:
        row = Transcript(user_id=current_user.id, raw_text=raw_text, file_path=saved_path)
        db.session.add(row)

    db.session.commit()
    return jsonify({"ok": True, "extracted_chars": len(raw_text)})
