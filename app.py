from flask import Flask, jsonify, render_template, redirect, url_for
from flask_cors import CORS

from config import UPLOAD_FOLDER, MAX_CONTENT_LENGTH, SECRET_KEY, SQLALCHEMY_DATABASE_URI, SQLALCHEMY_TRACK_MODIFICATIONS
from extensions import db, login_manager
from migrations_util import apply_sqlite_user_profile_columns
from models import Transcript, User  # noqa: F401 — Transcript registers with SQLAlchemy metadata

# ==============================
# CREATE APP
# ==============================
app = Flask(__name__)
CORS(app, supports_credentials=True)

app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['MAX_CONTENT_LENGTH'] = MAX_CONTENT_LENGTH
app.config['SECRET_KEY'] = SECRET_KEY
app.config['SQLALCHEMY_DATABASE_URI'] = SQLALCHEMY_DATABASE_URI
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = SQLALCHEMY_TRACK_MODIFICATIONS

db.init_app(app)
login_manager.init_app(app)


@login_manager.user_loader
def load_user(user_id):
    return User.query.get(int(user_id))


# ==============================
# ENTRY: login first
# ==============================
@app.route("/")
def index():
    return redirect(url_for("auth.login"))


@app.route("/home")
def tools_home():
    return render_template("main.html")


with app.app_context():
    db.create_all()
    apply_sqlite_user_profile_columns(app)

# ==============================
# REGISTER BLUEPRINTS
# ==============================
from routes.auth import auth_bp
from routes.course_advisor import course_advisor_bp
from routes.graduation_plan import graduation_plan_bp
from routes.gpa_planner import gpa_planner_bp
from routes.profile import profile_bp

app.register_blueprint(auth_bp)
app.register_blueprint(course_advisor_bp)
app.register_blueprint(graduation_plan_bp)
app.register_blueprint(gpa_planner_bp)
app.register_blueprint(profile_bp)

# ==============================
# DEBUG ROUTE
# ==============================
@app.route("/api/debug/cache", methods=["GET"])
def debug_cache():
    from routes.course_advisor import analysis_cache as advisor_cache
    from routes.graduation_plan import analysis_cache as plan_cache
    return jsonify({
        "advisor_cache_keys": list(advisor_cache.keys()),
        "plan_cache_keys": list(plan_cache.keys()),
    })

# ==============================
# RUN
# ==============================
if __name__ == "__main__":
    app.run(debug=True)