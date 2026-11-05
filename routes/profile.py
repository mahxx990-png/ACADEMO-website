"""Profile blueprint: view/edit personal info, specialization, and optimisation questions."""

import json
import re

from flask import Blueprint, render_template, request, redirect, url_for, flash, jsonify
from flask_login import current_user, login_required

from extensions import db
from models import User

profile_bp = Blueprint("profile", __name__)

EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")

VALID_SPECIALIZATIONS = [
    "Computer Science",
    "Computing with Business",
    "IT",
    "Network & Security",
    "Web Development",
]

OPTIMIZATION_FIELDS = [
    "priority",           # Speed vs GPA
    "course_load",        # Light / Balanced / Heavy
    "employment",         # Not working / Part-time / Full-time
    "learning_pref",      # Visual / Reading / Hands-on / Mixed
    "daily_study_hours",  # 1-2 / 3-4 / 5-6 / 7+
    "strengths",          # Free text
]


@profile_bp.route("/profile", methods=["GET"])
@login_required
def profile_page():
    """Render the profile SPA."""
    return render_template("profile.html")


@profile_bp.route("/api/me/profile", methods=["GET"])
@login_required
def get_profile():
    """Return full profile JSON for the current user."""
    u = current_user
    return jsonify({
        "full_name": u.full_name or "",
        "email": u.email or "",
        "student_id": u.student_id or "",
        "phone": u.phone or "",
        "specialization": u.specialization or "",
        "optimization": u.get_optimization(),
    })


@profile_bp.route("/api/me/profile", methods=["POST"])
@login_required
def update_profile():
    """Update personal info, specialization, and optimisation answers."""
    data = request.get_json(silent=True) or {}

    errors = []

    # ── Personal info ──────────────────────────────────────────────────────
    full_name = (data.get("full_name") or "").strip()
    email = (data.get("email") or "").strip().lower()
    phone = (data.get("phone") or "").strip() or None
    specialization = (data.get("specialization") or "").strip()
    optimization = data.get("optimization") or {}

    if full_name and len(full_name) < 2:
        errors.append("Full name must be at least 2 characters.")
    if email and not EMAIL_RE.match(email):
        errors.append("Please enter a valid email address.")

    # Check email uniqueness (only if changed)
    if email and email != (current_user.email or ""):
        existing = User.query.filter(User.email == email, User.id != current_user.id).first()
        if existing:
            errors.append("That email is already registered by another account.")

    if specialization and specialization not in VALID_SPECIALIZATIONS:
        errors.append(f"Invalid specialization: {specialization}")

    if errors:
        return jsonify({"ok": False, "errors": errors}), 400

    # ── Apply changes ──────────────────────────────────────────────────────
    if full_name:
        current_user.full_name = full_name
    if email:
        current_user.email = email
    current_user.phone = phone

    if specialization:
        current_user.specialization = specialization

    # Sanitise optimisation answers — only accept known keys
    clean_opt = {}
    for key in OPTIMIZATION_FIELDS:
        val = (optimization.get(key) or "").strip()
        if val:
            clean_opt[key] = val[:500]  # hard cap
    current_user.set_optimization(clean_opt)

    db.session.commit()

    return jsonify({"ok": True})
