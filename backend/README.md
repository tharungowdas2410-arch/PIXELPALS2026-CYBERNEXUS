# CYBERNEXUS backend (SIH 26105) — PHASE 1

Python FastAPI service for the AI-powered cyber risk quantification prototype.

Financial figures are **illustrative model outputs**, not actuarial estimates. PHASES 1–5 are implemented: inventory CRUD, explainable risk scoring, dashboard, financial/Monte Carlo, investment optimization, scenarios, attack paths, incidents, compliance, prototype blockchain evidence, and a rule-based advisor (no LLM).

## Prerequisites

- Python 3.12+
- Docker (for PostgreSQL)

## Install

```bash
cd backend
python -m venv .venv
# Windows PowerShell
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
copy .env.example .env
```

Edit `.env` and replace `SECRET_KEY`.

## Start PostgreSQL

```bash
cd backend
docker compose up -d postgres
```

`alembic upgrade head` failed with **password authentication failed for user "cybernexus"** because a Postgres server is already on port 5432, but it does not have that role/password. Either:

- keep SQLite in `.env` (recommended until Docker or a dedicated role exists), or
- put your real Postgres user/password/database into `DATABASE_URL` and `DATABASE_SYNC_URL`.

If Docker is unavailable, use SQLite in `.env`:

```
DATABASE_URL=sqlite+aiosqlite:///./cybernexus.db
DATABASE_SYNC_URL=sqlite:///./cybernexus.db
```

```bash
cd backend
alembic upgrade head
```

Generate a future revision after model changes:

```bash
alembic revision --autogenerate -m "describe change"
alembic upgrade head
```

## Seed demo data

```bash
cd backend
python scripts/seed_data.py
```

Demo login (from `.env`):

- email: `ciso@northbridge.example`
- password: `ChangeMe_demo1!`

## Run the API

```bash
cd backend
uvicorn app.main:app --reload
```

- API base: http://127.0.0.1:8000/api/v1
- Swagger: http://127.0.0.1:8000/docs
- OpenAPI: http://127.0.0.1:8000/openapi.json
- Health: http://127.0.0.1:8000/health

## Tests

```bash
cd backend
pytest
```

Tests use in-memory SQLite and do not require PostgreSQL.

## Example requests

```bash
# Register
curl -X POST http://127.0.0.1:8000/api/v1/auth/register ^
  -H "Content-Type: application/json" ^
  -d "{\"organization_name\":\"Northbridge Holdings\",\"email\":\"ciso@example.com\",\"password\":\"ChangeMe_demo1!\",\"full_name\":\"A. Mehta\"}"

# Login
curl -X POST http://127.0.0.1:8000/api/v1/auth/login ^
  -H "Content-Type: application/json" ^
  -d "{\"email\":\"ciso@northbridge.example\",\"password\":\"ChangeMe_demo1!\"}"

# Assets
curl http://127.0.0.1:8000/api/v1/assets -H "Authorization: Bearer <token>"
```

## PHASE 1 surface

| Method | Path |
| --- | --- |
| POST | `/api/v1/auth/register` |
| POST | `/api/v1/auth/login` |
| GET | `/api/v1/auth/me` |
| GET/PUT | `/api/v1/organizations/{id}` |
| GET | `/api/v1/organizations/me` |
| GET/POST | `/api/v1/assets` |
| GET/PUT/DELETE | `/api/v1/assets/{id}` |
| GET/POST | `/api/v1/vulnerabilities` |
| GET/PUT | `/api/v1/vulnerabilities/{id}` |
| GET/POST | `/api/v1/controls` |
| GET/PUT/DELETE | `/api/v1/controls/{id}` |
| GET/POST | `/api/v1/threats` |
| GET/PUT | `/api/v1/threats/{id}` |

## PHASE 2 — Risk quantification (deterministic, no ML)

Chain: **Organization → Asset → Vulnerability → Threat → Control → Risk**.

```
inherent_risk = 100 × likelihood × impact × (criticality / 5) × exploitability
                × exposure_factor × threat_sophistication_factor   # clamped to [0, 100]

residual_risk = inherent_risk × (1 − applied_control_effectiveness)

applied_control_effectiveness = control.effectiveness × implementation_weight
implementation_weight: implemented=1.0, partial=0.5, planned=0.0, not_implemented=0.0
exposure_factor: internet/external/public=1.00, partner/vendor=0.90, internal/private=0.75, other=0.85
threat_sophistication_factor: 1.00 if no threat; else 0.85 + 0.15 × sophistication
risk_level(residual): LOW≤25, MODERATE≤50, HIGH≤75, CRITICAL>75
```

Likelihood and impact come from the calculate request. Exploitability comes from the vulnerability (default 0.3). Criticality and exposure come from the asset. Sophistication and catalog likelihood come from the threat. Effectiveness and implementation status come from the control. Outputs are illustrative, not actuarial.

| Method | Path |
| --- | --- |
| GET | `/api/v1/risks` |
| GET | `/api/v1/risks/{id}` |
| POST | `/api/v1/risks/calculate` |
| GET | `/api/v1/risks/summary` |
| GET | `/api/v1/dashboard/overview` |

## PHASE 1–5 surface (authenticated unless noted)

| Area | Paths |
| --- | --- |
| Auth | `POST /api/v1/auth/register`, `POST /api/v1/auth/login`, `GET /api/v1/auth/me` |
| Inventory | `/assets`, `/vulnerabilities`, `/controls`, `/threats` |
| Risk | `GET/POST /api/v1/risks`, `POST /api/v1/risks/calculate`, `GET /api/v1/risks/summary` |
| Dashboard | `GET /api/v1/dashboard/overview` |
| Financial | `GET /api/v1/financial/summary`, `GET /api/v1/financial/loss-distribution`, `POST /api/v1/financial/calculate`, `POST /api/v1/financial/monte-carlo` |
| Investments | `GET /api/v1/investments`, `POST /api/v1/investments/optimize`, `GET /api/v1/investments/recommendations` |
| Scenarios | `GET /api/v1/scenarios`, `POST /api/v1/scenarios/simulate` |
| Attack paths | `GET /api/v1/attack-paths` |
| Incidents | `GET/POST /api/v1/incidents`, `GET/PUT /api/v1/incidents/{id}` |
| Compliance | `GET /api/v1/compliance/summary`, `GET /api/v1/compliance/{framework}`, `POST /api/v1/compliance/evidence` |
| Blockchain | `GET /api/v1/blockchain`, `POST /api/v1/blockchain/record`, `POST /api/v1/blockchain/verify` |
| Advisor | `GET /api/v1/advisor/questions`, `POST /api/v1/advisor/ask` |

Not connected (interfaces only): public blockchain, Neo4j, OR-Tools, LLM/RAG, live SIEM/EDR.
