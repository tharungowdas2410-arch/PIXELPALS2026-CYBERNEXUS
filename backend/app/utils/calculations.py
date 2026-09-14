"""Deterministic, explainable prototype calculations.

All financial outputs are illustrative model values, not actuarial loss estimates.

Risk formulas (PHASE 2)
-----------------------
inherent_risk =
    100 × likelihood × impact × (criticality / 5) × exploitability
    × exposure_factor × threat_sophistication_factor
    clamped to [0, 100]

residual_risk =
    inherent_risk × (1 − applied_control_effectiveness)

applied_control_effectiveness =
    control.effectiveness × implementation_weight(status)

implementation_weight:
    implemented = 1.0, partial = 0.5, planned = 0.0, not_implemented = 0.0
    omitted status (no control row, or effectiveness supplied alone) = 1.0

exposure_factor:
    internet | external | public = 1.00
    partner | vendor             = 0.90
    internal | private           = 0.75
    unspecified / other          = 0.85

threat_sophistication_factor:
    no threat linked = 1.00
    otherwise        = 0.85 + 0.15 × clamp(sophistication)

risk_level(residual):
    ≤ 25 LOW, ≤ 50 MODERATE, ≤ 75 HIGH, else CRITICAL
"""

from __future__ import annotations

from dataclasses import dataclass, field

from app.models.enums import ImplementationStatus, RiskLevel

FORMULAS: dict[str, str] = {
    "inherent_risk": (
        "100 × likelihood × impact × (criticality / 5) × exploitability "
        "× exposure_factor × threat_sophistication_factor, clamped to [0, 100]"
    ),
    "residual_risk": "inherent_risk × (1 − applied_control_effectiveness)",
    "applied_control_effectiveness": "control.effectiveness × implementation_weight",
    "implementation_weight": (
        "implemented=1.0, partial=0.5, planned=0.0, not_implemented=0.0; "
        "omitted status=1.0"
    ),
    "exposure_factor": (
        "internet/external/public=1.00, partner/vendor=0.90, "
        "internal/private=0.75, other=0.85"
    ),
    "threat_sophistication_factor": (
        "1.00 if no threat is linked; otherwise 0.85 + 0.15 × sophistication"
    ),
    "expected_annual_loss": "likelihood × asset.business_value × impact",
    "risk_level": "LOW≤25, MODERATE≤50, HIGH≤75, CRITICAL>75",
}

IMPLEMENTATION_WEIGHTS: dict[str, float] = {
    ImplementationStatus.IMPLEMENTED.value: 1.0,
    ImplementationStatus.PARTIAL.value: 0.5,
    ImplementationStatus.PLANNED.value: 0.0,
    ImplementationStatus.NOT_IMPLEMENTED.value: 0.0,
}

EXPOSURE_FACTORS: dict[str, float] = {
    "internet": 1.0,
    "external": 1.0,
    "public": 1.0,
    "partner": 0.9,
    "vendor": 0.9,
    "internal": 0.75,
    "private": 0.75,
}


def clamp(value: float, lower: float = 0.0, upper: float = 1.0) -> float:
    return max(lower, min(upper, value))


def exposure_factor(exposure: str | None) -> float:
    if exposure is None or not str(exposure).strip():
        return 0.85
    return EXPOSURE_FACTORS.get(str(exposure).strip().lower(), 0.85)


def threat_sophistication_factor(sophistication: float | None) -> float:
    if sophistication is None:
        return 1.0
    return round(0.85 + 0.15 * clamp(sophistication), 4)


def implementation_weight(status: str | ImplementationStatus | None) -> float:
    if status is None:
        return 1.0
    key = status.value if isinstance(status, ImplementationStatus) else str(status).strip().lower()
    return IMPLEMENTATION_WEIGHTS.get(key, 1.0)


def applied_control_effectiveness(
    control_effectiveness: float,
    status: str | ImplementationStatus | None = None,
) -> float:
    return round(clamp(control_effectiveness) * implementation_weight(status), 4)


def inherent_risk(
    likelihood: float,
    impact: float,
    criticality: int,
    exploitability: float,
    *,
    exposure_multiplier: float = 1.0,
    threat_multiplier: float = 1.0,
) -> float:
    """inherent_risk = likelihood × impact × criticality × exploitability, scaled 0-100.

    Criticality is 1-5. The product of the four core factors is divided by 5 so a
    fully saturated input set maps to 100 before optional chain multipliers.
    """
    raw = clamp(likelihood) * clamp(impact) * max(1, min(5, criticality)) * clamp(exploitability)
    scaled = (raw / 5.0) * 100.0 * max(0.0, exposure_multiplier) * max(0.0, threat_multiplier)
    return round(min(100.0, scaled), 2)


def residual_risk(inherent: float, control_effectiveness: float) -> float:
    """residual_risk = inherent_risk × (1 - control_effectiveness)."""
    return round(max(0.0, inherent) * (1.0 - clamp(control_effectiveness)), 2)


def risk_level(score: float) -> RiskLevel:
    if score <= 25:
        return RiskLevel.LOW
    if score <= 50:
        return RiskLevel.MODERATE
    if score <= 75:
        return RiskLevel.HIGH
    return RiskLevel.CRITICAL


def expected_annual_loss(probability_of_loss: float, estimated_loss: float) -> float:
    """Illustrative EAL = probability_of_loss × estimated_loss."""
    return round(max(0.0, probability_of_loss) * max(0.0, estimated_loss), 2)


def rosi(loss_avoided: float, investment_cost: float) -> float | None:
    """ROSI = (loss_avoided - investment_cost) / investment_cost × 100.

    Returns None when investment_cost is zero to avoid division by zero.
    """
    if investment_cost == 0:
        return None
    return round(((loss_avoided - investment_cost) / investment_cost) * 100.0, 2)


@dataclass(frozen=True)
class RiskFactor:
    key: str
    label: str
    value: float | int | str | None
    normalized: float
    source: str
    explanation: str


@dataclass(frozen=True)
class RiskResult:
    inherent_risk: float
    residual_risk: float
    risk_level: RiskLevel
    drivers: list[str]
    explanation: str
    factors: list[RiskFactor] = field(default_factory=list)
    formula_trace: str = ""
    applied_control_effectiveness: float = 0.0
    formulas: dict[str, str] = field(default_factory=lambda: dict(FORMULAS))
