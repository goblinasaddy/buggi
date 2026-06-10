import os

# Define base paths
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PROJECT_ROOT = os.path.dirname(BASE_DIR)

# SQLite Database Settings
DATABASE_URL = os.getenv("DATABASE_URL", f"sqlite:///{os.path.join(BASE_DIR, 'buggi.db')}")

# Output Directories
REPORTS_DIR = os.path.join(PROJECT_ROOT, "reports")
ARTIFACTS_DIR = os.path.join(PROJECT_ROOT, "artifacts")

# Ensure output directories exist
os.makedirs(REPORTS_DIR, exist_ok=True)
os.makedirs(ARTIFACTS_DIR, exist_ok=True)

# Application Configuration
APP_NAME = "Buggi"
VERSION = "1.0.0"
DEBUG = True
