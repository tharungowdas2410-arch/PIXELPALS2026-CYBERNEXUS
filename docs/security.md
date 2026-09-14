# CyberNexus Enterprise Security Baseline & Architecture Guide

## 1. Executive Summary

CyberNexus is an enterprise-grade, continuous cyber risk quantification and investment optimization platform designed for CISOs, CFOs, Risk Managers, and Security Analysts. It combines:
- Quantitative cyber risk modeling (Expected Annual Loss, Value at Risk, Monte Carlo simulations)
- Graph-based attack path intelligence (Neo4j)
- Continuous security telemetry ingestion (SIEM, EDR, CSPM, IAM, Vulnerability scanners)
- Constraint-based cybersecurity investment optimization (ROSI, knapsack algorithms)
- Zero-hallucination AI Risk Advisory with verifiable facts and blockchain evidence notarization

This document outlines the zero-trust security controls, multi-tenant isolation, cryptographic protections, role-based access controls, and defense-in-depth measures implemented across the platform.

---

## 2. Multi-Tenancy & Data Isolation

### Strict Tenant Scoping
- **Tenant Key**: Every enterprise customer is represented as an `Organization`. Every core entity (`Asset`, `Vulnerability`, `Threat`, `Control`, `Risk`, `FinancialRisk`, `Investment`, `Incident`, `SecurityEvent`, `AuditLog`, `KnowledgeDocument`) is strictly bound to an `organization_id` (UUIDv4).
- **Query Scoping**: Database queries unconditionally filter on `organization_id == current_user.organization_id`.
- **IDOR Protection**: When a user attempts to access an entity belonging to another organization, the query returns `404 Not Found` (rather than `403 Forbidden`) to prevent enumeration attacks and leak of resource existence.

---

## 3. Identity, Authentication & Session Security

### Password & Credential Security
- **Hashing Algorithm**: Argon2id via `pwdlib` (`pwdlib[argon2]`), resilient against GPU-based cracking attacks.
- **Password Complexity Policy**: Minimum 8 characters, requiring at least one numeric digit and at least one special character.
- **Brute-Force Account Lockout**:
  - Maximum failed attempts: 5 attempts within a 15-minute window.
  - Lockout duration: 15 minutes.
  - Tracking is stateful and cleared upon successful login.
  - Failed login events are recorded in the security audit log with IP address and correlation ID.

### JWT Session Tokens
- **Algorithm**: HMAC-SHA256 (`HS256`) with a configurable, cryptographically secure 256-bit secret.
- **Claims Verification**:
  - `sub`: Subject User UUID
  - `org`: Organization UUID
  - `role`: Enterprise RBAC Role
  - `iss`: Issuer (`cybernexus-platform`)
  - `aud`: Audience (`cybernexus-api`)
  - `exp`: Configurable expiration (default: 60 minutes)
  - `iat`: Issued-at UTC timestamp

---

## 4. Role-Based Access Control (RBAC) Matrix

CyberNexus enforces a 5-tier role hierarchy:

| Permission / Capability | ADMIN | CISO | SECURITY_ANALYST | RISK_MANAGER | EXECUTIVE |
|:---|:---:|:---:|:---:|:---:|:---:|
| **User Administration & Reset** | ✅ | ❌ | ❌ | ❌ | ❌ |
| **System Health & Config** | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Audit Log Trail Explorer** | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Asset Management (Read/Write)** | ✅ | ✅ | ✅ (Read/Write) | ✅ (Read) | ✅ (Read) |
| **Vulnerabilities & Threats** | ✅ | ✅ | ✅ | ✅ (Read) | ❌ |
| **Controls Management** | ✅ | ✅ | ✅ | ✅ | ❌ |
| **Risk & Scenario Execution** | ✅ | ✅ | ❌ | ✅ | ❌ |
| **Financial Risk & Loss Models** | ✅ | ✅ | ❌ | ✅ | ✅ (Read) |
| **Attack Path Intelligence** | ✅ | ✅ | ✅ | ✅ (Read) | ❌ |
| **Telemetry Ingestion & Webhooks** | ✅ | ✅ | ✅ | ❌ | ❌ |
| **Investment Optimization** | ✅ | ✅ | ❌ | ✅ | ✅ (Read) |
| **AI Risk Advisor (Ask / Brief)** | ✅ | ✅ | ✅ (Ask) | ✅ | ✅ |
| **Blockchain Notarization** | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Compliance Management** | ✅ | ✅ | ❌ | ✅ | ✅ (Read) |
| **Executive Reports Export** | ✅ | ✅ | ❌ | ✅ | ✅ |

---

## 5. Defense-in-Depth HTTP Security Headers

Every HTTP response from CyberNexus contains the following security headers:
- `X-Content-Type-Options: nosniff` — Prevents MIME type sniffing.
- `X-Frame-Options: DENY` — Prevents clickjacking attacks.
- `Referrer-Policy: strict-origin-when-cross-origin` — Protects internal URI paths.
- `Permissions-Policy: geolocation=(), camera=(), microphone=(), payment=()` — Disables risky browser APIs.
- `Content-Security-Policy: default-src 'self'; ...` — Strict CSP allowing only trusted local assets.
- `Strict-Transport-Security: max-age=31536000; includeSubDomains; preload` — Enforces HTTPS in production.

---

## 6. End-to-End Request Correlation & Auditability

- **Correlation ID Middleware**: Every incoming request is inspected for `X-Request-ID` or `X-Correlation-ID`. If absent, a unique UUIDv4 is generated.
- **Propagation**: The ID is attached to `request.state.request_id`, reflected in response headers (`X-Request-ID`), stamped onto audit log entries, and included in error responses.
- **Standard Error Format**:
```json
{
  "error": {
    "code": "resource_not_found",
    "message": "Asset not found",
    "request_id": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d"
  }
}
```
- **Information Leakage Prevention**: Unhandled internal exceptions return a sanitized message (`"An internal error occurred. Please refer to request_id for investigation."`) without exposing Python stack traces or database schema details.

---

## 7. Append-Only Audit Logging

- **Immutable Trail**: All security-relevant actions (authentication, user creation, password changes, asset mutations, investment optimizations, blockchain notarizations) generate an `AuditLog` record.
- **Captured Attributes**: `id`, `organization_id`, `user_id`, `action`, `entity_type`, `entity_id`, `result`, `ip_address`, `user_agent`, `correlation_id`, `details`, `timestamp`.
- **Query API**: Restricted to `ADMIN` and `CISO` with multi-dimensional filtering and date ranges.

---

## 8. Adaptive Rate Limiting

- **Sliding-Window Limiter**: Implemented in-memory per IP / endpoint path category.
- **Configurable Limits**:
  - `/auth/*`: 10 requests / minute (mitigates credential stuffing).
  - `/advisor/*`: 30 requests / minute (protects LLM tokens & compute).
  - `/integrations/webhook/*`: 120 requests / minute (handles telemetry bursts).
  - General API: 120 requests / minute.
- **Throttling Response**: Returns `HTTP 429 Too Many Requests` with a standard `Retry-After` header.

---

## 9. Telemetry Ingestion & Demo Mode Safety

- **Webhook Signature Verification**: Secret token or HMAC-SHA256 header validation.
- **Demo Mode Transparency**: Synthetic demonstrations and mock data are clearly tagged with `"is_demo": true` and `"notice": "DEMO MODE — SYNTHETIC SECURITY TELEMETRY"`. Real and synthetic sources are never falsely conflated.
