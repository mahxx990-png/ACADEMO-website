import os

_BASE_DIR = os.path.abspath(os.path.dirname(__file__))
_INSTANCE = os.path.join(_BASE_DIR, "instance")
os.makedirs(_INSTANCE, exist_ok=True)

# ==============================
# APP / DATABASE
# ==============================
SECRET_KEY = os.environ.get("SECRET_KEY", "academo-dev-key-change-in-production")
SQLALCHEMY_DATABASE_URI = os.environ.get(
    "DATABASE_URL",
    "sqlite:///" + os.path.join(_INSTANCE, "academo.db").replace("\\", "/"),
)
SQLALCHEMY_TRACK_MODIFICATIONS = False

# ==============================
# FILE UPLOAD SETTINGS
# ==============================
UPLOAD_FOLDER = 'uploads'
ALLOWED_EXTENSIONS = {'pdf', 'png', 'jpg', 'jpeg'}
MAX_CONTENT_LENGTH = 16 * 1024 * 1024  # 16MB max

# إنشاء مجلد الرفع إذا لم يكن موجوداً
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

# ==============================
# LOAD GRADUATION PLAN DATA
# ==============================
try:
    with open(os.path.join("data", "cs_plan.json"), "r", encoding="utf-8") as f:
        CS_PLAN_DATA = f.read()
except Exception as e:
    print(f"Error loading plan: {e}")
    CS_PLAN_DATA = "[]"

# ==============================
# MODEL SETTINGS
# ==============================
MODEL_NAME = "gpt-oss:120b-cloud"
