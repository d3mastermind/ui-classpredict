from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..database import User, get_db
from ..schemas import LoginIn, RegisterIn
from ..security import ADVISER_CODE, current_user, hash_password, make_token, verify_password

router = APIRouter(prefix="/api/auth", tags=["auth"])


def user_out(u: User):
    return {"user_id": u.user_id, "full_name": u.full_name, "email": u.email, "role": u.role}


@router.post("/register")
def register(body: RegisterIn, db: Session = Depends(get_db)):
    if body.role == "adviser" and body.adviser_code != ADVISER_CODE:
        raise HTTPException(403, "The adviser access code is not correct. Ask the department for it.")
    if db.query(User).filter_by(email=body.email).first():
        raise HTTPException(409, "An account with this email already exists.")
    u = User(full_name=body.full_name.strip(), email=body.email, password_hash=hash_password(body.password), role=body.role)
    db.add(u)
    db.commit()
    return {"token": make_token(u), "user": user_out(u)}


@router.post("/login")
def login(body: LoginIn, db: Session = Depends(get_db)):
    u = db.query(User).filter_by(email=body.email.strip().lower()).first()
    if not u or not verify_password(body.password, u.password_hash):
        raise HTTPException(401, "Wrong email or password.")
    return {"token": make_token(u), "user": user_out(u)}


@router.get("/me")
def me(user: User = Depends(current_user)):
    return user_out(user)
