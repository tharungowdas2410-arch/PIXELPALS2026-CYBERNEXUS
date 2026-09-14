"""Dashboard overview tools for the AI Risk Advisor."""

from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession

from app.services.ai_advisor.citations import CitationCollector
from app.services.dashboard_service import overview


async def get_dashboard_summary(
    session: AsyncSession,
    organization_id: UUID,
    collector: CitationCollector | None = None,
) -> dict:
    """Returns enterprise risk score, total financial exposure, EAL, critical assets, active risks, and investment opportunities."""
    data = await overview(session, organization_id)
    if collector:
        collector.add(
            source_type="dashboard",
            source_id="overview",
            description=f"Enterprise risk overview (Score: {data.get('enterprise_risk_score')}, EAL: ₹{data.get('expected_annual_loss'):,.0f})",
            metadata={
                "enterprise_risk_score": data.get("enterprise_risk_score"),
                "total_financial_exposure": data.get("total_financial_exposure"),
                "expected_annual_loss": data.get("expected_annual_loss"),
                "active_critical_risks": data.get("active_critical_risks"),
            },
        )
    return {
        "enterprise_risk_score": data.get("enterprise_risk_score", 0.0),
        "total_financial_exposure": data.get("total_financial_exposure", 0.0),
        "expected_annual_loss": data.get("expected_annual_loss", 0.0),
        "active_critical_risks": data.get("active_critical_risks", 0),
        "open_risk_count": data.get("open_risk_count", 0),
        "investment_opportunity": data.get("risk_reduction_opportunity", 0.0),
        "top_drivers": [d.get("driver") for d in data.get("top_drivers", []) if isinstance(d, dict)],
        "recent_incidents": len(data.get("recent_incidents", [])),
        "illustrative": True,
    }
