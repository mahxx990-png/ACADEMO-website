# ACADEMO — Academic Intelligence Advisor

An AI-powered academic advisory system for Computer Science students at AOU.

## Features

| Module | Route | Description |
|--------|-------|-------------|
| **Course Advisor** | `/` | AI-powered next-semester course recommendations based on transcript analysis |
| **Graduation Plan** | `/graduation-plan` | Full graduation roadmap from current state until graduation |
| **GPA Planner** | `/gpa-planner` | GPA calculation, prediction, and achievement analysis |

## Project Structure

```
ACADEMO/
├── app.py                              # Entry point — registers blueprints
├── config.py                           # Shared settings & data loading
├── utils.py                            # Shared helpers (PDF/OCR extraction)
├── routes/
│   ├── __init__.py
│   ├── course_advisor.py               # Course advisor routes & prompt
│   ├── graduation_plan.py              # Graduation plan routes & prompt
│   └── gpa_planner.py                  # GPA planner routes & prompt
├── data/
│   └── cs_plan.json                    # Official CS graduation plan
├── static/
│   ├── js/
│   │   └── course_advisor.jsx          # React UI for course advisor
│   └── images/                         # Logo and icon assets
├── templates/
│   ├── course_advisor.html             # Course advisor page (React + Tailwind)
│   ├── graduation_plan.html            # Graduation plan page
│   └── gpa_planner.html               # GPA planner page
├── uploads/                            # Temporary file upload directory
└── README.md
```

## Setup & Run

### Using Docker (Recommended)
You can seamlessly run the entire project using Docker, which is pre-configured with Tesseract-OCR and other requirements.

1. **Install Prerequisites**:
   - Install [Docker Desktop](https://www.docker.com/products/docker-desktop/) on your laptop.
   - Install [Ollama](https://ollama.com/) and ensure it is running.
2. **Pull the AI Model**:
   Open a terminal and run:
   ```bash
   ollama pull gpt-oss:120b-cloud
   ```
   *(Note: If you use a different model, update the `MODEL_NAME` in `config.py`).*
3. **Launch the Application**:
   ```bash
   docker-compose up --build
   ```
4. **Access the App**:
   The app will be live at [http://localhost:5000](http://localhost:5000).

---

### Manual Setup
```bash
pip install flask flask-cors ollama pdfplumber pillow pytesseract
```

*(Note: Ensure Tesseract OCR is installed on your OS for image extraction).*

```bash
python app.py
```

Then open [http://localhost:5000](http://localhost:5000)
## API Endpoints

| Endpoint | Method | Module | Description |
|----------|--------|--------|-------------|
| `/api/process` | POST | Course Advisor | Analyze transcript → course recommendations |
| `/api/advice` | POST | Course Advisor | Follow-up academic advice |
| `/api/plan` | POST | Graduation Plan | Generate full graduation plan |
| `/api/gpa-plan` | POST | GPA Planner | Calculate and analyze GPA |
