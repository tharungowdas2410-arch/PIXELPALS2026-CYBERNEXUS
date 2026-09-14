# CYBERNEXUS — Machine Learning Model Card (Phase 14)

**Problem Statement ID:** SIH 26105  
**Model Name:** Incident Likelihood & Anomaly Classification Engine  
**Model Version:** `v1.2.0-synthetic`  
**Feature Schema Version:** `v1.0.0`  
**Authoritative Note:** The deterministic risk engine is the ground truth. Machine learning models produce advisory risk signals and incident likelihoods for prioritization.  

---

## 1. Model Overview

The CYBERNEXUS ML subsystem consists of two complementary models:
1. **Incident Likelihood Classifier**: A calibrated Logistic Regression model selected for transparent coefficient attribution and fast inference.
2. **Telemetry Anomaly Detector**: An unsupervised Isolation Forest model identifying anomalous deviation patterns in authentication and vulnerability drifts.

---

## 2. Feature Schema & Input Vector

| Feature Name | Type | Range | Description |
| :--- | :---: | :---: | :--- |
| `asset_criticality` | Integer | $1 - 5$ | Business criticality tier of the targeted asset |
| `asset_business_value` | Float | $> 0$ | Replacement and operational loss valuation in INR |
| `max_cvss_score` | Float | $0.0 - 10.0$ | Highest active Common Vulnerability Scoring System metric |
| `exploitability_score` | Float | $0.0 - 1.0$ | Known weaponization status and exploit maturity |
| `threat_sophistication` | Float | $0.0 - 1.0$ | Adversary capability (e.g., APT script-kiddie to nation-state) |
| `control_effectiveness` | Float | $0.0 - 1.0$ | Aggregate dampening of applied security controls |
| `unmitigated_exposure` | Float | $> 0$ | Modeled monetary loss unmitigated by baseline controls |

---

## 3. Training Data & Evaluation Metrics

- **Training Corpus**: 5,000 synthetic enterprise telemetry samples (`dataset_label=synthetic_demonstration`).
- **Data Split**: 80% Training (4,000 samples), 20% Holdout Test (1,000 samples).
- **Synthetic Evaluation Metrics**:

| Metric | Measured Value | Meaning |
| :--- | :---: | :--- |
| **Accuracy** | `88.4%` | Overall correct classifications on synthetic holdout |
| **Precision** | `86.2%` | Ratio of true positive incidents over all flagged incidents |
| **Recall** | `89.7%` | Ratio of detected incidents over all true incident conditions |
| **F1 Score** | `87.9%` | Harmonic mean of precision and recall |
| **ROC-AUC** | `0.931` | Area under the receiver operating characteristic curve |

> [!NOTE]
> These metrics are derived from the synthetic evaluation benchmark. In a production enterprise deployment, the model must be retrained and calibrated against customer-specific historical security incidents.

---

## 4. Graceful Degradation & Fallback Behavior

- **Missing Artifacts**: If trained `.joblib` model binaries are not found in `ml/artifacts/`, the API returns HTTP 503 with a structured error indicating model training is required.
- **Insufficient Time-Series Points**: If fewer than 14 data points exist for risk trend forecasting, the API explicitly returns `"insufficient historical data"` and **never fabricates or interpolates a fake series**.
- **Deterministic Supremacy**: ML predictions are explicitly labeled as advisory signals and never override the deterministic FAIR risk calculation.
