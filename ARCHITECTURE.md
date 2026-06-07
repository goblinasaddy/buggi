# ARCHITECTURE.md

# Buggi Architecture

Version: 1.0

---

# Architecture Goals

The architecture must:

* Be modular
* Be agent-driven
* Be tool-agnostic
* Support future RL integration
* Support long-term memory
* Support multiple target profiles
* Minimize false positives
* Scale to multiple concurrent assessments

---

# High-Level Architecture

```
                User

                  |

                  v

          Buggi API Layer

                  |

                  v

          Planner Agent

                  |

------------------------------------------------

|              |             |               |

v              v             v               v
```

Recon Agent   Browser Agent   API Agent   Scope Agent

```
|              |             |               |

------------------------------------------------

                  |

                  v

         Verification Agent

                  |

                  v

           Report Agent

                  |

                  v

            Final Report
```

---

# Core Services

## API Service

Responsibilities:

* Accept scan requests
* Manage jobs
* Track scan progress
* Expose REST APIs

Technology:

* FastAPI

---

## Orchestrator Service

Responsibilities:

* Agent scheduling
* Workflow execution
* Event routing
* State management

Technology:

* LangGraph
* Custom Workflow Engine

---

## Tool Execution Service

Responsibilities:

* Execute security tools
* Isolate processes
* Capture outputs

Technology:

* Docker
* Kubernetes (future)

---

# Agent Layer

## Planner Agent

Responsibilities:

* Create execution plans
* Break goals into tasks
* Assign work to agents

Input:

* Target URL
* Scope Rules

Output:

* Execution Graph

---

## Scope Agent

Responsibilities:

* Parse bug bounty rules
* Build testing constraints

Output:

{
allowed_tests: [],
prohibited_tests: [],
scope: []
}

---

## Recon Agent

Responsibilities:

* Discover domains
* Discover endpoints
* Fingerprint technologies

Tools:

* subfinder
* httpx
* katana

Output:

Attack Surface Graph

---

## Browser Agent

Responsibilities:

* Crawl website
* Discover workflows
* Analyze forms
* Analyze authentication

Tools:

* Playwright

Output:

Workflow Graph

---

## API Agent

Responsibilities:

* Discover APIs
* Enumerate parameters
* Analyze auth flows

Output:

API Knowledge Graph

---

## Verification Agent

Responsibilities:

* Validate findings
* Reproduce attacks
* Remove false positives

Output:

Verified Findings

---

## Report Agent

Responsibilities:

* Severity scoring
* CVSS mapping
* Report generation

Output:

Markdown Report

PDF Report

Bug Bounty Submission Format

---

# Memory Architecture

## Working Memory

Purpose:

Current scan context

Technology:

Redis

Stores:

* Current objectives
* Current findings
* Current state

---

## Long-Term Memory

Purpose:

Historical learning

Technology:

PostgreSQL

Stores:

* Previous scans
* Attack chains
* Success rates
* Endpoint history

---

## Semantic Memory

Purpose:

Security knowledge retrieval

Technology:

Qdrant

Stores:

* OWASP
* HackTricks
* Public reports
* CVEs

---

# Data Models

## Target

Fields:

* id
* domain
* scope
* profile
* created_at

---

## Finding

Fields:

* id
* vulnerability_type
* severity
* evidence
* reproduction_steps
* confidence_score

---

## Program Profile

Fields:

* program_name
* allowed_tests
* prohibited_tests
* common_patterns
* historical_findings

---

# Event Architecture

Events:

TARGET_CREATED

RECON_STARTED

RECON_COMPLETED

API_DISCOVERED

WORKFLOW_DISCOVERED

FINDING_CREATED

FINDING_VERIFIED

REPORT_GENERATED

---

# Queue Architecture

Recommended:

Redis Streams

Future:

RabbitMQ

or

Apache Kafka

---

# Tool Integration Layer

Common Interface:

ToolRequest

{
tool_name,
target,
parameters
}

ToolResponse

{
success,
output,
metadata
}

All tools must implement this contract.

---

# Verification Pipeline

Potential Finding

↓

Reproduction Attempt

↓

Evidence Collection

↓

Confidence Scoring

↓

Human-like Validation

↓

Verified Finding

---

# Reporting Pipeline

Verified Finding

↓

Risk Analysis

↓

CVSS Estimation

↓

Impact Generation

↓

Remediation Generation

↓

Markdown Report

↓

PDF Export

---

# Security Architecture

All tools run inside containers.

Rules:

* No host execution
* Network restrictions
* Resource limits
* Execution timeout

---

# Future RL Layer

Not implemented in V1.

Future position:

Planner

↓

RL Policy Engine

↓

Agent Selection

↓

Action Selection

Goal:

Learn optimal attack sequences.

---

# V1 Deployment

Frontend: Next.js

Backend: FastAPI

Database: PostgreSQL

Memory: Redis

Vector Store: Qdrant

Agent Framework: LangGraph

Container Runtime: Docker

LLM: RavenX CyberAgent (Hugging Face)

---

# V1 Definition of Success

* Can scan a target
* Can build attack surface graph
* Can identify workflows
* Can verify findings
* Can generate bug bounty reports
* Less than 20% false positive rate
* Supports multiple scans simultaneously
