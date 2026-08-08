"""Resolution verification (PROVE THE FIX).

Compares before/after evidence via the AI service and produces a
verification confidence + status.
"""
try:
    from services import ai_service
except ImportError:
    import ai_service


def verify_resolution(before_report, resolution):
    """Given the original incident's report and a resolution having an
    after-image/description, return (confidence, verdict)."""
    if not resolution.after_image and not resolution.note:
        return 0.0, "PENDING"

    # Use the original report as 'before' evidence.
    before_desc = before_report.description if before_report else resolution.before_image
    after_desc = resolution.note or ""

    # Classify the after evidence.
    after_cat, after_conf = ai_service.classify_image(
        image_url=resolution.after_image,
        filename=resolution.after_image or "",
    )

    before_conf = before_report.ai_confidence if before_report else 0.5

    confidence = ai_service.verify_before_after(
        before_desc, after_desc, before_conf, after_conf
    )

    if confidence >= 0.7:
        verdict = "LIKELY_RESOLVED"
    elif confidence >= 0.45:
        verdict = "PARTIAL_RESOLUTION"
    else:
        verdict = "INCOMPLETE_RESOLUTION"

    return confidence, verdict
