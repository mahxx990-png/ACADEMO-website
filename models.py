import json

from flask_login import UserMixin
from werkzeug.security import generate_password_hash, check_password_hash

from extensions import db


class User(UserMixin, db.Model):
    __tablename__ = "users"

    id = db.Column(db.Integer, primary_key=True)
    # Legacy column: for new signups set equal to student_id; login uses student_id.
    username = db.Column(db.String(80), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(256), nullable=False)
    full_name = db.Column(db.String(200), nullable=True)
    email = db.Column(db.String(120), nullable=True, unique=True, index=True)
    student_id = db.Column(db.String(64), nullable=True, unique=True, index=True)
    phone = db.Column(db.String(40), nullable=True)
    specialization = db.Column(db.String(120), nullable=True)
    optimization_answers = db.Column(db.Text, nullable=True)  # JSON blob

    transcript = db.relationship(
        "Transcript",
        backref=db.backref("user", lazy=True),
        uselist=False,
        cascade="all, delete-orphan",
    )

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

    def get_optimization(self):
        """Return optimization_answers as a dict (empty dict if unset)."""
        if not self.optimization_answers:
            return {}
        try:
            return json.loads(self.optimization_answers)
        except (json.JSONDecodeError, TypeError):
            return {}

    def set_optimization(self, data: dict):
        """Store optimization_answers from a dict."""
        self.optimization_answers = json.dumps(data, ensure_ascii=False)


class Transcript(db.Model):
    __tablename__ = "transcripts"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), unique=True, nullable=False, index=True)
    raw_text = db.Column(db.Text, nullable=True)
    file_path = db.Column(db.String(512), nullable=True)  # Path to the persisted uploaded PDF/image
