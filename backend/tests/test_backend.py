import pytest
import os
import shutil
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from backend.database.db import Base
from backend.database.models import Scan, ProgramProfile, Finding, Report, ScanEvent
from backend.agents.simulator import SimulatorEngine
from backend.config import REPORTS_DIR, ARTIFACTS_DIR

# Use separate test database
TEST_DB_FILE = "test_buggi.db"
TEST_DATABASE_URL = f"sqlite:///{TEST_DB_FILE}"

@pytest.fixture(scope="module")
def db_session():
    # Setup test engine
    engine = create_engine(TEST_DATABASE_URL, connect_args={"check_same_thread": False})
    Base.metadata.create_all(bind=engine)
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = TestingSessionLocal()
    
    try:
        yield db
    finally:
        db.close()
        Base.metadata.drop_all(bind=engine)
        engine.dispose()
        if os.path.exists(TEST_DB_FILE):
            os.remove(TEST_DB_FILE)

def test_profile_seeding_and_creation(db_session):
    # Test profile creation
    profile = ProgramProfile(
        program_name="Test Profile",
        allowed_tests=["Recon", "IDOR Check"],
        prohibited_tests=["DDoS"]
    )
    db_session.add(profile)
    db_session.commit()
    
    assert profile.id is not None
    assert profile.program_name == "Test Profile"

def test_scan_and_finding_relation(db_session):
    # Retrieve profile
    profile = db_session.query(ProgramProfile).filter(ProgramProfile.program_name == "Test Profile").first()
    
    # Test scan creation
    scan = Scan(
        target_url="http://test-target.local",
        profile_id=profile.id,
        scan_type="full",
        status="pending"
    )
    db_session.add(scan)
    db_session.commit()
    
    # Test finding creation linked to scan
    finding = Finding(
        scan_id=scan.id,
        severity="medium",
        title="Reflected XSS on /search",
        status="potential",
        confidence=0.7,
        target="http://test-target.local/search?q=test"
    )
    db_session.add(finding)
    db_session.commit()
    
    # Verify relations
    assert len(scan.findings) == 1
    assert scan.findings[0].title == "Reflected XSS on /search"
    assert scan.findings[0].severity == "medium"

def test_simulator_execution(db_session):
    import asyncio
    
    # Seed program profile
    profile = ProgramProfile(
        program_name="Simulate Target Profile",
        allowed_tests=["API Mapping"],
        prohibited_tests=["DoS"]
    )
    db_session.add(profile)
    db_session.commit()

    # Create scan run
    scan = Scan(
        target_url="http://sandbox.example.com",
        profile_id=profile.id,
        scan_type="api",
        status="pending"
    )
    db_session.add(scan)
    db_session.commit()

    # Execute simulation inside event loop
    async def run_sim():
        simulator = SimulatorEngine(db_session, scan.id)
        await simulator.run()
        
    asyncio.run(run_sim())

    # Query DB to check changes made by simulation
    db_session.refresh(scan)
    assert scan.status == "completed"
    
    # Verify findings were created
    findings = db_session.query(Finding).filter(Finding.scan_id == scan.id).all()
    assert len(findings) > 0
    assert findings[0].severity == "high"
    
    # Verify report was created
    report = db_session.query(Report).filter(Report.scan_id == scan.id).first()
    assert report is not None
    assert "report_" in report.file_path
    
    # Verify events were logged
    events = db_session.query(ScanEvent).filter(ScanEvent.scan_id == scan.id).all()
    assert len(events) > 0
    
    # Clean up generated files if any
    for root, dirs, files in os.walk(REPORTS_DIR):
        for f in files:
            if scan.id in f or "sandbox_example_com" in f:
                try:
                    os.remove(os.path.join(root, f))
                except Exception:
                    pass
                
    for root, dirs, files in os.walk(ARTIFACTS_DIR):
        for f in files:
            if scan.id in f:
                try:
                    os.remove(os.path.join(root, f))
                except Exception:
                    pass
