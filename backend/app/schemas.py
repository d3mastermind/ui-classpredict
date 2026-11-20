from typing import Literal, Optional

from pydantic import BaseModel, Field, field_validator, model_validator

from .database import FACULTIES

GPA = Optional[float]


class RegisterIn(BaseModel):
    full_name: str = Field(min_length=2, max_length=120)
    email: str = Field(min_length=5, max_length=160)
    password: str = Field(min_length=8, max_length=128)
    role: Literal["student", "adviser"] = "student"
    adviser_code: Optional[str] = None

    @field_validator("email")
    @classmethod
    def email_ok(cls, v):
        v = v.strip().lower()
        if "@" not in v or "." not in v.split("@")[-1]:
            raise ValueError("Enter a valid email address.")
        return v


class LoginIn(BaseModel):
    email: str
    password: str


class StudentInput(BaseModel):
    matric_no: Optional[str] = Field(default=None, max_length=30)
    faculty: str
    entry_mode: Literal["UTME", "DE"]
    utme_score: Optional[int] = Field(default=None, ge=180, le=400)
    olevel_points: int = Field(ge=5, le=30)
    carryovers: int = Field(default=0, ge=0, le=60)
    gpa_100_1: GPA = Field(default=None, ge=0, le=4)
    gpa_100_2: GPA = Field(default=None, ge=0, le=4)
    gpa_200_1: GPA = Field(default=None, ge=0, le=4)
    gpa_200_2: GPA = Field(default=None, ge=0, le=4)
    gpa_300_1: GPA = Field(default=None, ge=0, le=4)
    gpa_300_2: GPA = Field(default=None, ge=0, le=4)

    @field_validator("faculty")
    @classmethod
    def faculty_ok(cls, v):
        if v not in FACULTIES:
            raise ValueError(f"Faculty must be one of: {', '.join(FACULTIES)}.")
        return v

    @model_validator(mode="after")
    def mode_rules(self):
        if self.entry_mode == "DE" and (self.gpa_100_1 is not None or self.gpa_100_2 is not None):
            raise ValueError("Direct Entry students do not have 100 Level results. Leave 100 Level blank.")
        if self.entry_mode == "UTME" and self.utme_score is None:
            raise ValueError("Please enter your UTME score.")
        return self


class CalculatorIn(BaseModel):
    current_cgpa: float = Field(ge=0, le=4)
    units_completed: int = Field(ge=1, le=400)
    units_remaining: int = Field(ge=0, le=400)
