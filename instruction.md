# Local Repository Setup Instructions

This document provides step-by-step instructions to set up the Buggi developer workspace on a local Windows machine. Follow these steps to configure the C++ compiler toolchain, Rust compiler, Node.js environment, and Python backend.

---

## Prerequisites & Installation

### 1. Install C++ Developer Build Tools
Tauri requires the MSVC (Microsoft Visual C++) compiler toolchain to compile the desktop shell.
1. Download the [Visual Studio Installer](https://visualstudio.microsoft.com/visual-cpp-build-tools/).
2. Launch the installer and select **Desktop development with C++** under the Workloads tab.
3. Ensure the following individual components are selected:
   * **MSVC v143 - VS 2022 C++ x64/x86 build tools** (or latest version)
   * **Windows 10 SDK** (or Windows 11 SDK depending on your OS)
4. Click **Install** and wait for the process to complete (requires a system restart).

### 2. Install Rust
Tauri's backend core is written in Rust.
1. Download and run `rustup-init.exe` from [rustup.rs](https://rustup.rs/).
2. In the terminal prompt, choose the default installation (Option 1). This installs the stable Rust compiler toolchain (`rustc`, `cargo`, and `rustup`).
3. Verify the installation by restarting your terminal and running:
   ```powershell
   rustc --version
   cargo --version
   ```

### 3. Install Node.js
The desktop frontend is powered by Next.js.
1. Download the LTS version of Node.js from [nodejs.org](https://nodejs.org/).
2. Run the installer and proceed with the default options.
3. Verify the installation:
   ```powershell
   node --version
   npm --version
   ```

### 4. Install Python
The application server uses FastAPI.
1. Download Python 3.10+ from [python.org](https://www.python.org/downloads/).
2. Run the installer and **ensure you check the box that says "Add Python to PATH"** before clicking install.
3. Verify the installation:
   ```powershell
   python --version
   pip --version
   ```

---

## Workspace Setup

### 1. Clone and Navigate to the Repository
Open a PowerShell terminal and run:
```powershell
git clone <repository-url>
cd buggi
```

### 2. Run Workspace Installer
Install all Node modules (root workspace and frontend) and Python packages concurrently using the workspace script:
```powershell
npm run install:all
```
This script automates:
* Root devDependencies installation.
* `frontend/node_modules/` installation.
* Python package installations via `pip` (`fastapi`, `uvicorn`, `sqlalchemy`, `pydantic`, `websockets`, `pytest`).

---

## Running the Application

To compile the Rust desktop client and start the Next.js and FastAPI servers concurrently:
```powershell
npm run dev
```

* **FastAPI Server**: Running on `http://127.0.0.1:8000`
* **Next.js Dev Server**: Running on `http://localhost:3000`
* **Tauri Client**: Compiles debug targets in `src-tauri/target/debug/` and launches the desktop app window.

---

## Troubleshooting

### EADDRINUSE (Address already in use)
If you encounter port conflicts on 3000 or 8000 when starting the dev servers, close any orphaned node/python instances:
```powershell
Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }
Get-NetTCPConnection -LocalPort 8000 -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }
```

### Missing C++ Compiler Linkage
If Cargo throws compiler errors pointing to missing linkers or SDK libraries:
1. Open the Visual Studio Installer.
2. Select **Modify** on your Build Tools installation.
3. Verify that the **Windows 10/11 SDK** is checked, and reinstall/update if necessary.
