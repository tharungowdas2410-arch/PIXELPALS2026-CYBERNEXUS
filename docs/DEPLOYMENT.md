# CYBERNEXUS — Deployment & Operations Guide

**Problem Statement ID:** SIH 26105  
**Product Title:** AI-Powered Continuous Cyber Risk Quantification and Investment Optimization Platform  
**Target Environments:** Local Development, Docker Multi-Service, and Enterprise Staging  

---

## 1. System Prerequisites

| Component | Minimum Version | Recommended Spec |
| :--- | :--- | :--- |
| **Operating System** | Linux (Ubuntu 22.04+), macOS 14+, or Windows 11 (PowerShell/WSL2) | 4+ CPU Cores, 8GB+ RAM |
| **Python** | Python 3.11 or 3.12 | Python 3.12.x 64-bit |
| **Node.js** | Node.js 20 LTS | Node.js v20.18+ & npm v10+ |
| **Database (Relational)** | PostgreSQL 16 (or SQLite for local zero-config) | PostgreSQL 16 Alpine |
| **Database (Graph)** | Neo4j 5.28 Community / Enterprise | Neo4j 5.28 with APOC plugin |
| **Container Engine** | Docker Engine 24+ & Docker Compose v2 | Docker Desktop / Docker CE |

---

## 2. Option A: Local Native Deployment (Fastest Setup)

### Step 1: Clone & Configure Environment
```bash
git clone https://github.com/your-org/sih-26105.git
cd sih-26105

# Setup root environment
cp .env.example .env.local

# Setup backend environment
cp backend/.env.example backend/.env
```

### Step 2: Initialize Backend Python Environment
```bash
cd backend
python -m venv .venv

# On Windows PowerShell:
.\.venv\Scripts\Activate.ps1
# On Linux/macOS:
# source .venv/bin/activate

pip install --upgrade pip
pip install -r requirements.txt
```

### Step 3: Run Database Migrations & Seed Baseline Data
```bash
# Execute Alembic schema migrations (0001 -> 0007)
alembic upgrade head

# Seed deterministic demo tenant and risks
python scripts/seed_data.py
```

### Step 4: Start FastAPI Backend
```bash
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```
Verify backend startup:
```bash
curl http://127.0.0.1:8000/health/ready
# Expected: {"status":"ready","service":"CYBERNEXUS",...}
```

### Step 5: Start Next.js 16 Frontend
In a new terminal:
```bash
cd sih-26105
npm install
npm run dev
```
Navigate to `http://localhost:3000` in your browser.

---

## 3. Option B: Unified Docker Multi-Service Deployment

The root `docker-compose.yml` orchestrates all 4 tiers with persistent volumes, automated health checks, and isolated networking.

### Step 1: Launch Containers
```bash
cd sih-26105
docker-compose up --build -d
```

### Step 2: Monitor Service Health
```bash
docker-compose ps
```
Output will indicate healthy states:
```text
NAME                  IMAGE                  STATUS                   PORTS
cybernexus-postgres   postgres:16-alpine     Up (healthy)             0.0.0.0:5432->5432/tcp
cybernexus-neo4j      neo4j:5.28-community   Up (healthy)             0.0.0.0:7474->7474/tcp, 0.0.0.0:7687->7687/tcp
cybernexus-backend    sih-26105-backend      Up (healthy)             0.0.0.0:8000->8000/tcp
cybernexus-frontend   sih-26105-frontend     Up (healthy)             0.0.0.0:3000->3000/tcp
```

### Step 3: Execute Seed Migration in Docker (First Run)
```bash
docker-compose exec backend alembic upgrade head
docker-compose exec backend python scripts/seed_data.py
```

### Step 4: Access Applications
- **Web Dashboard**: `http://localhost:3000`
- **Evaluator Controller**: `http://localhost:3000/demo`
- **FastAPI OpenAPI Docs**: `http://localhost:8000/docs`
- **Neo4j Browser**: `http://localhost:7474` (User: `neo4j`, Password: `cybernexusdemo`)

---

## 4. Environment Variables Reference

| Variable | Description | Default | Required in Production |
| :--- | :--- | :--- | :---: |
| `NEXT_PUBLIC_API_URL` | Public base URL for backend API | `http://localhost:8000/api/v1` | **YES** |
| `SECRET_KEY` | Cryptographic secret for signing JWTs | *Replace with random 256-bit key* | **YES** |
| `DATABASE_URL` | Async PostgreSQL connection string | `sqlite+aiosqlite:///./cybernexus.db` | **YES** |
| `DATABASE_SYNC_URL` | Sync connection string for Alembic | `sqlite:///./cybernexus.db` | **YES** |
| `NEO4J_URI` | Bolt protocol connection for graph | `bolt://localhost:7687` | **YES** |
| `NEO4J_PASSWORD` | Graph database password | `cybernexusdemo` | **YES** |
| `CORS_ORIGINS` | Permitted browser origins | `http://localhost:3000` | **YES** |
| `AI_ENABLED` | Grounded AI Advisor toggle | `true` | NO |
| `OPENAI_API_KEY` | Key for optional LLM narrative synthesis | *None (uses deterministic fallback)* | NO |
| `DEMO_MODE` | Exposes `/demo` reset & scenario controller | `true` | NO (set false in prod) |

---

## 5. Security & Hardening Checklist for Production

1. **Secret Generation**:
   ```bash
   openssl rand -hex 32
   ```
   Set this value as `SECRET_KEY` in production environment.
2. **Reverse Proxy (Nginx / Caddy)**:
   Place frontend and backend behind TLS termination (HTTPS with valid SSL certificate).
3. **Database Security**:
   Ensure PostgreSQL is not bound to public interfaces (`0.0.0.0`); bind strictly to internal Docker network or private VPC CIDR.
4. **Disaster Recovery**:
   Set up cron backups as documented in [docs/BACKUP_RESTORE.md](file:///c:/Users/tharu/sih-26105/docs/BACKUP_RESTORE.md).
