"use client";

import Link from "next/link";
import { useState } from "react";
import { AIAdvisor } from "@/components/AIAdvisor";
import { AttackPathGraph } from "@/components/AttackPathGraph";
import { DashboardCard } from "@/components/DashboardCard";
import { IllustrativeNote } from "@/components/IllustrativeNote";
import { LossDistributionChart } from "@/components/LossDistributionChart";
import { MetricCard } from "@/components/MetricCard";
import { PageHeader } from "@/components/PageHeader";
import { RecommendationCard } from "@/components/AIAdvisor";
import { RiskBadge } from "@/components/RiskBadge";
import { RiskScore } from "@/components/RiskScore";
import { RiskTrendChart } from "@/components/RiskTrendChart";
import { EmptyState, ErrorState, LoadingState } from "@/components/QueryStates";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { useAskAdvisor, useAdvisorQuestions } from "@/lib/hooks/useAssurance";
import { useAttackPaths } from "@/lib/hooks/useAttackPaths";
import { useDashboard } from "@/lib/hooks/useDashboard";
import { useMlSignals } from "@/lib/hooks/useMl";
import { useRisks } from "@/lib/hooks/useRisks";
import { formatInr } from "@/lib/format";
import { num, toUiRiskLevel } from "@/lib/level";
import { toGraphPath } from "@/lib/graph";
import type { AttackPathNode, MetricKpi, TrendRange } from "@/lib/types";
import type { AdvisorAnswer } from "@/lib/types/api";

const ranges: TrendRange[] = ["7d", "30d", "90d", "1y"];

function toAdvisorView(question: string, answer: any) {
  const actions: string[] =
    answer.recommended_actions ||
    (answer.recommendations ? answer.recommendations.map((r: any) => r.action || r.title || String(r)) : []);
  const supporting = answer.supporting_risks || [];
  const assumptions: string[] = answer.assumptions || [];
  const finImpact = answer.financial_impact || {};
  const eal = finImpact.illustrative_eal_in_scope || finImpact.expected_loss_avoided || finImpact.eal || 0;
  return {
    id: question,
    question,
    recommendation: answer.answer,
    reasoning: actions,
    evidence: supporting.map((item: any) => ({
      source: `Risk ${item.id ? item.id.slice(0, 8) : "ID"}`,
      detail: `Residual ${item.residual_risk || 0} · EAL ${formatInr(item.expected_annual_loss || 0)}`,
    })),
    confidence: typeof answer.confidence === "number" ? answer.confidence : 0.85,
    expectedRiskReduction: formatInr(eal),
    limitations: [...assumptions, "AI Risk Advisor — Continuous Intelligence"].join(" "),
    generatedAt: new Date().toISOString(),
    illustrative: true as const,
  };
}

export function ExecutiveDashboard() {
  const [range, setRange] = useState<TrendRange>("30d");
  const [selected, setSelected] = useState<AttackPathNode | null>(null);
  const [question, setQuestion] = useState("What are my top risks?");
  const overview = useDashboard(range);
  const paths = useAttackPaths();
  const risks = useRisks();
  const signals = useMlSignals();
  const questions = useAdvisorQuestions();
  const ask = useAskAdvisor();

  if (overview.isLoading || (overview.isFetching && !overview.data)) return <LoadingState />;
  if (overview.isError || !overview.data || overview.data.expected_annual_loss === undefined) {
    if (overview.isFetching) return <LoadingState />;
    return <ErrorState message="Unable to load enterprise risk summary." onRetry={() => overview.refetch()} />;
  }

  const data = overview.data;
  const kpis: MetricKpi[] = [
    {
      id: "score",
      title: "Enterprise Risk Score",
      value: data.enterprise_risk_score.toFixed(1),
      trend: { direction: "flat", delta: 0, label: "Live residual average", sentiment: "neutral" },
      comparison: `${data.open_risk_count} open risks`,
      explanation: "Average residual risk across open records.",
    },
    {
      id: "exposure",
      title: "Financial Exposure",
      value: formatInr(data.total_financial_exposure),
      trend: { direction: "up", delta: 0, label: "Illustrative", sentiment: "negative" },
      comparison: "Sum of open-risk PML",
      explanation: "Prototype financial exposure, not booked losses.",
    },
    {
      id: "eal",
      title: "Expected Annual Loss",
      value: formatInr(data.expected_annual_loss),
      trend: { direction: "flat", delta: 0, label: "Illustrative EAL", sentiment: "neutral" },
      comparison: "likelihood × value × impact",
      explanation: "Deterministic expected annual loss from stored risks.",
    },
    {
      id: "opportunity",
      title: "Risk Reduction Opportunity",
      value: formatInr(data.risk_reduction_opportunity),
      trend: { direction: "down", delta: 0, label: "Recommended controls", sentiment: "positive" },
      comparison: "From investment rows",
      explanation: "Modeled loss avoided if recommended controls are funded.",
    },
    {
      id: "critical",
      title: "Critical Risks",
      value: String(data.active_critical_risks),
      trend: { direction: data.active_critical_risks > 0 ? "up" : "flat", delta: 0, label: "Open CRITICAL", sentiment: data.active_critical_risks > 0 ? "negative" : "positive" },
      comparison: `Reduction ${data.risk_reduction}`,
      explanation: "Open risks whose residual score exceeds 75.",
    },
    {
      id: "budget",
      title: "Security Budget",
      value: formatInr(50_00_000),
      trend: { direction: "flat", delta: 0, label: "OR-Tools Cap", sentiment: "neutral" },
      comparison: "₹50 Lakh allocation",
      explanation: "Constraint ceiling applied for portfolio optimization.",
    },
  ];

  const trendPoints = (data.risk_trend ?? []).map((point) => ({
    date: point.date,
    currentRisk: point.risk,
    previousPeriod: point.risk,
    riskAppetite: 55,
  }));

  const lossPoints = (data.financial_loss_distribution ?? []).map((item) => ({
    percentile: item.percentile,
    lossInr: item.loss,
  }));

  const graphPath = paths.data?.[0]
    ? toGraphPath(paths.data[0], risks.data?.data ?? [])
    : null;

  const advisorQuestions = (questions.data ?? []).map((prompt) => ({ id: prompt, prompt }));
  const advisorAnswer = ask.data ? toAdvisorView(question, ask.data) : null;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="CYBERNEXUS · SIH 26105"
        title="Enterprise Cyber Risk Intelligence"
        description="Continuous visibility into technical vulnerabilities, attack paths, financial exposure, and constraint-based security investments."
        badges={
          <span className="inline-flex items-center gap-1.5 rounded-md border border-amber-500/40 bg-amber-950/30 px-2.5 py-1 text-xs font-semibold text-amber-300">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
            DEMO / SYNTHETIC DATA
          </span>
        }
        actions={
          <div className="text-right">
            <IllustrativeNote />
            <p className="mt-1 text-xs text-slate-500">As of {new Date(data.as_of).toLocaleString("en-IN")}</p>
          </div>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6">
        {kpis.map((kpi) => (
          <MetricCard key={kpi.id} kpi={kpi} />
        ))}
      </div>

      <DashboardCard
        title="AI RISK SIGNALS"
        description="Incident-likelihood from an offline logistic model. Residual risk from the engine remains authoritative."
        action={
          <Button variant="secondary" asChild>
            <Link href="/ml-intelligence">Model performance</Link>
          </Button>
        }
      >
        {signals.isLoading ? (
          <LoadingState label="Scoring assets…" />
        ) : signals.isError || !signals.data ? (
          <EmptyState title="Signals unavailable" description="Train the incident model, then refresh." />
        ) : signals.data.signals.length === 0 ? (
          <EmptyState title="No assets to score" description="Add inventory to generate ML signals." />
        ) : (
          <ul className="space-y-3">
            {signals.data.signals.slice(0, 5).map((item) => (
              <li key={item.asset_id} className="flex items-start justify-between gap-3 border-b border-white/5 pb-3 last:border-0">
                <div>
                  <Link href="/assets" className="text-sm text-cyan-200 hover:underline">
                    {item.asset_name}
                  </Link>
                  <p className="mt-1 text-xs text-slate-500">{item.top_factors.slice(0, 2).join(" · ") || "No factors"}</p>
                </div>
                <div className="text-right">
                  <RiskBadge level={toUiRiskLevel(item.risk_level)} />
                  <p className="mt-1 font-mono text-xs text-white">{(item.incident_probability * 100).toFixed(1)}%</p>
                  <p className="font-mono text-xs text-slate-500">Engine residual {item.residual_risk}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
        <div className="mt-3">
          <IllustrativeNote>Synthetic-trained demonstration signal</IllustrativeNote>
        </div>
      </DashboardCard>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <DashboardCard
          title="Risk trend"
          description="Current residual snapshot from stored risk records. Historical series is not yet persisted."
          action={
            <Tabs value={range} onValueChange={(value) => setRange(value as TrendRange)}>
              <TabsList>
                {ranges.map((item) => (
                  <TabsTrigger key={item} value={item}>
                    {item.toUpperCase()}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          }
        >
          {trendPoints.length ? (
            <RiskTrendChart data={trendPoints} />
          ) : (
            <EmptyState
              title="Insufficient historical data"
              description="Historical risk time series will populate as continuous telemetry is ingested across 7D, 30D, and 90D windows."
            />
          )}
        </DashboardCard>

        <DashboardCard title="Financial exposure" description="Modeled cyber loss distribution.">
          {lossPoints.length ? (
            <>
              <LossDistributionChart data={lossPoints} />
              <div className="mt-3 grid grid-cols-3 gap-2 text-xs text-slate-400">
                <span>EL {formatInr(data.expected_annual_loss ?? 0)}</span>
                <span>P95 {formatInr(lossPoints.find((p) => p.percentile === "p95")?.lossInr ?? 0)}</span>
                <span>P99 {formatInr(lossPoints.find((p) => p.percentile === "p99")?.lossInr ?? 0)}</span>
              </div>
              <div className="mt-2">
                <IllustrativeNote />
              </div>
            </>
          ) : (
            <EmptyState title="No loss distribution" description="Open risks are required to build the curve." />
          )}
        </DashboardCard>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,1.2fr)_minmax(0,0.8fr)]">
        <DashboardCard title="Top risk contributors" description="Executive prioritization ranked by residual risk.">
          {data.top_risk_contributors.length === 0 ? (
            <EmptyState title="No contributors" description="Run risk calculation to populate this list." />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Risk / Driver</TableHead>
                    <TableHead className="text-xs">Score</TableHead>
                    <TableHead className="text-xs">Exposure</TableHead>
                    <TableHead className="text-xs text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.top_risk_contributors.slice(0, 5).map((item, index) => (
                    <TableRow key={item.id} className="hover:bg-white/5">
                      <TableCell className="py-2.5">
                        <Link href={`/risks/${item.id}`} className="text-xs font-semibold text-cyan-200 hover:underline block truncate max-w-[180px]">
                          {index + 1}. {(item.drivers ?? []).slice(0, 1)[0] || `Risk #${item.id.slice(0, 6)}`}
                        </Link>
                        <span className="text-[10px] text-slate-500 truncate block">
                          {(item.drivers ?? []).slice(1, 2)[0] || "Targeted Threat Vector"}
                        </span>
                      </TableCell>
                      <TableCell className="py-2.5">
                        <div className="flex items-center gap-1.5">
                          <RiskBadge level={toUiRiskLevel(item.risk_level)} />
                          <span className="font-mono text-xs font-bold text-white">{item.residual_risk}</span>
                        </div>
                      </TableCell>
                      <TableCell className="py-2.5 font-mono text-xs text-slate-300">
                        {formatInr(item.financial_exposure)}
                      </TableCell>
                      <TableCell className="py-2.5 text-right">
                        <Button variant="ghost" size="sm" asChild className="h-6 px-2 text-[11px] text-cyan-400 hover:text-cyan-200">
                          <Link href={`/risks/${item.id}`}>Detail →</Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </DashboardCard>

        <DashboardCard title="Attack path" description="Highest-risk path stored for this organization.">
          {paths.isLoading ? (
            <LoadingState label="Loading graph…" />
          ) : paths.isError ? (
            <ErrorState message="Unable to load attack paths." onRetry={() => paths.refetch()} />
          ) : graphPath ? (
            <AttackPathGraph path={graphPath} selectedId={selected?.id} onSelect={setSelected} />
          ) : (
            <EmptyState title="No attack paths" description="Seed or persist an attack path to visualize it." />
          )}
        </DashboardCard>

        <DashboardCard title="Path context">
          {graphPath ? (
            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Attack path risk</span>
                <RiskScore value={graphPath.riskScore} size="sm" />
              </div>
              <p className="text-slate-400">
                Potential financial exposure{" "}
                <span className="font-mono text-white">{formatInr(graphPath.potentialExposureInr)}</span>
              </p>
              <RecommendationCard title="Critical weakness" body={graphPath.criticalWeakness} />
              <RecommendationCard title="Recommended action" body={graphPath.recommendedAction} />
              {selected ? (
                <div className="rounded-md border border-white/10 p-3 text-xs text-slate-400">
                  <p className="text-sm text-white">{selected.label}</p>
                  <p className="mt-1">Service: {selected.businessService}</p>
                  <p>Conditional impact: {formatInr(selected.impactInr)}</p>
                </div>
              ) : (
                <p className="text-xs text-slate-500">Select a node to inspect modeled impact.</p>
              )}
              <IllustrativeNote />
            </div>
          ) : (
            <EmptyState title="No path selected" description="Attack-path context appears when a graph is available." />
          )}
        </DashboardCard>
      </div>

      <DashboardCard
        title="Investment opportunities"
        description="Control spend vs modeled loss avoided. Not a purchase recommendation."
      >
        {(data.investment_opportunities ?? []).length === 0 ? (
          <EmptyState title="No investment rows" description="Optimize a portfolio to persist recommendations." />
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Control</TableHead>
                  <TableHead>Cost</TableHead>
                  <TableHead>Loss avoided</TableHead>
                  <TableHead>ROSI</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.investment_opportunities.slice(0, 4).map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="font-medium">{row.name}</TableCell>
                    <TableCell className="font-mono">{formatInr(row.cost)}</TableCell>
                    <TableCell className="font-mono">{formatInr(row.estimated_loss_avoided)}</TableCell>
                    <TableCell className="font-mono">
                      {row.rosi == null ? "—" : `${num(row.rosi).toFixed(1)}%`}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <div className="mt-3">
              <IllustrativeNote />
            </div>
          </>
        )}
      </DashboardCard>

      <DashboardCard title="Recent incidents">
        {data.recent_incidents.length === 0 ? (
          <EmptyState title="No incidents" description="Record an incident to see it here." />
        ) : (
          <ul className="space-y-2 text-sm">
            {data.recent_incidents.map((item) => (
              <li key={item.id} className="flex justify-between border-b border-white/5 pb-2">
                <Link href={`/incidents/${item.id}`} className="text-cyan-200 hover:underline">
                  {item.title}
                </Link>
                <span className="text-xs text-slate-500">
                  {item.severity} · {formatInr(item.estimated_loss)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </DashboardCard>

      <DashboardCard title="Compliance summary">
        <p className="font-mono text-2xl text-white">{data.compliance_summary.overall_score}</p>
        <p className="text-xs text-slate-500">Overall mapped score · {data.compliance_summary.total_requirements} requirements</p>
        <ul className="mt-3 space-y-1 text-sm text-slate-400">
          {data.compliance_summary.frameworks.map((item) => (
            <li key={item.framework} className="flex justify-between">
              <span>{item.framework}</span>
              <span className="font-mono text-slate-200">{item.score}</span>
            </li>
          ))}
        </ul>
      </DashboardCard>

      {questions.isLoading ? (
        <LoadingState label="Loading advisor…" />
      ) : questions.isError ? (
        <ErrorState message="Advisor questions unavailable." onRetry={() => questions.refetch()} />
      ) : (
        <div className="space-y-3">
          <p className="text-xs uppercase tracking-wider text-slate-500">AI Risk Advisor — Decision Support Prototype</p>
          <AIAdvisor
            questions={advisorQuestions}
            answer={
              advisorAnswer ?? {
                id: "idle",
                question,
                recommendation: "Ask a question to analyze enterprise risk, attack paths, and financial investment allocations using grounded platform intelligence.",
                reasoning: ["Grounded in PostgreSQL, Neo4j, and OR-Tools."],
                evidence: [],
                confidence: 0.88,
                expectedRiskReduction: "—",
                limitations: "Synthesised from active quantified risk models.",
                generatedAt: new Date().toISOString(),
                illustrative: true,
              }
            }
            onAsk={(id) => {
              setQuestion(id);
              ask.mutate(id);
            }}
          />
          {ask.isError ? <p className="text-sm text-amber-200">Advisor request failed.</p> : null}
        </div>
      )}

      <div className="flex justify-end gap-2">
        <Button variant="secondary" asChild>
          <Link href="/risks">Open risk center</Link>
        </Button>
        <Button variant="secondary" asChild>
          <Link href="/reports">Open reports</Link>
        </Button>
      </div>
    </div>
  );
}
