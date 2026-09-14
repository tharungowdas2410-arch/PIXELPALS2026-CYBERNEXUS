"""Illustrative financial conversion. Not an actuarial model."""

from __future__ import annotations

import math
import random
from statistics import mean, median

from app.utils.calculations import expected_annual_loss


ASSUMPTIONS = (
    "Prototype: probability_of_loss=likelihood; estimated_loss=business_value×impact. "
    "Figures are illustrative model output, not booked losses."
)


def calculate_eal(*, likelihood: float, asset_business_value: float, impact: float) -> dict[str, float | str]:
    estimated_loss = max(0.0, asset_business_value) * max(0.0, min(1.0, impact))
    eal = expected_annual_loss(likelihood, estimated_loss)
    return {
        "expected_annual_loss": eal,
        "estimated_annual_loss": eal,
        "probable_minimum_loss": round(estimated_loss * 0.4, 2),
        "probable_maximum_loss": round(estimated_loss * 1.6, 2),
        "confidence_level": 0.8,
        "assumptions": ASSUMPTIONS,
    }


def _percentile(sorted_values: list[float], pct: float) -> float:
    if not sorted_values:
        return 0.0
    if len(sorted_values) == 1:
        return round(sorted_values[0], 2)
    rank = (len(sorted_values) - 1) * (pct / 100.0)
    low = math.floor(rank)
    high = math.ceil(rank)
    if low == high:
        return round(sorted_values[low], 2)
    weight = rank - low
    return round(sorted_values[low] * (1 - weight) + sorted_values[high] * weight, 2)


def run_monte_carlo(
    *,
    expected_loss: float,
    min_loss: float,
    max_loss: float,
    probability: float,
    simulations: int = 10_000,
    seed: int | None = None,
) -> dict:
    """Loss distribution. Deterministic when seed is supplied."""
    sims = max(1, min(simulations, 50_000))
    rng = random.Random(seed)
    low = min(min_loss, max_loss)
    high = max(min_loss, max_loss)
    mode = min(max(expected_loss, low), high)
    samples: list[float] = []
    for _ in range(sims):
        if rng.random() > max(0.0, min(1.0, probability)):
            samples.append(0.0)
        elif high == low:
            samples.append(low)
        else:
            samples.append(rng.triangular(low, high, mode))
    ordered = sorted(samples)
    p50 = _percentile(ordered, 50)
    p75 = _percentile(ordered, 75)
    p90 = _percentile(ordered, 90)
    p95 = _percentile(ordered, 95)
    p99 = _percentile(ordered, 99)
    ceiling = max(ordered) or 1.0
    bucket_count = 10
    width = ceiling / bucket_count
    buckets = []
    for i in range(bucket_count):
        start = i * width
        end = (i + 1) * width
        count = sum(1 for value in ordered if start <= value < end or (i == bucket_count - 1 and value == end))
        buckets.append({"from": round(start, 2), "to": round(end, 2), "count": count})
    return {
        "mean": round(mean(ordered), 2),
        "median": round(median(ordered), 2),
        "p50": p50,
        "p75": p75,
        "p90": p90,
        "p95": p95,
        "p99": p99,
        "var": p95,
        "simulations": sims,
        "distribution_buckets": buckets,
        "assumptions": ASSUMPTIONS,
        "illustrative": True,
    }
