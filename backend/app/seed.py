"""Creates two demo accounts on first run so the system can be tried at once.
   student@classpredict.demo / demo1234   (student)
   adviser@classpredict.demo / demo1234   (academic adviser)"""
from .database import SessionLocal, User
from .security import hash_password

DEMO = [("Tolu Adeyemi (Demo Student)", "student@classpredict.demo", "student"),
        ("Dr. Funmi Okafor (Demo Adviser)", "adviser@classpredict.demo", "adviser")]


def seed_demo():
    with SessionLocal() as db:
        for name, email, role in DEMO:
            if not db.query(User).filter_by(email=email).first():
                db.add(User(full_name=name, email=email, password_hash=hash_password("demo1234"), role=role))
        db.commit()
