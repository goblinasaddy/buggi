from sqlalchemy import Column, String, Integer, Float, DateTime, ForeignKey, JSON
from sqlalchemy.orm import relationship
import datetime
import uuid
from backend.database.db import Base

def generate_uuid():
    return str(uuid.uuid4())

class ProgramProfile(Base):
    __tablename__ = "program_profiles"

    id = Column(String, primary_key=True, default=generate_uuid)
    program_name = Column(String, nullable=False, unique=True)
    allowed_tests = Column(JSON, nullable=False)  # list of strings
    prohibited_tests = Column(JSON, nullable=False)  # list of strings
    common_patterns = Column(JSON, nullable=True)  # dict or list
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    scans = relationship("Scan", back_populates="profile")


class Scan(Base):
    __tablename__ = "scans"

    id = Column(String, primary_key=True, default=generate_uuid)
    target_url = Column(String, nullable=False)
    profile_id = Column(String, ForeignKey("program_profiles.id"), nullable=False)
    scan_type = Column(String, nullable=False)  # "recon", "api", "full"
    status = Column(String, nullable=False, default="pending")  # "pending", "running", "completed", "failed"
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)

    profile = relationship("ProgramProfile", back_populates="scans")
    findings = relationship("Finding", back_populates="scan", cascade="all, delete-orphan")
    reports = relationship("Report", back_populates="scan", cascade="all, delete-orphan")
    events = relationship("ScanEvent", back_populates="scan", cascade="all, delete-orphan")
    graph_nodes = relationship("ScanGraphNode", back_populates="scan", cascade="all, delete-orphan")
    graph_edges = relationship("ScanGraphEdge", back_populates="scan", cascade="all, delete-orphan")


class ScanEvent(Base):
    __tablename__ = "scan_events"

    id = Column(String, primary_key=True, default=generate_uuid)
    scan_id = Column(String, ForeignKey("scans.id"), nullable=False)
    event_type = Column(String, nullable=False)  # e.g., "RECON_STARTED", "API_DISCOVERED"
    agent = Column(String, nullable=False)  # "Recon", "Browser", "API", etc.
    message = Column(String, nullable=False)
    payload = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    scan = relationship("Scan", back_populates="events")


class ScanGraphNode(Base):
    __tablename__ = "scan_graph_nodes"

    id = Column(String, primary_key=True, default=generate_uuid)
    scan_id = Column(String, ForeignKey("scans.id"), nullable=False)
    type = Column(String, nullable=False)  # "domain", "url", "parameter", "api"
    label = Column(String, nullable=False)
    url = Column(String, nullable=True)
    method = Column(String, nullable=True)
    metadata_json = Column(JSON, nullable=True)  # custom extra info
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    scan = relationship("Scan", back_populates="graph_nodes")


class ScanGraphEdge(Base):
    __tablename__ = "scan_graph_edges"

    id = Column(String, primary_key=True, default=generate_uuid)
    scan_id = Column(String, ForeignKey("scans.id"), nullable=False)
    source_id = Column(String, nullable=False)  # references a ScanGraphNode.id
    target_id = Column(String, nullable=False)  # references a ScanGraphNode.id
    label = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    scan = relationship("Scan", back_populates="graph_edges")


class Finding(Base):
    __tablename__ = "findings"

    id = Column(String, primary_key=True, default=generate_uuid)
    scan_id = Column(String, ForeignKey("scans.id"), nullable=False)
    severity = Column(String, nullable=False)  # "low", "medium", "high", "critical"
    title = Column(String, nullable=False)
    status = Column(String, nullable=False, default="potential")  # "potential", "verified", "false_positive"
    confidence = Column(Float, nullable=False, default=0.5)
    target = Column(String, nullable=False)  # URL or specific endpoint parameter
    evidence = Column(JSON, nullable=True)  # details, e.g., requests/responses
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)

    scan = relationship("Scan", back_populates="findings")


class Report(Base):
    __tablename__ = "reports"

    id = Column(String, primary_key=True, default=generate_uuid)
    scan_id = Column(String, ForeignKey("scans.id"), nullable=False)
    title = Column(String, nullable=False)
    file_path = Column(String, nullable=False)
    format = Column(String, nullable=False)  # "markdown", "json"
    generated_at = Column(DateTime, default=datetime.datetime.utcnow)

    scan = relationship("Scan", back_populates="reports")
