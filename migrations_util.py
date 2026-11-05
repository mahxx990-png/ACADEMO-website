"""Lightweight SQLite ALTER TABLE for new columns (no Flask-Migrate)."""

from sqlalchemy import inspect, text

from extensions import db


def apply_sqlite_user_profile_columns(app):
    uri = (app.config.get("SQLALCHEMY_DATABASE_URI") or "").lower()
    if not uri.startswith("sqlite"):
        return

    inspector = inspect(db.engine)
    if "users" not in inspector.get_table_names():
        return

    cols = {c["name"] for c in inspector.get_columns("users")}
    statements = []
    if "full_name" not in cols:
        statements.append("ALTER TABLE users ADD COLUMN full_name VARCHAR(200)")
    if "email" not in cols:
        statements.append("ALTER TABLE users ADD COLUMN email VARCHAR(120)")
    if "student_id" not in cols:
        statements.append("ALTER TABLE users ADD COLUMN student_id VARCHAR(64)")
    if "phone" not in cols:
        statements.append("ALTER TABLE users ADD COLUMN phone VARCHAR(40)")
    if "specialization" not in cols:
        statements.append("ALTER TABLE users ADD COLUMN specialization VARCHAR(120)")
    if "optimization_answers" not in cols:
        statements.append("ALTER TABLE users ADD COLUMN optimization_answers TEXT")

    if statements:
        with db.engine.begin() as conn:
            for stmt in statements:
                conn.execute(text(stmt))

    # Legacy accounts: copy username into student_id when missing (login uses student ID).
    try:
        with db.engine.begin() as conn:
            conn.execute(
                text(
                    "UPDATE users SET student_id = username "
                    "WHERE (student_id IS NULL OR student_id = '') AND username IS NOT NULL"
                )
            )
    except Exception:
        pass

    # ── Transcripts table: add file_path if missing ──────────────────────────
    if "transcripts" in inspector.get_table_names():
        transcript_cols = {c["name"] for c in inspector.get_columns("transcripts")}
        if "file_path" not in transcript_cols:
            with db.engine.begin() as conn:
                conn.execute(text("ALTER TABLE transcripts ADD COLUMN file_path VARCHAR(512)"))
