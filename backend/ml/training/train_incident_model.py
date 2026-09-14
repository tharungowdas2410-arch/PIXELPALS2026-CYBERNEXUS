"""Train the incident likelihood model and persist metrics + artifact."""

from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BACKEND = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(BACKEND))

from ml.models.incident_likelihood import IncidentLikelihoodTrainer  # noqa: E402
from ml.training.generate_synthetic import write_incident_dataset  # noqa: E402


def main() -> None:
    raw = ROOT / "data" / "raw" / "incident_likelihood_synthetic.csv"
    processed = ROOT / "data" / "processed" / "incident_likelihood_synthetic.csv"
    artifact = ROOT / "artifacts" / "incident_likelihood_v1.joblib"
    metrics_path = ROOT / "artifacts" / "incident_likelihood_metrics.json"
    write_incident_dataset(raw, n_records=5000, seed=26105)
    write_incident_dataset(processed, n_records=5000, seed=26105)
    trainer = IncidentLikelihoodTrainer(n_records=5000, seed=26105)
    trainer.train()
    trainer.save_model(artifact)
    metrics_path.write_text(json.dumps(trainer.evaluate(), indent=2), encoding="utf-8")
    print(json.dumps(trainer.evaluate(), indent=2))
    print(f"saved {artifact}")


if __name__ == "__main__":
    main()
