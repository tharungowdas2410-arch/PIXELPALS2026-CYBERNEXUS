# CYBERNEXUS ML layer (Phase 7)

Offline training + online inference for SIH 26105. The deterministic risk engine remains authoritative. These models produce **illustrative demonstration signals**, not production-accuracy forecasts.

## Layout

```
ml/
  data/raw
  data/processed
  artifacts/          # gitignored model files
  features/feature_engineering.py
  models/incident_likelihood.py
  models/risk_forecasting.py
  models/anomaly_detection.py
  training/generate_synthetic.py
  training/train_incident_model.py
  training/train_forecasting_model.py
  training/evaluate.py
  inference/predictor.py
  inference/forecaster.py
```

## Training

From `backend/`:

```
python ml/training/train_incident_model.py
python ml/training/train_forecasting_model.py
python ml/training/evaluate.py
```

Incident training uses 5,000 **labelled synthetic** rows (`dataset_label=synthetic_demonstration`). Logistic regression is the serving model (coefficient explainability). Random forest is trained only for comparison metrics.

Forecasting is not a persisted classifier. It fits moving average, exponential smoothing, and linear trend on a real residual-risk series. If fewer than 14 points exist, APIs return `insufficient historical data` and do not invent a series.

## Inference

APIs never retrain the incident model. Missing artifacts yield HTTP 503.

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/api/v1/ml/status` | Artifact + version |
| POST | `/api/v1/ml/predict-incident` | `{asset_id, vulnerability_ids?, threat_ids?}` |
| POST | `/api/v1/ml/forecast-risk` | History from DB or optional `history` |
| GET | `/api/v1/ml/anomalies` | Z-score change + Isolation Forest |
| GET | `/api/v1/ml/model-performance` | Synthetic evaluation metrics |
| GET | `/api/v1/ml/risk-signals` | Ranked asset incident probabilities |

Predictions persist to `ml_predictions`. Isolation Forest and trend fits run on the request series (unsupervised / local), which is not the same as retraining the incident classifier.

## Limitations

- Labels are synthetic. Do not treat ROC-AUC or F1 as production performance.
- No PII is used in features.
- No SHAP / deep learning.
- Residual risk from Phase 2 remains the score shown as ground truth for decisions.
