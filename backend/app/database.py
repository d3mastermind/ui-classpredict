"""Database connection and ORM models (SQLAlchemy). The schema is in Third Normal Form:
repeating groups (semester GPAs, class probabilities) live in their own tables and
faculty names live only in the faculties table."""
import os
from datetime import datetime, timezone

from sqlalchemy import (Column, DateTime, Float, ForeignKey, Integer, String,
                        UniqueConstraint, create_engine)
from sqlalchemy.orm import DeclarativeBase, relationship, sessionmaker

DB_URL = os.getenv("CLASSPREDICT_DB", "sqlite:///" + os.path.join(os.path.dirname(__file__), "..", "classpredict.db"))
engine = create_engine(DB_URL, connect_args={"check_same_thread": False} if DB_URL.startswith("sqlite") else {})
SessionLocal = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)


def now():
    return datetime.now(timezone.utc)


class Base(DeclarativeBase):
    pass


class User(Base):
    __tablename__ = "users"
    user_id = Column(Integer, primary_key=True)
    full_name = Column(String(120), nullable=False)
    email = Column(String(160), unique=True, nullable=False, index=True)
    password_hash = Column(String(200), nullable=False)
    role = Column(String(20), nullable=False)          # "student" or "adviser"
    created_at = Column(DateTime, default=now)
    student = relationship("Student", back_populates="user", uselist=False)


class Faculty(Base):
    __tablename__ = "faculties"
    faculty_id = Column(Integer, primary_key=True)
    name = Column(String(80), unique=True, nullable=False)


class BatchUpload(Base):
    __tablename__ = "batch_uploads"
    batch_id = Column(Integer, primary_key=True)
    uploaded_by = Column(Integer, ForeignKey("users.user_id"), nullable=False)
    file_name = Column(String(200))
    row_count = Column(Integer, default=0)
    created_at = Column(DateTime, default=now)
    students = relationship("Student", back_populates="batch")


class Student(Base):
    __tablename__ = "students"
    student_id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.user_id"), unique=True, nullable=True)
    batch_id = Column(Integer, ForeignKey("batch_uploads.batch_id"), nullable=True)
    matric_no = Column(String(30))
    faculty_id = Column(Integer, ForeignKey("faculties.faculty_id"), nullable=False)
    entry_mode = Column(String(10), nullable=False)
    utme_score = Column(Integer, nullable=True)
    olevel_points = Column(Integer, nullable=False)
    carryovers = Column(Integer, default=0)
    user = relationship("User", back_populates="student")
    batch = relationship("BatchUpload", back_populates="students")
    faculty = relationship("Faculty")
    results = relationship("SemesterResult", cascade="all, delete-orphan", order_by="SemesterResult.level, SemesterResult.semester")
    predictions = relationship("Prediction", back_populates="student", cascade="all, delete-orphan")


class SemesterResult(Base):
    __tablename__ = "semester_results"
    __table_args__ = (UniqueConstraint("student_id", "level", "semester"),)
    result_id = Column(Integer, primary_key=True)
    student_id = Column(Integer, ForeignKey("students.student_id"), nullable=False)
    level = Column(Integer, nullable=False)       # 100, 200, 300, 400
    semester = Column(Integer, nullable=False)    # 1 or 2
    gpa = Column(Float, nullable=False)


class Prediction(Base):
    __tablename__ = "predictions"
    prediction_id = Column(Integer, primary_key=True)
    student_id = Column(Integer, ForeignKey("students.student_id"), nullable=False)
    stage = Column(Integer, nullable=False)
    model_name = Column(String(40), nullable=False)
    predicted_class = Column(String(40), nullable=False)
    confidence = Column(Float, nullable=False)
    cgpa_so_far = Column(Float, nullable=False)
    created_by = Column(Integer, ForeignKey("users.user_id"), nullable=False)
    created_at = Column(DateTime, default=now)
    student = relationship("Student", back_populates="predictions")
    probabilities = relationship("PredictionProbability", cascade="all, delete-orphan")


class PredictionProbability(Base):
    __tablename__ = "prediction_probabilities"
    prediction_id = Column(Integer, ForeignKey("predictions.prediction_id"), primary_key=True)
    class_label = Column(String(40), primary_key=True)
    probability = Column(Float, nullable=False)


FACULTIES = ["Science", "Technology", "Social Sciences", "Arts", "Agriculture", "Education",
             "Economics and Management Sciences"]


def init_db():
    Base.metadata.create_all(engine)
    with SessionLocal() as db:
        for name in FACULTIES:
            if not db.query(Faculty).filter_by(name=name).first():
                db.add(Faculty(name=name))
        db.commit()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
