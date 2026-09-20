"use client";

import { useState } from "react";
import {
  Sliders,
  Play,
  ArrowRight,
  TrendingDown,
  ShieldCheck,
  RotateCcw,
  Sparkles,
  History,
  CheckCircle2,
  DollarSign,
  AlertTriangle,
} from "lucide-react";
import { DashboardCard } from "@/components/DashboardCard";
import { IllustrativeNote } from "@/components/IllustrativeNote";
import { PageHeader } from "@/components/PageHeader";
import { ErrorState, LoadingState } from "@/components/QueryStates";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/misc";
import { Badge } from "@/components/ui/badge";
import { formatInr, formatPercent } from "@/lib/format";
import { useScenarios, useSimulateScenario } from "@/lib/hooks/useAssurance";
import { useRiskSummary } from "@/lib/hooks/useRisks";
import type { ScenarioResult } from "@/lib/types/api";

const PRESET_INTERVENTIONS = [
  { id: "mfa", label: "Enforce Hardware MFA Org-wide", effectiveness: 0.45, cost: 1200000, desc: "Eliminates credential stuffing and brute force on VPN & IdP" },
  { id: "cve", label: "Patch Critical Perimeter CVEs", effectiveness: 0.35, cost: 400000, desc: "Remediates unauthenticated RCE on edge reverse proxies" },
  { id: "edr", label: "Deploy EDR with Zero-Trust Isolation", effectiveness: 0.30, cost: 2400000, desc: "Halts lateral movement and ransomware execution on endpoints" },
  { id: "backup", label: "Modernize Air-Gapped Immutable Backups", effectiveness: 0.25, cost: 900000, desc: "Guarantees business continuity and recovery under extortion" },
  { id: "segment", label: "Micro-Segment Payment & Customer DB", effectiveness: 0.40, cost: 1800000, desc: "Isolates cardholder data environment from general corporate LAN" },
  { id: "retire", label: "Decommission Deprecated Legacy Asset", effectiveness: 0.20, cost: 250000, desc: "Eliminates legacy tech debt and unmonitored shadow IT servers" },
];

export default function WhatIfPage() {
  const history = useScenarios();
  const summary = useRiskSummary();
  const run = useSimulateScenario();

  const [selected, setSelected] = useState<string[]>([
    "Enforce Hardware MFA Org-wide",
    "Patch Critical Perimeter CVEs",
  ]);
  const [cost, setCost] = useState("1600000");
  const [effectiveness, setEffectiveness] = useState("0.55");
  const [viewed, setViewed] = useState<ScenarioResult | null>(null);

  const baselineRisk = summary.data?.average_residual_risk ?? 78;
  const baselineEal = summary.data?.total_expected_annual_loss ?? 18400000;

  const result = viewed ?? run.data ?? history.data?.[0];

  const handleToggle = (label: string, optCost: number, optEff: number) => {
    setSelected((prev) => {
      const exists = prev.includes(label);
      const next = exists ? prev.filter((i) => i !== label) : [...prev, label];
      // calculate approximate new cost
      const newCost = next.reduce((sum, item) => {
        const p = PRESET_INTERVENTIONS.find((x) => x.label === item);
        return sum + (p ? p.cost : 0);
      }, 0);
      const newEff = Math.min(0.85, next.length * 0.25);
      setCost(String(newCost || 500000));
      setEffectiveness(newEff.toFixed(2));
      return next;
    });
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="flex h-2 w-2 rounded-full bg-blue-600" />
            <Badge variant="outline" className="border-blue-200 bg-blue-50 text-blue-700 text-[10px] uppercase tracking-wider font-semibold">
              Counterfactual Simulation Sandbox
            </Badge>
          </div>
          <PageHeader
            eyebrow="Decision Intelligence"
            title="What-If Scenario Simulator"
            description="Interactively model the systemic ripple effects of security interventions on risk score, attack paths, and expected loss before deploying budget."
          />
        </div>
        <IllustrativeNote />
      </div>

      {history.isLoading ? (
        <LoadingState />
      ) : history.isError ? (
        <ErrorState message="Unable to load scenarios." onRetry={() => history.refetch()} />
      ) : (
        <div className="grid gap-6 xl:grid-cols-[380px_minmax(0,1fr)]">
          {/* Controls & Interventions Panel */}
          <div className="space-y-4">
            <div className="rounded-xl border border-[#E2E8F0] bg-white p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-2.5">
                <div className="flex items-center gap-2">
                  <Sliders className="h-4 w-4 text-blue-600" />
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-900">
                    Select Interventions
                  </span>
                </div>
                <Badge variant="outline" className="text-[10px] border-[#E2E8F0] bg-slate-50 text-slate-600">
                  {selected.length} Active
                </Badge>
              </div>

              <div className="space-y-2">
                {PRESET_INTERVENTIONS.map((option) => {
                  const isChecked = selected.includes(option.label);
                  return (
                    <div
                      key={option.id}
                      onClick={() => handleToggle(option.label, option.cost, option.effectiveness)}
                      className={`cursor-pointer rounded-lg border p-3 transition ${
                        isChecked
                          ? "border-blue-300 bg-blue-50/70 text-slate-900 shadow-xs"
                          : "border-[#E2E8F0] bg-white text-slate-800 hover:border-slate-300 hover:bg-slate-50"
                      }`}
                    >
                      <div className="flex items-start gap-2.5">
                        <Checkbox
                          checked={isChecked}
                          className="mt-0.5 border-[#CBD5E1] data-[state=checked]:bg-[#2563EB]"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-semibold">{option.label}</div>
                          <div className="text-[11px] text-slate-500 mt-0.5 leading-tight">{option.desc}</div>
                          <div className="mt-1.5 flex items-center gap-3 text-[10px] font-mono text-slate-500">
                            <span>Cost: <strong className="text-slate-800">{formatInr(option.cost)}</strong></span>
                            <span>·</span>
                            <span>Eff: <strong className="text-emerald-700">+{formatPercent(option.effectiveness)}</strong></span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="space-y-3 pt-2 border-t border-[#E2E8F0]">
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <Label className="text-slate-700">Total Simulated Spend</Label>
                    <span className="font-mono text-blue-600 font-bold">{formatInr(Number(cost))}</span>
                  </div>
                  <Input
                    className="font-mono text-xs border-[#CBD5E1] bg-white text-slate-900 focus:border-[#2563EB]"
                    value={cost}
                    onChange={(e) => setCost(e.target.value)}
                  />
                </div>

                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <Label className="text-slate-700">Compound Effectiveness Factor</Label>
                    <span className="font-mono text-emerald-700 font-bold">{effectiveness}</span>
                  </div>
                  <Input
                    type="number"
                    step="0.05"
                    min="0"
                    max="1"
                    className="font-mono text-xs border-[#CBD5E1] bg-white text-slate-900 focus:border-[#2563EB]"
                    value={effectiveness}
                    onChange={(e) => setEffectiveness(e.target.value)}
                  />
                </div>

                <Button
                  className="w-full bg-[#2563EB] hover:bg-blue-700 text-white text-xs font-semibold py-2.5 mt-2 shadow-xs"
                  disabled={run.isPending || selected.length === 0}
                  onClick={() =>
                    run.mutate(
                      {
                        changes: selected,
                        control_effectiveness: Number(effectiveness),
                        investment_cost: Number(cost),
                        baseline_risk: baselineRisk,
                        baseline_eal: baselineEal,
                        name: selected.join(" + "),
                      },
                      { onSuccess: (data) => setViewed(data) }
                    )
                  }
                >
                  {run.isPending ? (
                    <RotateCcw className="mr-2 h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Play className="mr-2 h-3.5 w-3.5" />
                  )}
                  Run What-If Simulation
                </Button>
              </div>
            </div>

            {/* Saved Scenario History */}
            <DashboardCard
              title="Saved Scenarios"
              subtitle="Quickly recall and compare previous simulation results"
            >
              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {(history.data ?? []).map((item) => (
                  <button
                    key={item.id ?? item.name}
                    type="button"
                    className="flex w-full items-center justify-between rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] p-2.5 text-left transition hover:border-blue-300 hover:bg-blue-50/50"
                    onClick={() => setViewed(item)}
                  >
                    <div className="min-w-0 pr-2">
                      <p className="text-xs font-semibold text-slate-900 truncate">{item.name ?? item.changes?.join(" + ")}</p>
                      <p className="text-[10px] text-slate-500 font-mono">
                        Cost: {formatInr(item.investment_cost)} · Avoided: {formatInr(item.financial_loss_avoided)}
                      </p>
                    </div>
                    <span className="shrink-0 font-mono text-xs font-bold text-emerald-700">
                      {item.baseline_risk} → {item.scenario_risk}
                    </span>
                  </button>
                ))}
              </div>
            </DashboardCard>
          </div>

          {/* Side-by-Side Simulation Workspace */}
          <div className="space-y-6">
            {result ? (
              <>
                {/* Side-by-Side Current vs Simulated */}
                <div className="grid gap-4 md:grid-cols-2">
                  {/* Current Environment */}
                  <div className="rounded-xl border border-red-200 bg-white p-5 shadow-xs space-y-4">
                    <div className="flex items-center justify-between border-b border-red-100 pb-2.5">
                      <span className="text-xs font-bold uppercase tracking-wider text-red-700">
                        Current Environment (Baseline)
                      </span>
                      <Badge variant="outline" className="border-red-200 bg-red-50 text-red-700 text-[10px]">
                        As Is Today
                      </Badge>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] p-3">
                        <span className="text-[10px] uppercase text-slate-500">Residual Risk</span>
                        <div className="font-mono text-3xl font-bold text-red-600 mt-1">
                          {result.baseline_risk} <span className="text-xs font-normal text-slate-400">/ 100</span>
                        </div>
                      </div>
                      <div className="rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] p-3">
                        <span className="text-[10px] uppercase text-slate-500">Critical Attack Paths</span>
                        <div className="font-mono text-3xl font-bold text-red-600 mt-1">4 Active</div>
                      </div>
                    </div>

                    <div className="rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] p-3 space-y-1">
                      <span className="text-[10px] uppercase text-slate-500">Expected Annual Loss (EAL)</span>
                      <div className="font-mono text-xl font-bold text-slate-900">
                        {formatInr(result.baseline_eal)}
                      </div>
                      <span className="text-[11px] text-slate-500 block">
                        Total Exposure: {formatInr(Number(result.baseline_eal) * 3.5)}
                      </span>
                    </div>
                  </div>

                  {/* Simulated Result */}
                  <div className="rounded-xl border border-emerald-200 bg-gradient-to-br from-white via-emerald-50/20 to-emerald-50/50 p-5 shadow-xs space-y-4">
                    <div className="flex items-center justify-between border-b border-emerald-200/60 pb-2.5">
                      <span className="text-xs font-bold uppercase tracking-wider text-emerald-800">
                        Simulated Result (Post-Intervention)
                      </span>
                      <Badge variant="outline" className="border-emerald-200 bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                        Target State
                      </Badge>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="rounded-lg border border-emerald-200/60 bg-white p-3">
                        <span className="text-[10px] uppercase text-emerald-700">Residual Risk</span>
                        <div className="font-mono text-3xl font-bold text-emerald-700 mt-1">
                          {result.scenario_risk} <span className="text-xs font-normal text-slate-400">/ 100</span>
                        </div>
                      </div>
                      <div className="rounded-lg border border-emerald-200/60 bg-white p-3">
                        <span className="text-[10px] uppercase text-emerald-700">Critical Attack Paths</span>
                        <div className="font-mono text-3xl font-bold text-emerald-700 mt-1">
                          {Math.max(1, 4 - Math.round(Number(result.risk_reduction) / 10))} Left
                        </div>
                      </div>
                    </div>

                    <div className="rounded-lg border border-emerald-200/60 bg-white p-3 space-y-1">
                      <span className="text-[10px] uppercase text-emerald-700">Expected Annual Loss (EAL)</span>
                      <div className="font-mono text-xl font-bold text-emerald-700">
                        {formatInr(result.scenario_eal)}
                      </div>
                      <span className="text-[11px] text-emerald-700 font-semibold block">
                        Net Loss Avoided: {formatInr(result.financial_loss_avoided)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* KPI Metrics */}
                <div className="grid gap-3 sm:grid-cols-4">
                  <div className="rounded-lg border border-[#E2E8F0] bg-white p-3.5 text-center shadow-xs">
                    <span className="text-[10px] uppercase tracking-wider text-slate-500">Risk Reduction</span>
                    <p className="mt-1 font-mono text-lg font-bold text-emerald-700">−{result.risk_reduction} pts</p>
                  </div>
                  <div className="rounded-lg border border-[#E2E8F0] bg-white p-3.5 text-center shadow-xs">
                    <span className="text-[10px] uppercase tracking-wider text-slate-500">Annual Loss Avoided</span>
                    <p className="mt-1 font-mono text-lg font-bold text-emerald-700">{formatInr(result.financial_loss_avoided)}</p>
                  </div>
                  <div className="rounded-lg border border-[#E2E8F0] bg-white p-3.5 text-center shadow-xs">
                    <span className="text-[10px] uppercase tracking-wider text-slate-500">Simulated Spend</span>
                    <p className="mt-1 font-mono text-lg font-bold text-slate-900">{formatInr(result.investment_cost)}</p>
                  </div>
                  <div className="rounded-lg border border-[#E2E8F0] bg-white p-3.5 text-center shadow-xs">
                    <span className="text-[10px] uppercase tracking-wider text-slate-500">Simulated ROSI</span>
                    <p className="mt-1 font-mono text-lg font-bold text-purple-700">
                      {result.rosi == null ? "—" : `${result.rosi.toFixed(1)}%`}
                    </p>
                  </div>
                </div>

                {/* Scenario Details Explanation */}
                <div className="rounded-xl border border-[#E2E8F0] bg-white p-5 space-y-3 shadow-xs">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-blue-600" />
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-900">
                      Scenario Ripple Effect Breakdown
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    By applying the selected controls (<strong>{selected.join(", ")}</strong>), the systemic risk drops from <strong>{result.baseline_risk}</strong> down to <strong>{result.scenario_risk}</strong>. This severes the primary perimeter traversal stage in the attack graph, isolating critical payment and customer database assets from the external internet ingress. Annualized expected financial loss is curtailed by <strong>{formatInr(result.financial_loss_avoided)}</strong> against an initial investment of <strong>{formatInr(result.investment_cost)}</strong>.
                  </p>
                </div>
              </>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
