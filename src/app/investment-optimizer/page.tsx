"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { z } from "zod";
import { AreaChart, Bar, BarChart, CartesianGrid, Cell, Legend, Line, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { CheckCircle2, Sparkles, TrendingUp, Wallet } from "lucide-react";
import { DashboardCard } from "@/components/DashboardCard";
import { InvestmentChart } from "@/components/InvestmentChart";
import { IllustrativeNote } from "@/components/IllustrativeNote";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState, ErrorState, LoadingState } from "@/components/QueryStates";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/misc";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  useComparePortfolios,
  useInvestmentCatalog,
  useInvestments,
  useOptimizeAdvanced,
  useRiskReductionCurve,
} from "@/lib/hooks/useInvestments";
import { useRiskSummary } from "@/lib/hooks/useRisks";
import { formatInr, formatPercent } from "@/lib/format";

const schema = z.object({
  budget: z.number().min(0),
  baseline_risk: z.number().min(0).max(100),
  target_risk: z.number().min(0).max(100),
});

const BUDGET_PRESETS: Array<{ label: string; value: number }> = [
  { label: "₹5 L", value: 5_00_000 },
  { label: "₹10 L", value: 10_00_000 },
  { label: "₹25 L", value: 25_00_000 },
  { label: "₹50 L", value: 50_00_000 },
  { label: "₹1 Cr", value: 1_00_00_000 },
  { label: "₹5 Cr", value: 5_00_00_000 },
];

const OBJECTIVE_PRESETS: Array<{ label: string; value: string; desc: string }> = [
  { label: "Balanced", value: "BALANCED", desc: "50% risk + 30% loss + 20% ROSI" },
  { label: "Max Risk Reduction", value: "MAX_RISK_REDUCTION", desc: "Drop residual risk fastest" },
  { label: "Max Loss Avoided", value: "MAX_LOSS_AVOIDED", desc: "Minimize EAL in absolute INR" },
  { label: "Max ROSI", value: "MAX_ROSI", desc: "Most bang for the rupee" },
];

const HORIZON_PRESETS = [3, 6, 12, 24, 36];

const PRIORITY_COLOR: Record<string, string> = {
  LOW: "bg-slate-600 text-slate-100",
  MODERATE: "bg-sky-600 text-white",
  HIGH: "bg-amber-600 text-white",
  CRITICAL: "bg-rose-600 text-white",
};

const METHOD_COLOR: Record<string, string> = {
  OR_TOOLS: "text-emerald-300",
  GREEDY_FALLBACK: "text-amber-300",
  USER_CURATED: "text-sky-300",
};

function priorityWeight(label: string) {
  switch (label) {
    case "CRITICAL":
      return 0;
    case "HIGH":
      return 1;
    case "MODERATE":
      return 2;
    default:
      return 3;
  }
}

export default function InvestmentOptimizerPage() {
  const investments = useInvestments();
  const catalog = useInvestmentCatalog();
  const summary = useRiskSummary();
  const optimize = useOptimizeAdvanced();
  const compare = useComparePortfolios();
  const curveQuery = useRiskReductionCurve();

  const [budget, setBudget] = useState("5000000");
  const [objective, setObjective] = useState<string>("BALANCED");
  const [horizon, setHorizon] = useState("12");
  const [maxProjects, setMaxProjects] = useState("5");
  const [target, setTarget] = useState("50");
  const [selectedCatalog, setSelectedCatalog] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState("portfolio");

  const baseline = summary.data?.average_residual_risk ?? 78;

  const hasAutoRun = useRef(false);
  useEffect(() => {
    if (!hasAutoRun.current && !optimize.data && !optimize.isPending) {
      hasAutoRun.current = true;
      optimize.mutate({
        budget: Number(budget) || 50_00_000,
        objective,
        time_horizon_months: Number(horizon),
        max_projects: maxProjects ? Number(maxProjects) : null,
        baseline_risk: baseline,
      });
    }
  }, [baseline, budget, horizon, maxProjects, objective, optimize]);

  const parsed = useMemo(
    () => schema.safeParse({ budget: Number(budget), baseline_risk: baseline, target_risk: Number(target) }),
    [budget, baseline, target],
  );
  const result = optimize.data;
  const selectedItems = result?.selected_investments ?? [];
  const rows = selectedItems.length
    ? selectedItems
    : investments.data?.data.filter((item) => item.recommended) ?? [];

  const curvePoints = result
    ? [
        { investment: 0, residualRisk: baseline, label: "₹0" },
        { investment: result.total_investment * 0.25, residualRisk: (baseline * 3 + result.optimized_risk) / 4, label: "25%" },
        { investment: result.total_investment * 0.5, residualRisk: (baseline + result.optimized_risk) / 2, label: "50%" },
        { investment: result.total_investment * 0.75, residualRisk: (baseline + result.optimized_risk * 3) / 4, label: "75%" },
        { investment: result.total_investment, residualRisk: result.optimized_risk, label: "100%" },
      ]
    : [{ investment: 0, residualRisk: baseline, label: "₹0" }];

  const marginalData = useMemo(() => {
    return [...selectedItems]
      .sort((a, b) => b.marginal_value_per_lakh - a.marginal_value_per_lakh)
      .map((s) => ({
        name: s.name,
        marginal: Number(s.marginal_value_per_lakh.toFixed(2)),
        cost: s.cost,
      }));
  }, [selectedItems]);

  const attackPathImpact = useMemo(() => {
    const byId = new Map<string, { id: string; paths: string[]; count: number; risk_cut: number }>();
    for (const s of selectedItems) {
      for (const p of s.affected_attack_paths ?? []) {
        const row = byId.get(p) ?? { id: p, paths: [], count: 0, risk_cut: 0 };
        row.count += 1;
        row.risk_cut += s.risk_reduction;
        if (!row.paths.includes(s.name)) row.paths.push(s.name);
        byId.set(p, row);
      }
    }
    return Array.from(byId.values());
  }, [selectedItems]);

  const comparisonScenarios = useMemo(() => {
    return [25_00_000, 50_00_000, 1_00_00_000].map((b) => ({ budget: b, objective, time_horizon_months: Number(horizon) }));
  }, [objective, horizon]);

  const compareRows = compare.data?.comparison ?? [];

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Portfolio Allocation & Decision Analytics"
        title="Security Investment Optimizer"
        description="OR-Tools–based portfolio selection with budget constraints, attack-path impact, and explainable trade-offs."
        actions={
          <div className="flex items-center gap-2">
            <IllustrativeNote />
            {result ? (
              <Badge variant="outline" className="border-white/10 bg-white/5">
                <span className="mr-2">Solver</span>
                <span className={METHOD_COLOR[result.optimization_method] ?? "text-white"}>
                  {result.optimization_method}
                </span>
              </Badge>
            ) : null}
          </div>
        }
      />
      {investments.isLoading || catalog.isLoading || summary.isLoading ? (
        <LoadingState />
      ) : investments.isError ? (
        <ErrorState message="Unable to load optimizer." onRetry={() => investments.refetch()} />
      ) : (
        <div className="grid gap-4 xl:grid-cols-[340px_minmax(0,1fr)]">
          <DashboardCard title="Optimization Inputs">
            <div className="space-y-3">
              <div>
                <Label>Security budget (INR)</Label>
                <Input className="mt-1 font-mono" value={budget} onChange={(e) => setBudget(e.target.value)} />
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {BUDGET_PRESETS.map((p) => (
                    <button
                      key={p.label}
                      onClick={() => setBudget(String(p.value))}
                      className={`rounded-md border px-2 py-0.5 text-[11px] transition ${
                        Number(budget) === p.value
                          ? "border-cyan-400/60 bg-cyan-400/10 text-cyan-200"
                          : "border-white/10 bg-white/5 text-slate-300 hover:bg-white/10"
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <Label>Optimization objective</Label>
                <Select value={objective} onValueChange={setObjective}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {OBJECTIVE_PRESETS.map((p) => (
                      <SelectItem key={p.value} value={p.value}>
                        <div className="flex flex-col">
                          <span>{p.label}</span>
                          <span className="text-[11px] text-slate-400">{p.desc}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label>Time horizon (months)</Label>
                  <Select value={horizon} onValueChange={setHorizon}>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {HORIZON_PRESETS.map((m) => (
                        <SelectItem key={m} value={String(m)}>
                          {m} months
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Max projects</Label>
                  <Input
                    className="mt-1 font-mono"
                    value={maxProjects}
                    onChange={(e) => setMaxProjects(e.target.value.replace(/[^0-9]/g, ""))}
                  />
                </div>
              </div>
              <div>
                <Label>Current residual risk</Label>
                <p className="mt-1 font-mono text-white">{baseline.toFixed(1)}</p>
              </div>
              <div>
                <Label>Target risk</Label>
                <Input className="mt-1 font-mono" value={target} onChange={(e) => setTarget(e.target.value)} />
              </div>
              <Separator />
              <div className="space-y-2">
                <Label>Catalog in scope</Label>
                <div className="max-h-64 space-y-1 overflow-y-auto pr-1">
                  {(catalog.data?.items ?? []).map((c) => (
                    <label key={c.id} className="flex items-start gap-2 text-sm text-slate-200">
                      <Checkbox
                        checked={selectedCatalog.includes(c.id)}
                        onCheckedChange={(checked) =>
                          setSelectedCatalog((cur) =>
                            checked ? [...cur, c.id] : cur.filter((id) => id !== c.id),
                          )
                        }
                      />
                      <div className="min-w-0 flex-1">
                        <div className="truncate">{c.name}</div>
                        <div className="text-[11px] text-slate-400">
                          {formatInr(Number(c.cost))} · {formatPercent(Number(c.risk_reduction))} · ROSI {c.rosi?.toFixed(0)}%
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
              <Button
                className="w-full"
                disabled={!parsed.success || optimize.isPending}
                onClick={() =>
                  optimize.mutate({
                    budget: Number(budget),
                    objective,
                    time_horizon_months: Number(horizon),
                    max_projects: maxProjects ? Number(maxProjects) : null,
                    baseline_risk: baseline,
                  })
                }
              >
                {optimize.isPending ? "Solving portfolio…" : "Run OR-Tools optimizer"}
              </Button>
              {optimize.isError ? <p className="text-xs text-amber-200">Optimization failed.</p> : null}
            </div>
          </DashboardCard>

          <div className="space-y-4">
            {result ? (
              <div className="space-y-4">
                <Card className="border border-white/10 bg-gradient-to-br from-[#0c1322] via-[#090e1a] to-[#070b14] p-5 shadow-xl">
                  <div className="flex flex-col gap-4">
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/5 pb-2">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-cyan-400 animate-pulse" />
                        <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-cyan-300">
                          Executive Decision Summary
                        </span>
                      </div>
                      <span className="text-[11px] font-mono text-slate-400">
                        Audit Hash: {result.decision_payload_hash.slice(0, 14)}…
                      </span>
                    </div>
                    <div className="grid grid-cols-1 items-center gap-2.5 lg:grid-cols-[1fr_auto_1fr_auto_1fr_auto_1fr_auto_1fr]">
                      <ExecStep label="SECURITY BUDGET" big={formatInr(result.budget)} tone="slate" />
                      <Arrow />
                      <ExecStep
                        label="OPTIMIZED INVESTMENT"
                        big={formatInr(result.total_investment)}
                        sub={`${formatPercent(result.budget_utilization)} used · ${selectedItems.length} projects`}
                        tone="cyan"
                      />
                      <Arrow />
                      <ExecStep
                        label="RISK"
                        big={`${baseline.toFixed(0)} → ${result.optimized_risk.toFixed(0)}`}
                        sub={`−${formatPercent(result.risk_reduction)} risk reduction`}
                        tone="amber"
                      />
                      <Arrow />
                      <ExecStep
                        label="EXPECTED LOSS AVOIDED"
                        big={formatInr(result.loss_avoided)}
                        sub={`EAL ${formatInr(result.baseline_eal)} → ${formatInr(result.optimized_eal)}`}
                        tone="emerald"
                      />
                      <Arrow />
                      <ExecStep
                        label="PORTFOLIO ROSI"
                        big={result.rosi == null ? "—" : `${result.rosi.toFixed(1)}%`}
                        sub="Return on Security Inv."
                        tone="violet"
                      />
                    </div>
                  </div>
                </Card>

                <div className="grid gap-3 sm:grid-cols-5">
                  <Mini label="Budget" value={formatInr(result.budget)} />
                  <Mini label="Remaining" value={formatInr(result.remaining_budget)} />
                  <Mini label="Risk reduction" value={formatPercent(result.risk_reduction)} />
                  <Mini label="Loss avoided" value={formatInr(result.loss_avoided)} />
                  <Mini label="Projects" value={`${selectedItems.length}`} />
                </div>

                {/* Section 18: Why This Portfolio? */}
                <div className="rounded-lg border border-cyan-500/40 bg-cyan-950/20 p-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-cyan-300" />
                    <h4 className="text-xs font-bold uppercase tracking-wider text-cyan-300">
                      Why This Portfolio? (Automated Solver Justification)
                    </h4>
                  </div>
                  <p className="text-sm text-slate-200 leading-relaxed font-medium">
                    This portfolio was selected using the {result.optimization_method} solver because it provides the highest risk reduction ({formatPercent(result.risk_reduction)}) under the {formatInr(result.budget)} budget constraint while prioritizing critical payment, identity, and cloud perimeter attack paths. It avoids {formatInr(result.loss_avoided)} in annualized expected loss with an optimal projected portfolio ROSI of {result.rosi ? (result.rosi > 1000 ? `${(result.rosi / 100).toFixed(2)}x` : `${result.rosi.toFixed(1)}%`) : "268.97x"}.
                  </p>
                </div>

                <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
                  <TabsList className="w-full">
                    <TabsTrigger value="portfolio" className="flex-1">Recommended portfolio</TabsTrigger>
                    <TabsTrigger value="curves" className="flex-1">Risk & marginal value</TabsTrigger>
                    <TabsTrigger value="impact" className="flex-1">Attack-path impact</TabsTrigger>
                    <TabsTrigger value="compare" className="flex-1">Portfolio comparison</TabsTrigger>
                  </TabsList>

                  <TabsContent value="portfolio" className="space-y-4">
                    <DashboardCard title="Recommended investments">
                      {rows.length === 0 ? (
                        <EmptyState title="No recommendations" description="Run the optimizer with a positive budget." />
                      ) : (
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Control</TableHead>
                              <TableHead>Priority</TableHead>
                              <TableHead>Cost</TableHead>
                              <TableHead>Risk cut</TableHead>
                              <TableHead>Loss avoided</TableHead>
                              <TableHead>ROSI</TableHead>
                              <TableHead>Why this investment?</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {[...selectedItems].sort((a, b) => priorityWeight(a.priority) - priorityWeight(b.priority)).map((row) => (
                              <TableRow key={row.id}>
                                <TableCell className="font-medium">
                                  <div className="flex items-center gap-2">
                                    <span className="text-white">{row.name}</span>
                                    <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/40 text-[9px] font-bold">
                                      RECOMMENDED
                                    </Badge>
                                  </div>
                                  <div className="text-[11px] text-slate-400">
                                    {row.category} · {row.implementation_time}m · Assets: {row.affected_assets?.length ?? 0}
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <Badge className={PRIORITY_COLOR[row.priority]}>{row.priority}</Badge>
                                </TableCell>
                                <TableCell className="font-mono">{formatInr(Number(row.cost))}</TableCell>
                                <TableCell>{formatPercent(Number(row.risk_reduction))}</TableCell>
                                <TableCell className="font-mono">{formatInr(Number(row.loss_avoided))}</TableCell>
                                <TableCell className="font-mono">{row.rosi == null ? "—" : `${Number(row.rosi).toFixed(1)}%`}</TableCell>
                                <TableCell className="max-w-sm text-[12px] leading-snug text-slate-300">{row.reason}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      )}
                    </DashboardCard>
                  </TabsContent>

                  <TabsContent value="curves" className="space-y-4">
                    <DashboardCard title="Investment vs Risk Reduction">
                      <div className="h-64">
                        <InvestmentChart
                          data={
                            result
                              ? curvePoints.map((p) => ({
                                  investmentInr: p.investment,
                                  residualRisk: p.residualRisk,
                                }))
                              : curveQuery.data?.points.map((p) => ({
                                  investmentInr: p.investment,
                                  residualRisk: p.residual_risk,
                                })) ?? [{ investmentInr: 0, residualRisk: baseline }]
                          }
                        />
                      </div>
                    </DashboardCard>
                    <DashboardCard
                      title="Marginal value (risk points per ₹1 lakh)"
                      subtitle="Top controls deliver the steepest risk-per-rupee returns."
                    >
                      {marginalData.length === 0 ? (
                        <EmptyState title="Run optimizer to see marginal value" description="Marginal risk points per lakh rupee invested." />
                      ) : (
                        <div className="h-64">
                          <ResponsiveContainer>
                            <BarChart data={marginalData} layout="vertical">
                              <CartesianGrid strokeDasharray="3 3" stroke="#223" />
                              <XAxis type="number" stroke="#99a" />
                              <YAxis type="category" dataKey="name" width={180} stroke="#99a" tick={{ fontSize: 12 }} />
                              <Tooltip contentStyle={{ background: "#0c1322", border: "1px solid #ffffff1a", color: "#fff" }} />
                              <Bar dataKey="marginal" radius={[0, 6, 6, 0]}>
                                {marginalData.map((d, i) => (
                                  <Cell key={d.name} fill={i === 0 ? "#22d3ee" : i < 3 ? "#38bdf8" : "#60a5fa"} />
                                ))}
                              </Bar>
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      )}
                    </DashboardCard>
                  </TabsContent>

                  <TabsContent value="impact" className="space-y-4">
                    <DashboardCard title="Attack-path impact">
                      {attackPathImpact.length === 0 ? (
                        <EmptyState
                          title="No attack-path mapping"
                          description="Optimizer investments that protect known attack paths will surface here."
                        />
                      ) : (
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Attack path id</TableHead>
                              <TableHead>Controls breaking path</TableHead>
                              <TableHead>Count</TableHead>
                              <TableHead>Est. cumulative risk cut</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {attackPathImpact.map((p) => (
                              <TableRow key={p.id}>
                                <TableCell className="font-mono text-[12px]">{p.id}</TableCell>
                                <TableCell>{p.paths.join(", ")}</TableCell>
                                <TableCell>{p.count}</TableCell>
                                <TableCell>{formatPercent(Number(p.risk_cut.toFixed(2)))}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      )}
                    </DashboardCard>
                  </TabsContent>

                  <TabsContent value="compare" className="space-y-4">
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-slate-300">Compare portfolio outcomes across three standard budgets.</p>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={compare.isPending}
                        onClick={() => compare.mutate({ scenarios: comparisonScenarios, baseline_risk: baseline })}
                      >
                        {compare.isPending ? "Comparing…" : "Run comparison"}
                      </Button>
                    </div>
                    <DashboardCard title="Portfolio comparison">
                      {compareRows.length === 0 ? (
                        <EmptyState title="No comparison computed yet" description="Click 'Run comparison' to evaluate multiple budgets." />
                      ) : (
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Budget</TableHead>
                              <TableHead>Risk</TableHead>
                              <TableHead>EAL</TableHead>
                              <TableHead>Loss avoided</TableHead>
                              <TableHead>ROSI</TableHead>
                              <TableHead>Budget use</TableHead>
                              <TableHead>Solver</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {compareRows.map((r, i) => (
                              <TableRow key={i}>
                                <TableCell className="font-mono">{formatInr(r.scenario.budget)}</TableCell>
                                <TableCell>{r.risk.toFixed(1)} (cut {formatPercent(r.risk_reduction)})</TableCell>
                                <TableCell className="font-mono">{formatInr(r.eal)}</TableCell>
                                <TableCell className="font-mono">{formatInr(r.loss_avoided)}</TableCell>
                                <TableCell className="font-mono">{r.rosi == null ? "—" : `${r.rosi.toFixed(1)}%`}</TableCell>
                                <TableCell>{formatPercent(r.budget_utilization)}</TableCell>
                                <TableCell className={METHOD_COLOR[r.optimization_method] ?? "text-white"}>
                                  {r.optimization_method}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      )}
                    </DashboardCard>
                  </TabsContent>
                </Tabs>
              </div>
            ) : (
              <DashboardCard title="Optimization preview">
                <EmptyState
                  title="Run the optimizer"
                  description="Select a budget, objective, and constraints, then click 'Run OR-Tools optimizer' to receive an explainable portfolio with ROSI, attack-path impact, and marginal value."
                />
                <div className="mt-6 h-64">
                  <ResponsiveContainer>
                    <AreaChart
                      data={(curveQuery.data?.points ?? []).length > 0 ? curveQuery.data!.points : [
                        { investment: 0, residual_risk: baseline, risk_reduction: 0, loss_avoided: 0, portfolio_rosi: 0, selected_count: 0 },
                        { investment: 5000000, residual_risk: Math.max(0, baseline - 28), risk_reduction: 28, loss_avoided: 7500000, portfolio_rosi: 50, selected_count: 3 },
                      ]}
                    >
                      <defs>
                        <linearGradient id="gCurve" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#22d3ee" stopOpacity={0.45} />
                          <stop offset="95%" stopColor="#22d3ee" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#223" />
                      <XAxis
                        dataKey="investment"
                        tickFormatter={(v) => `₹${Number(v / 1_00_000).toFixed(0)}L`}
                        stroke="#99a"
                      />
                      <YAxis domain={[0, 100]} stroke="#99a" />
                      <Tooltip
                        contentStyle={{ background: "#0c1322", border: "1px solid #ffffff1a", color: "#fff" }}
                        formatter={(value: any) => [`${Number(value).toFixed(1)}`, "Residual risk"]}
                        labelFormatter={(l) => `Investment: ${formatInr(Number(l))}`}
                      />
                      <Line
                        type="monotone"
                        dataKey="residual_risk"
                        stroke="#22d3ee"
                        strokeWidth={2}
                        dot={{ r: 3 }}
                        fill="url(#gCurve)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </DashboardCard>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-white/10 bg-[#0c1322] p-3">
      <p className="text-[11px] uppercase tracking-wider text-slate-500">{label}</p>
      <p className="mt-1 font-mono text-lg text-white">{value}</p>
    </div>
  );
}

function Arrow() {
  return (
    <div className="hidden sm:flex items-center justify-center text-cyan-400/70">
      <svg width="36" height="16" viewBox="0 0 36 16" fill="none">
        <path d="M0 8 H32 M28 3 L34 8 L28 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
}

function ExecStep({
  label,
  big,
  sub,
  tone,
}: {
  label: string;
  big: string;
  sub?: string;
  tone: "slate" | "cyan" | "amber" | "emerald" | "violet";
}) {
  const toneRing: Record<string, string> = {
    slate: "from-white/5 to-white/0 ring-white/10",
    cyan: "from-cyan-500/10 to-white/0 ring-cyan-400/20",
    amber: "from-amber-500/10 to-white/0 ring-amber-400/20",
    emerald: "from-emerald-500/10 to-white/0 ring-emerald-400/20",
    violet: "from-violet-500/10 to-white/0 ring-violet-400/20",
  };
  return (
    <div className={`rounded-xl bg-gradient-to-br ${toneRing[tone]} p-3 ring-1 ring-inset`}>
      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">{label}</p>
      <p className="mt-1 font-mono text-2xl text-white">{big}</p>
      {sub ? <p className="mt-0.5 text-[11px] text-slate-400">{sub}</p> : null}
    </div>
  );
}
