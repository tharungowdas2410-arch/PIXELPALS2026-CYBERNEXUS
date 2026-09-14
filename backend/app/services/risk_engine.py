"""Deterministic cyber risk scoring. Not an ML model.

Connects Organization → Asset → Vulnerability → Threat → Control → Risk.
"""

from __future__ import annotations

from collections import Counter
from typing import Any

from app.models.enums import RiskLevel, RiskStatus
from app.models.risk import Risk
from app.utils.calculations import (
    FORMULAS,
    RiskFactor,
    RiskResult,
    applied_control_effectiveness,
    exposure_factor,
    inherent_risk,
    residual_risk,
    risk_level,
    threat_sophistication_factor,
)

DEFAULT_EXPLOITABILITY = 0.3


def build_drivers(
    *,
    criticality: int,
    exploitability: float,
    exposure: str | None,
    control_effectiveness: float,
    likelihood: float,
    threat_likelihood: float | None = None,
    vulnerability_severity: str | None = None,
    data_sensitivity: str | None = None,
    implementation_status: str | None = None,
) -> list[str]:
    drivers: list[str] = []
    if criticality >= 4:
        drivers.append("High asset criticality")
    if exploitability >= 0.6:
        drivers.append("Known exploitable vulnerability")
    if (exposure or "").lower() in {"internet", "external", "public"}:
        drivers.append("External exposure")
    if control_effectiveness < 0.5:
        drivers.append("Low control effectiveness")
    if implementation_status in {"planned", "not_implemented"}:
        drivers.append("Control not implemented")
    if likelihood >= 0.5 or (threat_likelihood is not None and threat_likelihood >= 0.5):
        drivers.append("Elevated threat likelihood")
    if (vulnerability_severity or "").lower() == "critical":
        drivers.append("Critical vulnerability severity")
    if (data_sensitivity or "").lower() in {"high", "restricted", "confidential", "secret"}:
        drivers.append("Sensitive data on asset")
    if not drivers:
        drivers.append("Composite residual score from the illustrative model")
    return drivers


def _factor(
    key: str,
    label: str,
    value: float | int | str | None,
    normalized: float,
    source: str,
    explanation: str,
) -> RiskFactor:
    return RiskFactor(
        key=key,
        label=label,
        value=value,
        normalized=round(max(0.0, min(1.0, normalized)), 4),
        source=source,
        explanation=explanation,
    )


def build_factors(
    *,
    likelihood: float,
    impact: float,
    criticality: int,
    exploitability: float,
    exposure: str | None,
    exposure_multiplier: float,
    threat_likelihood: float | None,
    threat_sophistication: float | None,
    threat_multiplier: float,
    control_effectiveness: float,
    implementation_status: str | None,
    applied_effectiveness: float,
    vulnerability_severity: str | None,
    data_sensitivity: str | None,
) -> list[RiskFactor]:
    return [
        _factor(
            "likelihood",
            "Likelihood",
            likelihood,
            likelihood,
            "request",
            "Probability the linked threat materializes against this asset.",
        ),
        _factor(
            "impact",
            "Impact",
            impact,
            impact,
            "request",
            "Relative consequence of a successful event on confidentiality, integrity, or availability.",
        ),
        _factor(
            "criticality",
            "Asset criticality",
            criticality,
            criticality / 5.0,
            "asset",
            "Asset criticality (1–5) scales inherent risk linearly via criticality / 5.",
        ),
        _factor(
            "exploitability",
            "Exploitability",
            exploitability,
            exploitability,
            "vulnerability" if exploitability != DEFAULT_EXPLOITABILITY else "default",
            "How readily the linked vulnerability can be exploited. Defaults to 0.3 when none is linked.",
        ),
        _factor(
            "exposure",
            "Exposure factor",
            exposure or "unspecified",
            exposure_multiplier,
            "asset",
            "Internet-facing assets use 1.00; internal assets use 0.75.",
        ),
        _factor(
            "threat_likelihood",
            "Threat catalog likelihood",
            threat_likelihood,
            threat_likelihood if threat_likelihood is not None else 0.0,
            "threat",
            "Catalog likelihood is recorded for explanation; scoring uses the request likelihood.",
        ),
        _factor(
            "threat_sophistication",
            "Threat sophistication factor",
            threat_sophistication,
            threat_multiplier,
            "threat" if threat_sophistication is not None else "default",
            "0.85 + 0.15 × sophistication when a threat is linked; otherwise 1.00.",
        ),
        _factor(
            "control_effectiveness",
            "Control effectiveness (raw)",
            control_effectiveness,
            control_effectiveness,
            "control",
            "Stated effectiveness of the linked control before implementation weight.",
        ),
        _factor(
            "implementation_status",
            "Implementation weight",
            implementation_status or "omitted",
            applied_effectiveness / control_effectiveness if control_effectiveness else 0.0,
            "control",
            "Planned or unimplemented controls do not reduce residual risk.",
        ),
        _factor(
            "applied_control_effectiveness",
            "Applied control effectiveness",
            applied_effectiveness,
            applied_effectiveness,
            "derived",
            "effectiveness × implementation_weight; residual = inherent × (1 − this value).",
        ),
        _factor(
            "vulnerability_severity",
            "Vulnerability severity",
            vulnerability_severity or "unspecified",
            1.0 if (vulnerability_severity or "").lower() == "critical" else 0.5,
            "vulnerability",
            "Severity is a qualitative driver; exploitability carries the quantitative weight.",
        ),
        _factor(
            "data_sensitivity",
            "Data sensitivity",
            data_sensitivity or "unspecified",
            1.0 if (data_sensitivity or "").lower() in {"high", "restricted", "confidential", "secret"} else 0.4,
            "asset",
            "Qualitative driver for why impact on this asset matters to the organization.",
        ),
    ]


def quantify_risk(
    *,
    likelihood: float,
    impact: float,
    criticality: int,
    exploitability: float,
    control_effectiveness: float,
    exposure: str | None = None,
    drivers: list[str] | None = None,
    threat_likelihood: float | None = None,
    threat_sophistication: float | None = None,
    implementation_status: str | None = None,
    vulnerability_severity: str | None = None,
    data_sensitivity: str | None = None,
) -> RiskResult:
    exposure_multiplier = exposure_factor(exposure)
    threat_multiplier = threat_sophistication_factor(threat_sophistication)
    applied = applied_control_effectiveness(control_effectiveness, implementation_status)
    inherent = inherent_risk(
        likelihood,
        impact,
        criticality,
        exploitability,
        exposure_multiplier=exposure_multiplier,
        threat_multiplier=threat_multiplier,
    )
    residual = residual_risk(inherent, applied)
    resolved_drivers = drivers or build_drivers(
        criticality=criticality,
        exploitability=exploitability,
        exposure=exposure,
        control_effectiveness=applied,
        likelihood=likelihood,
        threat_likelihood=threat_likelihood,
        vulnerability_severity=vulnerability_severity,
        data_sensitivity=data_sensitivity,
        implementation_status=implementation_status,
    )
    factors = build_factors(
        likelihood=likelihood,
        impact=impact,
        criticality=criticality,
        exploitability=exploitability,
        exposure=exposure,
        exposure_multiplier=exposure_multiplier,
        threat_likelihood=threat_likelihood,
        threat_sophistication=threat_sophistication,
        threat_multiplier=threat_multiplier,
        control_effectiveness=control_effectiveness,
        implementation_status=implementation_status,
        applied_effectiveness=applied,
        vulnerability_severity=vulnerability_severity,
        data_sensitivity=data_sensitivity,
    )
    trace = (
        f"inherent = 100 × {likelihood} × {impact} × ({criticality}/5) × {exploitability} "
        f"× {exposure_multiplier} × {threat_multiplier} = {inherent}; "
        f"residual = {inherent} × (1 − {applied}) = {residual}"
    )
    explanation = (
        "Illustrative residual risk from Organization → Asset → Vulnerability → Threat → Control. "
        + FORMULAS["inherent_risk"]
        + " Then "
        + FORMULAS["residual_risk"]
        + " Not a prediction of incidents."
    )
    return RiskResult(
        inherent_risk=inherent,
        residual_risk=residual,
        risk_level=risk_level(residual),
        drivers=resolved_drivers,
        explanation=explanation,
        factors=factors,
        formula_trace=trace,
        applied_control_effectiveness=applied,
        formulas=dict(FORMULAS),
    )


def factor_dicts(result: RiskResult) -> list[dict[str, Any]]:
    return [
        {
            "key": item.key,
            "label": item.label,
            "value": item.value,
            "normalized": item.normalized,
            "source": item.source,
            "explanation": item.explanation,
        }
        for item in result.factors
    ]


def summarize_risks(rows: list[Risk]) -> dict[str, Any]:
    open_rows = [item for item in rows if item.status == RiskStatus.OPEN]
    residual_scores = [item.residual_risk for item in open_rows]
    inherent_scores = [item.risk_score for item in open_rows]
    counts = {level.value: 0 for level in RiskLevel}
    for item in open_rows:
        counts[risk_level(item.residual_risk).value] += 1
    driver_counter: Counter[str] = Counter()
    for item in open_rows:
        driver_counter.update(item.drivers or [])
    complete = sum(
        1
        for item in open_rows
        if item.asset_id and item.vulnerability_id and item.threat_id and item.control_id
    )
    avg_residual = round(sum(residual_scores) / len(residual_scores), 2) if residual_scores else 0.0
    avg_inherent = round(sum(inherent_scores) / len(inherent_scores), 2) if inherent_scores else 0.0
    return {
        "count": len(open_rows),
        "total_records": len(rows),
        "average_inherent_risk": avg_inherent,
        "average_residual_risk": avg_residual,
        "risk_reduction": round(avg_inherent - avg_residual, 2),
        "by_level": counts,
        "top_drivers": [{"driver": name, "count": count} for name, count in driver_counter.most_common(8)],
        "linked_chain_complete": complete,
        "total_expected_annual_loss": round(sum(float(item.expected_annual_loss) for item in open_rows), 2),
        "total_financial_exposure": round(sum(float(item.financial_exposure) for item in open_rows), 2),
        "formulas": dict(FORMULAS),
        "illustrative": True,
    }
