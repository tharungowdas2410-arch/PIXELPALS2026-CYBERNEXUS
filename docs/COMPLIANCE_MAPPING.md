# CyberNexus Compliance Framework Alignment & Control Mapping

> [!IMPORTANT]
> **DISCLAIMER**: This document describes **Control Alignment Assessments** performed by the CyberNexus platform. It reflects technical telemetry and configuration mapping against published security baselines. It is **not** an official statutory audit certification or endorsement by NIST, ISO, CIS, RBI, or SEBI.

---

## 1. Overview & Architecture Alignment

CyberNexus provides continuous, quantifiable assurance across major international and national cybersecurity standards:
- **NIST Cybersecurity Framework (CSF) 2.0**
- **ISO/IEC 27001:2022** (Information Security Management Systems)
- **CIS Critical Security Controls v8**
- **Reserve Bank of India (RBI) Cyber Security Framework for Banks / NBFCs**
- **Securities and Exchange Board of India (SEBI) Cybersecurity & Cyber Resilience Framework (CSCRF)**

---

## 2. NIST Cybersecurity Framework 2.0 Alignment

| Function | Category | Subcategory / Requirement | CyberNexus Platform Technical Implementation |
|:---|:---|:---|:---|
| **GOVERN (GV)** | Organizational Context & Risk Strategy (GV.OC) | Cyber risk management strategy integrated with business decisions | Expected Annual Loss (EAL) and 95% Value at Risk (VaR) quantify cyber risk in INR/currency for Board review. |
| **IDENTIFY (ID)** | Asset Management (ID.AM) | Inventory of physical/virtual devices, software, systems, and data | Multi-tenant Asset Registry tracks hardware, cloud resources, microservices, data sensitivity, and business value. |
| **IDENTIFY (ID)** | Risk Assessment (ID.RA) | Threats, vulnerabilities, and potential business impacts identified | Graph-derived attack paths (Neo4j) map multi-hop exploitability from perimeter to critical crown jewel databases. |
| **PROTECT (PR)** | Identity Management & Access Control (PR.AC) | Access to assets managed with principle of least privilege | 5-tier centralized RBAC, Argon2id password hashing, brute-force lockout, and IAM telemetry anomaly detection. |
| **PROTECT (PR)** | Data Security (PR.DS) | Data-at-rest and data-in-transit protected | Strict tenant isolation, CSPM data exposure alerts, and AES-256 / TLS 1.3 verification signals. |
| **DETECT (DE)** | Continuous Monitoring (DE.CM) | Assets monitored to identify cybersecurity events | Ingestion pipeline processes real-time telemetry from SIEM, EDR, CSPM, and CloudTrail webhooks. |
| **RESPOND (RS)** | Incident Response (RS.RP) | Incidents declared, contained, and escalated | Incident lifecycle tracker with automated severity assessment, breach cost modeling, and MTTR tracking. |
| **RECOVER (RC)** | Recovery Planning (RC.RP) | Resilience and disaster recovery strategies maintained | Financial loss engine quantifies business downtime costs; investment optimizer prioritizes backup & DR investments. |

---

## 3. ISO/IEC 27001:2022 Control Mapping

| Control Clause | Control Title | CyberNexus Capability & Evidence Artifact |
|:---|:---|:---|
| **A.5.15** | Access Control | Centralized permission registry (`ROLE_PERMISSIONS`) enforcing strict role separation between Admin, CISO, Analyst, Risk Manager, and Executive. |
| **A.5.24** | Incident Management Planning | Incident API routes with severity categorization, remediation workflows, and timeline audit records. |
| **A.8.8** | Management of Technical Vulnerabilities | Real-time vulnerability ingestion (CVSS scores, exploitability, patch status) linked directly to impacted assets. |
| **A.8.16** | Monitoring Activities | Continuous telemetry event stream (`/api/v1/integrations/events`) normalizing security events into unified schemas. |
| **A.8.20** | Network Security | Attack path intelligence models network lateral movement hops and firewall segmentation bypass vectors. |
| **A.8.24** | Use of Cryptography | Cryptographic evidence notarization onto blockchain ledger generating SHA-256 proofs and verification receipts. |

---

## 4. CIS Critical Security Controls v8

| CIS Control | Safeguard Description | CyberNexus Platform Feature |
|:---|:---|:---|
| **CIS 1** | Inventory and Control of Enterprise Assets | Real-time inventory tracking asset criticality (1-5), environment, owner, exposure, and business value. |
| **CIS 4** | Secure Configuration of Enterprise Assets | CSPM telemetry connector ingesting misconfiguration alerts, open ports, and unencrypted storage alerts. |
| **CIS 6** | Access Control Management | IAM connector flagging MFA-disabled accounts, dormant privileged accounts, and credential abuse spikes. |
| **CIS 7** | Continuous Vulnerability Management | Automated risk recalculation factoring in vulnerability severity, exploit maturity, and compensating controls. |
| **CIS 13** | Network Monitoring and Defense | Attack path discovery identifying high-risk entry points and perimeter traversal sequences. |

---

## 5. RBI Cyber Security Framework Alignment

| RBI Domain | Mandate Requirement | CyberNexus Technical Mechanism |
|:---|:---|:---|
| **Board Oversight** | Board approved cyber risk appetite and quantitative reporting | Executive Risk Dashboard, Board Decision Briefs, and VaR/EAL metrics translated into financial terms. |
| **SOC & 24x7 Monitoring** | Continuous monitoring of security anomalies and threats | Real-time telemetry ingestion with sliding-window rate limiting and event correlation. |
| **Payment Security** | Dual-factor authentication & isolation of payment switch networks | Crown jewel asset tagging; attack path simulator tests if payment engines are reachable from DMZ. |
| **Vendor & Cloud Risk** | Cloud configuration monitoring and third-party risk assessment | Multi-tenant organization isolation and CSPM cloud storage exposure tracking. |

---

## 6. SEBI Cyber Security & Resilience Framework (CSCRF)

| SEBI Guideline | Regulatory Objective | CyberNexus Implementation |
|:---|:---|:---|
| **Cyber Resilience** | Recovery Point Objective (RPO < 15 min) and business continuity | Downtime financial impact modeling and investment optimization prioritizing active-active failover. |
| **VAPT & Threat Intel** | Comprehensive identification of attack vectors and threat actors | Mitre ATT&CK-aligned threat actor modeling, likelihood ratings, and attack path graph traversal. |
| **Audit Trails & Evidence** | Tamper-evident, non-repudiable audit trails retained for compliance | Append-only `AuditLog` table with request correlation IDs and SHA-256 blockchain evidence notarization. |
