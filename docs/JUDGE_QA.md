# CyberNexus: SIH 2026 Judge Q&A Guide
**Problem Statement 26105**: *AI-Powered Continuous Cyber Risk Quantification and Investment Optimization Platform*

This document provides concise, technically rigorous, and honest answers to the 20 most critical questions anticipated from SIH judges and industry evaluators.

---

### Q1: Why is this different from a normal SIEM?
**A**: A traditional SIEM (e.g., Splunk, Microsoft Sentinel) is an operational log aggregator and alert detection system. It generates thousands of alerts that overwhelm analysts without answering the executive question: *"What is our financial exposure, and where should we invest our budget?"*  
CyberNexus consumes SIEM/EDR alerts, maps them onto a graph to discover end-to-end multi-hop attack paths, quantifies the risk into Expected Annual Loss (EAL in ₹), and uses mathematical optimization (OR-Tools) to allocate security budgets for maximum risk reduction.

---

### Q2: Why use AI?
**A**: We use AI strictly where natural language reasoning and contextual synthesis are required:
1. Translating complex technical telemetry and graph attack paths into clear, C-level executive explanations.
2. Answering ad-hoc strategic inquiries (e.g., *"What happens if we lose ₹25 lakh of our budget?"*) using grounded tools.  
**Critical distinction**: AI does *not* invent the risk scores or financial loss calculations. All numbers come from deterministic engines (FAIR, Monte Carlo, OR-Tools).

---

### Q3: Why convert cyber risk into money?
**A**: Executive boards, CISOs, and CFOs cannot make investment decisions based on vague heatmaps ("Red/Amber/Green") or CVSS 9.8 scores. A CVSS 9.8 on an isolated test machine has zero business impact, whereas a CVSS 7.2 on a payment database could bankrupt an enterprise. Converting cyber risk into Expected Annual Loss (₹ EAL) and 95% Value at Risk (VaR) allows security to be evaluated as a measurable financial balance-sheet liability with clear Return on Security Investment (ROSI).

---

### Q4: How do you calculate EAL?
**A**: Based on the Open FAIR (Factor Analysis of Information Risk) standard:
$$\text{EAL} = \text{Loss Event Frequency (LEF)} \times \text{Loss Magnitude (LM)}$$
- **LEF**: Derived from threat likelihood, vulnerability exploitability, control effectiveness, and real-time telemetry anomalies.
- **LM**: Aggregates primary loss (asset replacement, downtime revenue loss) and secondary loss (regulatory fines under DPDP/GDPR, forensic response, reputation damage).

---

### Q5: How does Monte Carlo help?
**A**: Cyber risk is non-linear and characterized by low-frequency, high-impact "black swan" events. A static average EAL hides tail risk. CyberNexus runs 10,000 Monte Carlo iterations sampling from log-normal loss distributions to compute **95% Value at Risk (VaR)** and loss exceedance curves. This tells the CFO: *"In 95% of years, your cyber losses will not exceed ₹1.82 Crore, but you have a 5% tail risk of ₹3.4 Crore."*

---

### Q6: How does the optimizer work?
**A**: It models security budgeting as a **0-1 Multi-Dimensional Knapsack Problem** solved using Mixed Integer Linear Programming (MILP). It selects a portfolio of security controls to maximize risk reduction or loss avoided subject to:
1. Total Budget constraint ($\sum c_i x_i \le B$)
2. Control prerequisite dependencies ($x_{\text{EDR}} \le x_{\text{MFA}}$)
3. Mutually exclusive control sets ($\sum x_k \le 1$)
4. Maximum implementation capacity limits

---

### Q7: Why OR-Tools?
**A**: Google OR-Tools is an industry-standard, production-grade constraint optimization suite. Unlike simple heuristics or greedy sorting (which get trapped in local optima and fail on complex dependency constraints), OR-Tools uses branch-and-bound and cutting-plane algorithms to guarantee global Pareto optimality. For resilience, CyberNexus also includes a greedy heuristic fallback if solver binaries are missing.

---

### Q8: Why Neo4j?
**A**: Vulnerabilities do not exist in silos; attackers exploit multi-hop chains across systems. Relational databases require expensive, recursive recursive joins to trace multi-tier relationships. Neo4j stores assets, vulnerabilities, identities, and controls as nodes and edges, allowing millisecond Cypher graph queries to identify critical attack paths from the Internet perimeter to crown jewel databases and calculate blast radii.

---

### Q9: Why blockchain?
**A**: Security decisions, compliance attestations, and risk sign-offs are frequent targets of post-incident blame shifting and audit disputes. CyberNexus uses an append-only cryptographic evidence ledger to anchor decision records, optimizer outputs, and risk assessments into an immutable hash chain (SHA-256 with Merkle verification), guaranteeing non-repudiation for auditors, insurers, and regulators.

---

### Q10: Why is blockchain not the risk engine?
**A**: Blockchains are distributed, immutable ledgers designed for consensus and verification—they are fundamentally unsuitable for high-throughput numeric simulations like Monte Carlo or real-time graph traversals. Putting real-time telemetry on-chain introduces massive latency, high costs, and privacy leaks. We maintain strict architectural separation: **computation occurs in high-performance engines (PostgreSQL, Neo4j, Python), while cryptographic proofs are committed to the ledger**.

---

### Q11: How does continuous telemetry work?
**A**: Telemetry enters via authenticated REST endpoints and HMAC-SHA256 signed webhooks (`/api/v1/telemetry/webhook`). The normalizer maps vendor-specific events into standardized `TelemetryEvent` structures. Event processing rules dynamically adjust asset exposure factors, update vulnerability exploitation indicators, elevate threat actor likelihoods, and trigger asynchronous recalculation of EAL and attack paths.

---

### Q12: How do you prevent AI hallucinations?
**A**: Through strict Retrieval-Augmented Generation (RAG) and tool grounding:
1. The AI Advisor cannot generate financial figures or risk scores out of thin air.
2. The LLM is restricted to calling deterministic backend tools (`query_organization_metrics`, `calculate_financial_risk`, `optimize_investments`).
3. The prompt explicitly instructs the model to state "Data unavailable" if a tool returns no records.
4. An offline deterministic expert fallback operates with 100% mathematical consistency if LLM APIs are disabled.

---

### Q13: How do you prevent prompt injection?
**A**: We employ defense-in-depth:
1. Input sanitization detects common injection patterns (`ignore previous instructions`, `system prompt`, `sudo`).
2. Hardcoded system guardrails restrict the assistant's persona and mandate tool usage.
3. The LLM has **zero direct access** to database connections, shell commands, or raw SQL/Cypher queries.
4. Tenant isolation is strictly enforced at the Python service layer: the user's authenticated `organization_id` is injected into tool calls by the backend, not the prompt.

---

### Q14: How do you isolate organizations?
**A**: Strict Multi-Tenant isolation:
1. Every database query in SQLAlchemy includes `filter(Model.organization_id == current_user.organization_id)`.
2. The backend never accepts `organization_id` from the client request body or query parameter for authorization—it is extracted directly from the validated JWT token.
3. Cross-tenant access attempts return HTTP 404 (Not Found) or 403 (Forbidden) to prevent IDOR scanning.

---

### Q15: What happens if AI is unavailable?
**A**: The platform features **Graceful Degradation**. If OpenAI API keys are absent, network connectivity drops, or rate limits are reached, the AI Advisor seamlessly switches to an internal **Deterministic Heuristic Advisor**. This fallback inspects live database metrics and returns structured, mathematical executive answers without failing.

---

### Q16: What happens if Neo4j is unavailable?
**A**: Neo4j is treated as an optional high-fidelity graph acceleration layer. Health check probes (`/health/ready`) flag Neo4j status as `DEGRADED (optional: true)`. Core risk calculations, PostgreSQL asset registries, EAL financial modeling, and investment optimization continue to operate with 100% fidelity using tabular relational models.

---

### Q17: Is the ML model trained on real enterprise data?
**A**: **No, and we are completely transparent about this.** For SIH 2026, the model was trained on a calibrated, synthetic dataset generated according to MITRE ATT&CK and Open FAIR distributions. In a production enterprise deployment, the model weights would be fine-tuned on the customer's historical incident logs and telemetry. We provide full model cards and evaluation metrics (`docs/ML_MODEL_CARD.md`).

---

### Q18: How would this integrate with SIEM/EDR/IAM?
**A**: In this demo build, we provide pre-built mock connectors and HMAC webhook endpoints (`/api/v1/telemetry/events`, `/api/v1/telemetry/webhook`) that accept standard JSON schemas mirroring Splunk HEC, CrowdStrike Falcon Streaming API, and AWS CloudTrail. In production, connectors would run as lightweight containerized collectors using these exact schemas.

---

### Q19: How does this scale?
**A**: 
- **Stateless Application Layer**: FastAPI application instances scale horizontally behind a load balancer.
- **Relational Partitioning**: PostgreSQL tables use tenant-based partitioning on `organization_id`.
- **Async Execution**: Heavy Monte Carlo simulations and graph traversals can be offloaded to worker pools without blocking API event loops.
- **Efficient Caching**: Read-heavy executive metrics are cached with short TTLs invalidated upon new telemetry events.

---

### Q20: What would you build next?
**A**:
1. **Automated Playbook Orchestration**: Bi-directional integration with SOAR platforms (e.g., Cortex XSOAR) to initiate human-in-the-loop remediation tickets based on approved investment portfolios.
2. **Dynamic Cyber Insurance Underwriting**: Exporting cryptographic risk evidence directly into standardized insurance telemetry APIs for dynamic premium reduction.
3. **Federated Learning**: Enabling cross-organization threat likelihood training without sharing proprietary asset or breach telemetry.
