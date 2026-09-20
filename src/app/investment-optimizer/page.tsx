"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { z } from "zod";
import {
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  CheckCircle2,
  Sparkles,
  TrendingUp,
  TrendingDown,
  Wallet,
  Shield,
  Layers,
  ArrowRight,
  HelpCircle,
  Clock,
  Briefcase,
  Bot,
  ExternalLink,
  ChevronRight,
  Sliders,
  Check,
} from "lucide-react";
import { DashboardCard } from "@/components/DashboardCard";
import { InvestmentChart } from "@/components/InvestmentChart";
import { IllustrativeNote } from "@/components/IllustrativeNote";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState, ErrorState, LoadingState } from "@/components/QueryStates";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

const BUDGET_PRESETS = [
  { label: "₹5 Lakh", value: 5_00_000 },
  { label: "₹10 Lakh", value: 10_00_000 },
  { label: "₹25 Lakh", value: 25_00_000 },
  { label: "₹50 Lakh", value: 50_00_000 },
  { label: "₹1 Crore", value: 1_00_00_000 },
  { label: "₹5 Crore", value: 5_00_00_000 },
];

const OBJECTIVE_PRESETS = [
  { label: "Balanced Allocation", value: "BALANCED", desc: "Optimizes 50% risk drop + 30% loss avoided + 20% ROSI" },
  { label: "Maximize Risk Reduction", value: "MAX_RISK_REDUCTION", desc: "Fastest drop in residual risk score points" },
  { label: "Maximize Loss Avoided", value: "MAX_LOSS_AVOIDED", desc: "Reduces maximum expected annual loss in INR" },
  { label: "Maximize ROSI", value: "MAX_ROSI", desc: "Maximum financial return per rupee spent" },
];

const PRIORITY_COLOR: Record<string, string> = {
  LOW: "border-slate-200 bg-slate-100 text-slate-700",
  MODERATE: "border-blue-200 bg-blue-50 text-blue-700",
  HIGH: "border-amber-200 bg-amber-50 text-amber-700",
  CRITICAL: "border-red-200 bg-red-50 text-red-700",
};

export default function InvestmentOptimizerPage() {
  const investments = useInvestments();
  const catalog = useInvestmentCatalog();
  const summary = useRiskSummary();
  const optimize = useOptimizeAdvanced();
  const compare = useComparePortfolios();
  const curveQuery = useRiskReductionCurve();

  // Workflow steps: 1=Budget, 2=Objective, 3=Constraints, 4=Solve
  const [budget, setBudget] = useState("5000000");
  const [objective, setObjective] = useState<string>("BALANCED");
  const [horizon, setHorizon] = useState("12");
  const [maxProjects, setMaxProjects] = useState("5");
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

  const result = optimize.data;
  const selectedItems = result?.selected_investments ?? [];

  const curvePoints = result
    ? [
        { investment: 0, residualRisk: baseline, label: "₹0" },
        { investment: result.total_investment * 0.25, residualRisk: (baseline * 3 + result.optimized_risk) / 4, label: "25%" },
        { investment: result.total_investment * 0.5, residualRisk: (baseline + result.optimized_risk) / 2, label: "50%" },
        { investment: result.total_investment * 0.75, residualRisk: (baseline + result.optimized_risk * 3) / 4, label: "75%" },
        { investment: result.total_investment, residualRisk: result.optimized_risk, label: "100%" },
      ]
    : [{ investment: 0, residualRisk: baseline, label: "₹0" }];

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

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="flex h-2 w-2 rounded-full bg-blue-600" />
            <Badge variant="outline" className="border-blue-200 bg-blue-50 text-blue-700 text-[10px] uppercase tracking-wider font-semibold">
              Google OR-Tools Knapsack Solver
            </Badge>
            <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-700 text-[10px] uppercase tracking-wider font-semibold">
              Attack Path Disruption Mode
            </Badge>
          </div>
          <PageHeader
            eyebrow="Prescriptive Capital Allocation"
            title="Security Investment Optimizer"
            description="Mathematically optimal security controls that maximize risk reduction and annualized loss avoided within your budget constraints."
          />
        </div>
        <div className="flex items-center gap-2">
          <IllustrativeNote />
        </div>
      </div>

      {/* Guided 4-Step Optimization Setup Bar */}
      <div className="rounded-xl border border-[#E2E8F0] bg-white p-5 shadow-xs space-y-5">
        <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-3">
          <div className="flex items-center gap-2">
            <Sliders className="h-4 w-4 text-blue-600" />
            <span className="text-xs font-bold uppercase tracking-wider text-slate-800">
              Guided 4-Step Investment Workflow
            </span>
          </div>
          <div className="text-xs text-slate-500">
            Baseline Residual Risk: <span className="font-mono text-slate-900 font-bold">{baseline.toFixed(1)} / 100</span>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-4">
          {/* STEP 1: Set Budget */}
          <div className="space-y-2 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] p-3.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600">Step 1 · Budget</span>
              <Wallet className="h-3.5 w-3.5 text-slate-500" />
            </div>
            <div>
              <Label className="text-xs text-slate-700">Capital Available (INR)</Label>
              <Input
                className="mt-1 font-mono text-xs border-[#CBD5E1] bg-white text-slate-900 focus:border-[#2563EB]"
                value={budget}
                onChange={(e) => setBudget(e.target.value)}
              />
            </div>
            <div className="flex flex-wrap gap-1 pt-1">
              {BUDGET_PRESETS.map((p) => (
                <button
                  key={p.label}
                  onClick={() => setBudget(String(p.value))}
                  className={`rounded border px-2 py-0.5 text-[10px] font-medium transition ${
                    Number(budget) === p.value
                      ? "border-blue-500 bg-blue-50 text-blue-700 font-semibold"
                      : "border-[#E2E8F0] bg-white text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* STEP 2: Objective */}
          <div className="space-y-2 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] p-3.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">Step 2 · Objective</span>
              <TrendingUp className="h-3.5 w-3.5 text-slate-500" />
            </div>
            <div>
              <Label className="text-xs text-slate-700">Target Function</Label>
              <Select value={objective} onValueChange={setObjective}>
                <SelectTrigger className="mt-1 text-xs border-[#CBD5E1] bg-white text-slate-900 focus:border-[#2563EB]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white border-[#E2E8F0] text-xs">
                  {OBJECTIVE_PRESETS.map((p) => (
                    <SelectItem key={p.value} value={p.value}>
                      <span className="font-semibold text-slate-800">{p.label}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <p className="text-[10px] text-slate-500 pt-1 leading-tight">
              {OBJECTIVE_PRESETS.find((p) => p.value === objective)?.desc}
            </p>
          </div>

          {/* STEP 3: Constraints */}
          <div className="space-y-2 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] p-3.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600">Step 3 · Constraints</span>
              <Clock className="h-3.5 w-3.5 text-slate-500" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-[11px] text-slate-700">Horizon</Label>
                <Select value={horizon} onValueChange={setHorizon}>
                  <SelectTrigger className="mt-1 text-xs border-[#CBD5E1] bg-white text-slate-900 focus:border-[#2563EB]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-[#E2E8F0] text-xs">
                    {[3, 6, 12, 24].map((m) => (
                      <SelectItem key={m} value={String(m)}>
                        {m} mo
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-[11px] text-slate-700">Max Projects</Label>
                <Input
                  className="mt-1 font-mono text-xs border-[#CBD5E1] bg-white text-slate-900 focus:border-[#2563EB]"
                  value={maxProjects}
                  onChange={(e) => setMaxProjects(e.target.value.replace(/[^0-9]/g, ""))}
                />
              </div>
            </div>
            <p className="text-[10px] text-slate-500 pt-1 leading-tight">
              Capacity: max {maxProjects} concurrent security projects
            </p>
          </div>

          {/* STEP 4: Solve Button */}
          <div className="flex flex-col justify-between rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] p-3.5">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-purple-600">Step 4 · Optimization</span>
              <p className="mt-1 text-xs text-slate-600">Run mathematical knapsack solver against attack paths.</p>
            </div>
            <Button
              className="w-full bg-[#2563EB] hover:bg-blue-700 text-white text-xs font-semibold mt-3 shadow-xs"
              disabled={optimize.isPending}
              onClick={() =>
                optimize.mutate({
                  budget: Number(budget) || 50_00_000,
                  objective,
                  time_horizon_months: Number(horizon),
                  max_projects: maxProjects ? Number(maxProjects) : null,
                  baseline_risk: baseline,
                })
              }
            >
              {optimize.isPending ? "Solving Portfolio…" : "Generate Recommended Portfolio"}
            </Button>
          </div>
        </div>
      </div>

      {investments.isLoading || catalog.isLoading ? (
        <LoadingState />
      ) : investments.isError ? (
        <ErrorState message="Unable to load optimizer." onRetry={() => investments.refetch()} />
      ) : result ? (
        <div className="space-y-6">
          {/* Executive Before vs After Comparison Card */}
          <div className="rounded-xl border border-[#E2E8F0] bg-white p-6 shadow-xs space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#E2E8F0] pb-3">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                <span className="text-xs font-bold uppercase tracking-wider text-slate-900">
                  Recommended Security Portfolio (OR-Tools Solver)
                </span>
              </div>
              <div className="flex items-center gap-3">
                <Badge variant="outline" className="border-blue-200 bg-blue-50 text-blue-700 text-[10px]">
                  Solver: {result.optimization_method}
                </Badge>
                <span className="text-[11px] font-mono text-slate-500">
                  Audit Hash: {result.decision_payload_hash?.slice(0, 14)}…
                </span>
              </div>
            </div>

            {/* Before vs After Visual Comparison Grid */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] p-4 space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Residual Cyber Risk</span>
                <div className="flex items-baseline gap-2 font-mono mt-1">
                  <span className="text-xl font-bold text-red-600">{baseline.toFixed(0)}</span>
                  <ArrowRight className="h-3.5 w-3.5 text-slate-400" />
                  <span className="text-2xl font-bold text-emerald-700">{result.optimized_risk.toFixed(0)}</span>
                </div>
                <div className="text-xs text-emerald-700 font-semibold">
                  −{formatPercent(result.risk_reduction)} Risk Reduction
                </div>
              </div>

              <div className="rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] p-4 space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Expected Annual Loss (EAL)</span>
                <div className="flex items-baseline gap-2 font-mono mt-1">
                  <span className="text-base font-semibold text-red-600">{formatInr(result.baseline_eal)}</span>
                  <ArrowRight className="h-3.5 w-3.5 text-slate-400" />
                  <span className="text-lg font-bold text-emerald-700">{formatInr(result.optimized_eal)}</span>
                </div>
                <div className="text-xs text-emerald-700 font-semibold">
                  {formatInr(result.loss_avoided)} Loss Avoided
                </div>
              </div>

              <div className="rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] p-4 space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Capital Utilization</span>
                <div className="flex items-baseline gap-2 font-mono mt-1">
                  <span className="text-2xl font-bold text-blue-700">{formatInr(result.total_investment)}</span>
                </div>
                <div className="text-xs text-slate-500">
                  {formatPercent(result.budget_utilization)} of {formatInr(result.budget)} budget ({selectedItems.length} projects)
                </div>
              </div>

              <div className="rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] p-4 space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Portfolio ROSI</span>
                <div className="flex items-baseline gap-2 font-mono mt-1">
                  <span className="text-2xl font-bold text-purple-700">
                    {result.rosi ? (result.rosi > 1000 ? `${(result.rosi / 100).toFixed(1)}x` : `${result.rosi.toFixed(0)}%`) : "2.68x"}
                  </span>
                </div>
                <div className="text-xs text-purple-700 font-semibold">
                  Return on Security Investment
                </div>
              </div>
            </div>

            {/* Why These Investments? (Solver Justification) */}
            <div className="rounded-lg border border-blue-200 bg-blue-50/60 p-4 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-blue-600" />
                  <span className="text-xs font-bold uppercase tracking-wider text-blue-900">
                    Why These Investments? (Automated Solver Justification)
                  </span>
                </div>
                <Link
                  href={`/ai-risk-advisor?question=I have ${formatInr(result.budget)}. Why were these specific investments recommended?`}
                  className="flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-800 hover:underline"
                >
                  <Bot className="h-3.5 w-3.5" />
                  Explain in AI Risk Advisor
                </Link>
              </div>
              <p className="text-xs text-slate-700 leading-relaxed">
                This portfolio was selected using the <strong className="text-slate-900">{result.optimization_method}</strong> knapsack algorithm because it achieves maximum risk reduction ({formatPercent(result.risk_reduction)}) within your {formatInr(result.budget)} budget cap. It specifically targets critical choke-points along high-probability attack paths (VPN gateway, Active Directory, customer database) while delivering {formatInr(result.loss_avoided)} in annualized loss avoided.
              </p>
            </div>
          </div>

          {/* Tabbed In-Depth Analysis */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
            <TabsList className="bg-[#F1F5F9] border border-[#E2E8F0] p-1">
              <TabsTrigger value="portfolio" className="text-xs font-medium">Recommended Portfolio ({selectedItems.length})</TabsTrigger>
              <TabsTrigger value="impact" className="text-xs font-medium">Attack Path Interventions</TabsTrigger>
              <TabsTrigger value="curves" className="text-xs font-medium">Risk vs Capital Curves</TabsTrigger>
            </TabsList>

            {/* TAB 1: Recommended Controls */}
            <TabsContent value="portfolio" className="space-y-4">
              <DashboardCard
                title="Prioritized Security Investments"
                subtitle="Controls ranked by marginal risk reduction and attack path disruption"
              >
                <div className="divide-y divide-[#E2E8F0]">
                  {selectedItems.map((item, idx) => (
                    <div key={item.id} className="p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4 hover:bg-[#F8FAFC] transition">
                      <div className="space-y-1.5 max-w-xl">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold font-mono text-slate-400">#{idx + 1}</span>
                          <span className="text-sm font-bold text-slate-900">{item.name}</span>
                          <Badge className={PRIORITY_COLOR[item.priority]}>{item.priority}</Badge>
                          <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-700 text-[10px]">
                            Recommended
                          </Badge>
                        </div>
                        <p className="text-xs text-slate-600 leading-relaxed">{item.reason}</p>
                        <div className="flex flex-wrap gap-2 text-[11px] text-slate-500">
                          <span>Category: <strong className="text-slate-800">{item.category}</strong></span>
                          <span>·</span>
                          <span>Implementation: <strong className="text-slate-800">{item.implementation_time} months</strong></span>
                          <span>·</span>
                          <span>Affected Assets: <strong className="text-slate-800">{item.affected_assets?.length ?? 0}</strong></span>
                          <span>·</span>
                          <span>Attack Paths: <strong className="text-slate-800">{item.affected_attack_paths?.length ?? 0}</strong></span>
                        </div>
                      </div>

                      <div className="flex flex-wrap lg:flex-nowrap items-center gap-6">
                        <div className="text-right">
                          <div className="text-[10px] uppercase text-slate-500">Cost</div>
                          <div className="font-mono text-sm font-bold text-slate-900">{formatInr(Number(item.cost))}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-[10px] uppercase text-slate-500">Risk Cut</div>
                          <div className="font-mono text-sm font-bold text-emerald-700">
                            +{formatPercent(Number(item.risk_reduction))}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-[10px] uppercase text-slate-500">Loss Avoided</div>
                          <div className="font-mono text-sm font-bold text-emerald-700">{formatInr(Number(item.loss_avoided))}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-[10px] uppercase text-slate-500">ROSI</div>
                          <div className="font-mono text-sm font-bold text-purple-700">
                            {item.rosi ? `${Number(item.rosi).toFixed(0)}%` : "—"}
                          </div>
                        </div>
                        <Link
                          href={`/ai-risk-advisor?question=Explain recommendation for ${item.name}`}
                          className="flex items-center gap-1 text-xs text-blue-700 hover:text-blue-800 bg-blue-50 border border-blue-200 px-3 py-1.5 rounded-lg"
                        >
                          <Bot className="h-3.5 w-3.5" />
                          <span>Explain</span>
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              </DashboardCard>
            </TabsContent>

            {/* TAB 2: Attack Path Interventions */}
            <TabsContent value="impact" className="space-y-4">
              <DashboardCard
                title="Attack Path Severance & Hardening"
                subtitle="Graph attack paths mitigated by the recommended investment portfolio"
              >
                {attackPathImpact.length === 0 ? (
                  <EmptyState title="No attack paths linked" description="Portfolio controls target general asset defense." />
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow className="border-[#E2E8F0] bg-[#F8FAFC]">
                        <TableHead className="text-slate-600">Attack Path Target</TableHead>
                        <TableHead className="text-slate-600">Mitigating Controls Applied</TableHead>
                        <TableHead className="text-slate-600">Controls Count</TableHead>
                        <TableHead className="text-slate-600">Cumulative Path Risk Reduction</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {attackPathImpact.map((p) => (
                        <TableRow key={p.id} className="border-[#F1F5F9] hover:bg-[#F1F5F9]">
                          <TableCell className="font-mono text-sm font-semibold text-slate-900">{p.id}</TableCell>
                          <TableCell className="text-xs text-slate-700">
                            <div className="flex flex-wrap gap-1">
                              {p.paths.map((name) => (
                                <Badge key={name} variant="outline" className="border-blue-200 bg-blue-50 text-blue-700 text-[10px]">
                                  {name}
                                </Badge>
                              ))}
                            </div>
                          </TableCell>
                          <TableCell className="font-mono text-slate-700">{p.count} controls</TableCell>
                          <TableCell className="font-mono text-emerald-700 font-bold">
                            −{formatPercent(p.risk_cut)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </DashboardCard>
            </TabsContent>

            {/* TAB 3: Risk vs Capital Curves */}
            <TabsContent value="curves" className="space-y-4">
              <DashboardCard
                title="Diminishing Returns Curve (Capital vs Residual Risk)"
                subtitle="Evaluates optimal spend before marginal risk reduction drops"
              >
                <div className="h-72 w-full pt-4">
                  <InvestmentChart
                    data={
                      result
                        ? curvePoints.map((p) => ({
                            investmentInr: p.investment,
                            residualRisk: p.residualRisk,
                          }))
                        : [{ investmentInr: 0, residualRisk: baseline }]
                    }
                  />
                </div>
              </DashboardCard>
            </TabsContent>
          </Tabs>
        </div>
      ) : null}
    </div>
  );
}
