"""Machine learning risk signal and anomaly tools."""

from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession

from app.services.ai_advisor.citations import CitationCollector
from app.services.ml_risk_service import detect_anomalies, risk_signals
from app.services.risk_forecast_service import forecast_risk_for_org


async def get_ml_risk_signals_tool(
    session: AsyncSession,
    organization_id: UUID,
    limit: int = 5,
    collector: CitationCollector | None = None,
) -> dict:
    """Fetches ML incident probability signals, risk forecasts, and anomalous behavior detections."""
    signals_data = await risk_signals(session, organization_id, limit=limit)
    anomalies_data = await detect_anomalies(session, organization_id)
    forecast_data = await forecast_risk_for_org(session, organization_id)

    if collector:
        collector.add(
            source_type="ml_signals",
            source_id="ml_incident_v1",
            description=f"ML incident risk signals (Signals evaluated: {len(signals_data.get('signals', []))}, Anomalies: {anomalies_data.get('anomaly_detected')})",
            metadata={
                "model_version": signals_data.get("model_version"),
                "anomaly_detected": anomalies_data.get("anomaly_detected"),
            },
        )

    return {
        "incident_signals": signals_data.get("signals", [])[:limit],
        "anomalies": {
            "detected": anomalies_data.get("anomaly_detected", False),
            "asset_anomalies": len(anomalies_data.get("asset_anomalies", [])),
        },
        "forecast_30_days": forecast_data.get("forecast", {}).get("30_days"),
        "model_name": signals_data.get("model_name"),
        "model_version": signals_data.get("model_version"),
        "feature_version": signals_data.get("feature_version"),
        "illustrative": True,
    }
