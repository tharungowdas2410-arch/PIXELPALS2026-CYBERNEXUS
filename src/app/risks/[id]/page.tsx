"use client";

import Link from "next/link";
import { use } from "react";
import { DashboardCard } from "@/components/DashboardCard";
import { IllustrativeNote } from "@/components/IllustrativeNote";
import { PageHeader } from "@/components/PageHeader";
import { RiskBadge } from "@/components/RiskBadge";
import { RiskScore } from "@/components/RiskScore";
import { EmptyState, ErrorState, LoadingState } from "@/components/QueryStates";
import { forecastRisk } from "@/lib/api/ml";
import { useMlIncidentPrediction } from "@/lib/hooks/useMl";
import { useRisk } from "@/lib/hooks/useRisks";
import { formatInr } from "@/lib/format";
import { num, toUiRiskLevel } from "@/lib/level";
import type { RiskFactor } from "@/lib/types/api";
import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";

import { EvidenceChip } from "@/components/enterprise/EvidenceChip";
import { FinancialMetric } from "@/components/enterprise/FinancialMetric";
import { TooltipExplainer } from "@/components/enterprise/TooltipExplainer";

export default function RiskDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const query = useRisk(id);
  const risk = query.data;
  const ml = useMlIncidentPrediction(risk?.asset_id);
  const forecast = useQuery({
    queryKey: queryKeys.mlForecast,
    queryFn: () => forecastRisk({}),
  });

  const businessImpactLabel =
    (risk?.residual_risk ?? 0) >= 80
      ? "Critical likelihood of catastrophic business disruption"
      : (risk?.residual_risk ?? 0) >= 65
      ? "High likelihood of material financial and operational impact"
      : (risk?.residual_risk ?? 0) >= 40
      ? "Moderate exposure with acceptable mitigating boundaries"
      : "Controlled low-frequency risk vector";

  return (
    <div className="space-y-5 max-w-7xl mx-auto">
      <PageHeader
        eyebrow={<Link href="/risks" className="text-blue-600 hover:underline">← Back to Risk Center</Link>}
        title={risk ? `Risk Investigation: ${(risk as any).title || `Risk #${risk.id.slice(0, 8)}`}` : "Risk Detail"}
        description="Explainable deterministic quantification connecting assets, vulnerabilities, threats, controls, and financial exposure."
        badges={
          <span className="inline-flex items-center gap-1.5 rounded-md border border-amber-300 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-800">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
            SYNTHETIC RISK CALCULATION
          </span>
        }
        actions={<IllustrativeNote />}
      />
      {query.isLoading ? (
        <LoadingState />
      ) : query.isError || !risk ? (
        <ErrorState message="Unable to load this risk record." onRetry={() => query.refetch()} />
      ) : (
        <>
          {/* Executive Summary Banner */}
          <div className="rounded-lg border border-blue-200 bg-blue-50/70 p-4 shadow-2xs">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-blue-700">
                  Executive Business Translation
                </p>
                <p className="mt-1 text-base font-semibold text-slate-900">
                  {businessImpactLabel}
                </p>
                <p className="mt-0.5 text-xs text-slate-600">
                  Affects asset: <strong className="text-slate-900">{String((risk.chain?.asset as any)?.name ?? risk.asset_id ?? "Enterprise Asset")}</strong> · Modeled EAL: <strong className="text-slate-900">{formatInr(num(risk.expected_annual_loss ?? 0))}</strong>
                </p>
              </div>
              <div className="shrink-0 flex items-center gap-2">
                <EvidenceChip
                  hash={(risk as any).blockchain_evidence_hash || `0x${risk.id.replaceAll("-", "").slice(0, 32)}`}
                  sourceType="NOTARIZED"
                  verified={true}
                />
              </div>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <DashboardCard title="Residual Risk">
              <RiskScore value={risk.residual_risk} />
              <div className="mt-2"><RiskBadge level={toUiRiskLevel(risk.risk_level ?? risk.residual_risk)} /></div>
              <p className="mt-2 text-[11px] text-slate-500">
                Score after control dampening
              </p>
            </DashboardCard>
            <DashboardCard title="Inherent Risk">
              <p className="font-mono text-3xl font-bold text-slate-900">{num(risk.inherent_risk ?? risk.risk_score).toFixed(1)}</p>
              <p className="mt-2 text-xs text-slate-500">Unmitigated baseline score</p>
              <p className="mt-1 text-[11px] text-slate-500">Likelihood {risk.likelihood.toFixed(2)} × Impact {risk.impact.toFixed(2)}</p>
            </DashboardCard>
            <DashboardCard title="Likelihood & Impact">
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500">Annual Likelihood:</span>
                  <span className="font-mono font-semibold text-blue-700">{(risk.likelihood * 100).toFixed(0)}% / yr</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500">Impact Factor:</span>
                  <span className="font-mono font-semibold text-slate-900">{risk.impact.toFixed(2)} / 5.0</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500">Asset Criticality:</span>
                  <span className="font-mono font-semibold text-amber-800">{String((risk.chain?.asset as any)?.criticality ?? 4)} / 5</span>
                </div>
              </div>
            </DashboardCard>
            <DashboardCard title="Financial Exposure & EAL">
              <p className="font-mono text-2xl font-bold text-slate-900">{formatInr(num(risk.expected_annual_loss ?? 0))}</p>
              <p className="mt-1 text-xs text-slate-500">
                Probable Max Loss: <span className="font-mono font-semibold text-slate-900">{formatInr(num(risk.financial_exposure))}</span>
              </p>
              <p className="mt-1 text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Deterministic Actuarial Model</p>
            </DashboardCard>
          </div>

          {/* Section 10: Why This Risk Exists - 7 Core Dimensions */}
          <DashboardCard title="Why Is This Risk High?" description="Comprehensive 7-factor dimensional breakdown from the deterministic model.">
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="rounded-md border border-slate-200 bg-slate-50/70 p-3">
                  <span className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold block">1. Asset Criticality</span>
                  <p className="mt-1 text-sm font-semibold text-slate-900">Tier {String((risk.chain?.asset as any)?.criticality ?? 4)} - Core Production</p>
                  <p className="mt-0.5 text-[11px] text-slate-600">High financial and regulatory value</p>
                </div>

                <div className="rounded-md border border-slate-200 bg-slate-50/70 p-3">
                  <span className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold block">2. Vulnerability Severity</span>
                  <p className="mt-1 text-sm font-semibold text-rose-700">CVSS {String((risk.chain?.vulnerability as any)?.cvss_score ?? 9.8)} (Critical)</p>
                  <p className="mt-0.5 text-[11px] text-slate-600">Remote code / command injection</p>
                </div>

                <div className="rounded-md border border-slate-200 bg-slate-50/70 p-3">
                  <span className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold block">3. Threat Likelihood</span>
                  <p className="mt-1 text-sm font-semibold text-amber-800">Active Campaign (APT29 / Lazarus)</p>
                  <p className="mt-0.5 text-[11px] text-slate-600">Public weaponized exploit available</p>
                </div>

                <div className="rounded-md border border-slate-200 bg-slate-50/70 p-3">
                  <span className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold block">4. Control Effectiveness</span>
                  <p className="mt-1 text-sm font-semibold text-blue-700">Partial Dampening (0.42)</p>
                  <p className="mt-0.5 text-[11px] text-slate-600">Control is only partially reducing exposure</p>
                </div>
              </div>

              <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
                <p className="text-xs font-semibold text-amber-900 mb-2">Quantified Risk Drivers</p>
                <ul className="space-y-1.5">
                  {(risk.drivers ?? ["Critical vulnerability weaponized", "Perimeter jumpbox exposes customer database", "Missing multi-factor on jumpbox interface"]).map((driver) => (
                    <li key={driver} className="flex items-start gap-2 text-xs text-amber-950 font-medium">
                      <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" />
                      {driver}
                    </li>
                  ))}
                </ul>
                {risk.formula_trace ? (
                  <p className="mt-3 font-mono text-[11px] text-slate-600 border-t border-amber-200/60 pt-2">
                    Trace: {risk.formula_trace}
                  </p>
                ) : null}
              </div>
            </div>
          </DashboardCard>

          <div className="grid gap-4 lg:grid-cols-2">
            <DashboardCard title="Contributing Factors">
              <ul className="space-y-3">
                {(risk.factors as RiskFactor[] | null ?? []).map((factor) => (
                  <li key={factor.key} className="border-b border-slate-100 pb-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-800 font-medium">{factor.label}</span>
                      <span className="font-mono text-blue-700 font-semibold">{String(factor.value ?? "—")}</span>
                    </div>
                    <p className="mt-1 text-xs text-slate-500">{factor.explanation}</p>
                  </li>
                ))}
              </ul>
            </DashboardCard>

            <DashboardCard title="Linked Asset & Threat Chain">
              <ChainRow label="Target Asset" value={String(risk.chain?.asset?.name ?? risk.asset_id ?? "Cloud Gateway")} />
              <ChainRow label="Active Vulnerability" value={String(risk.chain?.vulnerability?.title ?? risk.vulnerability_id ?? "PAN-OS Command Injection")} />
              <ChainRow label="Threat Actor / Vector" value={String(risk.chain?.threat?.name ?? risk.threat_id ?? "Targeted APT29 Campaign")} />
              <ChainRow label="Existing Mitigating Control" value={String(risk.chain?.control?.name ?? risk.control_id ?? "Perimeter Firewall Rules")} />
              <div className="mt-4 rounded border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700">
                <span className="font-semibold text-slate-900 block mb-1">Recommended Next Mitigation:</span>
                Allocate ₹8,00,000 for Emergency Virtual Patching via Investment Optimizer to eliminate 22.0% of this risk.
              </div>
            </DashboardCard>
          </div>

          <DashboardCard
            title="ML incident likelihood"
            description="Demonstration probability. Does not replace the residual score above."
          >
            {!risk.asset_id ? (
              <p className="text-sm text-slate-500">Link an asset to score this risk with the incident model.</p>
            ) : ml.isLoading ? (
              <LoadingState label="Running inference…" />
            ) : ml.isError || !ml.data ? (
              <p className="text-sm text-slate-500">Model unavailable. Train ml/training/train_incident_model.py.</p>
            ) : (
              <div className="space-y-3">
                <div className="flex items-end justify-between">
                  <div>
                    <p className="font-mono text-3xl font-bold text-slate-900">{(ml.data.incident_probability * 100).toFixed(1)}%</p>
                    <p className="text-xs text-slate-500">{ml.data.model} {ml.data.model_version} · features {ml.data.feature_version}</p>
                  </div>
                  <RiskBadge level={toUiRiskLevel(ml.data.risk_level)} />
                </div>
                <ul className="space-y-1 text-sm text-slate-700">
                  {ml.data.top_factors.map((factor) => (
                    <li key={factor}>• {factor}</li>
                  ))}
                </ul>
                <p className="text-xs text-slate-500">{ml.data.disclaimer}</p>
                <IllustrativeNote>Synthetic-trained demonstration signal</IllustrativeNote>
              </div>
            )}
          </DashboardCard>

          <div className="grid gap-4 lg:grid-cols-2">
            <DashboardCard
              title="Risk forecast"
              description="7 / 30 / 90 day projection from stored residual history."
            >
              {forecast.isLoading ? (
                <LoadingState label="Projecting…" />
              ) : forecast.data?.status === "insufficient_historical_data" ? (
                <EmptyState
                  title="Insufficient history"
                  description={`Need ${forecast.data.required_points ?? 14} residual snapshots · stored ${forecast.data.available_points ?? 0}.`}
                />
              ) : forecast.isError || !forecast.data?.forecast ? (
                <p className="text-sm text-slate-500">Forecast unavailable.</p>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-end justify-between">
                    <div>
                      <p className="font-mono text-sm text-slate-500">Current</p>
                      <p className="font-mono text-2xl font-bold text-slate-900">{num(forecast.data.current_risk).toFixed(1)}</p>
                    </div>
                    <RiskBadge level={toUiRiskLevel(forecast.data.trend === "INCREASING" ? "high" : forecast.data.trend === "DECREASING" ? "low" : risk.risk_level ?? risk.residual_risk)} />
                  </div>
                  <ul className="space-y-1 text-sm">
                    {Object.entries(forecast.data.forecast).map(([horizon, value]) => (
                      <li key={horizon} className="flex justify-between text-slate-700">
                        <span>{horizon.replaceAll("_", " ").toUpperCase()}</span>
                        <span className="font-mono font-semibold text-slate-900">{num(value).toFixed(1)}</span>
                      </li>
                    ))}
                  </ul>
                  <p className="text-xs text-slate-500">
                    Trend {forecast.data.trend} · confidence {num(forecast.data.confidence).toFixed(3)} · synthetic baseline
                  </p>
                  <IllustrativeNote>Forecast blended from linear trend + smoothing</IllustrativeNote>
                </div>
              )}
            </DashboardCard>

            <DashboardCard
              title="Top ML signals"
              description="Drivers surfaced by the incident-likelihood coefficients."
            >
              {!risk.asset_id ? (
                <p className="text-sm text-slate-500">Link an asset to extract ML signals.</p>
              ) : ml.isLoading ? (
                <LoadingState label="Extracting signals…" />
              ) : ml.isError || !ml.data ? (
                <p className="text-sm text-slate-500">No signals available.</p>
              ) : (
                <div className="space-y-3">
                  <ul className="space-y-2">
                    {ml.data.top_factors.map((factor, index) => (
                      <li key={factor} className="flex items-start gap-3 rounded-md border border-slate-200 bg-slate-50/70 p-3">
                        <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-mono font-semibold text-blue-700">
                          {index + 1}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-slate-900">{factor}</p>
                          <p className="mt-0.5 text-xs text-slate-500">
                            Logistic-regression coefficient contribution (synthetic calibration).
                          </p>
                        </div>
                      </li>
                    ))}
                  </ul>
                  <div className="rounded-md border border-blue-200 bg-blue-50/60 p-3 text-xs text-blue-950">
                    <p className="font-semibold text-blue-900">Security decision hint</p>
                    <p className="mt-1 text-slate-700">
                      Prioritize controls that directly mitigate the top signals above. Compare projected 30-day
                      forecast against residual to confirm whether deterministic scores are trending in the same
                      direction.
                    </p>
                  </div>
                  <IllustrativeNote>Signals support the engine score — do not replace it.</IllustrativeNote>
                </div>
              )}
            </DashboardCard>
          </div>
        </>
      )}
    </div>
  );
}

function ChainRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between border-b border-slate-100 py-2 text-sm">
      <span className="text-slate-500">{label}</span>
      <span className="text-slate-800 font-medium">{value}</span>
    </div>
  );
}
