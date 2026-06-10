from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import PlainTextResponse
from sqlalchemy.orm import Session
from typing import List, Dict, Any
import os
from backend.database.db import get_db
from backend.database.models import Report
from backend.config import REPORTS_DIR, ARTIFACTS_DIR
from pydantic import BaseModel
import datetime

router = APIRouter(prefix="/reports", tags=["Reports"])

class ReportResponseSchema(BaseModel):
    id: str
    scan_id: str
    title: str
    file_path: str
    format: str
    generated_at: datetime.datetime

    class Config:
        orm_mode = True

@router.get("/", response_model=List[ReportResponseSchema])
def list_reports(db: Session = Depends(get_db)):
    """List all vulnerability reports indexed in the database."""
    return db.query(Report).order_by(Report.generated_at.desc()).all()

@router.get("/{report_id}", response_model=ReportResponseSchema)
def get_report(report_id: str, db: Session = Depends(get_db)):
    """Get report metadata."""
    report = db.query(Report).filter(Report.id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    return report

@router.get("/{report_id}/content", response_class=PlainTextResponse)
def get_report_content(report_id: str, db: Session = Depends(get_db)):
    """Retrieve raw Markdown content for viewing in the terminal dashboard."""
    report = db.query(Report).filter(Report.id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
        
    if not os.path.exists(report.file_path):
        raise HTTPException(status_code=404, detail="Report file not found on disk")
        
    with open(report.file_path, "r", encoding="utf-8") as f:
        content = f.read()
    return content

@router.get("/artifacts/list", response_model=List[Dict[str, Any]])
def list_artifacts():
    """List raw scans artifacts from /artifacts directory."""
    if not os.path.exists(ARTIFACTS_DIR):
        return []
    
    files = []
    for filename in os.listdir(ARTIFACTS_DIR):
        filepath = os.path.join(ARTIFACTS_DIR, filename)
        if os.path.isfile(filepath):
            stat = os.stat(filepath)
            files.append({
                "filename": filename,
                "size_bytes": stat.st_size,
                "modified_at": datetime.datetime.fromtimestamp(stat.st_mtime).isoformat()
            })
    return files

@router.get("/artifacts/view/{filename}", response_class=PlainTextResponse)
def get_artifact_content(filename: str):
    """View raw data content of a specific scan artifact (e.g. IDOR logs)."""
    # Simple traversal defense
    safe_filename = os.path.basename(filename)
    filepath = os.path.join(ARTIFACTS_DIR, safe_filename)
    
    if not os.path.exists(filepath):
        raise HTTPException(status_code=404, detail="Artifact not found")
        
    with open(filepath, "r", encoding="utf-8") as f:
        content = f.read()
    return content
