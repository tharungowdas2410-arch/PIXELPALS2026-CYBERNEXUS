"use client";

import { useState } from "react";
import { z } from "zod";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  DollarSign,
  Activity,
  Calculator,
  ShieldAlert,
  ChevronDown,
  ChevronUp,
  Info,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import { DashboardCard } from "@/components/DashboardCard";
import { IllustrativeNote } from "@/components/IllustrativeNote";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState, ErrorState, LoadingState } from "@/components/QueryStates";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/misc";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useCalculateFinancial, useFinancialSummary, useLossDistribution, useMonteCarlo } from "@/lib/hooks/useFinancial";
import { formatInr } from "@/lib/format";

const mcSchema = z.object({
  expected_loss: z.coerce.number().min(0),
  min_loss: z.coerce.number().min(0),
  max_loss: z.coerce.number().min(0),
  probability: z.coerce.number().min(0).max(1),
  simulations: z.coerce.number().min(100).max(50000),
  seed: z.coerce.number(),
});

export default function FinancialRiskPage() {
  const summary = useFinancialSummary();
  const distribution = useLossDistribution();
  const monte = useMonteCarlo();
  const calc = useCalculateFinancial();

  const [driversOpen, setDriversOpen] = useState(false);
  const [mc, setMc] = useState({
    expected_loss: "1000000",
    min_loss: "100000",
    max_loss: "5000000",
    probability: "0.4",
    simulations: "5000",
    seed: "26105",
  });
  const [ealForm, setEalForm] = useState({
    likelihood: "0.4",
    impact: "0.7",
    asset_business_value: "10000000",
  });

  const live = monte.data ?? distribution.data;
  const lossPoints = live
    ? [
        { percentile: "P50 (Median)", lossInr: live.p50, raw: live.p50 },
        { percentile: "P75", lossInr: live.p75, raw: live.p75 },
        { percentile: "P90", lossInr: live.p90, raw: live.p90 },
        { percentile: "P95 (VaR)", lossInr: live.p95, raw: live.p95 },
        { percentile: "P99 (Extreme)", lossInr: live.p99, raw: live.p99 },
      ]
    : [];

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner / Title */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="flex h-2 w-2 rounded-full bg-emerald-500" />
            <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-700 text-[10px] uppercase tracking-wider font-semibold">
              Open FAIR Aligned
            </Badge>
            <Badge variant="outline" className="border-blue-200 bg-blue-50 text-blue-700 text-[10px] uppercase tracking-wider font-semibold">
              Monte Carlo Engine (10,000 Iterations)
            </Badge>
          </div>
          <PageHeader
            eyebrow="Quantitative Risk Analysis"
            title="Financial Risk Intelligence Terminal"
            description="Empirical loss distribution, Value at Risk (VaR 95%), and annualized exposure derived from enterprise telemetry and Open FAIR methodology."
          />
        </div>
        <div className="flex items-center gap-2">
          <IllustrativeNote />
        </div>
      </div>

      {summary.isLoading || (summary.isFetching && !summary.data) ? (
        <LoadingState />
      ) : summary.isError || !summary.data || summary.data.expected_annual_loss === undefined ? (
        summary.isFetching ? (
          <LoadingState />
        ) : (
          <ErrorState message="Unable to load financial summary." onRetry={() => summary.refetch()} />
        )
      ) : (
        <>
          {/* Executive KPI Strip */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border border-[#E2E8F0] bg-white p-5 shadow-xs">
              <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
                <span className="font-semibold uppercase tracking-wider">Expected Annual Loss</span>
                <DollarSign className="h-4 w-4 text-blue-600" />
              </div>
              <div className="text-2xl font-bold font-mono text-slate-900 tracking-tight">
                {formatInr(summary.data.expected_annual_loss ?? 0)}
              </div>
              <div className="mt-2 flex items-center gap-1.5 text-xs text-slate-500">
                <span className="text-emerald-600 font-medium">Mean expected loss</span> across all operational assets
              </div>
            </div>

            <div className="rounded-xl border border-[#E2E8F0] bg-white p-5 shadow-xs">
              <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
                <span className="font-semibold uppercase tracking-wider">Value at Risk (95%)</span>
                <ShieldAlert className="h-4 w-4 text-amber-600" />
              </div>
              <div className="text-2xl font-bold font-mono text-amber-700 tracking-tight">
                {formatInr(live?.var ?? live?.p95 ?? 0)}
              </div>
              <div className="mt-2 flex items-center gap-1.5 text-xs text-slate-500">
                <span className="text-amber-700 font-medium">P95 tolerance</span> 95% probability losses will not exceed this
              </div>
            </div>

            <div className="rounded-xl border border-[#E2E8F0] bg-white p-5 shadow-xs">
              <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
                <span className="font-semibold uppercase tracking-wider">Total Potential Exposure</span>
                <Activity className="h-4 w-4 text-red-600" />
              </div>
              <div className="text-2xl font-bold font-mono text-red-700 tracking-tight">
                {formatInr(summary.data.total_financial_exposure)}
              </div>
              <div className="mt-2 flex items-center gap-1.5 text-xs text-slate-500">
                <span className="text-red-700 font-medium">{summary.data.risk_count} quantified risks</span> in register
              </div>
            </div>

            <div className="rounded-xl border border-[#E2E8F0] bg-white p-5 shadow-xs">
              <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
                <span className="font-semibold uppercase tracking-wider">Model Status</span>
                <Sparkles className="h-4 w-4 text-emerald-600" />
              </div>
              <div className="text-2xl font-bold font-mono text-emerald-700 tracking-tight">
                {live?.mean ? formatInr(live.mean) : formatInr(summary.data.expected_annual_loss ?? 0)}
              </div>
              <div className="mt-2 flex items-center gap-1.5 text-xs text-emerald-700">
                <span>Active simulation mean loss</span>
              </div>
            </div>
          </div>

          {/* Collapsible Explainer: "What drives this estimate?" */}
          <div className="rounded-xl border border-[#E2E8F0] bg-white p-4 shadow-xs">
            <button
              onClick={() => setDriversOpen(!driversOpen)}
              className="flex w-full items-center justify-between text-left focus:outline-none"
            >
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-blue-50 p-2 text-blue-600">
                  <Info className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">
                    What Drives This Financial Estimate? (Open FAIR Model Decomposition)
                  </h3>
                  <p className="text-xs text-slate-500">
                    Understanding how security telemetry transforms into quantified Indian Rupee exposures
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-xs font-medium text-blue-600">
                <span>{driversOpen ? "Collapse Methodology" : "Inspect Decomposition"}</span>
                {driversOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </div>
            </button>

            {driversOpen && (
              <div className="mt-4 pt-4 border-t border-[#E2E8F0] space-y-4">
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] p-3 space-y-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600">Step 1 · Loss Event Frequency (LEF)</span>
                    <p className="text-xs font-semibold text-slate-900">Threat Frequency × Vulnerability</p>
                    <p className="text-[11px] text-slate-500 leading-relaxed">
                      Determined by external threat capability, CVE CVSS metrics, unpatched attack paths, and internal control effectiveness (MFA, EDR, network segmentation).
                    </p>
                  </div>
                  <div className="rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] p-3 space-y-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600">Step 2 · Loss Magnitude (LM)</span>
                    <p className="text-xs font-semibold text-slate-900">Primary + Secondary Business Impact</p>
                    <p className="text-[11px] text-slate-500 leading-relaxed">
                      Quantifies operational downtime, response costs, incident investigation, customer churn, and regulatory penalties (RBI, SEBI, GDPR compliance fines).
                    </p>
                  </div>
                  <div className="rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] p-3 space-y-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">Step 3 · Monte Carlo Trials</span>
                    <p className="text-xs font-semibold text-slate-900">10,000 Log-Normal Simulations</p>
                    <p className="text-[11px] text-slate-500 leading-relaxed">
                      Instead of one arbitrary guess, the engine runs 10,000 trials sampling beta-PERT distributions to produce realistic P50, P90, and P95 tail exposures.
                    </p>
                  </div>
                </div>

                <div className="rounded-lg bg-blue-50/70 border border-blue-200 p-3 text-xs text-slate-700">
                  <span className="font-semibold text-blue-800">Governance Note: </span>
                  Values presented are model-estimated decision intelligence figures intended for prioritizing controls and executive decision-making. Sensitive raw financial data is not transmitted externally.
                </div>
              </div>
            )}
          </div>

          {/* Charts Row */}
          <div className="grid gap-6 xl:grid-cols-2">
            {/* Percentile Distribution Chart */}
            <DashboardCard
              title="Percentile Loss Curve (Open FAIR)"
              subtitle="Probabilistic loss across percentiles"
            >
              {distribution.isLoading ? (
                <LoadingState />
              ) : lossPoints.length ? (
                <div className="h-72 w-full pt-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={lossPoints} margin={{ top: 8, right: 12, left: 12, bottom: 8 }}>
                      <CartesianGrid stroke="#E2E8F0" vertical={false} />
                      <XAxis dataKey="percentile" tick={{ fill: "#64748B", fontSize: 11 }} tickLine={false} axisLine={false} />
                      <YAxis
                        tick={{ fill: "#64748B", fontSize: 11 }}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(v: number) => `₹${(v / 1_00_00_000).toFixed(1)} Cr`}
                      />
                      <Tooltip
                        formatter={(val: unknown) => [formatInr(Number(val)), "Modeled Loss"]}
                        contentStyle={{
                          background: "#FFFFFF",
                          border: "1px solid #E2E8F0",
                          borderRadius: 8,
                          fontSize: 12,
                          color: "#0F172A",
                          boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                        }}
                      />
                      <Bar dataKey="lossInr" fill="#2563EB" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <EmptyState title="No distribution" description="Quantify risks first." />
              )}
            </DashboardCard>

            {/* Simulation Histogram */}
            <DashboardCard
              title="Monte Carlo Frequency Histogram"
              subtitle="Frequency of loss ranges across 10,000 simulated trials"
            >
              {live?.distribution_buckets?.length ? (
                <div className="h-72 w-full pt-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={live.distribution_buckets} margin={{ top: 8, right: 12, left: 12, bottom: 8 }}>
                      <CartesianGrid stroke="#E2E8F0" vertical={false} />
                      <XAxis
                        dataKey="from"
                        tickFormatter={(v: number) => formatInr(v)}
                        tick={{ fill: "#64748B", fontSize: 10 }}
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis tick={{ fill: "#64748B", fontSize: 11 }} tickLine={false} axisLine={false} />
                      <Tooltip
                        formatter={(val: unknown) => [String(val), "Trials"]}
                        labelFormatter={(lbl: unknown) => `Loss Bin: ${formatInr(Number(lbl))}`}
                        contentStyle={{
                          background: "#FFFFFF",
                          border: "1px solid #E2E8F0",
                          borderRadius: 8,
                          fontSize: 12,
                          color: "#0F172A",
                          boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                        }}
                      />
                      <Bar dataKey="count" fill="#0891B2" radius={[3, 3, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <EmptyState
                  title="No histogram bins"
                  description="Run a Monte Carlo simulation below to generate custom histogram bins."
                />
              )}
            </DashboardCard>
          </div>

          {/* Percentile Table */}
          <DashboardCard title="Executive Percentile Breakdown" subtitle="Detailed percentile loss values with risk tolerance thresholds">
            <Table>
              <TableHeader>
                <TableRow className="border-[#E2E8F0] bg-[#F8FAFC]">
                  <TableHead className="text-slate-600">Metric</TableHead>
                  <TableHead className="text-slate-600">Percentile Meaning</TableHead>
                  <TableHead className="text-slate-600">Modeled Loss (INR)</TableHead>
                  <TableHead className="text-slate-600">Risk Assessment</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow className="border-[#F1F5F9] hover:bg-[#F1F5F9]">
                  <TableCell className="font-semibold text-slate-900">P50 (Median)</TableCell>
                  <TableCell className="text-slate-500 text-xs">50% chance annual losses will exceed this</TableCell>
                  <TableCell className="font-mono text-blue-700 font-semibold">{formatInr(live?.p50 ?? 0)}</TableCell>
                  <TableCell><Badge variant="outline" className="text-emerald-700 border-emerald-200 bg-emerald-50">Standard Operating Risk</Badge></TableCell>
                </TableRow>
                <TableRow className="border-[#F1F5F9] hover:bg-[#F1F5F9]">
                  <TableCell className="font-semibold text-slate-900">P75</TableCell>
                  <TableCell className="text-slate-500 text-xs">Upper quartile loss expectation</TableCell>
                  <TableCell className="font-mono text-slate-800 font-semibold">{formatInr(live?.p75 ?? 0)}</TableCell>
                  <TableCell><Badge variant="outline" className="text-blue-700 border-blue-200 bg-blue-50">Moderate Exposure</Badge></TableCell>
                </TableRow>
                <TableRow className="border-[#F1F5F9] hover:bg-[#F1F5F9]">
                  <TableCell className="font-semibold text-slate-900">P90</TableCell>
                  <TableCell className="text-slate-500 text-xs">90th percentile stress scenario</TableCell>
                  <TableCell className="font-mono text-amber-700 font-semibold">{formatInr(live?.p90 ?? 0)}</TableCell>
                  <TableCell><Badge variant="outline" className="text-amber-700 border-amber-200 bg-amber-50">Heightened Stress</Badge></TableCell>
                </TableRow>
                <TableRow className="border-[#F1F5F9] hover:bg-[#F1F5F9]">
                  <TableCell className="font-semibold text-red-700 font-mono">P95 (VaR)</TableCell>
                  <TableCell className="text-slate-500 text-xs">Board-level Value at Risk ceiling</TableCell>
                  <TableCell className="font-mono text-red-700 font-bold">{formatInr(live?.var ?? live?.p95 ?? 0)}</TableCell>
                  <TableCell><Badge variant="outline" className="text-red-700 border-red-200 bg-red-50">Executive Risk Ceiling</Badge></TableCell>
                </TableRow>
                <TableRow className="border-[#F1F5F9] hover:bg-[#F1F5F9]">
                  <TableCell className="font-semibold text-red-800 font-mono">P99 (Extreme)</TableCell>
                  <TableCell className="text-slate-500 text-xs">1-in-100 year catastrophic cyber black swan</TableCell>
                  <TableCell className="font-mono text-red-800 font-bold">{formatInr(live?.p99 ?? 0)}</TableCell>
                  <TableCell><Badge variant="outline" className="text-red-800 border-red-200 bg-red-50">Catastrophic Tail Risk</Badge></TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </DashboardCard>

          {/* Interactive Simulation Sandbox */}
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Custom Monte Carlo Runner */}
            <DashboardCard
              title="Run Custom Monte Carlo Simulation"
              subtitle="Adjust loss bounds and probabilities to simulate tail outcomes"
            >
              <div className="grid grid-cols-2 gap-3">
                {Object.entries(mc).map(([key, value]) => (
                  <div key={key}>
                    <Label className="capitalize text-xs text-slate-700">{key.replaceAll("_", " ")}</Label>
                    <Input
                      className="mt-1 font-mono text-xs border-[#CBD5E1] bg-white text-slate-900 focus:border-[#2563EB]"
                      value={value}
                      onChange={(e) => setMc((c) => ({ ...c, [key]: e.target.value }))}
                    />
                  </div>
                ))}
              </div>
              <div className="mt-4 flex items-center justify-between">
                <Button
                  className="bg-[#2563EB] hover:bg-blue-700 text-white text-xs font-semibold px-4 shadow-xs"
                  onClick={() => {
                    const parsed = mcSchema.safeParse(mc);
                    if (parsed.success) monte.mutate(parsed.data);
                  }}
                  disabled={monte.isPending || !mcSchema.safeParse(mc).success}
                >
                  {monte.isPending ? (
                    <RefreshCw className="mr-2 h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Calculator className="mr-2 h-3.5 w-3.5" />
                  )}
                  Execute Monte Carlo Simulation
                </Button>
                <span className="text-[11px] text-slate-500 font-mono">Trials: {mc.simulations}</span>
              </div>
              {monte.isError ? (
                <p className="mt-2 text-xs text-red-600">Simulation failed. Check input bounds.</p>
              ) : null}
              {monte.isSuccess ? (
                <p className="mt-2 text-xs text-emerald-600">Simulation finished! Charts updated above.</p>
              ) : null}
            </DashboardCard>

            {/* Quick EAL Asset Calculator */}
            <DashboardCard
              title="Quick Asset EAL Calculator"
              subtitle="Test annualized loss for an individual critical business asset"
            >
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-xs">
                    <Label className="text-slate-700">Likelihood (0.0 to 1.0)</Label>
                    <span className="font-mono text-blue-600 font-semibold">{ealForm.likelihood}</span>
                  </div>
                  <Input
                    type="number"
                    step="0.05"
                    min="0"
                    max="1"
                    className="mt-1 font-mono text-xs border-[#CBD5E1] bg-white text-slate-900 focus:border-[#2563EB]"
                    value={ealForm.likelihood}
                    onChange={(e) => setEalForm((c) => ({ ...c, likelihood: e.target.value }))}
                  />
                </div>

                <div>
                  <div className="flex justify-between text-xs">
                    <Label className="text-slate-700">Impact Factor (0.0 to 1.0)</Label>
                    <span className="font-mono text-amber-600 font-semibold">{ealForm.impact}</span>
                  </div>
                  <Input
                    type="number"
                    step="0.05"
                    min="0"
                    max="1"
                    className="mt-1 font-mono text-xs border-[#CBD5E1] bg-white text-slate-900 focus:border-[#2563EB]"
                    value={ealForm.impact}
                    onChange={(e) => setEalForm((c) => ({ ...c, impact: e.target.value }))}
                  />
                </div>

                <div>
                  <div className="flex justify-between text-xs">
                    <Label className="text-slate-700">Asset Business Valuation (INR)</Label>
                    <span className="font-mono text-emerald-700 font-semibold">{formatInr(Number(ealForm.asset_business_value))}</span>
                  </div>
                  <Input
                    className="mt-1 font-mono text-xs border-[#CBD5E1] bg-white text-slate-900 focus:border-[#2563EB]"
                    value={ealForm.asset_business_value}
                    onChange={(e) => setEalForm((c) => ({ ...c, asset_business_value: e.target.value }))}
                  />
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between">
                <Button
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-4 shadow-xs"
                  onClick={() =>
                    calc.mutate({
                      likelihood: Number(ealForm.likelihood),
                      impact: Number(ealForm.impact),
                      asset_business_value: Number(ealForm.asset_business_value),
                    })
                  }
                  disabled={calc.isPending}
                >
                  Compute Expected Annual Loss
                </Button>
                {calc.data ? (
                  <div className="font-mono text-sm font-bold text-emerald-700">
                    EAL: {formatInr(Number(calc.data.estimated_annual_loss))}
                  </div>
                ) : null}
              </div>
            </DashboardCard>
          </div>
        </>
      )}
    </div>
  );
}
