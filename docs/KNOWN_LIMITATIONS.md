# CYBERNEXUS — Known Limitations & Operational Assumptions

**Problem Statement ID:** SIH 26105  
**Product Title:** AI-Powered Continuous Cyber Risk Quantification Platform  
**Documentation Objective:** Honest, transparent technical disclosure for SIH evaluators and enterprise architects.  

---

## 1. Transparency Principle

In adherence to Section 24 of the engineering specification, CYBERNEXUS explicitly distinguishes between **operational production capabilities** and **synthetic evaluation artifacts**. We believe that technical honesty increases judge credibility and demonstrates mature engineering judgment.

---

## 2. Technical Limitations & Baseline Assumptions

### 2.1 Financial Quantification Models
- **Illustrative Actuarial Values**: In demo mode (`DEMO_MODE=true`), financial loss numbers (Expected Annual Loss, 95% Value at Risk, and Probable Maximum Loss) are derived from deterministic actuarial formulas parameterized on synthetic asset valuations. They do not represent audited accounting losses.
- **Enterprise Calibration**: In a real production deployment, the actuarial engine requires calibration against the organization's specific revenue-per-hour, regulatory penalty schedules (e.g., SEBI / RBI / DPDP Act guidelines), and historical cyber insurance claims.

### 2.2 Enterprise Security Telemetry Connectors
- **Synthetic Adapter Layer**: The telemetry ingestion engine provides fully functional REST webhook endpoints and normalization parsers for SIEM (Splunk), EDR (CrowdStrike), IAM (Okta), and CSPM (AWS Security Hub). However, in evaluation mode, these feeds are populated via deterministic synthetic telemetry bursts (`generate_demo_telemetry.py`) rather than requiring live production corporate API credentials.
- **Production Readiness**: Transitioning to live feeds requires simply configuring real API keys and webhook secrets in `.env`.

### 2.3 Blockchain Evidence Layer
- **Prototype Ledger**: The current blockchain implementation functions as a local, append-only cryptographic ledger storing SHA-256 payload digests. It proves non-repudiation and tamper detection mathematically.
- **No Public Gas Costs**: It intentionally does not connect to a public Ethereum or Bitcoin mainnet to avoid gas fees, confirmation latency, and reliance on external network access during demonstrations.

### 2.4 Machine Learning Corpus
- **Synthetic Training Dataset**: The ML incident likelihood model is trained on a synthetic corpus of 5,000 labeled enterprise vectors. While the feature extraction pipeline and inference service are fully production-grade, reported accuracy metrics (88.4% accuracy, 0.931 ROC-AUC) reflect performance on this synthetic benchmark.

### 2.5 Automated Remediation
- **Advisory by Design**: In strict compliance with enterprise risk governance rules, the platform **does not perform autonomous live patching or automatic firewall changes**. It acts as a decision support and recommendation system, leaving the final execution to authorized human engineers.
