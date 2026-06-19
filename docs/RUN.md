# Buggi V1 Foundation - Run Instructions

Buggi consists of a FastAPI backend (SQLite, background queue, simulation engine) and a Next.js + Tailwind CSS frontend packaged as a desktop client using Tauri.

---

## Prerequisites

Ensure you have the following installed on your system:
* **Python 3.8+**
* **Node.js v18+** & **npm**
* **Rust & Cargo** (Required to compile Tauri desktop wrappers)

---

## 1. Backend Setup

From the project root directory, install python dependencies and launch the backend server:

```bash
# Install required libraries
pip install fastapi uvicorn sqlalchemy pydantic websockets pytest

# Start the FastAPI server on localhost:8000
python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload
```

* The SQLite database file `backend/buggi.db` will be initialized automatically on startup.
* The pre-seeded program profiles (Google VRP, GitHub, Shopify, Generic Web App) will be automatically loaded on startup.
* The API will be accessible at [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs) (Swagger documentation).

---

## 2. Frontend Setup

In a new terminal, install frontend dependencies and run the Next.js development server:

```bash
# Navigate to frontend folder
cd frontend

# Install Node dependencies
npm install

# Run dev server on localhost:3000
npm run dev
```

* The Next.js dashboard will be accessible at [http://localhost:3000](http://localhost:3000) for testing inside standard browsers.

---

## 3. Desktop Tauri Client Execution

In another terminal at the project root directory, compile and launch the dual-window Tauri wrapper:

```bash
# Install root workspace CLI tools
npm install

# Run the Tauri application in developer mode
npm run tauri:dev
```

* Upon launch:
  1. The borderless, transparent **Buggi Pet Widget** will appear at the center of your desktop screen.
  2. Clicking on the mascot will immediately reveal and focus the **Cybersecurity Command Center** dashboard window.
  3. Launching scans from the "Scans" console will update the pet's animations in real-time between scanning, thinking, and alert states.
  4. Reports will be written locally to `/reports` and raw traffic logs under `/artifacts`.
