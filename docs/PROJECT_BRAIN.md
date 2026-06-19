# PROJECT_BRAIN.md

## Purpose

This file is the single source of truth for Buggi.

Every AI agent (Antigravity, OpenCode, Claude, Gemini, etc.) must read this file before making changes.

This file tracks:

* Vision
* Architecture
* Decisions
* Progress
* Current State
* Future Roadmap

No agent should infer project goals independently.

---

# PROJECT STATUS

Current Version: V2

State:

* Desktop Pet Implemented
* Command Center Implemented
* FastAPI Backend Implemented
* SQLite Implemented
* WebSocket Streaming Implemented
* Findings Panel Implemented
* Reports System Implemented
* Agent Simulator Implemented

Status:

Functional Prototype

---

# CORE VISION

Buggi is an autonomous security validation platform.

Purpose:

Help organizations discover weaknesses in their systems before attackers do.

Buggi is NOT:

* Malware
* Unauthorized intrusion software
* Credential theft tooling
* Persistence tooling

Buggi IS:

* Security validation
* Attack surface management
* Internal security assessment
* Bug bounty research
* Defensive security tooling

---

# PRODUCT IDENTITY

Mascot:

Buggi

Appearance:

* Black rounded square
* Green glowing eyes
* Small smile
* Cyber glow
* Desktop companion

---

# CURRENT ARCHITECTURE

Frontend:

* Next.js
* Tailwind
* Tauri

Backend:

* FastAPI

Database:

* SQLite

Communication:

* WebSocket

---

# ACTIVE DECISIONS

Decision #001

Use Tauri.

Reason:

Desktop pet experience.

Status:

Approved

---

Decision #002

Use SQLite initially.

Reason:

Reduce complexity.

Status:

Approved

---

Decision #003

UI ownership belongs to Antigravity.

Status:

Approved

---

Decision #004

Backend ownership belongs to OpenCode.

Status:

Approved

---

# AGENT RESPONSIBILITIES

## Antigravity

Responsible for:

* UI
* UX
* Desktop Pet
* Dashboard
* Command Center
* Reports Viewer
* Visualizations

Not responsible for:

* Core backend logic

---

## OpenCode

Responsible for:

* Backend
* Agent Engine
* Memory
* Storage
* Integrations
* Testing
* Architecture

Not responsible for:

* UI redesign

---

# CURRENT PRIORITY

Current Goal:

Transform Buggi from simulator into real security validation platform.

Focus:

* Asset Intelligence
* Agent Framework
* Memory Layer
* Knowledge Layer

---

# CHANGELOG

Every modification must be appended here.

Format:

[DATE]

Agent:
Antigravity/OpenCode

Changed:
...

Reason:
...

Result:
...

---

[2026-06-19]

Agent:
OpenCode

Changed:
- Created backend/assets/models.py (Asset, AssetGraphNode, AssetGraphEdge, AssetEvent DB models)
- Created backend/assets/schemas.py (Pydantic schemas for asset API)
- Created backend/assets/events.py (AssetEventType enum)
- Created backend/assets/providers.py (DomainDiscoveryProvider, PageCrawlProvider, EndpointDiscoveryProvider, TechnologyDiscoveryProvider, JavaScriptDiscoveryProvider, AssetDiscoveryOrchestrator)
- Created backend/assets/service.py (AssetService with CRUD, bulk creation, discovery orchestration, graph building)
- Created backend/assets/graph.py (AssetGraphManager with graph building, statistics, connected components, max depth)
- Created backend/api/assets.py (REST API endpoints for asset CRUD, discovery, graph, summary)
- Created backend/tests/test_assets.py (comprehensive test suite for all asset modules)
- Updated backend/main.py (registered asset API router)
- Updated backend/reports/manager.py (added Asset Intelligence Report generation)
- Updated docs/PROJECT_BRAIN.md (moved V3 to completed, updated changelog)

Reason:
Implement V3 Asset Intelligence milestone.

Result:
V3 Asset Intelligence fully implemented and tested.

---

# FUTURE ROADMAP

V3
Asset Intelligence ✅

V4
Attack Surface Graph

V5
Real Agent Framework

V6
Memory Layer

V7
Knowledge Layer

V8
Reasoning Layer

V9
Continuous Validation

V10
Enterprise Platform
