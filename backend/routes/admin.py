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
    if not _valid_token(request.cookies.get(COOKIE_NAME)):
        raise HTTPException(status_code=401, detail="Administrator authentication required")
    return True

def _supabase_config():
    url = os.getenv("SUPABASE_URL") or os.getenv("VITE_SUPABASE_URL")
    key = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("SUPABASE_PUBLISHABLE_KEY") or os.getenv("SUPABASE_ANON_KEY") or os.getenv("VITE_SUPABASE_PUBLISHABLE_KEY") or os.getenv("VITE_SUPABASE_ANON_KEY")
    if not url or not key:
        raise HTTPException(status_code=503, detail="Admin database integration is not configured on the server")
    return url.rstrip("/"), key

def _supabase_request(path: str, method: str = "GET", payload: dict | None = None, headers: dict | None = None):
    url, key = _supabase_config()
    request = urllib.request.Request(
        f"{url}/rest/v1/{path}",
        data=json.dumps(payload).encode() if payload is not None else None,
        method=method,
        headers={"apikey": key, "Authorization": f"Bearer {key}", "Content-Type": "application/json", "Prefer": "return=representation", **(headers or {})},
    )
    try:
        with urllib.request.urlopen(request, timeout=15) as response:
            raw = response.read().decode() or "[]"
            return json.loads(raw)
    except urllib.error.HTTPError as error:
        detail = error.read().decode(errors="ignore")
        raise HTTPException(status_code=502, detail=f"Supabase request failed: {detail or error.reason}")
    except Exception as error:
        raise HTTPException(status_code=502, detail=f"Unable to reach Supabase: {error}")

def _supabase_patch(report_id: str, payload: dict):
    rows = _supabase_request(f"reports?id=eq.{urllib.parse.quote(str(report_id), safe='')}", method="PATCH", payload=payload)
    if not rows:
        raise HTTPException(status_code=404, detail="Report not found or the configured Supabase policy did not allow the update")
    return rows[0]

def _data_url_to_extension(value: str) -> tuple[str, bytes, str]:
    try:
        header, encoded = value.split(",", 1)
        if not header.startswith("data:") or ";base64" not in header:
            raise ValueError
        mime = header[5:].split(";", 1)[0].strip().lower() or "image/jpeg"
        if not mime.startswith("image/"):
            raise ValueError
        ext = {"image/jpeg": "jpg", "image/jpg": "jpg", "image/png": "png", "image/webp": "webp", "image/gif": "gif"}.get(mime, "jpg")
        return ext, base64.b64decode(encoded, validate=True), mime
    except Exception:
        raise HTTPException(status_code=400, detail="Completion proof must be a valid base64 image")

def _upload_resolution_image(report_id: str, data_url: str) -> str:
    """Upload proof image to the configured public/private Supabase storage bucket."""
    bucket = os.getenv("CIVICOS_REPORTS_BUCKET", "reports")
    ext, raw, mime = _data_url_to_extension(data_url)
    if len(raw) > 4 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Completion proof image must be 4 MB or smaller")
    filename = f"{report_id}/resolution-{int(time.time())}.{ext}"
    url, key = _supabase_config()
    req = urllib.request.Request(
        f"{url}/storage/v1/object/{urllib.parse.quote(bucket, safe='')}/{urllib.parse.quote(filename, safe='/')}",
        data=raw,
        method="POST",
        headers={"apikey": key, "Authorization": f"Bearer {key}", "Content-Type": mime, "x-upsert": "true"},
    )
    try:
        with urllib.request.urlopen(req, timeout=20) as response:
            response.read()
    except urllib.error.HTTPError as error:
        detail = error.read().decode(errors="ignore")
        raise HTTPException(status_code=502, detail=f"Resolution image upload failed: {detail or error.reason}")
    except Exception as error:
        raise HTTPException(status_code=502, detail=f"Unable to upload resolution image: {error}")
    # Prefer a public URL when the bucket is public; for a private bucket the URL is still stored
    # as canonical object location and can be swapped for a signed URL by the API layer later.
    return f"{url}/storage/v1/object/public/{urllib.parse.quote(bucket, safe='')}/{urllib.parse.quote(filename, safe='/')}"

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

@router.patch("/reports/{report_id}/status")
def update_report_status(report_id: str, body: StatusBody, _: bool = Depends(require_admin)):
    status = body.status.strip().lower()
    if status not in VALID_STATUSES:
        raise HTTPException(status_code=400, detail="Invalid report status")
    report = _supabase_patch(report_id, {"status": status})
    return {"ok": True, "report": report, "status": status}

@router.patch("/reports/{report_id}/assign")
def assign_report(report_id: str, body: AssignBody, _: bool = Depends(require_admin)):
    report = _supabase_patch(report_id, {"status": "assigned"})
    return {"ok": True, "report": report, "status": "assigned", "department": body.department}

@router.post("/reports/{report_id}/verify")
def verify_report(report_id: str, body: VerifyBody, _: bool = Depends(require_admin)):
    patch: dict = {"status": "verified"}
    if body.note is not None:
        patch["resolution_note"] = body.note.strip() or None
    if body.after_image:
        image_url = _upload_resolution_image(report_id, body.after_image)
        existing = _supabase_request(f"reports?id=eq.{urllib.parse.quote(str(report_id), safe='')}&select=resolution_image_urls", method="GET")
        current = existing[0].get("resolution_image_urls") if existing else []
        current = current if isinstance(current, list) else []
        patch["resolution_image_urls"] = [*current, image_url]
    report = _supabase_patch(report_id, patch)
    return {"ok": True, "report": report, "status": "verified", "note": body.note or None, "has_after_image": bool(body.after_image), "resolution_image_urls": report.get("resolution_image_urls") or []}
