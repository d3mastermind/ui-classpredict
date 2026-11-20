from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..database import Faculty, Prediction, PredictionProbability, SemesterResult, Student, User, get_db
from ..predictor import GPA_KEYS, get_predictor, target_gpas
from ..schemas import CalculatorIn, StudentInput
from ..security import current_user

router = APIRouter(prefix="/api", tags=["prediction"])
LEVEL_SEM = {k: (int(k.split("_")[1]), int(k.split("_")[2])) for k in GPA_KEYS}


def save_student(db: Session, data: StudentInput, student: Student = None, **extra) -> Student:
    fac = db.query(Faculty).filter_by(name=data.faculty).one()
    if student is None:
        student = Student(**extra)
        db.add(student)
    student.matric_no = data.matric_no
    student.faculty_id = fac.faculty_id
    student.entry_mode = data.entry_mode
    student.utme_score = data.utme_score
    student.olevel_points = data.olevel_points
    student.carryovers = data.carryovers
    student.results.clear()
    db.flush()
    for k in GPA_KEYS:
        v = getattr(data, k)
        if v is not None:
            lvl, sem = LEVEL_SEM[k]
            student.results.append(SemesterResult(level=lvl, semester=sem, gpa=v))
    db.flush()
    return student


def save_prediction(db: Session, student: Student, res: dict, user: User) -> Prediction:
    p = Prediction(student_id=student.student_id, stage=res["stage"], model_name=res["model_name"],
                   predicted_class=res["predicted_class"], confidence=res["confidence"],
                   cgpa_so_far=res["cgpa_so_far"], created_by=user.user_id)
    for c, pr in res["probabilities"].items():
        p.probabilities.append(PredictionProbability(class_label=c, probability=pr))
    db.add(p)
    db.flush()
    return p


@router.post("/predict")
def predict(body: StudentInput, user: User = Depends(current_user), db: Session = Depends(get_db)):
    res = get_predictor().predict(body.model_dump())
    if res["stage"] == 0:
        raise HTTPException(422, res["message"])
    if user.role == "student":
        student = save_student(db, body, user.student, user_id=user.user_id)
    else:
        student = save_student(db, body)
    p = save_prediction(db, student, res, user)
    db.commit()
    res["prediction_id"] = p.prediction_id
    return res


@router.post("/calculator")
def calculator(body: CalculatorIn, user: User = Depends(current_user)):
    return {"current_cgpa": body.current_cgpa, "targets": target_gpas(body.current_cgpa, body.units_completed, body.units_remaining)}


@router.get("/predictions/me")
def history(user: User = Depends(current_user), db: Session = Depends(get_db)):
    q = db.query(Prediction).filter(Prediction.created_by == user.user_id).order_by(Prediction.created_at.desc()).limit(50)
    return [{"prediction_id": p.prediction_id, "created_at": p.created_at.isoformat(), "stage": p.stage,
             "model_name": p.model_name, "predicted_class": p.predicted_class, "confidence": p.confidence,
             "cgpa_so_far": p.cgpa_so_far, "matric_no": p.student.matric_no,
             "probabilities": {pp.class_label: pp.probability for pp in p.probabilities}} for p in q]


@router.get("/profile")
def profile(user: User = Depends(current_user)):
    s = user.student
    if not s:
        return None
    out = {"matric_no": s.matric_no, "faculty": s.faculty.name, "entry_mode": s.entry_mode,
           "utme_score": s.utme_score, "olevel_points": s.olevel_points, "carryovers": s.carryovers}
    for r in s.results:
        out[f"gpa_{r.level}_{r.semester}"] = r.gpa
    return out
