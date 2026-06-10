import asyncio
import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.config import APP_NAME, VERSION, DEBUG
from backend.database.db import engine, Base, SessionLocal
from backend.database.models import ProgramProfile
from backend.api import scans, findings, reports, profiles
from backend.queue.worker import background_worker

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("buggi.main")

# Initialize SQLite tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title=APP_NAME,
    version=VERSION,
    debug=DEBUG
)

# Set up CORS middleware for Tauri apps (local hosts)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Tauri apps run on random custom protocols or localhost
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API Routers
app.include_router(profiles.router, prefix="/api")
app.include_router(scans.router, prefix="/api")
app.include_router(findings.router, prefix="/api")
app.include_router(reports.router, prefix="/api")

# Seeding Pre-built Program Profiles
def seed_profiles():
    db = SessionLocal()
    try:
        built_ins = [
            {
                "program_name": "Generic Web App",
                "allowed_tests": ["Recon", "Form Crawl", "API Mapping", "Active Fuzzing", "IDOR Check"],
                "prohibited_tests": ["Denial of Service", "Social Engineering"],
                "common_patterns": {"rate_limit": 10, "auth_header": "Authorization"}
            },
            {
                "program_name": "Google VRP",
                "allowed_tests": ["Subdomain Enum", "XSS Fuzzing", "IDOR Verification", "OAuth Analysis"],
                "prohibited_tests": ["Denial of Service", "Social Engineering", "Brute Force", "Spamming"],
                "common_patterns": {"headers_required": ["X-Google-VRP"]}
            },
            {
                "program_name": "GitHub VRP",
                "allowed_tests": ["Actions Workflow Ingestion", "Repository Permission Audit", "API Endpoint Fuzzing"],
                "prohibited_tests": ["Denial of Service", "Spamming", "Physical Intrusion"],
                "common_patterns": {"scopes_to_test": ["public_repo"]}
            },
            {
                "program_name": "Shopify VRP",
                "allowed_tests": ["OAuth Flow Inspection", "Webhook Spoofing Verification", "REST Endpoint Mapping"],
                "prohibited_tests": ["Brute Force API Gateway", "DDoS Shopify Admin Portal"],
                "common_patterns": {"api_version": "2024-04"}
            }
        ]

        for p in built_ins:
            exists = db.query(ProgramProfile).filter(ProgramProfile.program_name == p["program_name"]).first()
            if not exists:
                profile = ProgramProfile(
                    program_name=p["program_name"],
                    allowed_tests=p["allowed_tests"],
                    prohibited_tests=p["prohibited_tests"],
                    common_patterns=p["common_patterns"]
                )
                db.add(profile)
        db.commit()
        logger.info("Successfully seeded pre-built Program Profiles in database.")
    except Exception as e:
        logger.error(f"Error seeding program profiles: {e}")
    finally:
        db.close()

# Start background queue worker
background_task = None

@app.on_event("startup")
async def startup_event():
    global background_task
    seed_profiles()
    background_task = asyncio.create_task(background_worker())
    logger.info("FastAPI backend application successfully initialized.")

@app.on_event("shutdown")
async def shutdown_event():
    if background_task:
        background_task.cancel()
        logger.info("FastAPI background worker task shutdown completed.")

@app.get("/")
def read_root():
    return {"status": "online", "app": APP_NAME, "version": VERSION}
