"""Cohort upload for advisers: read a CSV, predict every valid row, flag students at risk."""
import csv
import io

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from fastapi.responses import PlainTextResponse
from pydantic import ValidationError
from sqlalchemy.orm import Session

from ..database import BatchUpload, Prediction, Student, User, get_db
from ..predictor import get_predictor
from ..schemas import StudentInput
from ..security import adviser_only
from .predict import save_prediction, save_student

router = APIRouter(prefix="/api/batch", tags=["batch"])
COLUMNS = ["matric_no", "faculty", "entry_mode", "utme_score", "olevel_points", "carryovers",
           "gpa_100_1", "gpa_100_2", "gpa_200_1", "gpa_200_2", "gpa_300_1", "gpa_300_2"]
TEMPLATE = ",".join(COLUMNS) + "\n" + "\n".join([
    "CSC/2023/001,Science,UTME,256,22,0,3.41,3.55,3.62,3.48,3.70,3.66",
    "CSC/2023/002,Science,UTME,214,17,4,1.92,2.05,1.88,1.74,1.95,1.80",
    "CSC/2024/101,Science,DE,,20,1,,,2.85,3.02,3.10,3.21",
]) + "\n"
MAX_ROWS = 2000


def risk_level(res: dict) -> str:
    third = res["probabilities"].get("Third Class", 0)
    if res["predicted_class"] == "Third Class":
        return "High"
    if third >= 0.25:
        return "Watch"
    return "Low"


def clean(v):
    v = (v or "").strip()
    return None if v == "" else v


@router.get("/template", response_class=PlainTextResponse)
def template():
    return PlainTextResponse(TEMPLATE, headers={"Content-Disposition": "attachment; filename=classpredict_template.csv"})


@router.post("")
async def upload(file: UploadFile = File(...), user: User = Depends(adviser_only), db: Session = Depends(get_db)):
    if not file.filename.lower().endswith(".csv"):
        raise HTTPException(400, "Please upload a .csv file. You can download the template to see the format.")
    raw = await file.read()
    try:
        text = raw.decode("utf-8-sig")
    except UnicodeDecodeError:
        raise HTTPException(400, "The file could not be read. Save it as CSV (UTF-8) and try again.")
    reader = csv.DictReader(io.StringIO(text))
    missing = [c for c in COLUMNS if c not in (reader.fieldnames or [])]
    if missing:
        raise HTTPException(400, f"The file is missing these columns: {', '.join(missing)}.")
    rows = list(reader)
    if not rows:
        raise HTTPException(400, "The file has no student rows.")
    if len(rows) > MAX_ROWS:
        raise HTTPException(400, f"Please upload at most {MAX_ROWS} students at a time.")

    batch = BatchUpload(uploaded_by=user.user_id, file_name=file.filename, row_count=0)
    db.add(batch)
    db.flush()
    pred = get_predictor()
    results, errors = [], []
    for i, r in enumerate(rows, start=2):           # row 1 is the header
        try:
            data = StudentInput(**{c: clean(r.get(c)) for c in COLUMNS})
        except ValidationError as e:
            msg = "; ".join((f"{err['loc'][0]}: " if err.get("loc") else "") + err["msg"].replace("Value error, ", "")
                            for err in e.errors())
            errors.append({"row": i, "matric_no": r.get("matric_no"), "error": msg})
            continue
        res = pred.predict(data.model_dump())
        if res["stage"] == 0:
            errors.append({"row": i, "matric_no": data.matric_no, "error": res["message"]})
            continue
        s = save_student(db, data, batch_id=batch.batch_id)
        save_prediction(db, s, res, user)
        results.append({"row": i, "matric_no": data.matric_no, "faculty": data.faculty, "entry_mode": data.entry_mode,
                        "stage": res["stage"], "cgpa_so_far": res["cgpa_so_far"],
                        "predicted_class": res["predicted_class"], "confidence": res["confidence"],
                        "probabilities": res["probabilities"], "risk": risk_level(res)})
    batch.row_count = len(results)
    db.commit()
    return summarise(batch, results, errors)


def summarise(batch, results, errors):
    classes = get_predictor().classes
    counts = {c: sum(1 for r in results if r["predicted_class"] == c) for c in classes}
    return {"batch_id": batch.batch_id, "file_name": batch.file_name, "created_at": batch.created_at.isoformat(),
            "processed": len(results), "errors": errors, "class_counts": counts,
            "at_risk": sum(1 for r in results if r["risk"] != "Low"), "results": results}


@router.get("")
def list_batches(user: User = Depends(adviser_only), db: Session = Depends(get_db)):
    q = db.query(BatchUpload).filter_by(uploaded_by=user.user_id).order_by(BatchUpload.created_at.desc())
    return [{"batch_id": b.batch_id, "file_name": b.file_name, "row_count": b.row_count,
             "created_at": b.created_at.isoformat()} for b in q]


@router.get("/{batch_id}")
def get_batch(batch_id: int, user: User = Depends(adviser_only), db: Session = Depends(get_db)):
    b = db.get(BatchUpload, batch_id)
    if not b or b.uploaded_by != user.user_id:
        raise HTTPException(404, "Batch not found.")
    results = []
    for s in b.students:
        p = max(s.predictions, key=lambda x: x.prediction_id)
        res = {"predicted_class": p.predicted_class,
               "probabilities": {pp.class_label: pp.probability for pp in p.probabilities}}
        results.append({"matric_no": s.matric_no, "faculty": s.faculty.name, "entry_mode": s.entry_mode,
                        "stage": p.stage, "cgpa_so_far": p.cgpa_so_far, "predicted_class": p.predicted_class,
                        "confidence": p.confidence, "probabilities": res["probabilities"], "risk": risk_level(res)})
    return summarise(b, results, [])
