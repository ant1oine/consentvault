"""Export router for CSV and HTML exports."""
import csv
from datetime import datetime
from io import StringIO
from uuid import UUID

from fastapi import APIRouter, Depends, Query, Response, status
from fastapi.responses import HTMLResponse
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.db import Consent, Org, get_db
from app.deps import get_current_org, require_role

router = APIRouter(prefix="/consents", tags=["Export"])


@router.get("/export.csv")
def export_csv(
    org_id: UUID = Query(...),
    subject_id: str | None = Query(None),
    purpose: str | None = Query(None),
    q: str | None = Query(None),
    current_org: Org = Depends(get_current_org),
    _membership = Depends(require_role("viewer")),
    db: Session = Depends(get_db),
):
    """Export consents as CSV."""
    query = db.query(Consent).filter(Consent.org_id == current_org.id)

    if subject_id:
        query = query.filter(Consent.subject_id == subject_id)
    if purpose:
        query = query.filter(Consent.purpose == purpose)
    if q:
        query = query.filter(
            or_(
                Consent.subject_id.ilike(f"%{q}%"),
                Consent.purpose.ilike(f"%{q}%"),
                Consent.text.ilike(f"%{q}%"),
            )
        )

    consents = query.order_by(Consent.accepted_at.desc()).all()

    # Generate CSV
    output = StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "ID", "Subject ID", "Purpose", "Text", "Version Hash",
        "IP", "User Agent", "Accepted At", "Revoked At"
    ])

    for consent in consents:
        writer.writerow([
            str(consent.id),
            consent.subject_id,
            consent.purpose,
            consent.text,
            consent.version_hash,
            str(consent.ip) if consent.ip else "",
            consent.user_agent or "",
            consent.accepted_at.isoformat() if consent.accepted_at else "",
            consent.revoked_at.isoformat() if consent.revoked_at else "",
        ])

    return Response(
        content=output.getvalue(),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=consents.csv"},
    )


@router.get("/export.html", response_class=HTMLResponse)
def export_html(
    org_id: UUID = Query(...),
    subject_id: str | None = Query(None),
    purpose: str | None = Query(None),
    q: str | None = Query(None),
    current_org: Org = Depends(get_current_org),
    _membership = Depends(require_role("viewer")),
    db: Session = Depends(get_db),
):
    """Export consents as print-friendly HTML."""
    query = db.query(Consent).filter(Consent.org_id == current_org.id)

    if subject_id:
        query = query.filter(Consent.subject_id == subject_id)
    if purpose:
        query = query.filter(Consent.purpose == purpose)
    if q:
        query = query.filter(
            or_(
                Consent.subject_id.ilike(f"%{q}%"),
                Consent.purpose.ilike(f"%{q}%"),
                Consent.text.ilike(f"%{q}%"),
            )
        )

    consents = query.order_by(Consent.accepted_at.desc()).all()

    html = """<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Consent Records - {org_name}</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f2f2f2; }
        tr:nth-child(even) { background-color: #f9f9f9; }
        @media print { body { margin: 0; } }
    </style>
</head>
<body>
    <h1>Consent Records - {org_name}</h1>
    <p>Generated: {timestamp}</p>
    <table>
        <thead>
            <tr>
                <th>Subject ID</th>
                <th>Purpose</th>
                <th>Text</th>
                <th>Accepted At</th>
                <th>Revoked At</th>
            </tr>
        </thead>
        <tbody>
""".format(
        org_name=current_org.name,
        timestamp=datetime.now().isoformat(),
    )

    for consent in consents:
        html += f"""
            <tr>
                <td>{consent.subject_id}</td>
                <td>{consent.purpose}</td>
                <td>{consent.text[:100]}...</td>
                <td>{consent.accepted_at.isoformat() if consent.accepted_at else ""}</td>
                <td>{consent.revoked_at.isoformat() if consent.revoked_at else ""}</td>
            </tr>
"""

    html += """
        </tbody>
    </table>
</body>
</html>
"""

    return HTMLResponse(content=html)

