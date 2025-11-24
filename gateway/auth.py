# gateway/auth.py
import os
import jwt
from fastapi import Depends, HTTPException, Header
from typing import Optional

JWT_SECRET = os.getenv("JWT_SECRET", "dev-secret-key-change-in-production")

def verify_token(authorization: Optional[str] = Header(None)) -> str:
    """Extract and verify JWT token from Authorization header"""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid Authorization header")
    
    token = authorization[7:]
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
        user_id = payload.get("userId")
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token payload")
        return user_id
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")
