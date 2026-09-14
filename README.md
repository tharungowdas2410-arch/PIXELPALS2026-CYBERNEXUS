# CyberNexus (SIH 2026)
### AI-Powered Continuous Cyber Risk Quantification and Investment Optimization Platform

[![SIH 2026](https://img.shields.io/badge/SIH%202026-Problem%20Statement%2026105-blue?style=for-the-badge)](https://sih.gov.in)
[![License](https://img.shields.io/badge/License-Proprietary-red?style=for-the-badge)](#)
[![Python](https://img.shields.io/badge/Python-3.11%2B-3776AB?style=for-the-badge&logo=python&logoColor=white)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115%2B-009688?style=for-the-badge&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![Next.js](https://img.shields.io/badge/Next.js-16%2B-black?style=for-the-badge&logo=next.js&logoColor=white)](https://nextjs.org)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)](https://postgresql.org)
[![Neo4j](https://img.shields.io/badge/Neo4j-5.15-008CC1?style=for-the-badge&logo=neo4j&logoColor=white)](https://neo4j.com)
[![Docker](https://img.shields.io/badge/Docker-Compose%20Ready-2496ED?style=for-the-badge&logo=docker&logoColor=white)](https://docker.com)

---

## 1. Project Overview
**CyberNexus** is an enterprise-grade cyber risk quantification and capital allocation platform developed for **Smart India Hackathon (SIH) 2026**. It continuously ingests real-time technical security telemetry (SIEM, EDR, IAM, CSPM), maps multi-hop attack paths on a graph, quantifies financial exposure in Indian Rupees (₹ EAL & 95% VaR) using the Open FAIR standard and Monte Carlo simulations, and optimizes cybersecurity investments using Google OR-Tools Mixed Integer Linear Programming (MILP). All strategic decisions and risk sign-offs are anchored to an immutable cryptographic blockchain evidence ledger.

---

## 2. SIH Problem Statement ID
- **Hackathon**: Smart India Hackathon (SIH) 2026
- **Problem Statement ID**: `26105`
- **Category**: Software / Cybersecurity / AI & Financial Optimization
- **Domain**: Enterprise Cyber Defense, CISO Decision Support, Financial Risk Governance

---

## 3. Problem Statement
Traditional enterprise cybersecurity operations suffer from an **Executive-Technical Disconnect**:
1. **Alert Fatigue Without Context**: Security tools generate thousands of technical alerts (CVEs, CVSS scores, failed logins) without context regarding crown jewel business assets.
2. **Qualitative Vague Scoring**: Risk registers rely on subjective "Red/Amber/Green" heatmaps that fail to provide financial clarity for C-suite and Board discussions.
3. **Inefficient Budget Allocation**: CISOs struggle to defend security budgets or prove Return on Security Investment (ROSI), often relying on intuition or vendor pressure rather than mathematical optimization.
4. **Audit Disputes & Repudiation**: In the aftermath of a breach, organizations struggle to prove historical control effectiveness and risk governance to regulators (SEBI, RBI, CERT-In).

---

## 4. The Solution: CyberNexus
CyberNexus delivers a single, unbroken chain of automated intelligence:
$$\text{Technical Telemetry} \longrightarrow \text{Graph Attack Paths} \longrightarrow \text{Financial Exposure (EAL)} \longrightarrow \text{OR-Tools Budget Optimization} \longrightarrow \text{Cryptographic Evidence}$$

- **Continuous Cyber Risk**: Translates streaming alerts into dynamic asset vulnerability scores in real time.
- **Graph Topology**: Identifies exploit paths from perimeter firewalls to customer databases via Neo4j.
- **Financial Quantification**: Calculates Expected Annual Loss (₹ EAL) and Value at Risk (VaR 95%) via 10,000-trial Monte Carlo simulations.
- **Capital Optimization**: Solves multi-dimensional knapsack models to recommend optimal control portfolios with maximum ROSI.
- **AI Risk Advisor**: Translates technical complexities into executive summaries with strict tool grounding and zero hallucinations.
- **Blockchain Evidence Ledger**: Anchors decision payloads into an immutable cryptographic hash chain.

---

## 5. High-Level Architecture

```mermaid
flowchart LR
    subgraph Inputs["1. Streaming Telemetry"]
        SIEM[SIEM / Webhooks]
        EDR[EDR Agents]
        IAM[IAM / CloudTrail]
    end

    subgraph Core["2. Analytics & Engine"]
        FastAPI[FastAPI Application Server]
        PostgreSQL[(PostgreSQL 16\nRelational & Evidence)]
        Neo4j[(Neo4j 5.15\nAttack Graph)]
        FAIR[FAIR Engine\nMonte Carlo 10k]
        ORTools[Google OR-Tools\nMILP Knapsack]
    end

    subgraph Interface["3. User & Executive Layer"]
        NextJS[Next.js 16 Web Console]
        AIAdvisor[AI Risk Advisor\nRAG + Tools]
        Ledger[Blockchain Audit Ledger\nSHA-256 Verifier]
    end

    Inputs --> FastAPI
    FastAPI <--> PostgreSQL
    FastAPI <--> Neo4j
    FastAPI --> FAIR
    FAIR --> ORTools
    FastAPI <--> AIAdvisor
    FastAPI <--> Ledger
    FastAPI <--> NextJS
```

---

## 6. Technology Stack

| Layer | Technologies |
|:---|:---|
| **Frontend** | Next.js 16 (App Router), TypeScript, Tailwind CSS, Lucide Icons, React Query, Recharts, Canvas Confetti |
| **Backend API** | Python 3.11+, FastAPI, Pydantic v2, SQLAlchemy 2.0 (Async), Uvicorn, Alembic |
| **Databases** | PostgreSQL 16 (Relational/Multi-tenant), Neo4j 5.15 Enterprise/Community (Graph Topology) |
| **Optimization** | Google OR-Tools (Mixed Integer Linear Programming / Knapsack Solver), NumPy |
| **Financial Engine**| Open FAIR Standard, Monte Carlo Simulations (SciPy / NumPy) |
| **AI Layer** | Strict Tool-Grounded RAG (OpenAI GPT-4o / Heuristic Rule-Based Fallback) |
| **Cryptographic Ledger** | SHA-256 Hash Chaining, Merkle Proof Generation, Tamper Verification Engine |
| **Security & Auth** | Argon2id, JWT (HMAC-SHA256), Multi-Tenant Scoping, Role-Based Access Control (5 Roles) |
| **DevOps** | Docker, Docker Compose, GitHub Actions CI, Pytest, ESLint |

---

## 7. Setup & Installation

### Prerequisites
- Python 3.11 or higher
- Node.js 20 LTS or higher
- PostgreSQL 16 (or Docker)
- Neo4j 5.15+ (optional; graceful degradation enabled)

### Local Development Setup

#### 1. Clone Repository & Setup Virtual Environment
```bash
git clone https://github.com/your-org/sih-26105.git
cd sih-26105

# Create & activate virtual environment
python -m venv .venv
# On Windows:
.venv\Scripts\activate
# On Linux/macOS:
source .venv/bin/activate

# Install backend dependencies
pip install -r backend/requirements.txt
```

#### 2. Configure Database & Migrations
```bash
# Apply Alembic migrations
cd backend
alembic upgrade head

# Seed deterministic demo data
python scripts/seed_data.py
cd ..
```

#### 3. Install Frontend Dependencies
```bash
npm install
```

#### 4. Run Development Servers
```bash
# Terminal 1: Backend
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload

# Terminal 2: Frontend
npm run dev
```

---

## 8. Environment Variables

Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

| Variable | Description | Default / Example |
|:---|:---|:---|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql+asyncpg://postgres:postgres@localhost:5432/cybernexus` |
| `JWT_SECRET_KEY` | HMAC secret for JWT signing | `change-this-to-a-secure-random-key-in-production` |
| `JWT_ALGORITHM` | JWT signing algorithm | `HS256` |
| `NEO4J_URI` | Neo4j Bolt protocol URI | `bolt://localhost:7687` |
| `NEO4J_USERNAME` | Neo4j database user | `neo4j` |
| `NEO4J_PASSWORD` | Neo4j database password | `password` |
| `AI_ENABLED` | Enable LLM features | `true` |
| `LLM_PROVIDER` | AI provider (`openai` or `heuristic`) | `heuristic` |
| `OPENAI_API_KEY` | OpenAI API key (optional) | `sk-...` |
| `NEXT_PUBLIC_API_URL` | Frontend API target | `http://127.0.0.1:8000` |
| `WEBHOOK_SECRET` | HMAC signature key for telemetry | `cybernexus-webhook-secret` |

---

## 9. Docker Deployment

Deploy the full multi-service stack with a single command:
```bash
# Build and run all services
docker-compose up --build -d

# Check status
docker-compose ps

# View logs
docker-compose logs -f backend
```

Services exposed:
- **Frontend Dashboard**: `http://localhost:3000`
- **FastAPI API & Docs**: `http://localhost:8000/docs`
- **Neo4j Browser**: `http://localhost:7474`
- **PostgreSQL**: `localhost:5432`

---

## 10. Demo Credentials

The platform comes pre-seeded with 5 enterprise roles:

| Role | Email | Password | Primary Capabilities |
|:---|:---|:---|:---|
| **System Admin** | `admin@cybernexus.local` | `Admin@12345` | Tenant management, system health, all operations |
| **CISO** | `ciso@cybernexus.local` | `Ciso@12345` | Budgets, risk thresholds, investment authorizations |
| **Security Analyst**| `analyst@cybernexus.local` | `Analyst@12345` | Telemetry triage, vulnerabilities, attack paths |
| **Risk Manager** | `riskmanager@cybernexus.local` | `Risk@12345` | Compliance frameworks, risk register, evidence review |
| **Executive** | `executive@cybernexus.local` | `Exec@12345` | High-level financial loss, ROSI, read-only board view |

---

## 11. End-to-End Demo Workflow

To run a deterministic 4-minute demonstration during SIH judging:

1. **Login**: Authenticate as `ciso@cybernexus.local` at `http://localhost:3000/login`.
2. **Baseline Overview**: Navigate to `/overview`—observe Enterprise Risk Score (74) and baseline EAL (₹1.85 Cr).
3. **Simulate Telemetry**: Navigate to `/demo` and click **"Simulate Telemetry Attack"**.
   - Watch failed logins and MFA bypass events trigger.
   - Enterprise risk increases to 88.
4. **Inspect Attack Path**: Open `/attack-paths`—observe the multi-hop path: `Internet -> VPN Gateway -> IdP -> App Server -> Customer DB`.
5. **Analyze Financial Exposure**: Open `/financial-risk`—review the 10,000-trial Monte Carlo loss distribution and 95% VaR (₹3.42 Cr).
6. **Optimize ₹50 Lakh Budget**: Open `/investment-optimizer`—select budget `₹50,00,000`, click **"Optimize"**.
   - Solver prescribes: FIDO2 MFA (₹12L) + Patch Automation (₹18L) + Air-Gapped Backups (₹15L).
   - Loss Avoided: ₹92.4L | ROSI: 105.3%.
7. **Ask AI Risk Advisor**: Open `/ai-advisor` and submit: *"I have ₹50 lakh. What should I fix first and why?"*
8. **Verify Blockchain Evidence**: Open `/blockchain-evidence` and click **"Verify Decision Hash"** (Tamper status: VALID).
9. **Reset Demo**: Click **"Reset Demo Data"** in the top navigation or execute `POST /api/v1/demo/reset`.

---

## 12. API Documentation

Interactive Swagger documentation is available at:
`http://localhost:8000/docs`

Key API Route Groups:
- `POST /api/v1/auth/login` — Authenticate and receive JWT access token.
- `GET /api/v1/assets` — Multi-tenant asset registry with exposure tags.
- `GET /api/v1/risks/summary` — Enterprise risk metrics and severity distributions.
- `GET /api/v1/financial/summary` — FAIR Expected Annual Loss (EAL) and VaR metrics.
- `POST /api/v1/investments/optimize` — OR-Tools multi-constraint knapsack solver.
- `GET /api/v1/attack-paths` — Neo4j multi-hop exploit paths and blast radii.
- `POST /api/v1/ai-advisor/chat` — Tool-grounded AI risk advisory chat.
- `POST /api/v1/evidence/notarize` — Anchor decision payload to cryptographic ledger.
- `POST /api/v1/demo/reset` — Deterministic reset of all 12 subsystems.

---

## 13. Testing & Verification

### Run Backend Pytest Suite
```bash
python -m pytest tests -q
# Output: 191 passed, 0 failed in 29.79s
```

### Run Frontend Production Build
```bash
npm run build
# Output: Compiled successfully, 29/29 routes generated
```

### Automated Smoke Test Script
```bash
python scripts/final_smoke_test.py
# Output: 12 / 12 Subsystems PASSED in 0.80s
```

---

## 14. Security & Compliance Hardening

- **Password Hashing**: Industry-standard Argon2id via `pwdlib[argon2]`.
- **Authorization**: Strictly enforced 5-tier Role-Based Access Control (RBAC).
- **Multi-Tenant Scoping**: All SQL/Cypher queries mandate `organization_id == current_user.organization_id`. Tenant context is never read from client request bodies.
- **Webhook Integrity**: HMAC-SHA256 signature verification over incoming telemetry payloads (`X-CyberNexus-Signature`).
- **HTTP Security Headers**: Strict Content Security Policy (CSP), `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`.
- **Brute Force Protection**: Automatic 15-minute lockout after 5 consecutive failed login attempts.

---

## 15. Machine Learning (ML) Engine

- **Model**: Gradient Boosted Decision Tree (LightGBM / XGBoost) trained on MITRE ATT&CK calibrated feature sets.
- **Inference Targets**: Threat actor likelihood, vulnerability exploit probability, and asset compromise likelihood.
- **Transparency**: Fully documented model cards in `docs/ML_MODEL_CARD.md`. All training data is synthetic and clearly labeled.
- **Graceful Degradation**: If ML model binaries are absent, deterministic rule-based weights take over without breaking API responses.

---

## 16. AI Risk Advisor

- **Strict Tool Grounding**: Uses Retrieval-Augmented Generation (RAG) where the LLM is restricted to querying internal backend tools.
- **Zero Hallucinations**: Financial loss values and risk scores are fetched directly from the database; the LLM is forbidden from fabricating numerical estimates.
- **Injection Defense**: Actively detects and refuses adversarial prompts (`ignore instructions`, `sudo`, `show secrets`).
- **Deterministic Heuristic Fallback**: Operates with 100% mathematical consistency even when external OpenAI API access is disabled.

---

## 17. Neo4j Graph Topology

- **Idempotent Synchronization**: Sync operations (`POST /api/v1/attack-paths/sync`) use Cypher `MERGE` statements to guarantee zero duplicate nodes.
- **Graph Traversal**: Identifies critical multi-hop attack paths from perimeter nodes (`Internet`, `VPN`) to sensitive crown jewels (`Customer DB`, `Payment Gateway`).
- **Resilience**: If the Neo4j service is offline, the platform flags graph status as `DEGRADED (optional: true)` and serves tabular relational approximations without crashing.

---

## 18. Blockchain Evidence Ledger

- **Purpose**: Immutability and non-repudiation for executive budget decisions and regulatory audit logs.
- **Architecture**: Append-only cryptographic ledger storing SHA-256 digests of canonical decision payloads chained with previous block hashes.
- **Verification Endpoint**: `GET /api/v1/evidence/verify/{id}` performs bitwise verification against historical records. Modifying a single character in the audit record immediately triggers a tamper alert.

---

## 19. Known Limitations

In accordance with academic and engineering transparency:
1. **Illustrative Values**: Financial metrics and asset valuations in the demo dataset are synthetic benchmarks.
2. **Mock Telemetry**: SIEM, EDR, and IAM connectors utilize realistic mock generators and HMAC webhooks rather than live enterprise production licenses.
3. **Private Ledger**: The blockchain evidence layer is an off-chain cryptographic hash-chain ledger optimized for low latency rather than a public proof-of-work blockchain.
4. Full details documented in `docs/KNOWN_LIMITATIONS.md`.

---

## 20. Future Scope & Roadmap

1. **SOAR Integration**: Direct integration with Cortex XSOAR and Splunk Phantom to trigger automated remediation playbooks for approved budget items.
2. **Dynamic Cyber Insurance**: Automated export of cryptographic risk evidence to insurance underwriters for real-time premium discounts.
3. **Cross-Tenant Federated Learning**: Privacy-preserving federated threat models allowing collaborative anomaly detection without sharing proprietary telemetry.

---

## Submission Sign-Off
- **SIH 2026 Problem Statement**: 26105
- **Platform Name**: CyberNexus
- **Lead Engineering Team**: Antigravity Lead Engineering Team
- **Submission Status**: **SIH 26105 SUBMISSION READY**
