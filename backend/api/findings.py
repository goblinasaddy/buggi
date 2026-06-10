from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional, Dict, Any
from backend.database.db import get_db
from backend.database.models import Finding
from pydantic import BaseModel
import datetime

router = APIRouter(prefix="/findings", tags=["Findings"])

class FindingResponseSchema(BaseModel):
    id: str
    scan_id: str
    severity: str
    title: str
    status: str
    confidence: float
    target: str
    evidence: Optional[Dict[str, Any]] = None
    timestamp: datetime.datetime

    class Config:
        orm_mode = True

@router.get("/", response_model=List[FindingResponseSchema])
def list_findings(scan_id: Optional[str] = None, db: Session = Depends(get_db)):
    """Retrieve all findings, optionally filtered by a specific scan."""
    query = db.query(Finding)
    if scan_id:
        query = query.filter(Finding.scan_id == scan_id)
    return query.order_by(Finding.timestamp.desc()).all()

@router.get("/{finding_id}", response_model=FindingResponseSchema)
def get_finding(finding_id: str, db: Session = Depends(get_db)):
    """Retrieve detailed info for a single vulnerability finding."""
    finding = db.query(Finding).filter(Finding.id == finding_id).first()
    if not finding:
        raise HTTPException(status_code=404, detail="Finding not found")
    return finding
