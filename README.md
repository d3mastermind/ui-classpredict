# ClassPredict

**Predictive System for University Students' Final Graduation Class of Degree – Case Study: University of Ibadan**

CSC 476 (Research Methods in Computer Science) group project, Department of Computer Science, University of Ibadan.

ClassPredict estimates the class of degree a University of Ibadan student is likely to graduate with (First Class, Second Class Upper, Second Class Lower or Third Class, on UI's 4.0 scale) from the results the student already has. It also shows the average GPA needed in the remaining semesters to reach each class, and lets academic advisers upload a whole cohort to see who is at risk.

> **Important:** the models in this repository were trained on **simulated** student records that follow UI's 4.0 grading rules. No real student data was used. The accuracy figures show how well the method works on data that follows those rules; the models must be retrained on real, approved records before the system is used for real decisions.

## What is inside

| Folder | What it holds |
|---|---|
| `ml/` | `generate_data.py` (simulated dataset), `train.py` (trains and compares 4 models at 3 stages), `make_figures.py` (charts for the report), `data/` |
| `backend/` | FastAPI app (`app/`), saved models (`models/`), tests (`tests/`), sample cohort CSV (`sample_data/`) |
| `frontend/` | React (Vite) web app |
| `docs/` | Design diagrams, screenshots and the scripts that built the proposal and report |

## Results (test set, 20% of 4,000 simulated records)

| Stage | Best model | Accuracy | Macro F1 |
|---|---|---|---|
| End of 100 Level | Random Forest | 74.1% | 0.638 |
| End of 200 Level | Random Forest | 85.3% | 0.799 |
| End of 300 Level | Random Forest | 92.8% | 0.893 |

Full metrics for all four models (Logistic Regression, Decision Tree, Random Forest, Gradient Boosting) are in `backend/models/metrics.json`.

## Running it on your computer

You need **Python 3.11+** and **Node.js 18+**.

```bash
# 1. backend
cd backend
python -m venv .venv
# Windows: .venv\Scripts\activate     macOS/Linux: source .venv/bin/activate
pip install -r requirements.txt

# 2. frontend (build once)
cd ../frontend
npm install
npm run build

# 3. start everything (the API also serves the built web app)
cd ../backend
uvicorn app.main:app --port 8000
```

Open http://localhost:8000 and log in with a demo account (password `demo1234`):

- Student: `student@classpredict.demo`
- Adviser: `adviser@classpredict.demo`

To register a new adviser account you need the adviser access code (default `UI-ADVISER-2026`, change it with the `CLASSPREDICT_ADVISER_CODE` environment variable). Set `CLASSPREDICT_SECRET` to a long random value before deploying.

For frontend development with hot reload, run the API on port 8000 and `npm run dev` in `frontend/` (Vite forwards `/api` to the API), then open http://localhost:5173.

API documentation is available at http://localhost:8000/docs once the server is running.

## Trying the cohort upload

Log in as the adviser, open **Cohort upload** and upload `backend/sample_data/demo_cohort_csc.csv` (44 simulated students plus 2 rows with deliberate errors). Use **Download CSV template** to see the expected columns:

```
matric_no,faculty,entry_mode,utme_score,olevel_points,carryovers,gpa_100_1,gpa_100_2,gpa_200_1,gpa_200_2,gpa_300_1,gpa_300_2
```

Leave 100 Level GPAs and the UTME score blank for Direct Entry students.

## Retraining the models

```bash
cd ml
pip install -r requirements.txt
python generate_data.py --n 4000 --seed 476   # or replace data/simulated_ui_students.csv with real records in the same format
python train.py                                # about 5 minutes; writes backend/models/
python make_figures.py
```

If the saved models fail to load because of a different scikit-learn version, just run `python train.py` again.

## Tests

```bash
cd backend
python -m pytest -v
```

18 functional tests cover registration and login, stage selection, input validation, Direct Entry students, the target-GPA calculator, history, role checks and cohort uploads.

## Tech stack

Python, scikit-learn, pandas, FastAPI, SQLAlchemy + SQLite, PyJWT, React 18, Vite, React Router, Recharts.
