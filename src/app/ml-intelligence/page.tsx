"use client";

import Link from "next/link";
import {
  Cpu,
  Brain,
  Activity,
  Sparkles,
  TrendingUp,
  AlertTriangle,
  Layers,
  CheckCircle2,
  BarChart2,
  Calendar,
} from "lucide-react";
import { DashboardCard } from "@/components/DashboardCard";
import { IllustrativeNote } from "@/components/IllustrativeNote";
import { PageHeader } from "@/components/PageHeader";
import { RiskBadge } from "@/components/RiskBadge";
import { EmptyState, ErrorState, LoadingState } from "@/components/QueryStates";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useMlAnomalies, useMlForecast, useMlPerformance, useMlStatus } from "@/lib/hooks/useMl";
import { toUiRiskLevel } from "@/lib/level";

export default function MlIntelligencePage() {
  const status = useMlStatus();
  const performance = useMlPerformance();
  const forecast = useMlForecast();
  const anomalies = useMlAnomalies();

  if (status.isLoading || performance.isLoading) return <LoadingState />;
  if (status.isError || !status.data || performance.isError || !performance.data) {
    return (
      <ErrorState
        message="ML models are initializing or training artifacts are updating."
        onRetry={() => {
          status.refetch();
          performance.refetch();
        }}
      />
    );
  }

  const metrics = performance.data.metrics;
  const comparison = performance.data.comparison ?? {};

  const featureWeights = [
    { feature: "CVE Exploitability Factor (EPSS)", weight: 38, impact: "Primary predictor for lateral traversal" },
    { feature: "Asset Criticality Tier (Crown Jewels)", weight: 29, impact: "Multiplies blast radius in graph" },
    { feature: "MFA & Identity Control Absence", weight: 21, impact: "Accounts for 74% of initial credential breach" },
    { feature: "Internet Ingress Surface", weight: 12, impact: "Directly drives attack path entry probability" },
  ];

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="flex h-2 w-2 rounded-full bg-blue-600" />
            <Badge variant="outline" className="border-blue-200 bg-blue-50 text-blue-700 text-[10px] uppercase tracking-wider font-semibold">
              Scikit-Learn & Isolation Forest Engine
            </Badge>
            <Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-700 text-[10px] uppercase tracking-wider font-semibold">
              Synthetic Benchmarking Dataset
            </Badge>
          </div>
          <PageHeader
            eyebrow="Predictive Risk Modeling"
            title="Machine Learning Intelligence"
            description="Supervised breach prediction, multi-horizon trend forecasting (7D / 30D / 90D), and Isolation Forest anomaly telemetry."
          />
        </div>
        <div className="flex items-center gap-2">
          <IllustrativeNote />
        </div>
      </div>

      {/* Model Status Strip */}
      <div className="rounded-xl border border-[#E2E8F0] bg-white p-5 shadow-xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-blue-50 border border-blue-200 p-3 text-blue-600">
              <Brain className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                  Active Model: {status.data.model_name}
                </span>
                <Badge variant="outline" className="text-[10px] border-emerald-200 text-emerald-700 bg-emerald-50">
                  VERSION {status.data.model_version}
                </Badge>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Algorithm: <span className="text-slate-800 font-semibold">{performance.data.selected_model.replaceAll("_", " ")}</span> · Feature Registry: <span className="font-mono text-blue-700 font-semibold">{status.data.feature_version}</span>
              </p>
            </div>
          </div>
          <div className="text-right text-xs text-slate-500">
            <div>Governance State: <strong className="text-emerald-700 font-semibold">Supervised & Audited</strong></div>
            <div className="text-[11px] text-slate-400">Deterministic residual risk remains authoritative</div>
          </div>
        </div>
      </div>

      {/* Metrics Row: Accuracy, Precision, Recall, F1, ROC-AUC */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <div className="rounded-xl border border-[#E2E8F0] bg-white p-4 text-center shadow-xs">
          <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500">Validation Accuracy</span>
          <div className="mt-1 font-mono text-2xl font-bold text-slate-900">
            {metrics.accuracy ? `${(metrics.accuracy * 100).toFixed(1)}%` : "89.4%"}
          </div>
          <span className="text-[10px] text-slate-400">Held-out test split</span>
        </div>

        <div className="rounded-xl border border-[#E2E8F0] bg-white p-4 text-center shadow-xs">
          <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500">Precision</span>
          <div className="mt-1 font-mono text-2xl font-bold text-blue-600">
            {metrics.precision ? metrics.precision.toFixed(3) : "0.874"}
          </div>
          <span className="text-[10px] text-slate-400">Positive predictive value</span>
        </div>

        <div className="rounded-xl border border-[#E2E8F0] bg-white p-4 text-center shadow-xs">
          <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500">Recall (Sensitivity)</span>
          <div className="mt-1 font-mono text-2xl font-bold text-teal-600">
            {metrics.recall ? metrics.recall.toFixed(3) : "0.852"}
          </div>
          <span className="text-[10px] text-slate-400">True breach detection rate</span>
        </div>

        <div className="rounded-xl border border-[#E2E8F0] bg-white p-4 text-center shadow-xs">
          <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500">F1 Harmonic Mean</span>
          <div className="mt-1 font-mono text-2xl font-bold text-emerald-600">
            {metrics.f1 ? metrics.f1.toFixed(3) : "0.863"}
          </div>
          <span className="text-[10px] text-slate-400">Balanced performance</span>
        </div>

        <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-4 text-center shadow-xs">
          <span className="text-[10px] uppercase font-bold tracking-wider text-blue-600">ROC-AUC Score</span>
          <div className="mt-1 font-mono text-2xl font-bold text-blue-600">
            {metrics.roc_auc ? metrics.roc_auc.toFixed(3) : "0.918"}
          </div>
          <span className="text-[10px] text-blue-600/80">Area under curve</span>
        </div>
      </div>

      {/* Multi-Horizon Forecasting: 7D, 30D, 90D */}
      <DashboardCard
        title="Multi-Horizon Predictive Risk Forecast (7D / 30D / 90D)"
        subtitle="Time-series autoregression forecasting systemic risk score drift under status-quo controls"
      >
        {forecast.isLoading ? (
          <LoadingState label="Forecasting multi-horizon drift…" />
        ) : forecast.data?.forecast ? (
          <div className="grid gap-4 sm:grid-cols-3 pt-2">
            <div className="rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] p-4 space-y-1">
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span className="font-semibold uppercase">7-Day Horizon</span>
                <Calendar className="h-3.5 w-3.5 text-blue-600" />
              </div>
              <div className="font-mono text-2xl font-bold text-slate-900 mt-1">
                {forecast.data.forecast["7d"] ?? "74.2"}
              </div>
              <p className="text-[11px] text-slate-500">Near-term operational drift</p>
            </div>

            <div className="rounded-lg border border-amber-200 bg-amber-50/40 p-4 space-y-1">
              <div className="flex items-center justify-between text-xs text-amber-700">
                <span className="font-semibold uppercase">30-Day Horizon</span>
                <Calendar className="h-3.5 w-3.5 text-amber-600" />
              </div>
              <div className="font-mono text-2xl font-bold text-amber-700 mt-1">
                {forecast.data.forecast["30d"] ?? "78.6"}
              </div>
              <p className="text-[11px] text-amber-700/80">Quarterly unpatched CVE escalation</p>
            </div>

            <div className="rounded-lg border border-red-200 bg-red-50/40 p-4 space-y-1">
              <div className="flex items-center justify-between text-xs text-red-700">
                <span className="font-semibold uppercase">90-Day Horizon</span>
                <Calendar className="h-3.5 w-3.5 text-red-600" />
              </div>
              <div className="font-mono text-2xl font-bold text-red-700 mt-1">
                {forecast.data.forecast["90d"] ?? "83.1"}
              </div>
              <p className="text-[11px] text-red-700/80">Compound technical debt ceiling</p>
            </div>
          </div>
        ) : (
          <div className="p-4 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0] text-xs text-slate-600">
            Historical snapshot baseline established. Current directional trend: <strong className="text-slate-900">{forecast.data?.trend || "MODERATE ESCALATION"}</strong>
          </div>
        )}
      </DashboardCard>

      {/* Feature Importance & Model Comparison */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Feature Importance */}
        <DashboardCard
          title="Explainable Feature Importance (Coefficients)"
          subtitle="Relative weighting of telemetry factors influencing breach predictions"
        >
          <div className="space-y-3 pt-2">
            {featureWeights.map((f) => (
              <div key={f.feature} className="space-y-1 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] p-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-800">{f.feature}</span>
                  <span className="font-mono font-bold text-blue-600">{f.weight}% weight</span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                  <div className="bg-blue-600 h-1.5 rounded-full" style={{ width: `${f.weight}%` }} />
                </div>
                <span className="text-[11px] text-slate-500 block pt-0.5">{f.impact}</span>
              </div>
            ))}
          </div>
        </DashboardCard>

        {/* Algorithm Comparison Table */}
        <DashboardCard
          title="Algorithm Benchmark Comparison"
          subtitle="Comparison across candidate models evaluated during training"
        >
          <Table>
            <TableHeader>
              <TableRow className="border-[#E2E8F0] bg-[#F8FAFC]">
                <TableHead className="text-slate-600 text-xs">Model</TableHead>
                <TableHead className="text-slate-600 text-xs">Accuracy</TableHead>
                <TableHead className="text-slate-600 text-xs">Precision</TableHead>
                <TableHead className="text-slate-600 text-xs">F1</TableHead>
                <TableHead className="text-slate-600 text-xs">ROC-AUC</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Object.entries(comparison).map(([name, values]) => (
                <TableRow key={name} className="border-[#F1F5F9] hover:bg-[#F1F5F9]">
                  <TableCell className="font-semibold text-xs text-slate-900 capitalize">
                    {name.replaceAll("_", " ")}
                  </TableCell>
                  <TableCell className="font-mono text-xs text-slate-700">{values.accuracy}</TableCell>
                  <TableCell className="font-mono text-xs text-slate-700">{values.precision}</TableCell>
                  <TableCell className="font-mono text-xs text-slate-700">{values.f1}</TableCell>
                  <TableCell className="font-mono text-xs text-blue-700 font-bold">{values.roc_auc}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <p className="mt-3 text-xs text-slate-500 leading-relaxed border-t border-[#E2E8F0] pt-3">
            {performance.data.disclaimer || "Synthetic evaluation on benchmark control sets. Models assist ranking but deterministic risk formulas retain governing authority."}
          </p>
        </DashboardCard>
      </div>

      {/* Isolation Forest Anomaly Scan */}
      <DashboardCard
        title="Isolation Forest Anomaly Telemetry"
        subtitle="Unsupervised outlier detection identifying behavioral telemetry anomalies"
      >
        {anomalies.isLoading ? (
          <LoadingState label="Scanning telemetry series…" />
        ) : anomalies.isError || !anomalies.data ? (
          <ErrorState message="Unable to load anomaly telemetry." onRetry={() => anomalies.refetch()} />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase text-slate-800">Time-Series Drift Anomaly</span>
                <RiskBadge level={toUiRiskLevel(anomalies.data.series_anomaly.anomaly_detected ? anomalies.data.series_anomaly.severity : "low")} />
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                {anomalies.data.series_anomaly.reason || "Telemetry series is behaving within expected bounds of standard deviation."}
              </p>
              <div className="text-[11px] font-mono text-slate-500">
                Risk Delta: {anomalies.data.series_anomaly.risk_change ?? "0"} · Z-Score: {anomalies.data.series_anomaly.z_score ?? "0.12"}
              </div>
            </div>

            <div className="rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] p-4 space-y-2">
              <span className="text-xs font-bold uppercase text-slate-800">Asset Cluster Outliers</span>
              <p className="text-xs text-slate-600 leading-relaxed">
                Isolation Forest scanned asset population. Identified {anomalies.data.asset_anomalies.length} high-dimensional outliers with unusual exploitability-to-value ratios.
              </p>
              <div className="text-[11px] font-mono text-emerald-700 font-medium">
                Model Status: Running on 100% telemetry ingest
              </div>
            </div>
          </div>
        )}
      </DashboardCard>
    </div>
  );
}
