"use client";

import { useMemo, useState } from "react";
import { AttackPathGraph } from "@/components/AttackPathGraph";
import { DashboardCard } from "@/components/DashboardCard";
import { IllustrativeNote } from "@/components/IllustrativeNote";
import { PageHeader } from "@/components/PageHeader";
import { RecommendationCard } from "@/components/AIAdvisor";
import { RiskScore } from "@/components/RiskScore";
import { RiskBadge } from "@/components/RiskBadge";
import { EmptyState, ErrorState, LoadingState } from "@/components/QueryStates";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  useAttackPathsResponse,
  useBlastRadius,
  useGraphHealth,
} from "@/lib/hooks/useAttackPaths";
import { useAssets } from "@/lib/hooks/useAssets";
import { useControls } from "@/lib/hooks/useInventory";
import { useRisks } from "@/lib/hooks/useRisks";
import { useVulnerabilities } from "@/lib/hooks/useVulnerabilities";
import { formatInr, formatPercent } from "@/lib/format";
import { toGraphPath } from "@/lib/graph";
import { toUiRiskLevel } from "@/lib/level";
import type { AttackPathNode } from "@/lib/types";
import type { AttackPath as ApiAttackPath } from "@/lib/types/api";

function PathListCard({
  paths,
  selectedId,
  onSelect,
  graphSource,
}: {
  paths: ApiAttackPath[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  graphSource: string;
}) {
  return (
    <DashboardCard
      title="Attack paths"
      subtitle={`${paths.length} discovered · ${graphSource === "neo4j" ? "Neo4j graph traversal" : "Fallback inference"}`}
      className="h-full min-h-[480px] flex flex-col"
    >
      <ul className="flex-1 divide-y divide-white/5 overflow-auto pr-1">
        {paths.map((p, idx) => {
          const active = p.id === selectedId;
          return (
            <li key={p.id}>
              <button
                type="button"
                onClick={() => onSelect(p.id)}
                className={`w-full rounded-md px-3 py-2.5 text-left transition-colors ${
                  active
                    ? "bg-cyan-500/10 ring-1 ring-cyan-400/40"
                    : "hover:bg-white/5"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono text-slate-500">#{idx + 1}</span>
                      <RiskBadge level={toUiRiskLevel(p.risk_score)} />
                      <p className="truncate text-sm font-medium text-white">{p.name}</p>
                    </div>
                    <p className="mt-0.5 truncate text-xs text-slate-400">
                      {p.entry_point_label ?? p.entry_point.slice(0, 8)} → {p.target_label ?? p.target.slice(0, 8)}
                      <span className="mx-1 text-slate-600">·</span>
                      {p.hop_count ?? Math.max(0, p.nodes.length - 1)} hops
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-mono text-sm text-white">{p.risk_score.toFixed(0)}</p>
                    <p className="text-[10px] font-mono text-slate-500">
                      {formatInr(p.financial_exposure)}
                    </p>
                  </div>
                </div>
              </button>
            </li>
          );
        })}
      </ul>
    </DashboardCard>
  );
}

function ExplanationSection({ path }: { path: ApiAttackPath }) {
  const entry = path.nodes[0]?.label ?? path.entry_point_label ?? "entry point";
  const target = path.nodes[path.nodes.length - 1]?.label ?? path.target_label ?? "target asset";
  const lines: string[] = [];
  lines.push(
    `This path begins at the ${entry} and reaches the ${target} over ${path.hop_count ?? Math.max(0, path.nodes.length - 1)} hops. ` +
      `The attack traverses ${path.edges.length} relationships including ${
        [...new Set(path.edges.map((e) => (e.relation ?? "CONNECTS_TO").replace("_", " ").toLowerCase()))].slice(0, 3).join(", ") || "connectivity"
      } edges.`,
  );
  if (path.risk_drivers?.length) {
    lines.push(`Primary risk drivers: ${path.risk_drivers.slice(0, 4).join("; ")}.`);
  }
  lines.push(
    `Residual risk on the highest-value asset (${path.highest_value_asset ?? target}) combines with path exposure to produce the estimated loss. ` +
      `Recommended controls are detailed on the right panel.`,
  );
  return (
    <DashboardCard title="Why is this path dangerous?" subtitle="Illustrative narrative for the judge demo">
      <ol className="list-decimal space-y-2 pl-5 text-sm text-slate-300 marker:text-cyan-400">
        {lines.map((line, i) => (
          <li key={i}>{line}</li>
        ))}
      </ol>
      <div className="mt-4 rounded-md border border-amber-400/20 bg-amber-400/5 p-3 text-xs text-amber-200/90">
        <p className="font-semibold text-amber-200">
          Potential financial exposure: <span className="font-mono">{formatInr(path.financial_exposure)}</span>
        </p>
        <p className="mt-1">
          Expected annual loss for this path:{" "}
          <span className="font-mono">{formatInr(path.expected_annual_loss ?? 0)}</span>. Figures are
          illustrative model outputs derived from the existing financial engine.
        </p>
      </div>
    </DashboardCard>
  );
}

function PathAnalyticsPanel({
  path,
  selected,
  onSelectNode,
  assets,
  vulns,
  risks,
  controls,
  blast,
}: {
  path: ApiAttackPath;
  selected: AttackPathNode | null;
  onSelectNode: (n: AttackPathNode | null) => void;
  assets: ReturnType<typeof useAssets>["data"];
  vulns: ReturnType<typeof useVulnerabilities>["data"];
  risks: ReturnType<typeof useRisks>["data"];
  controls: ReturnType<typeof useControls>["data"];
  blast: ReturnType<typeof useBlastRadius>["data"];
}) {
  const pid = selected?.id;
  const asset = assets?.data.find((item) => item.id === pid);
  const relatedVulns = (vulns?.data ?? []).filter((item) => item.asset_id === pid);
  const relatedRisk = (risks?.data ?? []).find((item) => item.asset_id === pid);
  const worst = relatedVulns.slice().sort((a, b) => (b.cvss_score ?? 0) - (a.cvss_score ?? 0))[0];

  return (
    <div className="flex flex-col gap-4">
      <DashboardCard title="Path analytics" subtitle="Highest-risk path">
        <div className="space-y-3 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-slate-400">Path risk</span>
            <RiskScore value={path.risk_score} size="sm" />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-400">Risk level</span>
            <RiskBadge level={toUiRiskLevel(path.risk_score)} />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-400">Financial exposure</span>
            <span className="font-mono text-white">{formatInr(path.financial_exposure)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-400">Expected annual loss</span>
            <span className="font-mono text-white">{formatInr(path.expected_annual_loss ?? 0)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-400">Hop count</span>
            <span className="font-mono text-white">{path.hop_count ?? Math.max(0, path.nodes.length - 1)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-400">Attack probability</span>
            <span className="font-mono text-white">
              {formatPercent(Math.min(1, path.risk_score / 100) * 100)}
            </span>
          </div>
          {path.affected_business_services?.length ? (
            <div>
              <p className="text-slate-400">Affected business services</p>
              <div className="mt-1 flex flex-wrap gap-1">
                {path.affected_business_services.slice(0, 5).map((svc) => (
                  <Badge key={svc} variant="outline" className="text-[11px]">
                    {svc}
                  </Badge>
                ))}
              </div>
            </div>
          ) : null}
          <RecommendationCard title="Critical weakness" body={path.critical_weakness ?? "—"} />
          <RecommendationCard title="Recommended action" body={path.recommended_action ?? "—"} />
          {path.risk_drivers?.length ? (
            <div>
              <p className="mb-1 text-slate-400">Risk drivers</p>
              <ul className="list-disc space-y-1 pl-5 text-xs text-slate-300">
                {path.risk_drivers.slice(0, 5).map((d) => (
                  <li key={d}>{d}</li>
                ))}
              </ul>
            </div>
          ) : null}
          {selected ? (
            <div className="rounded-md border border-white/10 p-3 text-xs text-slate-400">
              <p className="text-sm text-white">{selected.label}</p>
              <p className="mt-1">Criticality: {asset?.criticality ?? selected.level ?? "—"}</p>
              <p>Residual risk: {relatedRisk?.residual_risk ?? "—"}</p>
              <p>Financial impact: {formatInr(selected.impactInr)}</p>
              <p>
                Top vulnerability:{" "}
                {worst ? `${worst.title} (CVSS ${worst.cvss_score?.toFixed(1) ?? "—"})` : "None linked"}
              </p>
              <p>
                Controls:{" "}
                {(controls?.data ?? []).slice(0, 3).map((c) => c.name).join(", ") || "—"}
              </p>
              <div className="mt-2 flex gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  type="button"
                  onClick={() => onSelectNode(null)}
                >
                  Clear selection
                </Button>
              </div>
            </div>
          ) : (
            <p className="text-xs text-slate-500">
              Click a node for asset, vulnerability and financial context.
            </p>
          )}
          <IllustrativeNote />
        </div>
      </DashboardCard>

      {blast && selected ? (
        <DashboardCard
          title={`Blast Radius · ${selected.label}`}
          subtitle={`${blast.affected_count} reachable assets via Neo4j graph`}
        >
          <div className="space-y-3 text-xs">
            {/* Direct Impact */}
            <div className="rounded-md border border-rose-500/30 bg-rose-950/20 p-3 space-y-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-rose-300 block">
                Direct Impact (Compromised Asset)
              </span>
              <div className="flex items-center justify-between">
                <span className="text-slate-300 font-medium">{selected.label}</span>
                <span className="font-mono text-rose-200">{formatInr(selected.impactInr)}</span>
              </div>
              <p className="text-[11px] text-slate-400">
                Service: <strong className="text-white">{selected.businessService || "Core Infrastructure"}</strong> · Immediate compromise target
              </p>
            </div>

            {/* Indirect Impact */}
            <div className="rounded-md border border-amber-500/30 bg-amber-950/20 p-3 space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-300 block">
                Indirect Impact (Cascading Blast Radius)
              </span>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Propagation Risk:</span>
                <RiskScore value={blast.risk_propagation_score} size="sm" />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Total Cascading Exposure:</span>
                <span className="font-mono text-white font-bold">
                  {formatInr(blast.estimated_financial_exposure)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Cascading EAL:</span>
                <span className="font-mono text-white">
                  {formatInr(blast.expected_annual_loss ?? 0)}
                </span>
              </div>

              <div>
                <p className="text-slate-400 mb-1">Downstream Business Processes:</p>
                <div className="flex flex-wrap gap-1">
                  {blast.affected_business_services.map((svc) => (
                    <Badge key={svc} variant="outline" className="text-[10px] border-amber-500/40 text-amber-200">
                      {svc}
                    </Badge>
                  ))}
                  {blast.affected_business_services.length === 0 ? (
                    <span className="text-[11px] text-slate-500">None tagged</span>
                  ) : null}
                </div>
              </div>
            </div>

            <p className="text-[10px] text-slate-500 border-t border-white/5 pt-1">
              Graph Engine: <strong className="text-slate-400">{blast.graph_source}</strong> · Traversal Depth: {blast.propagation_depth} hops
            </p>
          </div>
        </DashboardCard>
      ) : null}
    </div>
  );
}

export default function AttackPathsPage() {
  const response = useAttackPathsResponse(50);
  const health = useGraphHealth();
  const risks = useRisks({ page_size: 100 });
  const assets = useAssets({ page_size: 100 });
  const vulns = useVulnerabilities({ page_size: 100 });
  const controls = useControls({ page_size: 100 });

  const paths = useMemo(
    () => [...(response.data?.paths ?? [])].sort((a, b) => b.risk_score - a.risk_score),
    [response.data],
  );
  const [selectedPathId, setSelectedPathId] = useState<string | null>(paths[0]?.id ?? null);
  const path = paths.find((p) => p.id === selectedPathId) ?? paths[0] ?? null;
  const graph = path ? toGraphPath(path, risks.data?.data ?? []) : null;
  const [selectedNode, setSelectedNode] = useState<AttackPathNode | null>(null);
  const blast = useBlastRadius(selectedNode?.id ?? null);

  return (
    <div className="flex min-h-[calc(100vh-6.5rem)] flex-col gap-4 pb-4">
      <PageHeader
        title="Attack Paths"
        description="Graph-derived entry-point → critical-asset paths with financial exposure and recommended remediation points."
        badges={
          <>
            <Badge
              variant="outline"
              className={
                health.data?.neo4j === "healthy"
                  ? "border-emerald-400/40 text-emerald-300"
                  : "border-amber-400/40 text-amber-300"
              }
            >
              Neo4j: {health.data?.neo4j ?? "unknown"}
              {response.data ? ` · ${response.data.graph_source}` : ""}
            </Badge>
            <Badge variant="outline" className="border-white/10">
              {response.data?.count ?? 0} paths
            </Badge>
          </>
        }
      />

      {response.isLoading || risks.isLoading || assets.isLoading ? (
        <LoadingState />
      ) : response.isError ? (
        <ErrorState message="Unable to load attack paths." onRetry={() => response.refetch()} />
      ) : !path || !graph ? (
        <EmptyState
          title="No attack paths"
          description="Create a few assets in the inventory (VPN, Identity, App, DB, Payment) to seed the graph, then run graph sync or let the fallback inference synthesize demo paths."
          action={
            <Button type="button" onClick={() => response.refetch()}>
              Re-scan
            </Button>
          }
        />
      ) : (
        <Tabs defaultValue="paths" className="min-h-0 flex-1">
          <TabsList>
            <TabsTrigger value="paths">Attack paths</TabsTrigger>
            <TabsTrigger value="explanation">Explanation</TabsTrigger>
          </TabsList>
          <TabsContent value="paths" className="mt-4 min-h-0 flex-1">
            <div className="grid min-h-[560px] flex-1 gap-4 lg:grid-cols-[300px_minmax(0,1fr)_360px]">
              <PathListCard
                paths={paths}
                selectedId={path?.id ?? null}
                onSelect={setSelectedPathId}
                graphSource={response.data?.graph_source ?? "fallback_inference"}
              />
              <DashboardCard
                title={path?.name ?? "Attack path"}
                subtitle={`${path.nodes.length} nodes · ${path.edges.length} edges · ${response.data?.graph_source ?? "fallback"}`}
                className="min-h-[480px] flex flex-col"
              >
                <div className="min-h-[420px] flex-1 rounded-md border border-red-500/20">
                  <AttackPathGraph
                    path={graph}
                    selectedId={selectedNode?.id}
                    onSelect={setSelectedNode}
                    showMiniMap
                    className="h-full min-h-[420px]"
                  />
                </div>
                <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
                  <p>
                    Formula:{" "}
                    <span className="font-mono">
                      node_risk = crit × severity × threat_boost × exposure × control_adj
                    </span>
                  </p>
                  <p>Engine reused: calculate_eal (financial_engine.py)</p>
                </div>
              </DashboardCard>
              <PathAnalyticsPanel
                path={path}
                selected={selectedNode}
                onSelectNode={setSelectedNode}
                assets={assets.data}
                vulns={vulns.data}
                risks={risks.data}
                controls={controls.data}
                blast={blast.data}
              />
            </div>
          </TabsContent>
          <TabsContent value="explanation" className="mt-4 min-h-0">
            <div className="grid gap-4 lg:grid-cols-2">
              <ExplanationSection path={path} />
              <div className="flex flex-col gap-4">
                <DashboardCard
                  title="Most important remediation point"
                  subtitle="Where to invest first to break this path"
                >
                  <p className="text-sm text-slate-300">
                    {path.recommended_action ??
                      "Add layered controls to the entry point and the asset immediately before the target."}
                  </p>
                  <div className="mt-4 space-y-2 rounded-md border border-cyan-400/20 bg-cyan-500/5 p-3 text-sm">
                    <p className="font-semibold text-cyan-200">Breaking the chain</p>
                    <ul className="list-disc space-y-1 pl-5 text-slate-300">
                      <li>
                        Harden the entry point ({path.nodes[0]?.label ?? "edge"}) with zero-trust
                        segmentation.
                      </li>
                      <li>
                        Mitigate exploitable vulnerabilities flagged by the risk drivers — they
                        shorten attacker dwell time dramatically.
                      </li>
                      <li>
                        Add compensating controls on the penultimate node before{" "}
                        {path.nodes[path.nodes.length - 1]?.label ?? "the target"} to prevent final
                        compromise even if mid-path assets fail.
                      </li>
                    </ul>
                  </div>
                </DashboardCard>
                <DashboardCard
                  title="Risk drivers & business impact"
                  subtitle="Transparent, factor-based scoring"
                >
                  <ul className="list-disc space-y-2 pl-5 text-sm text-slate-300">
                    {(path.risk_drivers ?? ["No individual dominant driver; aggregate path exposure."]).map(
                      (d) => (
                        <li key={d}>{d}</li>
                      ),
                    )}
                  </ul>
                  <div className="mt-4 grid grid-cols-2 gap-3 rounded-md border border-white/10 p-3 text-sm">
                    <div>
                      <p className="text-slate-500">Risk score</p>
                      <p className="font-mono text-white">{path.risk_score.toFixed(1)}</p>
                    </div>
                    <div>
                      <p className="text-slate-500">Risk level</p>
                      <p className="text-white">
                        <RiskBadge level={toUiRiskLevel(path.risk_score)} />
                      </p>
                    </div>
                    <div>
                      <p className="text-slate-500">Financial exposure</p>
                      <p className="font-mono text-white">{formatInr(path.financial_exposure)}</p>
                    </div>
                    <div>
                      <p className="text-slate-500">Expected annual loss</p>
                      <p className="font-mono text-white">{formatInr(path.expected_annual_loss ?? 0)}</p>
                    </div>
                  </div>
                  <IllustrativeNote />
                </DashboardCard>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
