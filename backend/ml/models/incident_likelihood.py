from __future__ import annotations

from abc import ABC, abstractmethod
from pathlib import Path
from typing import Any

import joblib
import numpy as np
from sklearn.ensemble import RandomForestClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (
    accuracy_score,
    f1_score,
    precision_score,
    recall_score,
    roc_auc_score,
)
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler

from ml.features.feature_engineering import FEATURE_COLUMNS, FEATURE_VERSION, rows_to_matrix
from ml.training.generate_synthetic import DATASET_LABEL, generate_incident_dataset

MODEL_NAME = "incident_likelihood"
MODEL_VERSION = "v1.0"
DEFAULT_SEED = 26105


class ModelTrainingService(ABC):
    @abstractmethod
    def train(self) -> Any: ...

    @abstractmethod
    def evaluate(self) -> dict[str, Any]: ...

    @abstractmethod
    def save_model(self, path: Path) -> Path: ...

    @abstractmethod
    def load_model(self, path: Path) -> Any: ...


def _metrics(y_true: np.ndarray, y_prob: np.ndarray) -> dict[str, float]:
    y_pred = (y_prob >= 0.5).astype(int)
    return {
        "accuracy": round(float(accuracy_score(y_true, y_pred)), 4),
        "precision": round(float(precision_score(y_true, y_pred, zero_division=0)), 4),
        "recall": round(float(recall_score(y_true, y_pred, zero_division=0)), 4),
        "f1": round(float(f1_score(y_true, y_pred, zero_division=0)), 4),
        "roc_auc": round(float(roc_auc_score(y_true, y_prob)), 4),
    }


class IncidentLikelihoodTrainer(ModelTrainingService):
    def __init__(self, n_records: int = 5000, seed: int = DEFAULT_SEED) -> None:
        self.n_records = n_records
        self.seed = seed
        self.pipeline: Pipeline | None = None
        self.comparison: dict[str, dict[str, float]] = {}
        self.selected_model = "logistic_regression"
        self.evaluation: dict[str, Any] = {}

    def train(self) -> Pipeline:
        frame = generate_incident_dataset(n_records=self.n_records, seed=self.seed)
        matrix = rows_to_matrix(frame.to_dict(orient="records"))
        labels = frame["incident_occurrence"].to_numpy()
        x_train, x_val, y_train, y_val = train_test_split(
            matrix,
            labels,
            test_size=0.2,
            random_state=self.seed,
            stratify=labels,
        )
        logistic = Pipeline(
            [
                ("scaler", StandardScaler()),
                (
                    "model",
                    LogisticRegression(max_iter=400, random_state=self.seed),
                ),
            ]
        )
        forest = RandomForestClassifier(
            n_estimators=80,
            max_depth=8,
            random_state=self.seed,
            n_jobs=1,
        )
        logistic.fit(x_train, y_train)
        forest.fit(x_train, y_train)
        log_metrics = _metrics(y_val, logistic.predict_proba(x_val)[:, 1])
        rf_metrics = _metrics(y_val, forest.predict_proba(x_val)[:, 1])
        self.comparison = {
            "logistic_regression": log_metrics,
            "random_forest": rf_metrics,
        }
        # Primary model is logistic regression for coefficient explainability.
        self.pipeline = logistic
        self.selected_model = "logistic_regression"
        self.evaluation = {
            "model_name": MODEL_NAME,
            "model_version": MODEL_VERSION,
            "feature_version": FEATURE_VERSION,
            "selected_model": self.selected_model,
            "training_records": int(len(y_train)),
            "validation_records": int(len(y_val)),
            "dataset_label": DATASET_LABEL,
            "evaluation_dataset": "Synthetic demonstration data",
            "seed": self.seed,
            "metrics": log_metrics,
            "comparison": self.comparison,
            "feature_columns": list(FEATURE_COLUMNS),
        }
        return logistic

    def evaluate(self) -> dict[str, Any]:
        if not self.evaluation:
            self.train()
        return self.evaluation

    def save_model(self, path: Path) -> Path:
        if self.pipeline is None:
            self.train()
        path.parent.mkdir(parents=True, exist_ok=True)
        joblib.dump(
            {
                "pipeline": self.pipeline,
                "evaluation": self.evaluation,
                "model_name": MODEL_NAME,
                "model_version": MODEL_VERSION,
                "feature_version": FEATURE_VERSION,
                "feature_columns": list(FEATURE_COLUMNS),
            },
            path,
        )
        return path

    def load_model(self, path: Path) -> Pipeline:
        payload = joblib.load(path)
        self.pipeline = payload["pipeline"]
        self.evaluation = payload.get("evaluation", {})
        return self.pipeline
