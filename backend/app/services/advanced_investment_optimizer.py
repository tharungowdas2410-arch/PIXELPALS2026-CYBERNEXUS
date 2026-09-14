"""OR-Tools–based cybersecurity investment optimization.

Objective
---------
Primary: Maximize expected risk reduction subject to budget,
implementation capacity, dependency, and mutual-exclusion constraints.

Fallback: Greedy density optimizer from investment_optimizer.py is
used if OR-Tools is unavailable or the solver returns INFEASIBLE/error.

Optimization model
------------------
Variables
  x_i ∈ {0, 1} for each investment i.

Objective (weighted, normalized)
  max  w_risk · Σ (risk_red_i · x_i / R̄)
     + w_loss · Σ (loss_avoid_i · x_i / L̄)
     + w_rosi · Σ (rosi_i · x_i / R̄rosi)

  where R̄ = Σ risk_red_i (total possible risk reduction)
        L̄ = Σ max(cost_i, loss_avoid_i)
        R̄rosi = Σ max(rosi_i, 0) when defined, else 1.

Constraints
  1. Σ cost_i · x_i + Σ aoc_i · horizon_months/12 · x_i ≤ budget
  2. Σ x_i ≤ max_projects
  3. For each dependency pair (A → B):  x_A ≤ x_B
     (selecting A forces B to be selected)
  4. For each mutual-exclusion group G:
        Σ_{i∈G} x_i ≤ 1
  5. For each investment with implementation_time > horizon_months:
        x_i = 0  (cannot fully implement within the horizon)

Outputs
  - selected_investments (with per-investment metadata)
  - aggregate portfolio metrics
  - risk-reduction curve (parametric over cumulative investment)
  - portfolio comparison table (multi-budget)
  - audit payload (hashable, for future blockchain evidence)
"""

from __future__ import annotations

import hashlib
import json
import time
from dataclasses import dataclass, field, asdict
from typing import Iterable, Literal

from app.services.investment_optimizer import (
    ControlOption,
    optimize_portfolio as greedy_optimize,
    portfolio_summary as greedy_summary,
)
from app.utils.calculations import rosi

MODEL_VERSION = "1.0.0"
OPTIMIZATION_METHOD_ORTOOLS = "OR_TOOLS"
OPTIMIZATION_METHOD_GREEDY = "GREEDY_FALLBACK"

ObjectiveKind = Literal["MAX_RISK_REDUCTION", "MAX_LOSS_AVOIDED", "MAX_ROSI", "BALANCED"]
PriorityKind = Literal["LOW", "MODERATE", "HIGH", "CRITICAL"]

DEFAULT_WEIGHTS: dict[ObjectiveKind, dict[str, float]] = {
    "MAX_RISK_REDUCTION": {"risk_reduction": 1.0, "loss_avoided": 0.0, "rosi": 0.0},
    "MAX_LOSS_AVOIDED": {"risk_reduction": 0.0, "loss_avoided": 1.0, "rosi": 0.0},
    "MAX_ROSI": {"risk_reduction": 0.0, "loss_avoided": 0.0, "rosi": 1.0},
    "BALANCED": {"risk_reduction": 0.5, "loss_avoided": 0.3, "rosi": 0.2},
}


@dataclass
class InvestmentCandidate:
    """Extended control/investment input for the advanced optimizer.

    numeric fields (risk_reduction, loss_avoided, cost, aoc) must be
    derived from real risk/financial-engine data, not random values.
    """

    id: str
    name: str
    category: str
    cost: float
    risk_reduction: float
    loss_avoided: float
    implementation_time_months: int = 1
    annual_operating_cost: float = 0.0
    dependencies: list[str] = field(default_factory=list)
    mutually_exclusive_group: str | None = None
    affected_asset_ids: list[str] = field(default_factory=list)
    affected_asset_criticality: list[int] = field(default_factory=list)
    affected_attack_path_ids: list[str] = field(default_factory=list)
    affected_attack_path_risk: list[float] = field(default_factory=list)
    control_effectiveness_gain: float = 0.0
    critical_asset_weight: float = 1.0

    @property
    def rosi_value(self) -> float:
        return rosi(self.loss_avoided, self.cost) or 0.0


@dataclass
class SelectedInvestment:
    id: str
    name: str
    category: str
    cost: float
    risk_reduction: float
    loss_avoided: float
    rosi: float | None
    implementation_time: int
    affected_assets: list[str]
    affected_attack_paths: list[str]
    priority: PriorityKind
    reason: str
    marginal_value: float


@dataclass
class OptimizationConstraints:
    budget: float
    objective: ObjectiveKind
    time_horizon_months: int
    max_projects: int | None
    custom_weights: dict[str, float] | None = None


@dataclass
class PortfolioResult:
    budget: float
    total_investment: float
    remaining_budget: float
    baseline_risk: float
    optimized_risk: float
    risk_reduction: float
    baseline_eal: float
    optimized_eal: float
    loss_avoided: float
    rosi: float | None
    budget_utilization: float
    selected_investments: list[SelectedInvestment]
    optimization_method: str
    objective: str
    constraints: dict
    model_version: str
    timestamp: float
    decision_payload_hash: str
    illustrative: bool = True


class InvestmentOptimizationService:
    """Constraint-based optimization with OR-Tools + greedy fallback."""

    def __init__(self, objective_weights: dict[ObjectiveKind, dict[str, float]] | None = None):
        self.objective_weights = objective_weights or DEFAULT_WEIGHTS

    def _validate_candidates(self, candidates: list[InvestmentCandidate]) -> None:
        cand_map = {c.id: c for c in candidates}
        for c in candidates:
            if c.cost < 0:
                raise ValueError(f"Investment '{c.id}' has negative cost: {c.cost}")
            if c.annual_operating_cost < 0:
                raise ValueError(f"Investment '{c.id}' has negative annual operating cost: {c.annual_operating_cost}")
            if c.risk_reduction < 0:
                raise ValueError(f"Investment '{c.id}' has negative risk reduction: {c.risk_reduction}")

        for c in candidates:
            for dep in c.dependencies:
                if dep not in cand_map:
                    raise ValueError(f"Investment '{c.id}' depends on non-existent investment '{dep}'")
                if dep == c.id:
                    raise ValueError(f"Investment '{c.id}' cannot depend on itself")

        def check_cycle(node_id: str, path: list[str]) -> None:
            if node_id in path:
                cycle_str = " -> ".join(path + [node_id])
                raise ValueError(f"Impossible circular dependency detected: {cycle_str}")
            cand = cand_map.get(node_id)
            if cand:
                for dep in cand.dependencies:
                    check_cycle(dep, path + [node_id])

        for c in candidates:
            check_cycle(c.id, [])

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------
    def optimize(
        self,
        candidates: list[InvestmentCandidate],
        *,
        baseline_risk: float,
        baseline_eal: float,
        constraints: OptimizationConstraints,
    ) -> PortfolioResult:
        if constraints.budget < 0:
            raise ValueError(f"Budget cannot be negative: {constraints.budget}")
        if constraints.time_horizon_months <= 0:
            raise ValueError(f"Time horizon must be positive: {constraints.time_horizon_months}")
        if candidates:
            self._validate_candidates(candidates)
        if constraints.budget == 0 or not candidates:
            return self._empty_result(candidates, baseline_risk, baseline_eal, constraints)
        feasible = [
            c for c in candidates
            if c.implementation_time_months <= constraints.time_horizon_months
        ]
        if not feasible:
            return self._empty_result(candidates, baseline_risk, baseline_eal, constraints)
        try:
            selected_ids = self._ortools_solve(feasible, constraints)
            method = OPTIMIZATION_METHOD_ORTOOLS
        except Exception:
            selected_ids = self._greedy_solve(feasible, constraints)
            method = OPTIMIZATION_METHOD_GREEDY
        chosen = [c for c in feasible if c.id in selected_ids]
        return self._build_result(chosen, feasible, baseline_risk, baseline_eal, constraints, method)

    def calculate_portfolio(
        self,
        candidates: list[InvestmentCandidate],
        selected_ids: Iterable[str],
        *,
        baseline_risk: float,
        baseline_eal: float,
        constraints: OptimizationConstraints,
    ) -> PortfolioResult:
        chosen = [c for c in candidates if c.id in set(selected_ids)]
        return self._build_result(chosen, candidates, baseline_risk, baseline_eal, constraints, "USER_CURATED")

    def calculate_rosi(self, loss_avoided: float, cost: float) -> float | None:
        return rosi(loss_avoided, cost)

    def calculate_risk_reduction(
        self,
        baseline_risk: float,
        investments: list[InvestmentCandidate],
    ) -> float:
        if not investments:
            return 0.0
        total = sum(inv.risk_reduction for inv in investments)
        return min(float(abs(baseline_risk)), round(total, 4))

    def calculate_budget_utilization(self, total_investment: float, budget: float) -> float:
        if budget <= 0:
            return 0.0
        return round((total_investment / budget) * 100.0, 2)

    def calculate_risk_reduction_curve(
        self,
        candidates: list[InvestmentCandidate],
        *,
        baseline_risk: float,
        baseline_eal: float,
        constraints: OptimizationConstraints,
        points: list[float] | None = None,
    ) -> list[dict]:
        budgets = points or [0, 5_00_000, 10_00_000, 25_00_000, 50_00_000, 1_00_00_000, 5_00_00_000]
        curve: list[dict] = []
        for b in budgets:
            cc = OptimizationConstraints(
                budget=float(b),
                objective=constraints.objective,
                time_horizon_months=constraints.time_horizon_months,
                max_projects=constraints.max_projects,
                custom_weights=constraints.custom_weights,
            )
            result = self.optimize(candidates, baseline_risk=baseline_risk, baseline_eal=baseline_eal, constraints=cc)
            curve.append({
                "investment": round(float(b), 2),
                "residual_risk": round(result.optimized_risk, 2),
                "risk_reduction": round(result.risk_reduction, 2),
                "loss_avoided": round(result.loss_avoided, 2),
                "portfolio_rosi": round(result.rosi or 0.0, 2),
                "selected_count": len(result.selected_investments),
            })
        return curve

    def compare_portfolios(
        self,
        candidates: list[InvestmentCandidate],
        *,
        baseline_risk: float,
        baseline_eal: float,
        scenarios: list[OptimizationConstraints],
    ) -> list[dict]:
        output: list[dict] = []
        for scenario in scenarios:
            result = self.optimize(candidates, baseline_risk=baseline_risk, baseline_eal=baseline_eal, constraints=scenario)
            output.append({
                "scenario": {
                    "budget": scenario.budget,
                    "objective": scenario.objective,
                    "time_horizon_months": scenario.time_horizon_months,
                    "max_projects": scenario.max_projects,
                },
                "total_investment": result.total_investment,
                "risk": result.optimized_risk,
                "risk_reduction": result.risk_reduction,
                "eal": result.optimized_eal,
                "loss_avoided": result.loss_avoided,
                "rosi": result.rosi,
                "budget_utilization": result.budget_utilization,
                "selected": [s.id for s in result.selected_investments],
                "optimization_method": result.optimization_method,
            })
        return output

    # ------------------------------------------------------------------
    # OR-Tools core
    # ------------------------------------------------------------------
    def _weights(self, constraints: OptimizationConstraints) -> dict[str, float]:
        base = dict(self.objective_weights.get(constraints.objective, DEFAULT_WEIGHTS["BALANCED"]))
        if constraints.custom_weights:
            for k, v in constraints.custom_weights.items():
                if k in base:
                    base[k] = float(v)
        total = sum(base.values())
        if total <= 0:
            return {k: 0.0 for k in base}
        return {k: round(v / total, 6) for k, v in base.items()}

    def _ortools_solve(
        self,
        candidates: list[InvestmentCandidate],
        constraints: OptimizationConstraints,
    ) -> set[str]:
        from ortools.linear_solver import pywraplp

        solver = pywraplp.Solver.CreateSolver("CBC")
        if solver is None:
            raise RuntimeError("OR-Tools CBC solver not available")
        solver.SetTimeLimit(10_000)
        index_by_id = {c.id: idx for idx, c in enumerate(candidates)}
        x = [solver.BoolVar(f"x_{c.id}") for c in candidates]
        weights = self._weights(constraints)
        horizon_years = max(1, constraints.time_horizon_months) / 12.0
        total_cost_coeff = max(1.0, sum(max(c.cost, 0.0) + c.annual_operating_cost * horizon_years for c in candidates))
        total_risk = max(1.0, sum(max(c.risk_reduction, 0.0) for c in candidates))
        total_loss = max(1.0, sum(max(c.loss_avoided, c.cost) for c in candidates))
        total_rosi = max(1.0, sum(max(0.0, c.rosi_value) for c in candidates))
        objective_terms: list = []
        for i, c in enumerate(candidates):
            total_cash_cost = c.cost + c.annual_operating_cost * horizon_years
            weighted_risk = weights["risk_reduction"] * (max(0.0, c.risk_reduction) / total_risk)
            weighted_loss = weights["loss_avoided"] * (max(0.0, c.loss_avoided) / total_loss)
            weighted_rosi = weights["rosi"] * (max(0.0, c.rosi_value) / total_rosi)
            critical_bonus = 0.0
            if c.critical_asset_weight and weights["risk_reduction"] > 0:
                critical_bonus = (weights["risk_reduction"] * 0.25) * (
                    min(2.0, c.critical_asset_weight) / total_risk * max(0.0, c.risk_reduction)
                )
            path_bonus = 0.0
            if c.affected_attack_path_risk:
                max_path_risk = max(c.affected_attack_path_risk) if c.affected_attack_path_risk else 0.0
                if max_path_risk >= 50:
                    path_bonus = (weights["risk_reduction"] * 0.15) * (max_path_risk / 100.0) * (max(0.0, c.risk_reduction) / total_risk)
            coeff = weighted_risk + weighted_loss + weighted_rosi + critical_bonus + path_bonus
            objective_terms.append(coeff * x[i])
        solver.Maximize(sum(objective_terms))
        budget_expr = sum(
            (c.cost + c.annual_operating_cost * horizon_years) * x[i]
            for i, c in enumerate(candidates)
        )
        solver.Add(budget_expr <= constraints.budget)
        if constraints.max_projects and constraints.max_projects > 0:
            solver.Add(sum(x) <= int(constraints.max_projects))
        groups: dict[str, list[int]] = {}
        for i, c in enumerate(candidates):
            if c.mutually_exclusive_group:
                groups.setdefault(c.mutually_exclusive_group, []).append(i)
        for members in groups.values():
            solver.Add(sum(x[i] for i in members) <= 1)
        for i, c in enumerate(candidates):
            for dep in c.dependencies:
                dep_idx = index_by_id.get(dep)
                if dep_idx is None:
                    solver.Add(x[i] == 0)
                    continue
                solver.Add(x[i] <= x[dep_idx])
        status = solver.Solve()
        if status not in (pywraplp.Solver.OPTIMAL, pywraplp.Solver.FEASIBLE):
            raise RuntimeError(f"OR-Tools did not solve, status={status}")
        selected: set[str] = set()
        for i, c in enumerate(candidates):
            if x[i].solution_value() > 0.5:
                selected.add(c.id)
        return self._validate_budget(selected, candidates, constraints)

    # ------------------------------------------------------------------
    # Greedy fallback
    # ------------------------------------------------------------------
    def _greedy_solve(
        self,
        candidates: list[InvestmentCandidate],
        constraints: OptimizationConstraints,
    ) -> set[str]:
        horizon_years = max(1, constraints.time_horizon_months) / 12.0
        options = [
            ControlOption(
                id=c.id,
                name=c.name,
                cost=c.cost + c.annual_operating_cost * horizon_years,
                estimated_risk_reduction=c.risk_reduction,
                estimated_loss_avoided=c.loss_avoided,
                category=c.category,
            )
            for c in candidates
        ]
        weights = self._weights(constraints)
        def density(o: ControlOption) -> float:
            if o.cost <= 0:
                return 1e18
            score = 0.0
            score += weights["risk_reduction"] * (o.estimated_risk_reduction / o.cost)
            score += weights["loss_avoided"] * (o.estimated_loss_avoided / o.cost)
            r = rosi(o.estimated_loss_avoided, o.cost) or 0.0
            score += weights["rosi"] * max(0.0, r) / 100.0
            return score
        remaining = constraints.budget
        selected: set[str] = set()
        project_slots = constraints.max_projects if constraints.max_projects else 10 ** 9
        ordered = sorted(options, key=density, reverse=True)
        for option in ordered:
            if option.cost > remaining:
                continue
            if len(selected) >= project_slots:
                break
            candidate = next(c for c in candidates if c.id == option.id)
            missing = False
            for dep in candidate.dependencies:
                if dep not in selected:
                    if self._include_dependency(dep, candidates, selected, remaining, project_slots):
                        continue
                    missing = True
                    break
            if missing:
                continue
            selected.add(candidate.id)
            remaining -= option.cost
        return self._validate_budget(selected, candidates, constraints)

    def _include_dependency(
        self,
        dep_id: str,
        candidates: list[InvestmentCandidate],
        selected: set[str],
        remaining: float,
        project_slots: int,
    ) -> bool:
        if dep_id in selected:
            return True
        candidate = next((c for c in candidates if c.id == dep_id), None)
        if candidate is None:
            return False
        if len(selected) >= project_slots:
            return False
        total = candidate.cost
        if total > remaining:
            return False
        selected.add(dep_id)
        remaining -= total
        return True

    # ------------------------------------------------------------------
    # Budget / dependency validation (post-selection)
    # ------------------------------------------------------------------
    def _validate_budget(
        self,
        selected: set[str],
        candidates: list[InvestmentCandidate],
        constraints: OptimizationConstraints,
    ) -> set[str]:
        horizon_years = max(1, constraints.time_horizon_months) / 12.0
        chosen = sorted(
            (c for c in candidates if c.id in selected),
            key=lambda c: (-(c.risk_reduction + c.loss_avoided / max(1.0, c.cost))),
        )
        kept: set[str] = set()
        running_cost = 0.0
        for c in chosen:
            total = c.cost + c.annual_operating_cost * horizon_years
            if running_cost + total > constraints.budget:
                continue
            if constraints.max_projects and len(kept) >= constraints.max_projects:
                continue
            kept.add(c.id)
            running_cost += total
        return kept

    # ------------------------------------------------------------------
    # Result assembly
    # ------------------------------------------------------------------
    def _empty_result(
        self,
        candidates: list[InvestmentCandidate],
        baseline_risk: float,
        baseline_eal: float,
        constraints: OptimizationConstraints,
    ) -> PortfolioResult:
        return self._build_result([], candidates, baseline_risk, baseline_eal, constraints, OPTIMIZATION_METHOD_GREEDY)

    def _build_result(
        self,
        chosen: list[InvestmentCandidate],
        candidates: list[InvestmentCandidate],
        baseline_risk: float,
        baseline_eal: float,
        constraints: OptimizationConstraints,
        method: str,
    ) -> PortfolioResult:
        horizon_years = max(1, constraints.time_horizon_months) / 12.0
        total_investment = sum(c.cost + c.annual_operating_cost * horizon_years for c in chosen)
        total_investment = round(total_investment, 2)
        if total_investment > constraints.budget:
            total_investment = constraints.budget
        remaining_budget = round(max(0.0, constraints.budget - total_investment), 2)
        total_risk_red = sum(c.risk_reduction for c in chosen)
        risk_reduction_val = min(abs(baseline_risk), round(total_risk_red, 4))
        optimized_risk = round(max(0.0, baseline_risk - risk_reduction_val), 2)
        total_loss_avoided = round(sum(c.loss_avoided for c in chosen), 2)
        optimized_eal = round(max(0.0, baseline_eal - total_loss_avoided), 2)
        portfolio_rosi = rosi(total_loss_avoided, total_investment) if total_investment > 0 else None
        utilization = round((total_investment / constraints.budget) * 100.0, 2) if constraints.budget > 0 else 0.0
        selected = self._build_selected(chosen, baseline_eal)
        payload = self._audit_payload(baseline_risk, baseline_eal, constraints, selected, method)
        decision_hash = hashlib.sha256(json.dumps(payload, sort_keys=True).encode("utf-8")).hexdigest()
        return PortfolioResult(
            budget=round(constraints.budget, 2),
            total_investment=total_investment,
            remaining_budget=remaining_budget,
            baseline_risk=round(baseline_risk, 2),
            optimized_risk=optimized_risk,
            risk_reduction=round(risk_reduction_val, 2),
            baseline_eal=round(baseline_eal, 2),
            optimized_eal=optimized_eal,
            loss_avoided=total_loss_avoided,
            rosi=portfolio_rosi,
            budget_utilization=utilization,
            selected_investments=selected,
            optimization_method=method,
            objective=constraints.objective,
            constraints={
                "budget": constraints.budget,
                "objective": constraints.objective,
                "time_horizon_months": constraints.time_horizon_months,
                "max_projects": constraints.max_projects,
                "custom_weights": constraints.custom_weights,
            },
            model_version=MODEL_VERSION,
            timestamp=round(time.time(), 6),
            decision_payload_hash=decision_hash,
        )

    def _build_selected(self, chosen: list[InvestmentCandidate], baseline_eal: float) -> list[SelectedInvestment]:
        selected: list[SelectedInvestment] = []
        ordered = sorted(chosen, key=lambda c: -(c.risk_reduction + c.loss_avoided / max(1.0, c.cost)))
        for c in ordered:
            if c.risk_reduction >= 15 or (c.affected_attack_path_risk and max(c.affected_attack_path_risk) >= 75):
                priority: PriorityKind = "CRITICAL"
            elif c.risk_reduction >= 9 or (c.loss_avoided / max(1.0, baseline_eal)) >= 0.08:
                priority = "HIGH"
            elif c.risk_reduction >= 4:
                priority = "MODERATE"
            else:
                priority = "LOW"
            reasons: list[str] = []
            if c.affected_attack_path_ids:
                top_path_risk = max(c.affected_attack_path_risk) if c.affected_attack_path_risk else 0.0
                reasons.append(f"Breaks {len(c.affected_attack_path_ids)} attack path(s) including a top risk path of {top_path_risk:.0f}/100")
            if c.affected_asset_criticality and any(crit >= 4 for crit in c.affected_asset_criticality):
                reasons.append("Protects high-criticality business assets")
            if c.rosi_value and c.rosi_value >= 100:
                reasons.append(f"High ROSI of {c.rosi_value:.0f}%")
            elif c.rosi_value and c.rosi_value > 0:
                reasons.append(f"Positive ROSI of {c.rosi_value:.0f}%")
            if c.control_effectiveness_gain >= 0.3:
                reasons.append(f"Provides +{c.control_effectiveness_gain*100:.0f}% control effectiveness")
            if not reasons:
                reasons.append("Contributes positively to portfolio risk reduction")
            cost_for_marginal = max(c.cost, 1.0)
            marginal_value = round((c.risk_reduction / cost_for_marginal) * 100_000.0, 2)
            selected.append(SelectedInvestment(
                id=c.id,
                name=c.name,
                category=c.category,
                cost=round(c.cost, 2),
                risk_reduction=round(c.risk_reduction, 2),
                loss_avoided=round(c.loss_avoided, 2),
                rosi=c.rosi_value if c.rosi_value else None,
                implementation_time=c.implementation_time_months,
                affected_assets=list(c.affected_asset_ids),
                affected_attack_paths=list(c.affected_attack_path_ids),
                priority=priority,
                reason="; ".join(reasons),
                marginal_value=marginal_value,
            ))
        return selected

    def _audit_payload(
        self,
        baseline_risk: float,
        baseline_eal: float,
        constraints: OptimizationConstraints,
        selected: list[SelectedInvestment],
        method: str,
    ) -> dict:
        return {
            "model_version": MODEL_VERSION,
            "method": method,
            "constraints": {
                "budget": constraints.budget,
                "objective": constraints.objective,
                "time_horizon_months": constraints.time_horizon_months,
                "max_projects": constraints.max_projects,
                "custom_weights": constraints.custom_weights or {},
            },
            "baseline": {"risk": baseline_risk, "eal": baseline_eal},
            "selected": [
                {
                    "id": s.id,
                    "cost": s.cost,
                    "risk_reduction": s.risk_reduction,
                    "loss_avoided": s.loss_avoided,
                }
                for s in selected
            ],
        }


def demo_candidates() -> list[InvestmentCandidate]:
    """Reference demo dataset for the hackathon.

    Derived from illustrative demo asset topology:
      - Internet VPN, Identity Provider, App Server, Customer DB,
        Payment Service, Backup Server
    """
    return [
        InvestmentCandidate(
            id="inv_mfa",
            name="Identity MFA",
            category="identity",
            cost=12_00_000,
            risk_reduction=12.4,
            loss_avoided=31_00_000,
            implementation_time_months=1,
            annual_operating_cost=1_50_000,
            dependencies=[],
            affected_asset_ids=["Identity Provider", "Internet Gateway VPN"],
            affected_asset_criticality=[5, 5],
            affected_attack_path_ids=["p_vpn_to_payment"],
            affected_attack_path_risk=[90.0],
            control_effectiveness_gain=0.35,
            critical_asset_weight=1.7,
        ),
        InvestmentCandidate(
            id="inv_edr",
            name="EDR Expansion",
            category="endpoint",
            cost=18_00_000,
            risk_reduction=10.3,
            loss_avoided=27_50_000,
            implementation_time_months=2,
            annual_operating_cost=2_40_000,
            dependencies=[],
            mutually_exclusive_group=None,
            affected_asset_ids=["Customer Application Server", "Customer Database"],
            affected_asset_criticality=[4, 5],
            affected_attack_path_ids=["p_app_to_db"],
            affected_attack_path_risk=[82.0],
            control_effectiveness_gain=0.3,
            critical_asset_weight=1.5,
        ),
        InvestmentCandidate(
            id="inv_segmentation",
            name="Network Segmentation",
            category="network",
            cost=15_00_000,
            risk_reduction=9.2,
            loss_avoided=22_00_000,
            implementation_time_months=3,
            annual_operating_cost=1_80_000,
            dependencies=["inv_inventory"],
            affected_asset_ids=["Customer Application Server", "Customer Database", "Payment Service"],
            affected_asset_criticality=[4, 5, 5],
            affected_attack_path_ids=["p_app_to_payment", "p_db_to_payment"],
            affected_attack_path_risk=[88.0, 70.0],
            control_effectiveness_gain=0.4,
            critical_asset_weight=1.9,
        ),
        InvestmentCandidate(
            id="inv_inventory",
            name="Asset Inventory & CMDB",
            category="foundational",
            cost=4_00_000,
            risk_reduction=2.5,
            loss_avoided=5_00_000,
            implementation_time_months=1,
            annual_operating_cost=60_000,
            affected_asset_ids=["Customer Application Server", "Payment Service"],
            affected_asset_criticality=[4, 5],
            affected_attack_path_ids=[],
            affected_attack_path_risk=[],
            control_effectiveness_gain=0.15,
            critical_asset_weight=1.2,
        ),
        InvestmentCandidate(
            id="inv_cve",
            name="Critical CVE Remediation",
            category="vulnerability",
            cost=7_50_000,
            risk_reduction=8.7,
            loss_avoided=20_00_000,
            implementation_time_months=1,
            annual_operating_cost=3_00_000,
            affected_asset_ids=["Internet Gateway VPN", "Customer Application Server", "Payment Service"],
            affected_asset_criticality=[5, 4, 5],
            affected_attack_path_ids=["p_vpn_to_payment", "p_app_to_payment"],
            affected_attack_path_risk=[90.0, 88.0],
            control_effectiveness_gain=0.25,
            critical_asset_weight=1.8,
        ),
        InvestmentCandidate(
            id="inv_backup",
            name="Backup Modernization",
            category="resilience",
            cost=9_00_000,
            risk_reduction=6.8,
            loss_avoided=18_50_000,
            implementation_time_months=2,
            annual_operating_cost=1_20_000,
            affected_asset_ids=["Backup Server", "Customer Database"],
            affected_asset_criticality=[3, 5],
            affected_attack_path_ids=["p_db_to_backup"],
            affected_attack_path_risk=[58.0],
            control_effectiveness_gain=0.2,
            critical_asset_weight=1.3,
        ),
        InvestmentCandidate(
            id="inv_email",
            name="Email Security (BEC/Phish)",
            category="email",
            cost=6_00_000,
            risk_reduction=4.2,
            loss_avoided=12_00_000,
            implementation_time_months=1,
            annual_operating_cost=80_000,
            mutually_exclusive_group="email_solution",
            affected_asset_ids=["Identity Provider"],
            affected_asset_criticality=[5],
            affected_attack_path_ids=["p_identity_breach"],
            affected_attack_path_risk=[72.0],
            control_effectiveness_gain=0.22,
            critical_asset_weight=1.4,
        ),
        InvestmentCandidate(
            id="inv_email_alt",
            name="Alternative Email SG",
            category="email",
            cost=5_50_000,
            risk_reduction=3.8,
            loss_avoided=10_50_000,
            implementation_time_months=1,
            annual_operating_cost=75_000,
            mutually_exclusive_group="email_solution",
            affected_asset_ids=["Identity Provider"],
            affected_asset_criticality=[5],
            affected_attack_path_ids=["p_identity_breach"],
            affected_attack_path_risk=[72.0],
            control_effectiveness_gain=0.2,
            critical_asset_weight=1.4,
        ),
        InvestmentCandidate(
            id="inv_idp",
            name="Identity Protection (IdP)",
            category="identity",
            cost=8_00_000,
            risk_reduction=7.1,
            loss_avoided=19_00_000,
            implementation_time_months=2,
            annual_operating_cost=1_00_000,
            dependencies=["inv_mfa"],
            affected_asset_ids=["Identity Provider", "Customer Application Server"],
            affected_asset_criticality=[5, 4],
            affected_attack_path_ids=["p_idp_to_app"],
            affected_attack_path_risk=[85.0],
            control_effectiveness_gain=0.28,
            critical_asset_weight=1.6,
        ),
        InvestmentCandidate(
            id="inv_soc",
            name="Advanced SOC Monitoring",
            category="detection",
            cost=20_00_000,
            risk_reduction=7.9,
            loss_avoided=15_00_000,
            implementation_time_months=6,
            annual_operating_cost=18_00_000,
            dependencies=["inv_edr"],
            affected_asset_ids=["Customer Application Server", "Payment Service", "Identity Provider"],
            affected_asset_criticality=[4, 5, 5],
            affected_attack_path_ids=["p_vpn_to_payment", "p_idp_to_app"],
            affected_attack_path_risk=[90.0, 85.0],
            control_effectiveness_gain=0.32,
            critical_asset_weight=1.55,
        ),
    ]
