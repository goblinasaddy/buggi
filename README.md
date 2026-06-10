# Buggi - Autonomous Bug Bounty Research Assistant

Buggi is a desktop-resident security research and security validation platform designed to assist security engineers, authorized bug bounty hunters, and internal organization teams in attack surface management and security assessment.

The application integrates a lightweight, transparent desktop pet mascot with a centralized, professional cybersecurity Command Center dashboard.

## Key Features

### 1. Transparent Desktop Mascot (Pet)
* **Visual Mascots**: Features a minimalist glowing cyber bug face housed in a transparent borderless window.
* **Coordinate Persistence**: Listens to window move events and automatically saves coordinates to localStorage, restoring its screen position upon relaunch.
* **Native OS Dragging**: Supports seamless dragging across multiple monitors using mouse movement thresholds to prevent swallowing mouse clicks.
* **Facial Expressions**: Dynamically transitions through state-specific facial expressions (Idle, Thinking, Scanning, Found, Reporting) and animations based on active scanner events.

### 2. Cybersecurity Command Center
* **Unified Workstation Layout**: Consists of a three-column interface optimized for dark-themed environments using custom green and cyan glows.
* **Live console logging**: Connects via WebSockets to the FastAPI backend queue to stream real-time scanner events.
* **Findings and Severity Mapping**: Visualizes verified findings with custom severity-colored borders (Critical/High, Medium, Low) and confidence ratings.
* **CLI Command Bar**: Accepts interactive terminal commands such as "help", "clear", "report", and "scan <url>" to deploy scans on target scopes.

### 3. Desktop Routing & Lifecycle Interceptor
* **Anti-Flicker Window Show**: Suppresses the initial blank white screen during Next.js loading by keeping the window hidden until the dark theme is fully painted.
* **Close Event Interception**: Intercepts the window close request in Rust (Tauri), hiding the window instead of destroying it. This allows the user to repeatedly reopen and focus the Command Center from the desktop pet icon.

---

## Technical Architecture

The platform is divided into three distinct modules:

1.  **Frontend (Next.js & Tailwind)**: Responsible for the layout, mascot visualization, and telemetry rendering.
2.  **Backend (FastAPI & SQLite)**: Manages database transactions, seeds VRP scopes, handles WebSocket notifications, and runs the scanner queue worker.
3.  **Desktop Bridge (Rust & Tauri)**: Interacts with operating system features such as coordinate tracking, native dragging, and window visibility.

```
                  +-----------------------------------+
                  |        Tauri Desktop Shell        |
                  |  (Window Management, Rust APIs)  |
                  +---+---------------------------+---+
                      |                           |
        Localhost API |                           | Websocket/IPC
                      v                           v
+---------------------+-------------+   +---------+-----------------+
|          FastAPI Backend          |   |      Next.js Frontend     |
|   (SQLite, Background Worker)     |   | (Mascot Widget, Dashboard)|
+-----------------------------------+   +---------------------------+
```

---

## Installation and Execution

### Prerequisites
* Rust compiler toolchain
* Node.js (v18+) and npm
* Python (v3.10+)

### Setup
Install all workspace dependencies concurrently:
```bash
npm run install:all
```

### Running the Application
Launch the FastAPI backend, Next.js dev server, and Tauri client concurrently:
```bash
npm run dev
```

---

## Development & Configuration

* **Tauri Config**: Located inside `src-tauri/tauri.conf.json`. Controls transparent windows, always-on-top attributes, and default dimensions.
* **Tailwind & CSS**: Maintained in `frontend/tailwind.config.ts` and `frontend/src/app/globals.css`. Uses the `postcss.config.js` configuration file to compile styles.
* **Rust Backend**: Located inside `src-tauri/src/main.rs`. Implements window events and commands.
* **FastAPI Backend**: Maintained inside the `backend/` directory. seeds VRP profiles into `buggi.db` via SQLAlchemy.