"""Financial risk and Monte Carlo simulation tools using the financial engine."""

from uuid import UUID
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.asset import Asset
from app.models.risk import Risk
from app.services.ai_advisor.citations import CitationCollector
from app.services.financial_engine import calculate_eal, run_monte_carlo


async def calculate_financial_risk(
    session: AsyncSession,
    organization_id: UUID,
    asset_id: UUID | None = None,
    confidence_level: float = 0.95,
    collector: CitationCollector | None = None,
) -> dict:
    """Calculates financial loss metrics (EAL, VaR, Max Exposure) using deterministic formulas."""
    multiplier = 1.65 if confidence_level <= 0.95 else 2.33
    if asset_id:
        asset = await session.get(Asset, asset_id)
        if not asset or asset.organization_id != organization_id:
            return {"error": f"Asset {asset_id} not found."}
        b_val = float(asset.business_value)
        risks = list(await session.scalars(select(Risk).where(Risk.asset_id == asset.id)))
        avg_likelihood = sum(r.likelihood for r in risks) / len(risks) if risks else 0.4
        avg_impact = sum(r.impact for r in risks) / len(risks) if risks else 0.5
        eal_res = calculate_eal(likelihood=avg_likelihood, asset_business_value=b_val, impact=avg_impact)
        eal = float(eal_res["estimated_annual_loss"])
        exposure = float(eal_res["probable_maximum_loss"])
        var_val = round(eal * multiplier, 2)
        name = asset.name
    else:
        risks = list(await session.scalars(select(Risk).where(Risk.organization_id == organization_id)))
        eal = sum(float(r.expected_annual_loss) for r in risks)
        exposure = sum(float(r.financial_exposure) for r in risks)
        var_val = round(eal * multiplier, 2)
        name = "Enterprise Total"

    if collector:
        collector.add(
            source_type="financial",
            source_id=str(asset_id or "enterprise"),
            description=f"Financial risk for {name}: EAL ₹{eal:,.0f}, VaR({int(confidence_level*100)}%) ₹{var_val:,.0f}",
            metadata={"eal": eal, "var": var_val, "exposure": exposure},
        )

    return {
        "entity": name,
        "expected_annual_loss": round(eal, 2),
        "total_financial_exposure": round(exposure, 2),
        "value_at_risk": round(var_val, 2),
        "confidence_level": confidence_level,
        "calculation_method": "FAIR-aligned deterministic loss exceedance engine",
        "illustrative": True,
    }


def run_monte_carlo_tool(
    expected_loss: float = 10_00_000.0,
    min_loss: float = 1_00_000.0,
    max_loss: float = 50_00_000.0,
    probability: float = 0.35,
    simulations: int = 2000,
    seed: int = 42,
    collector: CitationCollector | None = None,
) -> dict:
    """Runs a Monte Carlo loss distribution simulation using the verified financial engine."""
    result = run_monte_carlo(
        expected_loss=expected_loss,
        min_loss=min_loss,
        max_loss=max_loss,
        probability=probability,
        simulations=simulations,
        seed=seed,
    )
    if collector:
        collector.add(
            source_type="monte_carlo",
            source_id=f"mc_seed_{seed}",
            description=f"Monte Carlo simulation ({simulations:,} runs): Mean loss ₹{result['mean']:,.0f}, P95 ₹{result['p95']:,.0f}",
            metadata={"mean": result["mean"], "p95": result["p95"], "simulations": simulations},
        )
    return {
        **result,
        "simulation_count": simulations,
        "seed": seed,
        "illustrative": True,
        "disclaimer": "Simulations are illustrative stochastic distributions generated from parametric loss inputs.",
    }
