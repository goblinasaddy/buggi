from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from backend.database.db import get_db
from backend.database.models import ProgramProfile
from pydantic import BaseModel
import datetime

router = APIRouter(prefix="/profiles", tags=["Program Profiles"])

class ProgramProfileSchema(BaseModel):
    id: str
    program_name: str
    allowed_tests: List[str]
    prohibited_tests: List[str]
    common_patterns: dict = None
    created_at: datetime.datetime

    class Config:
        orm_mode = True

@router.get("/", response_model=List[ProgramProfileSchema])
def list_profiles(db: Session = Depends(get_db)):
    """Retrieve all available program profiles (including built-ins)."""
    return db.query(ProgramProfile).all()

@router.get("/{profile_id}", response_model=ProgramProfileSchema)
def get_profile(profile_id: str, db: Session = Depends(get_db)):
    """Retrieve details for a single profile."""
    profile = db.query(ProgramProfile).filter(ProgramProfile.id == profile_id).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    return profile
