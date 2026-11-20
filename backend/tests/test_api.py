"""Functional tests for the ClassPredict API.  Run from the backend folder:  python -m pytest -v"""
import os
import tempfile

os.environ["CLASSPREDICT_DB"] = "sqlite:///" + os.path.join(tempfile.mkdtemp(), "test.db")

from fastapi.testclient import TestClient  # noqa: E402

from app.main import app  # noqa: E402

GOOD = {"faculty": "Science", "entry_mode": "UTME", "utme_score": 256, "olevel_points": 22, "carryovers": 0,
        "gpa_100_1": 3.41, "gpa_100_2": 3.55, "gpa_200_1": 3.62, "gpa_200_2": 3.48, "gpa_300_1": 3.70, "gpa_300_2": 3.66}


def client():
    c = TestClient(app)
    c.__enter__()
    return c


C = client()


def login(email="student@classpredict.demo"):
    r = C.post("/api/auth/login", json={"email": email, "password": "demo1234"})
    return {"Authorization": f"Bearer {r.json()['token']}"}


def test_tc01_register_student():
    r = C.post("/api/auth/register", json={"full_name": "Test Student", "email": "t1@example.com", "password": "password123"})
    assert r.status_code == 200 and r.json()["user"]["role"] == "student"


def test_tc02_duplicate_email_rejected():
    r = C.post("/api/auth/register", json={"full_name": "Test Student", "email": "t1@example.com", "password": "password123"})
    assert r.status_code == 409


def test_tc03_adviser_needs_code():
    r = C.post("/api/auth/register", json={"full_name": "Xy Adviser", "email": "adv@example.com", "password": "password123", "role": "adviser"})
    assert r.status_code == 403


def test_tc04_wrong_password():
    r = C.post("/api/auth/login", json={"email": "student@classpredict.demo", "password": "wrong-pass"})
    assert r.status_code == 401


def test_tc05_predict_needs_login():
    assert C.post("/api/predict", json=GOOD).status_code == 401


def test_tc06_stage3_prediction():
    r = C.post("/api/predict", json=GOOD, headers=login())
    d = r.json()
    assert r.status_code == 200 and d["stage"] == 3
    assert abs(sum(d["probabilities"].values()) - 1) < 0.01
    assert d["predicted_class"] in d["probabilities"]


def test_tc07_stage2_and_stage1_selected():
    h = login()
    s2 = {k: v for k, v in GOOD.items() if not k.startswith("gpa_300")}
    s1 = {k: v for k, v in s2.items() if not k.startswith("gpa_200")}
    assert C.post("/api/predict", json=s2, headers=h).json()["stage"] == 2
    assert C.post("/api/predict", json=s1, headers=h).json()["stage"] == 1


def test_tc08_gpa_out_of_range():
    bad = dict(GOOD, gpa_200_1=4.5)
    assert C.post("/api/predict", json=bad, headers=login()).status_code == 422


def test_tc09_direct_entry_with_100l_rejected():
    bad = dict(GOOD, entry_mode="DE", utme_score=None)
    assert C.post("/api/predict", json=bad, headers=login()).status_code == 422


def test_tc10_direct_entry_prediction():
    de = {k: v for k, v in GOOD.items() if not k.startswith("gpa_100")}
    de.update(entry_mode="DE", utme_score=None)
    d = C.post("/api/predict", json=de, headers=login()).json()
    assert d["stage"] == 3


def test_tc11_not_enough_results():
    few = {k: v for k, v in GOOD.items() if not k.startswith("gpa_")}
    assert C.post("/api/predict", json=few, headers=login()).status_code == 422


def test_tc12_calculator():
    r = C.post("/api/calculator", json={"current_cgpa": 2.80, "units_completed": 126, "units_remaining": 42}, headers=login())
    t = {x["class"]: x for x in r.json()["targets"]}
    assert t["First Class"]["status"] == "out_of_reach"          # needs 5.60
    assert t["Second Class Upper"]["required_gpa"] == 3.6        # (3*168 - 2.8*126)/42 = 3.6
    assert t["Second Class Lower"]["status"] == "secured"


def test_tc13_history_saved():
    r = C.get("/api/predictions/me", headers=login())
    assert r.status_code == 200 and len(r.json()) >= 4


def test_tc14_student_cannot_upload():
    files = {"file": ("c.csv", b"x", "text/csv")}
    assert C.post("/api/batch", files=files, headers=login()).status_code == 403


def test_tc15_batch_upload():
    h = login("adviser@classpredict.demo")
    tpl = C.get("/api/batch/template", headers=h).text
    bad_row = "CSC/2023/009,Science,UTME,230,18,0,2.1,2.2,9.9,2.0,2.1,2.3\n"
    r = C.post("/api/batch", files={"file": ("cohort.csv", (tpl + bad_row).encode(), "text/csv")}, headers=h)
    d = r.json()
    assert r.status_code == 200 and d["processed"] == 3 and len(d["errors"]) == 1


def test_tc16_wrong_file_type():
    h = login("adviser@classpredict.demo")
    r = C.post("/api/batch", files={"file": ("cohort.xlsx", b"abc", "application/octet-stream")}, headers=h)
    assert r.status_code == 400


def test_tc17_missing_columns():
    h = login("adviser@classpredict.demo")
    r = C.post("/api/batch", files={"file": ("c.csv", b"matric_no,faculty\nA,Science\n", "text/csv")}, headers=h)
    assert r.status_code == 400 and "missing" in r.json()["detail"]


def test_tc18_model_metrics_public():
    r = C.get("/api/model/metrics")
    assert r.status_code == 200 and set(r.json()["stages"]) == {"1", "2", "3"}
