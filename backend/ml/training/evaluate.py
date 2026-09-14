"""Print stored evaluation metrics if artifacts exist; otherwise train first."""

from __future__ import annotations

import json
import sys
from pathlib import Path

BACKEND = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(BACKEND))

from ml.models.incident_likelihood import IncidentLikelihoodTrainer  # noqa: E402


def main() -> None:
    metrics = Path(__file__).resolve().parents[1] / "artifacts" / "incident_likelihood_metrics.json"
    if metrics.exists():
        print(metrics.read_text(encoding="utf-8"))
        return
    trainer = IncidentLikelihoodTrainer(n_records=5000, seed=26105)
    print(json.dumps(trainer.evaluate(), indent=2))


if __name__ == "__main__":
    main()
