# DECISIONS.md

# Purpose

This document records all major decisions made during the development of Buggi.

Every significant architectural, technical, or product decision must be documented here.

Goals:

* Prevent repeated discussions.
* Preserve reasoning behind decisions.
* Provide context for future contributors and AI agents.
* Reduce token waste across different coding assistants.

---

# Decision Format

## Decision ID

Unique identifier.

## Date

Decision date.

## Status

* Proposed
* Approved
* Deprecated
* Rejected

## Decision

Short description.

## Reasoning

Why the decision was made.

## Consequences

Positive and negative effects.

---

# Approved Decisions

---

## DEC-001

Date: 2026-06

Status: Approved

Decision:

Buggi will be developed as a desktop-first application.

Reasoning:

* Desktop companion experience.
* Continuous presence on the user's machine.
* Better integration with long-running agents.
* More unique than a traditional web dashboard.

Consequences:

* Better user engagement.
* Unique product identity.

- Increased desktop engineering complexity.

---

## DEC-002

Date: 2026-06

Status: Approved

Decision:

Use Tauri instead of Electron.

Reasoning:

* Lower memory usage.
* Better performance.
* Smaller application size.
* Rust backend support.

Consequences:

* Lightweight desktop application.
* Better native integration.

- Smaller ecosystem compared to Electron.

---

## DEC-003

Date: 2026-06

Status: Approved

Decision:

Buggi mascot will be the primary entry point to the application.

Reasoning:

The mascot is a core product identity rather than a decorative feature.

Consequences:

* Memorable user experience.
* Strong branding.

- Additional maintenance for mascot states and interactions.

---

## DEC-004

Date: 2026-06

Status: Approved

Decision:

Buggi mascot design:

* Black rounded square
* Green glowing eyes
* Small mischievous smile
* Cyber glow
* No legs
* No whiskers
* No body

Reasoning:

Simple, recognizable, and scalable design language.

Consequences:

* Consistent visual identity.
* Easy animation system.

---

## DEC-005

Date: 2026-06

Status: Approved

Decision:

The Command Center will use a cyberpunk terminal-inspired design.

Reasoning:

Matches the security research workflow and Buggi branding.

Layout:

Left:

* Agents
* Status
* Controls

Center:

* Terminal
* Logs
* Commands

Right:

* Findings
* Reports
* Results

Consequences:

* High information density.
* Strong cybersecurity aesthetic.

---

## DEC-006

Date: 2026-06

Status: Approved

Decision:

Use FastAPI for backend services.

Reasoning:

* Python ecosystem
* AI integration
* Async support
* Simplicity

Consequences:

* Fast development.
* Strong ecosystem.

---

## DEC-007

Date: 2026-06

Status: Approved

Decision:

Start with SQLite.

Reasoning:

Reduce operational complexity during early development.

Future:

PostgreSQL may replace SQLite when scaling requires it.

Consequences:

* Faster development.
* Easier onboarding.

---

## DEC-008

Date: 2026-06

Status: Approved

Decision:

Use WebSockets for real-time communication.

Reasoning:

Buggi requires:

* Live agent logs
* Status updates
* Event streaming

Consequences:

* Responsive UI.
* Better monitoring experience.

---

## DEC-009

Date: 2026-06

Status: Approved

Decision:

Buggi will be built as an autonomous security validation platform.

Reasoning:

Primary purpose:

* Security validation
* Security research
* Bug bounty research
* Attack surface management

Buggi is not intended for unauthorized access or offensive operations.

Consequences:

* Clear project scope.
* Easier enterprise adoption.

---

## DEC-010

Date: 2026-06

Status: Approved

Decision:

Separate responsibilities across AI coding agents.

Antigravity owns:

* UI
* UX
* Desktop experience
* Visualizations
* Reports UI

OpenCode owns:

* Backend
* Agent framework
* Database
* Memory
* Integrations
* Testing

Reasoning:

Improves productivity and reduces context overlap.

Consequences:

* Faster development.
* Cleaner ownership.

---

## DEC-011

Date: 2026-06

Status: Approved

Decision:

All integrations must use provider interfaces.

Examples:

* ILLMProvider
* IToolProvider
* IMemoryProvider
* IAgentProvider

Reasoning:

Future-proof architecture.

Consequences:

* Easy model replacement.
* Easy tool replacement.

---

## DEC-012

Date: 2026-06

Status: Approved

Decision:

The simulator architecture will remain even after real integrations exist.

Reasoning:

Allows testing without external dependencies.

Consequences:

* Easier development.
* Easier demonstrations.

---

# Future Decisions

Record all future decisions below this section.

Template:

## DEC-XXX

Date:

Status:

Decision:

Reasoning:

Consequences:
