import os
import time
import hmac
import json
import base64
import hashlib
import urllib.error
import urllib.request
import urllib.parse
from fastapi import APIRouter, Request, Response, HTTPException, Depends
from pydantic import BaseModel

router = APIRouter(prefix="/admin", tags=["admin"])
DEFAULT_PASSWORD_SHA256 = "eb297a3bf1d272dc25a3e8aa6216f62b48ffb449553f34140b648a74d0c6753e"
SESSION_SECRET = os.getenv("CIVICOS_ADMIN_SESSION_SECRET", DEFAULT_PASSWORD_SHA256)
SESSION_TTL_SECONDS = 12 * 60 * 60
COOKIE_NAME = "civicos_admin_session"
VALID_STATUSES = {"pending", "reported", "ai_verified", "prioritized", "assigned", "in_progress", "resolved", "verified", "rejected"}

class LoginBody(BaseModel): password: str
class StatusBody(BaseModel): status: str
class AssignBody(BaseModel): department: str | None = None
class VerifyBody(BaseModel):
    after_image: str | None = None
    note: str | None = None

def _b64(data: bytes) -> str: return base64.urlsafe_b64encode(data).decode().rstrip("=")
def _unb64(value: str) -> bytes: return base64.urlsafe_b64decode(value + "=" * (-len(value) % 4))
def _expected_password_hash() -> str:
    configured = os.getenv("CIVICOS_ADMIN_PASSWORD")
    return hashlib.sha256(configured.encode()).hexdigest() if configured else DEFAULT_PASSWORD_SHA256

def _make_token() -> str:
    payload = _b64(json.dumps({"admin": True, "exp": int(time.time()) + SESSION_TTL_SECONDS}, separators=(",", ":")).encode())
    return f"{payload}.{hmac.new(SESSION_SECRET.encode(), payload.encode(), hashlib.sha256).hexdigest()}"

def _valid_token(token: str | None) -> bool:
    if not token or "." not in token: return False
    payload, signature = token.rsplit(".", 1)
    expected = hmac.new(SESSION_SECRET.encode(), payload.encode(), hashlib.sha256).hexdigest()
    if not hmac.compare_digest(signature, expected): return False
    try:
        data = json.loads(_unb64(payload))
        return bool(data.get("admin")) and int(data.get("exp", 0)) > int(time.time())
    except Exception: return False

def require_admin(request: Request):
    if not _valid_token(request.cookies.get(COOKIE_NAME)): raise HTTPException(status_code=401, detail="Administrator authentication required")
    return True

def _supabase_config():
    url = os.getenv("SUPABASE_URL") or os.getenv("VITE_SUPABASE_URL")
    key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    if not url or not key: raise HTTPException(status_code=503, detail="Admin database integration is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in Vercel.")
    return url.rstrip("/"), key

def _supabase_patch(report_id: str, payload: dict):
    url, key = _supabase_config()
    request = urllib.request.Request(f"{url}/rest/v1/reports?id=eq.{urllib.parse.quote(str(report_id), safe='')}", data=json.dumps(payload).encode(), method="PATCH", headers={"apikey": key, "Authorization": f"Bearer {key}", "Content-Type": "application/json", "Prefer": "return=representation"})
    try:
        with urllib.request.urlopen(request, timeout=10) as response: data = json.loads(response.read().decode() or "[]")
    except urllib.error.HTTPError as error:
        detail = error.read().decode(errors="ignore")
        raise HTTPException(status_code=502, detail=f"Supabase update failed: {detail or error.reason}")
    except Exception as error: raise HTTPException(status_code=502, detail=f"Unable to update CIVICOS report: {error}")
    if not data: raise HTTPException(status_code=404, detail="Report not found")
    return data[0]

@router.post("/login")
def login(body: LoginBody, response: Response):
    supplied = hashlib.sha256(body.password.encode()).hexdigest()
    if not hmac.compare_digest(supplied, _expected_password_hash()): raise HTTPException(status_code=401, detail="Incorrect password")
    response.set_cookie(COOKIE_NAME, _make_token(), httponly=True, secure=True, samesite="lax", max_age=SESSION_TTL_SECONDS, path="/")
    return {"ok": True}
@router.get("/session")
def session(request: Request): return {"authenticated": _valid_token(request.cookies.get(COOKIE_NAME))}
@router.post("/logout")
def logout(response: Response): response.delete_cookie(COOKIE_NAME, path="/"); return {"ok": True}

@router.patch("/reports/{report_id}/status")
def update_report_status(report_id: str, body: StatusBody, _: bool = Depends(require_admin)):
    status = body.status.strip().lower()
    if status not in VALID_STATUSES: raise HTTPException(status_code=400, detail="Invalid report status")
    report = _supabase_patch(report_id, {"status": status})
    return {"ok": True, "report": report, "status": status}
@router.patch("/reports/{report_id}/assign")
def assign_report(report_id: str, body: AssignBody, _: bool = Depends(require_admin)):
    report = _supabase_patch(report_id, {"status": "assigned"})
    return {"ok": True, "report": report, "status": "assigned", "department": body.department}
@router.post("/reports/{report_id}/verify")
def verify_report(report_id: str, body: VerifyBody, _: bool = Depends(require_admin)):
    report = _supabase_patch(report_id, {"status": "verified"})
    return {"ok": True, "report": report, "status": "verified", "note": body.note or None, "has_after_image": bool(body.after_image)}
