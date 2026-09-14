# CYBERNEXUS — Evaluator Demo Runbook & Presentation Guide

**Problem Statement ID:** SIH 26105  
**Title:** AI-Powered Continuous Cyber Risk Quantification and Investment Optimization Platform  
**Target Audience:** Smart India Hackathon (SIH) Evaluators, Jury Members, CISOs, and CFOs  
**Expected Demo Duration:** 3 to 5 minutes  

---

## 1. Quick Start & Service Initialization

### Option A: Local Native Services (Recommended for fast local testing)

#### Terminal 1 — Start Backend:
```powershell
cd c:\Users\tharu\sih-26105\backend
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```
*Health verification:* `http://127.0.0.1:8000/health/ready`

#### Terminal 2 — Start Frontend:
```powershell
cd c:\Users\tharu\sih-26105
npm run dev
```
*Frontend URL:* `http://localhost:3000`

---

### Option B: Unified Docker Multi-Service Startup

```powershell
cd c:\Users\tharu\sih-26105
docker-compose up --build -d
```
All 4 services (Next.js frontend, FastAPI backend, PostgreSQL, Neo4j) will start with automated health probes and internal network isolation.

---

## 2. Credentials for Evaluation

| Role | Email | Password | Permissions |
| :--- | :--- | :--- | :--- |
| **CISO / Executive** | `ciso@northbridge.example` | `ChangeMe_demo1!` | Full view: Risks, Financials, Optimizer, Reports, AI |
| **Security Analyst** | `analyst@northbridge.example` | `ChangeMe_demo1!` | Operational view: Assets, Vulns, SOC, Telemetry |
| **Platform Admin** | `demo_test_admin@northbridge.example` | `ValidPassword_2026!` | Administrative & tenant management access |

---

## 3. The 11-Step Continuous Evaluator Story Sequence

Navigate to: `http://localhost:3000/demo` (or use the sticky **Demo Control Bar** at the top of any screen).

```
[1. Baseline] ➔ [2. Telemetry] ➔ [3. Vulnerability] ➔ [4. Threat Intel] ➔ [5. Attack Path] ➔ [6. Financial]
                                                                                                    │
[11. Report] ◄── [10. Blockchain] ◄── [9. AI Advisor] ◄── [8. Portfolio] ◄── [7. Optimization] ◄────┘
```

---

### Scene 1: Enterprise Normal Baseline
- **Action**: Click **"Scene 1: Normal State"** on `/demo` or open `/` (Overview).
- **Observed Metrics**:
  - Enterprise Cyber Risk: `72 / 100` (Elevated)
  - Security Posture Score: `78.4 / 100` (Optimal)
  - Expected Annual Loss (EAL): `₹4.82 Crore`
  - Active Critical Vulnerabilities: `3`
- **Judge Narrative**:
  > *"Every calculation on this screen is deterministic and actuarially backed. The organization starts in a monitored steady-state with ₹4.82 Crore in annualized probabilistic risk."*

---

### Scene 2: Synthetic Attack Telemetry Arrives
- **Action**: Click **"Scene 2: Attack Begins"** or navigate to `/security-operations` and click **"Simulate Auth Burst"**.
- **Observed Behavior**:
  - Live telemetry ingestion stream records burst of failed authentication attempts against the perimeter VPN from IP `203.0.113.45`.
  - Zero corruption of production database records.
- **Judge Narrative**:
  > *"Notice how the platform ingests live telemetry through continuous normalization adapters without polluting historical data."*

---

### Scene 3: Critical Zero-Day Vulnerability Detected
- **Action**: Click **"Scene 3: Risk Escalates"** or open `/vulnerabilities`.
- **Observed Behavior**:
  - Critical zero-day vulnerability (PAN-OS Command Injection, CVE-2024-3400, CVSS 9.8) surfaces on the internet-facing Payment Gateway.
  - Risk Drift triggers: Score shifts **`72 → 84 (+12)`**.
  - Main driver clearly stated: *Critical vulnerability on Payment Service*.
- **Judge Narrative**:
  > *"Risk scores shouldn't be updated once a year during an audit. As soon as a critical CVE is detected, our engine quantifies the drift in real-time."*

---

### Scene 4: Threat Intelligence Match
- **Action**: Open `/threat-intelligence` (or click Scene 4).
- **Observed Behavior**:
  - Threat actor correlation flags active campaign indicators tied to **APT29 / Lazarus Group**.
  - Exploit weaponization status flips from *Unproven* to *Actively Weaponized*.
- **Judge Narrative**:
  > *"We don't just count bugs. We correlate open threat intelligence to know if an exploit is theoretical or being actively weaponized against our specific stack."*

---

### Scene 5: Neo4j Attack Path Becomes Critical
- **Action**: Open `/attack-paths` (or click Scene 5).
- **Observed Behavior**:
  - Interactive React Flow attack graph highlights the critical path:
    $$\text{Internet} \longrightarrow \text{VPN Gateway} \longrightarrow \text{Jumpbox} \longrightarrow \text{App Server} \longrightarrow \text{Customer DB} \longrightarrow \text{Payment Service}$$
  - Path score jumps from `0.62` to `0.91`.
  - **Blast Radius Tab** shows:
    - **Direct Impact**: Compromised Payment Gateway.
    - **Indirect Impact**: Downstream transaction processing, customer database, and clearing APIs.
- **Judge Narrative**:
  > *"A vulnerability on an isolated test box doesn't matter much. But here, Neo4j proves this specific flaw opens a lateral traversal path directly into the crown-jewel payment service."*

---

### Scene 6: Financial Engine Recalculates Exposure
- **Action**: Open `/financial-risk` (or click Scene 6).
- **Observed Behavior**:
  - Monte Carlo distribution runs 5,000 iterations.
  - Expected Annual Loss (EAL) recalculates to **`₹5.37 Crore (+₹55 Lakh exposure increase)`**.
  - 95% Value at Risk (VaR) reflects the 1-in-20 year catastrophic tail loss.
- **Judge Narrative**:
  > *"This is the translation layer leadership cares about. We translated a technical CVE and graph path into an exact rupee figure: ₹55 Lakh in added annual exposure."*

---

### Scene 7 & 8: Investment Optimizer (The ₹50 Lakh Budget)
- **Action**: Open `/investment-optimizer`, click **₹50 Lakh**, and select **BALANCED** objective.
- **Observed Output**:
  - **Selected Portfolio**:
    1. Privileged Access Management (PAM) Deployment — Cost: `₹15,00,000`
    2. Emergency Virtual Patching — Cost: `₹8,00,000`
    3. Micro-segmentation for Crown-Jewel Database — Cost: `₹25,00,000`
  - **Total Capital Allocated**: `₹48,00,000` (96.0% utilization)
  - **Expected Loss Avoided**: `₹88,78,000`
  - **Portfolio ROSI**: **`1.85x (185% Return on Security Investment)`**
  - **Solver Justification ("Why This Portfolio?")**: Explains how Google OR-Tools solved the integer knapsack constraint to cut the critical lateral jumpbox path.
- **Judge Narrative**:
  > *"The CISO doesn't have infinite budget. Given ₹50 Lakh, our Google OR-Tools optimizer mathematically selects the exact combination of controls that breaks the attack path and maximizes loss avoided."*

---

### Scene 9: AI Risk Advisor Grounded Reasoning
- **Action**: Open `/ai-risk-advisor`, click the suggested question:
  *"I have ₹50 lakh. What should I fix first?"*
- **Observed Output**:
  - Response renders across distinct cards: **ANSWER**, **CONFIDENCE: HIGH**, **FINANCIAL IMPACT**, **KEY FINDINGS**, **RECOMMENDATIONS**, **WHY (Explainability)**, and **EVIDENCE**.
  - Expand **"Analysis Performed"** to show grounded engine executions:
    - `✓ Risk data (PostgreSQL models)`
    - `✓ Attack paths (Neo4j graph engine)`
    - `✓ Financial engine (Monte Carlo & VaR)`
    - `✓ Investment optimizer (OR-Tools knapsack)`
    - `✓ ML signals (Isolation Forest & drift)`
- **Judge Narrative**:
  > *"This AI does not hallucinate. It is strictly constrained: every number, recommendation, and rupee calculation comes directly from verified underlying mathematical solvers."*

---

### Scene 10: Cryptographic Blockchain Evidence
- **Action**: Open `/blockchain-evidence` (or click Scene 10).
- **Observed Behavior**:
  - Immutable ledger displays the decision digest:
    `SHA-256: e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855`
  - Verification status: `VERIFIED`.
  - Architectural callout displayed: *"Blockchain is used as a tamper-evident evidence layer, not as the primary risk calculation engine."*
- **Judge Narrative**:
  > *"For board governance and regulatory compliance, we anchor the decision payload hash to an immutable ledger so leadership can prove why and when capital was allocated."*

---

### Scene 11: Executive Decision Brief & Reset
- **Action**: Open `/reports` and click **Preview / Print PDF** on the Executive Decision Brief.
- **Reset**: Click the red **"Reset Demo"** button on the top control bar or invoke `POST /api/v1/demo/reset`.
- **Observed Result**:
  - The entire platform instantly returns to the clean baseline without touching permanent configuration or user accounts.
- **Judge Narrative**:
  > *"In 4 minutes, we showed the complete loop: Telemetry to Cyber Risk, Attack Paths, Financial Loss, Optimal Investment, AI Synthesis, and Immutable Evidence. With one click, the platform resets for the next presentation."*
