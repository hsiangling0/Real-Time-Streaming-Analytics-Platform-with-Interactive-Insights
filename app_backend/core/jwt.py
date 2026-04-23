import os
from fastapi import HTTPException, Header
from jose import jwt, JWTError

SECRET_KEY = os.getenv("SECRET_KEY", "app-secret")
ALGORITHM = "HS256"


def decode_jwt(token: str):
    try:
        return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    except JWTError:
        return None


def get_current_user(authorization: str = Header(None)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid Authorization header")

    token = authorization.split(" ")[1]
    payload = decode_jwt(token)

    if not payload:
        raise HTTPException(status_code=400, detail="Invalid token")

    if "org_id" not in payload:
        raise HTTPException(status_code=403, detail="org_id missing in token")

    return payload
