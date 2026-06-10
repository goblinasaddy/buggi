from enum import Enum
from pydantic import BaseModel
from typing import Optional, Dict, Any
import datetime

class EventType(str, Enum):
    SYSTEM_INFO = "SYSTEM_INFO"
    SCAN_STARTED = "SCAN_STARTED"
    RECON_STARTED = "RECON_STARTED"
    RECON_HOST_FOUND = "RECON_HOST_FOUND"
    BROWSER_CRAWL_STARTED = "BROWSER_CRAWL_STARTED"
    BROWSER_FORM_DISCOVERED = "BROWSER_FORM_DISCOVERED"
    API_DISCOVERED = "API_DISCOVERED"
    POTENTIAL_VULNERABILITY = "POTENTIAL_VULNERABILITY"
    VULNERABILITY_VERIFIED = "VULNERABILITY_VERIFIED"
    REPORT_GENERATED = "REPORT_GENERATED"
    SCAN_COMPLETED = "SCAN_COMPLETED"
    SCAN_FAILED = "SCAN_FAILED"

class ScanEventSchema(BaseModel):
    scan_id: str
    event_type: EventType
    agent: str
    message: str
    payload: Optional[Dict[str, Any]] = None
    created_at: datetime.datetime = datetime.datetime.utcnow()

    class Config:
        use_enum_values = True
