import os
import smtplib
from email.message import EmailMessage
from html import escape
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

router = APIRouter(prefix="/notifications", tags=["notifications"])

class ReportNotification(BaseModel):
    report_id: str | None = None
    title: str = "Civic issue"
    description: str = ""
    category: str | None = None
    severity: str | None = None
    status: str | None = None
    address: str | None = None
    latitude: float | None = None
    longitude: float | None = None
    image_url: str | None = None
    created_at: str | None = None

@router.post("/report")
def notify_report(report: ReportNotification):
    smtp_key = os.getenv("BREVO_SMTP_KEY")
    smtp_login = os.getenv("BREVO_SMTP_LOGIN")
    sender = os.getenv("BREVO_SENDER_EMAIL")
    recipient = os.getenv("CIVICOS_AUTHORITY_EMAIL", "flxcsin@gmail.com")
    if not smtp_key or not smtp_login or not sender:
        raise HTTPException(status_code=500, detail="Brevo email configuration is incomplete")

    subject = f"[CIVICOS] New report: {report.title}"
    def row(label, value):
        return f"<tr><td style='padding:8px;font-weight:600;border-bottom:1px solid #ddd'>{escape(label)}</td><td style='padding:8px;border-bottom:1px solid #ddd'>{escape(str(value or '—'))}</td></tr>"
    html = """<div style='font-family:Arial,sans-serif;max-width:700px;margin:auto'><h2 style='color:#2563eb'>New CIVICOS Report</h2><p>A new civic issue has been reported.</p><table style='width:100%;border-collapse:collapse'>""" + "".join([
        row("Report ID", report.report_id), row("Title", report.title), row("Description", report.description),
        row("Category", report.category), row("Severity", report.severity), row("Status", report.status),
        row("Address", report.address), row("Coordinates", f"{report.latitude}, {report.longitude}"), row("Created", report.created_at),
        row("Image", report.image_url)
    ]) + "</table></div>"

    message = EmailMessage()
    message["Subject"] = subject
    message["From"] = sender
    message["To"] = recipient
    message.set_content(f"New CIVICOS report: {report.title}\n\n{report.description}")
    message.add_alternative(html, subtype="html")
    try:
        with smtplib.SMTP("smtp-relay.brevo.com", 587, timeout=15) as smtp:
            smtp.starttls()
            smtp.login(smtp_login, smtp_key)
            smtp.send_message(message)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Email delivery failed: {str(exc)}")
    return {"sent": True, "recipient": recipient}
