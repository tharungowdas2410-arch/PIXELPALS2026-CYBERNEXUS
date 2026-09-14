# CYBERNEXUS — Blockchain Evidence & Assurance Layer

**Problem Statement ID:** SIH 26105  
**Component:** Tamper-Evident Evidence & Audit Non-Repudiation Service  
**Primary Interface:** `/blockchain-evidence` and `POST /api/v1/blockchain/record`  

---

## 1. Architectural Role: The Trust & Attestation Layer

> [!IMPORTANT]
> **Architectural Principle**: Blockchain is used strictly as a **tamper-evident evidence and non-repudiation layer**, NOT as the primary risk calculation or optimization engine.
> 
> Heavy mathematical operations (Monte Carlo simulations, Neo4j graph traversals, and OR-Tools integer programming) run on high-performance compute infrastructure. The blockchain interface commits cryptographic proofs of these decisions to guarantee that audit logs, risk assessments, and capital allocation approvals cannot be retroactively altered.

---

## 2. Zero-Knowledge Off-Chain Privacy Model

Enterprise vulnerability details, IP addresses, network topologies, and sensitive financial records **must never be published to an unencrypted public ledger**.

CYBERNEXUS employs a strict off-chain architecture:
1. **Raw Payload Stays Off-Chain**: The comprehensive risk assessment or decision brief resides securely in the organization's encrypted relational database.
2. **Deterministic Cryptographic Digest**: A SHA-256 hash is computed over the canonical normalized JSON representation of the decision:
   $$\text{Evidence Hash} = \text{SHA-256}(\text{Canonical Payload})$$
3. **Ledger Commit**: Only the `evidence_hash`, `entity_id` (UUID), `timestamp`, and `evidence_type` are written to the ledger.
4. **Non-Repudiation Verification**: An auditor or regulator can re-hash the offline payload and compare it with the immutable ledger entry.

---

## 3. Tamper Detection Proof

The `/api/v1/blockchain/verify` endpoint verifies whether an off-chain payload matches its original attested record:

```
Scenario A (Original Record):
Payload: "risk-assessment:org-001:vpn-gateway-cvss-9.8"
SHA-256: 3a7f8b9e... (Matches Ledger)
Status:  VERIFIED ✅

Scenario B (Tampered Record):
Payload: "risk-assessment:org-001:vpn-gateway-cvss-4.0" (Attacker modified score)
SHA-256: d82c1f0a... (Mismatch with Ledger)
Status:  FAILED / TAMPER DETECTED ❌
```

---

## 4. Current Implementation & Roadmap

### Current Prototype State
- Implemented as an append-only cryptographic ledger interface within PostgreSQL (`blockchain_evidence` table) with SHA-256 hashing and simulated transaction digests.
- Provides immediate auditability, zero transaction costs, and deterministic verification during evaluation.

### Production Consortium Evolution
- Designed with an abstract interface (`BlockchainService`) enabling pluggable backend drivers:
  - **Hyperledger Fabric**: Permissioned enterprise consortium among regulators (SEBI, RBI) and financial institutions.
  - **Ethereum / Polygon (L2)**: Merkle-root batch anchoring using zero-knowledge rollups for public transparency without exposing enterprise telemetry.
