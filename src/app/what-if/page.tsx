"use client";

import { useState } from "react";
import { DashboardCard } from "@/components/DashboardCard";
import { IllustrativeNote } from "@/components/IllustrativeNote";
import { PageHeader } from "@/components/PageHeader";
import { ErrorState, LoadingState } from "@/components/QueryStates";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/misc";
import { formatInr } from "@/lib/format";
import { useScenarios, useSimulateScenario } from "@/lib/hooks/useAssurance";
import { useRiskSummary } from "@/lib/hooks/useRisks";
import type { ScenarioResult } from "@/lib/types/api";

const presets = [
  { label: "Enable MFA", effectiveness: 0.45, cost: 1200000 },
  { label: "Patch critical vulnerability", effectiveness: 0.35, cost: 400000 },
  { label: "Increase EDR coverage", effectiveness: 0.3, cost: 2400000 },
  { label: "Modernize backups", effectiveness: 0.25, cost: 900000 },
  { label: "Increase budget", effectiveness: 0.2, cost: 5000000 },
  { label: "Remove vulnerable asset", effectiveness: 0.4, cost: 250000 },
];

export default function WhatIfPage() {
  const history = useScenarios();
  const summary = useRiskSummary();
  const run = useSimulateScenario();
  const [selected, setSelected] = useState(["Enable MFA"]);
  const [cost, setCost] = useState("1200000");
  const [effectiveness, setEffectiveness] = useState("0.45");
  const [viewed, setViewed] = useState<ScenarioResult | null>(null);

  const result = viewed ?? run.data ?? history.data?.[0];

  return (
    <div className="space-y-5 max-w-7xl mx-auto">
      <PageHeader
        eyebrow="Interactive Simulation & Decision Sandbox"
        title="What-If Scenario Simulator"
        description="Simulate the systemic security and financial impact of targeted control interventions before committing capital."
        actions={<IllustrativeNote>Illustrative scenario engine</IllustrativeNote>}
      />
      {history.isLoading ? (
        <LoadingState />
      ) : history.isError ? (
        <ErrorState message="Unable to load scenarios." onRetry={() => history.refetch()} />
      ) : (
        <div className="grid gap-4 xl:grid-cols-[300px_minmax(0,1fr)]">
          <DashboardCard title="Scenario Controls" description="Select one or more interventions:">
            <div className="space-y-3">
              {presets.map((option) => (
                <label key={option.label} className="flex items-center gap-2.5 text-xs text-slate-200 cursor-pointer p-1.5 rounded hover:bg-white/5">
                  <Checkbox
                    checked={selected.includes(option.label)}
                    onCheckedChange={(checked) => {
                      setSelected((current) =>
                        checked ? [...current, option.label] : current.filter((item) => item !== option.label),
                      );
                      if (checked) {
                        setCost(String(option.cost));
                        setEffectiveness(String(option.effectiveness));
                      }
                    }}
                  />
                  <span>{option.label}</span>
                </label>
              ))}
              <div className="border-t border-white/10 pt-3">
                <Label>Investment Cost (INR)</Label>
                <Input className="mt-1 font-mono text-xs" value={cost} onChange={(e) => setCost(e.target.value)} />
              </div>
              <div>
                <Label>Control Effectiveness (0.0 - 1.0)</Label>
                <Input className="mt-1 font-mono text-xs" value={effectiveness} onChange={(e) => setEffectiveness(e.target.value)} />
              </div>
              <Button
                className="w-full bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold mt-2"
                onClick={() =>
                  run.mutate(
                    {
                      changes: selected,
                      control_effectiveness: Number(effectiveness),
                      investment_cost: Number(cost),
                      baseline_risk: summary.data?.average_residual_risk,
                      baseline_eal: summary.data?.total_expected_annual_loss,
                      name: selected.join(" + "),
                    },
                    { onSuccess: (data) => setViewed(data) },
                  )
                }
                disabled={run.isPending || selected.length === 0}
              >
                {run.isPending ? "Simulating Systemic Cascade…" : "Simulate What-If Scenario"}
              </Button>
              {run.isError ? <p className="text-xs text-amber-200">Simulation failed.</p> : null}
            </div>
          </DashboardCard>

          <div className="space-y-4">
            {result ? <ScenarioBoard result={result} /> : null}

            <DashboardCard title="Saved Scenario History">
              <ul className="space-y-2 text-xs">
                {(history.data ?? []).map((item) => (
                  <li key={item.id ?? item.name}>
                    <button
                      type="button"
                      className="flex w-full items-center justify-between border-b border-white/5 py-2.5 text-left hover:text-cyan-200 group"
                      onClick={() => setViewed(item)}
                    >
                      <div className="min-w-0 pr-2">
                        <p className="text-white font-medium truncate group-hover:text-cyan-200">
                          {item.name ?? item.changes?.join(" + ")}
                        </p>
                        <p className="text-[10px] text-slate-500">
                          Cost: {formatInr(item.investment_cost)} · Loss Avoided: {formatInr(item.financial_loss_avoided)}
                        </p>
                      </div>
                      <span className="font-mono text-xs text-cyan-300 shrink-0">
                        {item.baseline_risk} → {item.scenario_risk} (−{item.risk_reduction} pts)
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </DashboardCard>
          </div>
        </div>
      )}
    </div>
  );
}

function ScenarioBoard({ result }: { result: ScenarioResult }) {
  const pathsBefore = 3;
  const pathsAfter = Math.max(1, 3 - Math.round(Number(result.risk_reduction) / 10));

  return (
    <div className="space-y-4">
      {/* Section 20: BEFORE / AFTER Grid */}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-lg border border-white/10 bg-[#0c1424] p-5 space-y-3">
          <div className="flex items-center justify-between border-b border-white/10 pb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">BEFORE INTERVENTION</span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300">BASELINE</span>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-1">
            <div>
              <p className="text-[10px] uppercase text-slate-400">Residual Risk</p>
              <p className="font-mono text-3xl font-bold text-white mt-1">{result.baseline_risk}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase text-slate-400">Critical Paths</p>
              <p className="font-mono text-3xl font-bold text-rose-400 mt-1">{pathsBefore} Active</p>
            </div>
          </div>

          <div className="border-t border-white/5 pt-2">
            <p className="text-[10px] uppercase text-slate-400">Expected Annual Loss (EAL)</p>
            <p className="font-mono text-xl font-semibold text-white mt-0.5">{formatInr(result.baseline_eal)}</p>
          </div>

          <div>
            <p className="text-[10px] uppercase text-slate-400">Total Financial Exposure</p>
            <p className="font-mono text-base text-slate-300 mt-0.5">{formatInr(Number(result.baseline_eal) * 10.7)}</p>
          </div>
        </div>

        <div className="rounded-lg border border-emerald-500/40 bg-emerald-950/20 p-5 space-y-3 ring-1 ring-emerald-500/20">
          <div className="flex items-center justify-between border-b border-emerald-500/20 pb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-300">AFTER INTERVENTION</span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-semibold">PROJECTED</span>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-1">
            <div>
              <p className="text-[10px] uppercase text-emerald-400">Residual Risk</p>
              <p className="font-mono text-3xl font-bold text-emerald-300 mt-1">{result.scenario_risk}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase text-emerald-400">Critical Paths</p>
              <p className="font-mono text-3xl font-bold text-emerald-300 mt-1">{pathsAfter} Remaining</p>
            </div>
          </div>

          <div className="border-t border-emerald-500/20 pt-2">
            <p className="text-[10px] uppercase text-emerald-400">Expected Annual Loss (EAL)</p>
            <p className="font-mono text-xl font-semibold text-white mt-0.5">{formatInr(result.scenario_eal)}</p>
          </div>

          <div>
            <p className="text-[10px] uppercase text-emerald-400">Total Financial Exposure</p>
            <p className="font-mono text-base text-emerald-200 mt-0.5">{formatInr(Number(result.scenario_eal) * 10.7)}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Mini label="Risk Reduction" value={`−${result.risk_reduction} pts`} tone="cyan" />
        <Mini label="Loss Avoided" value={formatInr(result.financial_loss_avoided)} tone="emerald" />
        <Mini label="Implementation Cost" value={formatInr(result.investment_cost)} tone="slate" />
        <Mini label="Projected ROSI" value={result.rosi == null ? "—" : `${result.rosi.toFixed(1)}%`} tone="violet" />
      </div>
    </div>
  );
}

function Mini({ label, value, tone = "slate" }: { label: string; value: string; tone?: string }) {
  return (
    <div className="rounded-md border border-white/10 bg-[#0c1424] p-3">
      <p className="text-[10px] uppercase tracking-wider text-slate-400">{label}</p>
      <p className="mt-1 font-mono text-base font-bold text-white">{value}</p>
    </div>
  );
}

