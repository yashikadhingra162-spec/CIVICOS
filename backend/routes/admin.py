import os
import time
import hmac
import json
import base64
import hashlib
from fastapi import APIRouter, Request, Response, HTTPException
from pydantic import BaseModel

router = APIRouter(prefix="/admin", tags=["admin"])

# The plaintext password is never shipped to the browser. Prefer setting
# CIVICOS_ADMIN_PASSWORD in Vercel; the hash fallback keeps the requested
# password working until that environment variable is configured.
DEFAULT_PASSWORD_SHA256 = "eb297a3bf1d272dc25a3e8aa6216f62b48ffb449553f34140b648a74d0c6753e"
SESSION_SECRET = os.getenv("CIVICOS_ADMIN_SESSION_SECRET", DEFAULT_PASSWORD_SHA256)
SESSION_TTL_SECONDS = 12 * 60 * 60
COOKIE_NAME = "civicos_admin_session"

class LoginBody(BaseModel):
    password: str

def _b64(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).decode().rstrip("=")

def _unb64(value: str) -> bytes:
    return base64.urlsafe_b64decode(value + "=" * (-len(value) % 4))

def _expected_password_hash() -> str:
    configured = os.getenv("CIVICOS_ADMIN_PASSWORD")
    if configured:
        return hashlib.sha256(configured.encode()).hexdigest()
    return DEFAULT_PASSWORD_SHA256

def _make_token() -> str:
    payload = _b64(json.dumps({"admin": True, "exp": int(time.time()) + SESSION_TTL_SECONDS}, separators=(",", ":")).encode())
    signature = hmac.new(SESSION_SECRET.encode(), payload.encode(), hashlib.sha256).hexdigest()
    return f"{payload}.{signature}"

def _valid_token(token: str | None) -> bool:
    if not token or "." not in token:
        return False
    payload, signature = token.rsplit(".", 1)
    expected = hmac.new(SESSION_SECRET.encode(), payload.encode(), hashlib.sha256).hexdigest()
    if not hmac.compare_digest(signature, expected):
        return False
    try:
        data = json.loads(_unb64(payload))
        return bool(data.get("admin")) and int(data.get("exp", 0)) > int(time.time())
    except Exception:
        return False

@router.post("/login")
def login(body: LoginBody, response: Response):
    supplied = hashlib.sha256(body.password.encode()).hexdigest()
    if not hmac.compare_digest(supplied, _expected_password_hash()):
        raise HTTPException(status_code=401, detail="Incorrect password")
    response.set_cookie(COOKIE_NAME, _make_token(), httponly=True, secure=True, samesite="lax", max_age=SESSION_TTL_SECONDS, path="/")
    return {"ok": True}

@router.get("/session")
def session(request: Request):
    return {"authenticated": _valid_token(request.cookies.get(COOKIE_NAME))}

@router.post("/logout")
def logout(response: Response):
    response.delete_cookie(COOKIE_NAME, path="/")
    return {"ok": True}
