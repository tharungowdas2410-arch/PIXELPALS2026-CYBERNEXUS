"use client";

import Link from "next/link";
import { DashboardCard } from "@/components/DashboardCard";
import { IllustrativeNote } from "@/components/IllustrativeNote";
import { PageHeader } from "@/components/PageHeader";
import { RiskBadge } from "@/components/RiskBadge";
import { EmptyState, ErrorState, LoadingState } from "@/components/QueryStates";
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
        message="ML artifacts are unavailable. Train the incident model from backend/ml/training/train_incident_model.py."
        onRetry={() => {
          status.refetch();
          performance.refetch();
        }}
      />
    );
  }

  const metrics = performance.data.metrics;
  const comparison = performance.data.comparison ?? {};

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Phase 7"
        title="ML Intelligence"
        description="Offline-trained demonstration models. Deterministic residual risk remains the decision score."
        actions={<IllustrativeNote>Synthetic evaluation — not production accuracy</IllustrativeNote>}
      />

      <div className="grid gap-4 md:grid-cols-4">
        <DashboardCard title="Incident model">
          <p className="font-mono text-lg text-white">{status.data.model_name} {status.data.model_version}</p>
          <p className="mt-1 text-xs text-slate-500">Features {status.data.feature_version}</p>
        </DashboardCard>
        <DashboardCard title="Selected algorithm">
          <p className="text-lg text-white">{performance.data.selected_model.replaceAll("_", " ")}</p>
          <p className="mt-1 text-xs text-slate-500">Logistic regression for coefficient explainability</p>
        </DashboardCard>
        <DashboardCard title="Validation ROC-AUC">
          <p className="font-mono text-3xl text-white">{metrics.roc_auc.toFixed(3)}</p>
        </DashboardCard>
        <DashboardCard title="F1">
          <p className="font-mono text-3xl text-white">{metrics.f1.toFixed(3)}</p>
        </DashboardCard>
      </div>

      <DashboardCard title="Held-out metrics" description={performance.data.evaluation_dataset}>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Model</TableHead>
              <TableHead>Accuracy</TableHead>
              <TableHead>Precision</TableHead>
              <TableHead>Recall</TableHead>
              <TableHead>F1</TableHead>
              <TableHead>ROC-AUC</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {Object.entries(comparison).map(([name, values]) => (
              <TableRow key={name}>
                <TableCell className="capitalize">{name.replaceAll("_", " ")}</TableCell>
                <TableCell className="font-mono">{values.accuracy}</TableCell>
                <TableCell className="font-mono">{values.precision}</TableCell>
                <TableCell className="font-mono">{values.recall}</TableCell>
                <TableCell className="font-mono">{values.f1}</TableCell>
                <TableCell className="font-mono">{values.roc_auc}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <p className="mt-3 text-sm text-slate-400">{performance.data.disclaimer}</p>
      </DashboardCard>

      <div className="grid gap-4 lg:grid-cols-2">
        <DashboardCard title="Residual-risk forecast">
          {forecast.isLoading ? (
            <LoadingState label="Forecasting…" />
          ) : forecast.data?.status === "insufficient_historical_data" ? (
            <EmptyState
              title="Insufficient historical data"
              description={`Need ${forecast.data.required_points ?? 14} residual snapshots. Stored: ${forecast.data.available_points ?? 0}.`}
            />
          ) : forecast.data?.forecast ? (
            <ul className="space-y-2 text-sm">
              <li className="flex justify-between text-slate-300">
                <span>Trend</span>
                <span className="font-mono text-white">{forecast.data.trend}</span>
              </li>
              {Object.entries(forecast.data.forecast).map(([horizon, value]) => (
                <li key={horizon} className="flex justify-between text-slate-300">
                  <span>{horizon.replaceAll("_", " ")}</span>
                  <span className="font-mono text-white">{value}</span>
                </li>
              ))}
              <li className="flex justify-between text-slate-500">
                <span>Confidence from naive MAE</span>
                <span className="font-mono">{forecast.data.confidence}</span>
              </li>
            </ul>
          ) : (
            <ErrorState message="Forecast unavailable." onRetry={() => forecast.refetch()} />
          )}
        </DashboardCard>
        <DashboardCard title="Anomaly scan">
          {anomalies.isLoading ? (
            <LoadingState label="Scanning…" />
          ) : anomalies.isError || !anomalies.data ? (
            <ErrorState message="Unable to load anomalies." onRetry={() => anomalies.refetch()} />
          ) : (
            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Series change</span>
                <RiskBadge level={toUiRiskLevel(anomalies.data.series_anomaly.anomaly_detected ? anomalies.data.series_anomaly.severity : "low")} />
              </div>
              <p className="text-slate-400">
                {anomalies.data.series_anomaly.reason
                  ?? `Δ residual ${anomalies.data.series_anomaly.risk_change ?? "—"} · z ${anomalies.data.series_anomaly.z_score ?? "—"}`}
              </p>
              <p className="text-xs text-slate-500">
                Asset outliers: {anomalies.data.asset_anomalies.length} (Isolation Forest needs ≥8 assets)
              </p>
            </div>
          )}
        </DashboardCard>
      </div>

      <p className="text-xs text-slate-500">
        <Link href="/" className="text-cyan-300 hover:underline">Dashboard signals</Link>
        {" · "}Engine scores stay authoritative. ML does not replace Phase 2 residual risk.
      </p>
    </div>
  );
}
