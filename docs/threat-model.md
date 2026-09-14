# CyberNexus Threat Model (STRIDE Methodology)

## 1. System Context & Trust Boundaries

CyberNexus processes sensitive cybersecurity posture, financial risk calculations, vulnerability exposures, and AI-driven investment strategies. The architecture comprises:
- **Next.js Web Client**: Browser runtime interacting with REST API.
- **FastAPI Backend**: Application logic, RBAC, orchestration, financial engines.
- **PostgreSQL Database**: Relational storage with multi-tenant tables.
- **Neo4j Graph Database**: Attack path and dependency graph storage.
- **External Telemetry Providers**: SIEM, EDR, CSPM, IAM, and Webhook sources.
- **AI / LLM Layer**: Reasoning and natural language orchestration.
- **Blockchain Ledger**: Immutability and cryptographic evidence notarization.

---

## 2. STRIDE Threat Analysis & Mitigations

### 2.1 Spoofing (Identity & Authenticity)
| Threat ID | Threat Description | Impact | Mitigations in CyberNexus |
|:---|:---|:---:|:---|
| **T-SP-01** | Attacker guesses or brute-forces user credentials. | Critical | Argon2id password hashing, minimum 8 characters with numbers & symbols, automatic 15-minute lockout after 5 consecutive failures. |
| **T-SP-02** | Attacker crafts a forged JWT or replays a token from another service. | High | Cryptographically signed HMAC-SHA256 tokens with mandatory verification of signature, expiration, issuer (`cybernexus-platform`), and audience (`cybernexus-api`). |
| **T-SP-03** | Malicious actor sends fake security telemetry to the webhook ingestion endpoint. | High | Ingestion endpoints validate pre-shared webhook tokens (`X-Webhook-Secret`) and calculate HMAC-SHA256 signature hashes over the request payload. |

---

### 2.2 Tampering (Integrity)
| Threat ID | Threat Description | Impact | Mitigations in CyberNexus |
|:---|:---|:---:|:---|
| **T-TM-01** | Attacker or rogue insider modifies security audit logs to hide unauthorized changes. | Critical | Audit logs are append-only. The API provides no `UPDATE` or `DELETE` endpoints for audit records. Critical decision records are cryptographically notarized to the blockchain ledger. |
| **T-TM-02** | Attacker manipulates risk calculation payloads to distort financial loss calculations. | High | Backend performs strict Pydantic schema validation. Financial calculations reuse deterministic, tested mathematical formulas (calculate_eal, run_monte_carlo). |
| **T-TM-03** | Cross-Site Scripting (XSS) injecting scripts into the dashboard DOM. | High | Strict Content Security Policy (CSP) headers, `X-Content-Type-Options: nosniff`, and React/Next.js default context-aware HTML escaping. |

---

### 2.3 Repudiation (Non-Repudiation)
| Threat ID | Threat Description | Impact | Mitigations in CyberNexus |
|:---|:---|:---:|:---|
| **T-RP-01** | Administrator denies changing user roles or resetting passwords. | Medium | All administrative mutations are recorded in the `AuditLog` table with user ID, target entity, timestamp, IP address, user agent, and correlation ID. |
| **T-RP-02** | Executive denies asking AI Risk Advisor for specific investment advice or budget approvals. | High | All AI Advisory queries, generated plans, tool executions, and final responses are logged in `advisor_audit_logs` and can be notarized as blockchain evidence. |

---

### 2.4 Information Disclosure (Confidentiality)
| Threat ID | Threat Description | Impact | Mitigations in CyberNexus |
|:---|:---|:---:|:---|
| **T-ID-01** | Multi-tenant cross-organization data leak via Insecure Direct Object References (IDOR). | Critical | All database queries strictly scope by `organization_id == current_user.organization_id`. Probing foreign IDs returns `404 Not Found` rather than `403 Forbidden` to prevent resource enumeration. |
| **T-ID-02** | Stack traces or database error details leaked to API consumers. | Medium | Centralized exception handlers catch all unhandled exceptions, log the full traceback internally with correlation ID, and return a sanitized error object: `{"error": {"code": "...", "message": "...", "request_id": "..."}}`. |
| **T-ID-03** | Secrets or API keys exposed via git commits or client-side bundles. | High | Secrets stored exclusively in `.env` files. `NEXT_PUBLIC_` variables are restricted to non-sensitive frontend configuration. Frontend uses secure HTTP-only cookies or bearer authorization. |

---

### 2.5 Denial of Service (Availability)
| Threat ID | Threat Description | Impact | Mitigations in CyberNexus |
|:---|:---|:---:|:---|
| **T-DS-01** | Attacker floods login or AI Advisor endpoints, exhausting compute and API budget. | High | Sliding-window in-memory rate limiting throttles requests per IP (`10/min` on auth, `30/min` on advisor) and responds with `429 Too Many Requests` and `Retry-After`. |
| **T-DS-02** | Attacker triggers expensive unbounded database queries (e.g. fetching millions of events). | High | Mandatory pagination (`page`, `page_size` with max limit of 100) enforced across all listing endpoints. |
| **T-DS-03** | Neo4j or external AI service outage takes down the platform. | High | Graceful degradation: If Neo4j is unreachable, the system falls back to database-derived heuristics. If LLM provider is unavailable, deterministic rule-based advisory answers are generated. |

---

### 2.6 Elevation of Privilege (Authorization)
| Threat ID | Threat Description | Impact | Mitigations in CyberNexus |
|:---|:---|:---:|:---|
| **T-EP-01** | Security Analyst attempts to reset passwords or change system configuration. | High | Centralized RBAC enforcement (`require_roles` / `enforce_permission`) evaluates permissions on every route before business logic executes. |
| **T-EP-02** | User changes their own role in a profile update payload. | Critical | The `UserUpdate` schema does not accept `role` or `organization_id`. Only `ADMIN` can update user roles via dedicated `/api/v1/users/{user_id}` endpoints. |

---

## 3. Residual Risk & Review Cadence
- **Residual Risk**: In-memory rate limiting resets upon container restart. For high-availability multi-instance deployments, Redis-backed rate limiting is recommended.
- **Cadence**: This threat model is reviewed bi-annually and upon any major architectural modification.
