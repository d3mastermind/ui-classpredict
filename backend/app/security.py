"""Password hashing (salted PBKDF2-SHA256) and JSON Web Tokens."""
import base64
import hashlib
import hmac
import os
from datetime import datetime, timedelta, timezone

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from .database import User, get_db

SECRET = os.getenv("CLASSPREDICT_SECRET", "change-this-secret-in-production")
ADVISER_CODE = os.getenv("CLASSPREDICT_ADVISER_CODE", "UI-ADVISER-2026")
ITERATIONS = 200_000
bearer = HTTPBearer(auto_error=False)


def hash_password(pw: str) -> str:
    salt = os.urandom(16)
    dk = hashlib.pbkdf2_hmac("sha256", pw.encode(), salt, ITERATIONS)
    return f"pbkdf2${ITERATIONS}${base64.b64encode(salt).decode()}${base64.b64encode(dk).decode()}"


def verify_password(pw: str, stored: str) -> bool:
    try:
        _, it, salt, dk = stored.split("$")
        new = hashlib.pbkdf2_hmac("sha256", pw.encode(), base64.b64decode(salt), int(it))
        return hmac.compare_digest(new, base64.b64decode(dk))
    except Exception:
        return False


def make_token(user: User) -> str:
    payload = {"sub": str(user.user_id), "role": user.role,
               "exp": datetime.now(timezone.utc) + timedelta(hours=12)}
    return jwt.encode(payload, SECRET, algorithm="HS256")


def current_user(cred: HTTPAuthorizationCredentials = Depends(bearer), db: Session = Depends(get_db)) -> User:
    if cred is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Please log in first.")
    try:
        data = jwt.decode(cred.credentials, SECRET, algorithms=["HS256"])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Your session has expired. Please log in again.")
    except jwt.InvalidTokenError:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid login token.")
    user = db.get(User, int(data["sub"]))
    if not user:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "User not found.")
    return user


def adviser_only(user: User = Depends(current_user)) -> User:
    if user.role != "adviser":
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Only academic advisers can do this.")
    return user
