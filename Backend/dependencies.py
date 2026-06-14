import os
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer
from jose import jwt

security = HTTPBearer(auto_error=False)
SECRET_KEY = os.environ.get("SECRET_KEY", "super-secret-key")
ALGORITHM = "HS256"


def get_current_user(token=Depends(security)):
    if token is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing or invalid authorization token",
        )
    try:
        payload = jwt.decode(token.credentials, SECRET_KEY, algorithms=[ALGORITHM])
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
        )
    return payload


def require_admin(payload=Depends(get_current_user)):
    role = payload.get("role")
    if role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin privileges required",
        )
    return payload
