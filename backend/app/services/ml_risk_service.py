"""Build features from live inventory and run offline-trained inference."""

from __future__ import annotations

import json
from datetime import UTC, datetime
from pathlib import Path
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.asset import Asset
from app.models.control import Control
from app.models.enums import RemediationStatus, Severity
from app.models.incident import Incident
from app.models.ml_prediction import MLPrediction
from app.models.risk import Risk
from app.models.threat import Threat
from app.models.vulnerability import Vulnerability
from app.services.query import get_asset_for_org
from app.utils.calculations import applied_control_effectiveness
from ml.features.feature_engineering import FEATURE_VERSION
from ml.inference.predictor import IncidentPredictor, predictor
from ml.models.anomaly_detection import isolation_forest_anomalies, zscore_change_anomalies
from ml.models.incident_likelihood import MODEL_NAME, MODEL_VERSION

OPEN_REMEDIATION = {RemediationStatus.OPEN, RemediationStatus.IN_PROGRESS}


def _cvss(vuln: Vulnerability) -> float:
    if vuln.cvss_score is not None:
        return float(vuln.cvss_score)
    mapping = {Severity.CRITICAL: 9.5, Severity.HIGH: 7.5, Severity.MEDIUM: 5.0, Severity.LOW: 2.5}
    return mapping.get(vuln.severity, 0.0)


def _is_critical(vuln: Vulnerability) -> bool:
    return vuln.severity == Severity.CRITICAL or _cvss(vuln) >= 9.0


async def build_asset_features(
    session: AsyncSession,
    organization_id: UUID,
    asset: Asset,
    *,
    vulnerability_ids: list[UUID] | None = None,
    threat_ids: list[UUID] | None = None,
) -> dict:
    vuln_query = select(Vulnerability).where(Vulnerability.asset_id == asset.id)
    if vulnerability_ids:
        vuln_query = vuln_query.where(Vulnerability.id.in_(vulnerability_ids))
    vulns = list(await session.scalars(vuln_query))
    scores = [_cvss(item) for item in vulns]
    open_vulns = [item for item in vulns if item.remediation_status in OPEN_REMEDIATION]
    now = datetime.now(UTC)
    ages = []
    for item in open_vulns:
        stamp = item.discovered_at or item.created_at
        if stamp is not None:
            if stamp.tzinfo is None:
                stamp = stamp.replace(tzinfo=UTC)
            ages.append(max(0.0, (now - stamp).total_seconds() / 86400.0))

    threat_query = select(Threat).where(Threat.active.is_(True))
    if threat_ids:
        threat_query = select(Threat).where(Threat.id.in_(threat_ids))
    threats = list(await session.scalars(threat_query))
    controls = list(await session.scalars(select(Control).where(Control.organization_id == organization_id)))
    applied = [applied_control_effectiveness(item.effectiveness, item.implementation_status) for item in controls]
    risks = list(
        await session.scalars(
            select(Risk).where(Risk.organization_id == organization_id, Risk.asset_id == asset.id)
        )
    )
    incidents = list(await session.scalars(select(Incident).where(Incident.organization_id == organization_id)))
    asset_name = (asset.name or "").lower()
    related_incidents = [
        item
        for item in incidents
        if asset_name
        and any(asset_name in str(ref).lower() for ref in (item.affected_assets or []))
    ]

    return {
        "asset_id": str(asset.id),
        "asset_criticality": asset.criticality,
        "vulnerability_count": len(vulns),
        "critical_vulnerability_count": sum(1 for item in vulns if _is_critical(item)),
        "avg_cvss": sum(scores) / len(scores) if scores else 0.0,
        "max_cvss": max(scores) if scores else 0.0,
        "exploitability": max((item.exploitability for item in vulns), default=0.3),
        "exposure": asset.exposure,
        "environment": asset.environment,
        "control_effectiveness": max(applied) if applied else 0.3,
        "threat_likelihood": max((item.likelihood for item in threats), default=0.3),
        "historical_incidents": float(len(related_incidents) or len(incidents)),
        "unresolved_vuln_age_days": max(ages) if ages else 0.0,
        "residual_risk": max((item.residual_risk for item in risks), default=0.0),
        "inherent_risk": max((item.risk_score for item in risks), default=0.0),
    }


async def persist_prediction(
    session: AsyncSession,
    *,
    organization_id: UUID,
    asset_id: UUID | None,
    prediction_type: str,
    value: float,
    result: dict,
) -> MLPrediction:
    row = MLPrediction(
        organization_id=organization_id,
        asset_id=asset_id,
        model_name=result.get("model_name", MODEL_NAME),
        model_version=result.get("model_version", MODEL_VERSION),
        prediction_type=prediction_type,
        prediction_value=value,
        confidence=result.get("confidence") or result.get("incident_probability"),
        top_factors=result.get("top_factors") or result.get("possible_contributing_factors") or [],
        feature_version=result.get("feature_version", FEATURE_VERSION),
        extras={
            "illustrative": True,
            "evaluation_dataset": result.get("evaluation_dataset", "Synthetic demonstration data"),
            "status": result.get("status"),
            "trend": result.get("trend"),
        },
    )
    session.add(row)
    await session.commit()
    await session.refresh(row)
    return row


def _loaded_predictor() -> IncidentPredictor:
    try:
        predictor.load()
    except FileNotFoundError as exc:
        raise HTTPException(
            status.HTTP_503_SERVICE_UNAVAILABLE,
            "Incident model is not trained. Run backend/ml/training/train_incident_model.py",
        ) from exc
    return predictor


async def predict_incident(
    session: AsyncSession,
    organization_id: UUID,
    asset_id: UUID,
    vulnerability_ids: list[UUID] | None = None,
    threat_ids: list[UUID] | None = None,
) -> dict:
    asset = await get_asset_for_org(session, organization_id, asset_id)
    features = await build_asset_features(
        session,
        organization_id,
        asset,
        vulnerability_ids=vulnerability_ids,
        threat_ids=threat_ids,
    )
    result = _loaded_predictor().predict(features)
    await persist_prediction(
        session,
        organization_id=organization_id,
        asset_id=asset.id,
        prediction_type="incident_likelihood",
        value=result["incident_probability"],
        result=result,
    )
    return {
        **result,
        "asset_id": str(asset.id),
        "asset_name": asset.name,
        "deterministic_residual_risk": features["residual_risk"],
        "disclaimer": "ML output is a demonstration signal. Deterministic residual risk remains authoritative.",
        "illustrative": True,
    }


async def risk_signals(session: AsyncSession, organization_id: UUID, limit: int = 8) -> dict:
    assets = list(await session.scalars(select(Asset).where(Asset.organization_id == organization_id)))
    ranked: list[dict] = []
    for asset in assets[:25]:
        features = await build_asset_features(session, organization_id, asset)
        prediction = _loaded_predictor().predict(features)
        ranked.append(
            {
                "asset_id": str(asset.id),
                "asset_name": asset.name,
                "incident_probability": prediction["incident_probability"],
                "risk_level": prediction["risk_level"],
                "top_factors": prediction["top_factors"],
                "residual_risk": features["residual_risk"],
            }
        )
    ranked.sort(key=lambda item: item["incident_probability"], reverse=True)
    return {
        "signals": ranked[:limit],
        "model_name": MODEL_NAME,
        "model_version": MODEL_VERSION,
        "feature_version": FEATURE_VERSION,
        "illustrative": True,
        "disclaimer": "Signals are generated from a synthetic-trained model and do not replace engine scores.",
    }


async def detect_anomalies(session: AsyncSession, organization_id: UUID) -> dict:
    risks = list(
        await session.scalars(
            select(Risk).where(Risk.organization_id == organization_id).order_by(Risk.calculated_at.asc())
        )
    )
    series = [item.residual_risk for item in risks]
    zscore = zscore_change_anomalies(series)
    assets = list(await session.scalars(select(Asset).where(Asset.organization_id == organization_id)))
    rows = []
    for asset in assets:
        features = await build_asset_features(session, organization_id, asset)
        rows.append(features)
    forest = isolation_forest_anomalies(rows)
    payload = {
        "series_anomaly": zscore,
        "asset_anomalies": forest,
        "anomaly_detected": bool(zscore.get("anomaly_detected") or forest),
        "illustrative": True,
    }
    if payload["anomaly_detected"]:
        await persist_prediction(
            session,
            organization_id=organization_id,
            asset_id=None,
            prediction_type="anomaly",
            value=1.0 if zscore.get("anomaly_detected") else float(len(forest)),
            result={"top_factors": zscore.get("possible_contributing_factors") or [], "feature_version": FEATURE_VERSION},
        )
    return payload


def model_status() -> dict:
    artifact = Path(__file__).resolve().parents[2] / "ml" / "artifacts" / "incident_likelihood_v1.joblib"
    ready = artifact.exists()
    evaluation = {}
    if ready:
        evaluation = predictor.load().get("evaluation", {})
    return {
        "incident_model_ready": ready,
        "model_name": MODEL_NAME,
        "model_version": MODEL_VERSION,
        "feature_version": FEATURE_VERSION,
        "artifact_path": str(artifact),
        "evaluation_dataset": evaluation.get("evaluation_dataset", "Synthetic demonstration data"),
        "illustrative": True,
    }


def model_performance() -> dict:
    status_payload = model_status()
    if not status_payload["incident_model_ready"]:
        raise HTTPException(
            status.HTTP_503_SERVICE_UNAVAILABLE,
            "Incident model is not trained. Run backend/ml/training/train_incident_model.py",
        )
    evaluation = predictor.load().get("evaluation", {})
    forecast_metrics = Path(__file__).resolve().parents[2] / "ml" / "artifacts" / "risk_forecasting_metrics.json"
    extra = {}
    if forecast_metrics.exists():
        extra["forecasting"] = json.loads(forecast_metrics.read_text(encoding="utf-8"))
    return {
        **evaluation,
        **extra,
        "disclaimer": "Metrics are from synthetic demonstration data, not production incidents.",
        "illustrative": True,
    }
