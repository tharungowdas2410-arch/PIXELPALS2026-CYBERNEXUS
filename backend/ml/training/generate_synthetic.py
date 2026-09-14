"""Synthetic demonstration dataset. Explicitly labelled; not production incidents."""

from __future__ import annotations

from pathlib import Path

import numpy as np
import pandas as pd

from ml.features.feature_engineering import FEATURE_COLUMNS, FEATURE_VERSION

SEED = 26105
SYNTHETIC_FLAG = True
DATASET_LABEL = "synthetic_demonstration"


def _sigmoid(value: np.ndarray) -> np.ndarray:
    return 1.0 / (1.0 + np.exp(-np.clip(value, -20, 20)))


def generate_incident_dataset(n_records: int = 5000, seed: int = SEED) -> pd.DataFrame:
    """Generate labelled rows with realistic coupling between risk drivers and incidents."""
    rng = np.random.default_rng(seed)
    criticality = rng.integers(1, 6, size=n_records).astype(float)
    vuln_count = rng.poisson(3, size=n_records).astype(float)
    crit_vuln = np.minimum(vuln_count, rng.poisson(0.7, size=n_records).astype(float))
    max_cvss = np.clip(rng.normal(6.5, 2.0, size=n_records), 0, 10)
    avg_cvss = np.clip(max_cvss - rng.uniform(0, 2.5, size=n_records), 0, 10)
    exploitability = np.clip(rng.beta(2.2, 2.8, size=n_records), 0, 1)
    external = rng.choice([0.2, 0.4, 0.7, 1.0], size=n_records, p=[0.35, 0.2, 0.15, 0.3])
    control = np.clip(rng.beta(2.0, 2.4, size=n_records), 0, 1)
    threat = np.clip(rng.beta(2.0, 3.0, size=n_records), 0, 1)
    history = rng.poisson(0.4, size=n_records).astype(float)
    age = np.clip(rng.gamma(2.0, 18.0, size=n_records), 0, 365)
    cloud = rng.choice([0.0, 1.0], size=n_records, p=[0.55, 0.45])
    inherent = np.clip(
        100 * (threat * 0.35 + (criticality / 5) * 0.25 + exploitability * 0.25 + external * 0.15),
        0,
        100,
    )
    residual = np.clip(inherent * (1.0 - control * 0.85), 0, 100)

    latent = (
        0.55 * (criticality / 5.0)
        + 0.85 * exploitability
        + 0.70 * external
        + 0.60 * np.clip(crit_vuln, 0, 3) / 3.0
        + 0.45 * threat
        + 0.35 * (residual / 100.0)
        + 0.20 * np.clip(history, 0, 4) / 4.0
        + 0.15 * (age / 180.0)
        - 0.90 * control
        - 1.15
    )
    probability = _sigmoid(latent)
    incident = (rng.random(n_records) < probability).astype(int)

    frame = pd.DataFrame(
        {
            "asset_criticality": criticality,
            "vulnerability_count": vuln_count,
            "critical_vulnerability_count": crit_vuln,
            "avg_cvss": avg_cvss,
            "max_cvss": max_cvss,
            "exploitability": exploitability,
            "external_exposure": external,
            "control_effectiveness": control,
            "threat_likelihood": threat,
            "historical_incidents": history,
            "unresolved_vuln_age_days": age,
            "environment_cloud": cloud,
            "residual_risk": residual,
            "inherent_risk": inherent,
            "incident_occurrence": incident,
            "latent_probability": probability,
            "synthetic": True,
            "dataset_label": DATASET_LABEL,
            "feature_version": FEATURE_VERSION,
            "seed": seed,
        }
    )
    missing = [name for name in FEATURE_COLUMNS if name not in frame.columns]
    if missing:
        raise ValueError(f"synthetic dataset missing features: {missing}")
    return frame


def write_incident_dataset(path: Path, n_records: int = 5000, seed: int = SEED) -> Path:
    path.parent.mkdir(parents=True, exist_ok=True)
    frame = generate_incident_dataset(n_records=n_records, seed=seed)
    frame.to_csv(path, index=False)
    return path
