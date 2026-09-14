# CYBERNEXUS — API Specification & Endpoint Catalog

**Problem Statement ID:** SIH 26105  
**Product Title:** AI-Powered Continuous Cyber Risk Quantification Platform  
**OpenAPI Specification:** Version 3.1.0 (Interactive docs at `/docs` or `/redoc`)  
**Base URL:** `/api/v1`  
**Authentication Scheme:** Bearer JWT Token (`Authorization: Bearer <token>`)  

---

## 1. Global Response Envelopes

All CYBERNEXUS REST API endpoints return uniform JSON envelopes:

### Success Envelope (Single Entity)
```json
{
  "data": {
    "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
    "name": "Enterprise Payment Gateway"
  }
}
```

### Paginated Collection Envelope
```json
{
  "data": [ ... ],
  "total": 42,
  "page": 1,
  "page_size": 20,
  "total_pages": 3
}
```

### Standard Error Envelope
```json
{
  "error": {
    "code": "resource_not_found",
    "message": "Asset with ID 3fa85f64... not found",
    "request_id": "e18137bd-c63c-48d2-a064-beb3bcf200c3",
    "details": null
  }
}
```

---

## 2. Core Endpoint Index

### 2.1 System & Health Probes (No Auth Required)
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/health` | General application ping |
| `GET` | `/health/live` | Process liveness probe |
| `GET` | `/health/ready` | Subsystem readiness probe (database, neo4j checks) |
| `GET` | `/api/v1/system/status` | Component health metrics, posture score, latencies *(Requires Auth)* |

### 2.2 Authentication & Identity
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/v1/auth/register` | Register new organization user (admin only) |
| `POST` | `/api/v1/auth/login` | Authenticate user via Argon2id verification, issues JWT |
| `GET` | `/api/v1/auth/me` | Retrieve authenticated user profile and permissions |

### 2.3 Assets & Attack Surface
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/v1/assets` | Paginated list of enterprise assets with filters |
| `POST` | `/api/v1/assets` | Register new asset (hostname, IP, criticality, business value) |
| `GET` | `/api/v1/assets/{id}` | Inspect asset details and linked vulnerability count |
| `PATCH` | `/api/v1/assets/{id}` | Update asset business value or exposure |
| `DELETE` | `/api/v1/assets/{id}` | Decommission asset |

### 2.4 Vulnerabilities & Threats
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/v1/vulnerabilities` | List vulnerabilities by CVSS severity and status |
| `POST` | `/api/v1/vulnerabilities` | Register CVE / CWE with exploitability metrics |
| `GET` | `/api/v1/threats` | List active threat actors and campaign vectors |
| `POST` | `/api/v1/threats` | Ingest threat actor profile and attack sophistication |

### 2.5 Risk Quantification & Posture
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/v1/risks` | Comprehensive risk register with residual/inherent scores |
| `GET` | `/api/v1/risks/{id}` | 7-factor explainability breakdown for individual risk |
| `POST` | `/api/v1/risks/calculate` | Recalculate deterministic risk score for asset-threat pair |
| `GET` | `/api/v1/risks/summary` | Aggregated executive KPIs (EAL, critical risks, post score) |

### 2.6 Financial Risk & Actuarial Models
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/v1/financial/summary` | Expected Annual Loss (EAL) and Probable Maximum Loss |
| `GET` | `/api/v1/financial/loss-distribution` | Monte Carlo 5,000-trial probabilistic loss distribution |
| `POST` | `/api/v1/financial/calculate` | Compute annualized financial loss from asset criticality |

### 2.7 Investment Optimizer (OR-Tools)
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/v1/investments` | List security controls in portfolio |
| `POST` | `/api/v1/investments/optimize` | Solve knapsack optimization given budget and objective |
| `GET` | `/api/v1/investments/risk-reduction-curve` | Parametric investment vs risk reduction curve |
| `POST` | `/api/v1/investments/compare` | Multi-budget comparative scenario solver |

### 2.8 Attack Paths & Neo4j Graph
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/v1/graph/critical-paths` | High-risk crown-jewel traversal paths |
| `GET` | `/api/v1/graph/blast-radius/{asset_id}` | Direct vs Indirect blast radius calculation |
| `POST` | `/api/v1/graph/sync` | Idempotent PostgreSQL to Neo4j graph synchronization |

### 2.9 Grounded AI Risk Advisor
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/v1/advisor/ask` | Grounded executive query with tool execution trace |
| `POST` | `/api/v1/advisor/plan` | Inspect solver orchestration plan without synthesis |
| `POST` | `/api/v1/advisor/decision-brief` | Generate CISO executive decision brief |
| `POST` | `/api/v1/advisor/audit/{id}/notarize` | Anchor advisor decision hash to blockchain ledger |

### 2.10 Continuous Telemetry & Security Operations
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/v1/integrations/events` | Real-time normalized telemetry event stream |
| `GET` | `/api/v1/integrations/alerts` | Prioritized risk drift and attack-path alerts |
| `POST` | `/api/v1/integrations/telemetry/mock` | Ingest synthetic SIEM/EDR/IAM/CSPM telemetry bursts |
| `GET` | `/api/v1/integrations/health` | Connector latency and operational status |

### 2.11 Blockchain Evidence & Assurance
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/v1/blockchain` | Paginated immutable evidence records |
| `POST` | `/api/v1/blockchain/record` | Anchor SHA-256 decision digest to prototype ledger |
| `POST` | `/api/v1/blockchain/verify` | Verify mathematical integrity of off-chain payload |

### 2.12 Evaluator Demo State Controller
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/v1/demo/state` | Current active scene, simulated events, and drift level |
| `POST` | `/api/v1/demo/scene/{scene_id}` | Trigger scene transition (Scenes 1 through 11) |
| `POST` | `/api/v1/demo/reset` | Safe 1-click restoration to baseline state |
