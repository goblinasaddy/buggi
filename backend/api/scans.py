from fastapi import APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect, Query
from sqlalchemy.orm import Session
from typing import List, Optional, Dict, Any
from backend.database.db import get_db
from backend.database.models import Scan, ProgramProfile, ScanEvent
from backend.queue.worker import job_queue
from backend.websocket.manager import manager
from pydantic import BaseModel
import datetime

router = APIRouter(prefix="/scans", tags=["Scans"])

class ScanCreateSchema(BaseModel):
    target_url: str
    profile_id: str
    scan_type: str  # "recon", "api", "full"

class ScanResponseSchema(BaseModel):
    id: str
    target_url: str
    profile_id: str
    scan_type: str
    status: str
    created_at: datetime.datetime
    completed_at: Optional[datetime.datetime] = None

    class Config:
        orm_mode = True

class ScanEventResponseSchema(BaseModel):
    id: str
    scan_id: str
    event_type: str
    agent: str
    message: str
    payload: Optional[Dict[str, Any]] = None
    created_at: datetime.datetime

    class Config:
        orm_mode = True

@router.post("/", response_model=ScanResponseSchema)
async def create_scan(scan_in: ScanCreateSchema, db: Session = Depends(get_db)):
    """Create a new scan job and place it in the background execution queue."""
    # Check if profile exists
    profile = db.query(ProgramProfile).filter(ProgramProfile.id == scan_in.profile_id).first()
    if not profile:
        raise HTTPException(status_code=400, detail="Invalid program profile ID")

    # Create scan
    db_scan = Scan(
        target_url=scan_in.target_url,
        profile_id=scan_in.profile_id,
        scan_type=scan_in.scan_type,
        status="pending"
    )
    db.add(db_scan)
    db.commit()
    db.refresh(db_scan)

    # Queue background task
    await job_queue.enqueue(db_scan.id)
    
    # Broadcast general pet update that scan is pending
    await manager.broadcast({
        "type": "scan_state_change",
        "scan_id": db_scan.id,
        "status": "pending",
        "message": f"Scan created for {db_scan.target_url}"
    })

    return db_scan

@router.get("/", response_model=List[ScanResponseSchema])
def list_scans(db: Session = Depends(get_db)):
    """Retrieve all scans."""
    return db.query(Scan).order_by(Scan.created_at.desc()).all()

@router.get("/{scan_id}", response_model=ScanResponseSchema)
def get_scan(scan_id: str, db: Session = Depends(get_db)):
    """Retrieve specific scan configuration and status."""
    scan = db.query(Scan).filter(Scan.id == scan_id).first()
    if not scan:
        raise HTTPException(status_code=404, detail="Scan not found")
    return scan

@router.get("/{scan_id}/events", response_model=List[ScanEventResponseSchema])
def get_scan_events(scan_id: str, db: Session = Depends(get_db)):
    """Replay log history for a specific scan."""
    events = db.query(ScanEvent).filter(ScanEvent.scan_id == scan_id).order_by(ScanEvent.created_at.asc()).all()
    return events

# WebSocket Endpoint
@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket, scan_id: str = Query("global")):
    """WebSocket log stream routing clients to a scan channel or global pet monitor."""
    await manager.connect(websocket, scan_id)
    try:
        while True:
            # Read messages if client sends any (not strictly needed for streaming, but keeps connection open)
            data = await websocket.receive_text()
            # Echo back or parse commands if needed
    except WebSocketDisconnect:
        manager.disconnect(websocket, scan_id)
