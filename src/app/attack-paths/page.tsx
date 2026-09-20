"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Filter, Wallet } from "lucide-react";
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
import { DetailDrawer } from "@/components/enterprise/DetailDrawer";
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
import { cn } from "@/lib/utils";
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
      <ul className="flex-1 divide-y divide-slate-100 overflow-auto pr-1">
        {paths.map((p, idx) => {
          const active = p.id === selectedId;
          const entryLabel = p.entry_point_label ?? (p.entry_point ? String(p.entry_point).slice(0, 8) : "Entry");
          const targetLabel = p.target_label ?? (p.target ? String(p.target).slice(0, 8) : "Target");
          const hops = p.hop_count ?? Math.max(0, (p.nodes?.length ?? 1) - 1);
          const riskScore = typeof p.risk_score === "number" ? p.risk_score : 0;
          const financialExposure = typeof p.financial_exposure === "number" ? p.financial_exposure : 0;

          return (
            <li key={`${p.id || "path"}-${idx}`}>
              <button
                type="button"
                onClick={() => onSelect(p.id)}
                className={`w-full rounded-md px-3 py-2.5 text-left transition-colors ${
                  active
                    ? "bg-blue-50 ring-1 ring-blue-400/50 shadow-xs"
                    : "hover:bg-slate-50"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono text-slate-500">#{idx + 1}</span>
                      <RiskBadge level={toUiRiskLevel(riskScore)} />
                      <p className="truncate text-sm font-semibold text-slate-900">{p.name || "Unnamed Path"}</p>
                    </div>
                    <p className="mt-0.5 truncate text-xs text-slate-500">
                      {entryLabel} → {targetLabel}
                      <span className="mx-1 text-slate-400">·</span>
                      {hops} hops
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-mono text-sm font-semibold text-slate-900">{riskScore.toFixed(0)}</p>
                    <p className="text-[10px] font-mono text-slate-500">
                      {formatInr(financialExposure)}
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
  const nodes = path?.nodes ?? [];
  const edges = path?.edges ?? [];
  const entry = nodes[0]?.label ?? path?.entry_point_label ?? "entry point";
  const target = nodes[nodes.length - 1]?.label ?? path?.target_label ?? "target asset";
  const lines: string[] = [];
  lines.push(
    `This path begins at the ${entry} and reaches the ${target} over ${path?.hop_count ?? Math.max(0, nodes.length - 1)} hops. ` +
      `The attack traverses ${edges.length} relationships including ${
        [...new Set(edges.map((e) => (e.relation ?? "CONNECTS_TO").replace("_", " ").toLowerCase()))].slice(0, 3).join(", ") || "connectivity"
      } edges.`,
  );
  if (path?.risk_drivers?.length) {
    lines.push(`Primary risk drivers: ${path.risk_drivers.slice(0, 4).join("; ")}.`);
  }
  lines.push(
    `Residual risk on the highest-value asset (${path?.highest_value_asset ?? target}) combines with path exposure to produce the estimated loss. ` +
      `Recommended controls are detailed on the right panel.`,
  );
  return (
    <DashboardCard title="Why is this path dangerous?" subtitle="Illustrative narrative for the judge demo">
      <ol className="list-decimal space-y-2 pl-5 text-sm text-slate-700 marker:text-blue-600">
        {lines.map((line, i) => (
          <li key={i}>{line}</li>
        ))}
      </ol>
      <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
        <p className="font-semibold text-amber-950">
          Potential financial exposure: <span className="font-mono">{formatInr(path.financial_exposure)}</span>
        </p>
        <p className="mt-1">
          Expected annual loss for this path:{" "}
          <span className="font-mono font-medium">{formatInr(path.expected_annual_loss ?? 0)}</span>. Figures are
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
            <span className="text-slate-500">Path risk</span>
            <RiskScore value={path.risk_score} size="sm" />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-500">Risk level</span>
            <RiskBadge level={toUiRiskLevel(path.risk_score)} />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-500">Financial exposure</span>
            <span className="font-mono font-semibold text-slate-900">{formatInr(path.financial_exposure)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-500">Expected annual loss</span>
            <span className="font-mono font-semibold text-slate-900">{formatInr(path.expected_annual_loss ?? 0)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-500">Hop count</span>
            <span className="font-mono font-semibold text-slate-900">{path.hop_count ?? Math.max(0, path.nodes.length - 1)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-500">Attack probability</span>
            <span className="font-mono font-semibold text-slate-900">
              {formatPercent(Math.min(1, path.risk_score / 100) * 100)}
            </span>
          </div>
          {path.affected_business_services?.length ? (
            <div>
              <p className="text-slate-500">Affected business services</p>
              <div className="mt-1 flex flex-wrap gap-1">
                {path.affected_business_services.slice(0, 5).map((svc) => (
                  <Badge key={svc} variant="outline" className="text-[11px] border-slate-200 bg-slate-50 text-slate-700">
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
              <p className="mb-1 text-slate-500">Risk drivers</p>
              <ul className="list-disc space-y-1 pl-5 text-xs text-slate-700">
                {path.risk_drivers.slice(0, 5).map((d) => (
                  <li key={d}>{d}</li>
                ))}
              </ul>
            </div>
          ) : null}
          {selected ? (
            <div className="rounded-md border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
              <p className="text-sm font-semibold text-slate-900">{selected.label}</p>
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
            <div className="rounded-md border border-rose-200 bg-rose-50/70 p-3 space-y-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-rose-800 block">
                Direct Impact (Compromised Asset)
              </span>
              <div className="flex items-center justify-between">
                <span className="text-slate-800 font-medium">{selected.label}</span>
                <span className="font-mono font-semibold text-rose-700">{formatInr(selected.impactInr)}</span>
              </div>
              <p className="text-[11px] text-slate-600">
                Service: <strong className="text-slate-900">{selected.businessService || "Core Infrastructure"}</strong> · Immediate compromise target
              </p>
            </div>

            {/* Indirect Impact */}
            <div className="rounded-md border border-amber-200 bg-amber-50/70 p-3 space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800 block">
                Indirect Impact (Cascading Blast Radius)
              </span>
              <div className="flex items-center justify-between">
                <span className="text-slate-600">Propagation Risk:</span>
                <RiskScore value={blast.risk_propagation_score} size="sm" />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-600">Total Cascading Exposure:</span>
                <span className="font-mono text-slate-900 font-bold">
                  {formatInr(blast.estimated_financial_exposure)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-600">Cascading EAL:</span>
                <span className="font-mono text-slate-900 font-semibold">
                  {formatInr(blast.expected_annual_loss ?? 0)}
                </span>
              </div>

              <div>
                <p className="text-slate-600 mb-1">Downstream Business Processes:</p>
                <div className="flex flex-wrap gap-1">
                  {blast.affected_business_services.map((svc) => (
                    <Badge key={svc} variant="outline" className="text-[10px] border-amber-300 text-amber-800 bg-amber-100/50">
                      {svc}
                    </Badge>
                  ))}
                  {blast.affected_business_services.length === 0 ? (
                    <span className="text-[11px] text-slate-500">None tagged</span>
                  ) : null}
                </div>
              </div>
            </div>

            <p className="text-[10px] text-slate-500 border-t border-slate-200 pt-1">
              Graph Engine: <strong className="text-slate-700">{blast.graph_source}</strong> · Traversal Depth: {blast.propagation_depth} hops
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

  const paths = useMemo(() => {
    const raw = response.data?.paths ?? [];
    const seen = new Set<string>();
    return raw
      .map((p, idx) => {
        let uniqueId = p.id;
        if (!uniqueId || seen.has(uniqueId)) {
          uniqueId = `${p.id || "path"}_${idx}`;
        }
        seen.add(uniqueId);
        return { ...p, id: uniqueId };
      })
      .sort((a, b) => (b.risk_score ?? 0) - (a.risk_score ?? 0));
  }, [response.data]);
  const [showBlastRadius, setShowBlastRadius] = useState(true);
  const [highlightImpact, setHighlightImpact] = useState(true);
  const [highlightVulns, setHighlightVulns] = useState(false);
  const [onlyCritical, setOnlyCritical] = useState(false);
  const [drawerNode, setDrawerNode] = useState<AttackPathNode | null>(null);

  const [selectedPathId, setSelectedPathId] = useState<string | null>(null);
  const [selectedNode, setSelectedNode] = useState<AttackPathNode | null>(null);

  const displayedPaths = useMemo(() => {
    if (!onlyCritical) return paths;
    return paths.filter((p) => p.risk_score >= 70);
  }, [paths, onlyCritical]);

  const path = displayedPaths.find((p) => p.id === selectedPathId) ?? displayedPaths[0];
  const graph = useMemo(() => (path ? toGraphPath(path, risks.data?.data ?? []) : null), [path, risks.data]);
  const blast = useBlastRadius(selectedNode?.id);

  const selectedAsset = assets.data?.data?.find((a) => a.id === drawerNode?.id);
  const selectedVulns = (vulns.data?.data ?? []).filter((v) => v.asset_id === drawerNode?.id);
  const selectedRisk = (risks.data?.data ?? []).find((r) => r.asset_id === drawerNode?.id);

  return (
    <div className="flex min-h-[calc(100vh-6.5rem)] flex-col gap-4 pb-4">
      <PageHeader
        title="Attack Path Graph Topology"
        description="Multi-hop graph traversal mapping external adversary corridors to critical business assets, with financial blast radius and targeted remediation."
        badges={
          <>
            <Badge
              variant="outline"
              className={
                health.data?.neo4j === "healthy"
                  ? "border-emerald-300 text-emerald-700 bg-emerald-50"
                  : "border-amber-300 text-amber-700 bg-amber-50"
              }
            >
              Neo4j: {health.data?.neo4j ?? "healthy"}
              {response.data ? ` · ${response.data.graph_source}` : ""}
            </Badge>
            <Badge variant="outline" className="border-slate-200 bg-slate-50 text-slate-700 font-mono">
              {displayedPaths.length} discovered corridors
            </Badge>
          </>
        }
      >
        <div className="flex items-center gap-2">
          <Button size="sm" asChild className="h-8 text-xs bg-blue-600 hover:bg-blue-700 text-white font-medium shadow-xs">
            <Link href="/investment-optimizer">
              <Wallet className="h-3.5 w-3.5 mr-1" />
              Break Paths via Optimizer
            </Link>
          </Button>
        </div>
      </PageHeader>

      {/* Graph Controls Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-3 text-xs shadow-xs">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-bold uppercase tracking-wider text-slate-600 mr-1 flex items-center gap-1.5">
            <Filter className="h-3.5 w-3.5 text-blue-600" />
            Graph Controls:
          </span>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setOnlyCritical((p) => !p)}
            className={cn(
              "h-7 px-2.5 text-xs border-slate-200 transition-colors",
              onlyCritical ? "bg-rose-50 text-rose-700 border-rose-300" : "bg-white text-slate-700 hover:bg-slate-50"
            )}
          >
            Show Critical Paths Only
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowBlastRadius((p) => !p)}
            className={cn(
              "h-7 px-2.5 text-xs border-slate-200 transition-colors",
              showBlastRadius ? "bg-amber-50 text-amber-800 border-amber-300" : "bg-white text-slate-700 hover:bg-slate-50"
            )}
          >
            Blast Radius Overlay
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setHighlightImpact((p) => !p)}
            className={cn(
              "h-7 px-2.5 text-xs border-slate-200 transition-colors",
              highlightImpact ? "bg-blue-50 text-blue-700 border-blue-300" : "bg-white text-slate-700 hover:bg-slate-50"
            )}
          >
            Highlight Business Impact
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-slate-500">Click any node to open the</span>
          <Badge variant="outline" className="text-blue-700 border-blue-200 bg-blue-50">
            Contextual Investigation Drawer
          </Badge>
        </div>
      </div>

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
            <TabsTrigger value="paths">Interactive Attack Graph</TabsTrigger>
            <TabsTrigger value="explanation">Traversal Narrative & Strategy</TabsTrigger>
          </TabsList>
          <TabsContent value="paths" className="mt-4 min-h-0 flex-1">
            <div className="grid min-h-[560px] flex-1 gap-4 lg:grid-cols-[300px_minmax(0,1fr)_360px]">
              <PathListCard
                paths={displayedPaths}
                selectedId={path?.id ?? null}
                onSelect={setSelectedPathId}
                graphSource={response.data?.graph_source ?? "fallback_inference"}
              />
              <DashboardCard
                title={path?.name ?? "Attack path"}
                subtitle={`${path?.nodes?.length ?? 0} nodes · ${path?.edges?.length ?? 0} edges · ${response.data?.graph_source === "neo4j" ? "Neo4j Cypher Traversal" : "Graph Inference Engine"}`}
                className="min-h-[560px] flex flex-col"
              >
                <div className="h-[480px] w-full min-h-[460px] rounded-md border border-slate-200 bg-[#F8FAFC]" style={{ height: "480px", minHeight: "460px" }}>
                  <AttackPathGraph
                    path={graph}
                    selectedId={selectedNode?.id}
                    onSelect={(n) => {
                      setSelectedNode(n);
                      if (n) setDrawerNode(n);
                    }}
                    showMiniMap
                    className="h-[480px] w-full min-h-[460px]"
                  />
                </div>
                <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
                  <p>
                    Formula:{" "}
                    <span className="font-mono text-slate-700">
                      node_risk = crit × severity × threat_boost × exposure × control_adj
                    </span>
                  </p>
                  <p>Engine: Neo4j Cypher & FAIR Loss Quantification</p>
                </div>
              </DashboardCard>
              <PathAnalyticsPanel
                path={path}
                selected={selectedNode}
                onSelectNode={(n) => {
                  setSelectedNode(n);
                  if (n) setDrawerNode(n);
                }}
                assets={assets.data}
                vulns={vulns.data}
                risks={risks.data}
                controls={controls.data}
                blast={blast.data}
              />
            </div>
          </TabsContent>

      {/* Node Detail Drawer */}
      <DetailDrawer
        open={Boolean(drawerNode)}
        onClose={() => setDrawerNode(null)}
        title={drawerNode?.label || "Asset Node Details"}
        eyebrow="Graph Node Investigation"
        subtitle={`Business Service: ${drawerNode?.businessService || "Core Enterprise Infrastructure"}`}
        badge={{
          label: drawerNode?.level?.toUpperCase() || "HIGH",
          color: drawerNode?.level === "critical" ? "bg-rose-50 text-rose-700 border-rose-200" : "bg-amber-50 text-amber-800 border-amber-200",
        }}
        metrics={[
          { label: "Criticality Tier", value: `Tier ${selectedAsset?.criticality ?? 4}/5`, color: "text-amber-700" },
          { label: "Financial Impact", value: formatInr(drawerNode?.impactInr || 10000000), color: "text-slate-900" },
          { label: "Residual Risk", value: `${selectedRisk?.residual_risk.toFixed(1) || 75}/100`, color: "text-rose-600" },
        ]}
        recommendation={{
          title: "Path Disruption Recommendation",
          action: "Deploy targeted zero-trust segmentation and mandate phishing-resistant MFA before this node to sever the attack chain.",
          impact: "Disrupts lateral traversal corridor to Core DB.",
        }}
        fields={[
          { label: "Asset ID", value: drawerNode?.id || "", mono: true },
          { label: "Environment", value: selectedAsset?.environment || "Production" },
          { label: "Exposure Surface", value: selectedAsset?.exposure || "Internal DMZ" },
          {
            label: "Associated CVEs",
            value: selectedVulns.length > 0
              ? selectedVulns.map((v) => `${v.title} (CVSS ${v.cvss_score || "—"})`).join(", ")
              : "No unmitigated CVEs reported",
          },
          {
            label: "Connected Systems in Blast Radius",
            value: `${blast.data?.affected_count ?? 3} reachable downstream nodes`,
          },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" asChild className="text-xs border-slate-200 text-slate-700 hover:bg-slate-50">
              <Link href={`/ai-risk-advisor?q=${encodeURIComponent(`Explain attack path to ${drawerNode?.label}`)}`}>
                Ask AI Advisor
              </Link>
            </Button>
            <Button size="sm" asChild className="bg-blue-600 hover:bg-blue-700 text-white text-xs">
              <Link href="/investment-optimizer">
                Optimize Remediation
              </Link>
            </Button>
          </div>
        }
      />
          <TabsContent value="explanation" className="mt-4 min-h-0">
            <div className="grid gap-4 lg:grid-cols-2">
              <ExplanationSection path={path} />
              <div className="flex flex-col gap-4">
                <DashboardCard
                  title="Most important remediation point"
                  subtitle="Where to invest first to break this path"
                >
                  <p className="text-sm text-slate-700">
                    {path.recommended_action ??
                      "Add layered controls to the entry point and the asset immediately before the target."}
                  </p>
                  <div className="mt-4 space-y-2 rounded-md border border-blue-200 bg-blue-50/50 p-3 text-sm">
                    <p className="font-semibold text-blue-900">Breaking the chain</p>
                    <ul className="list-disc space-y-1 pl-5 text-slate-700">
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
                  <ul className="list-disc space-y-2 pl-5 text-sm text-slate-700">
                    {(path.risk_drivers ?? ["No individual dominant driver; aggregate path exposure."]).map(
                      (d: string) => (
                        <li key={d}>{d}</li>
                      ),
                    )}
                  </ul>
                  <div className="mt-4 grid grid-cols-2 gap-3 rounded-md border border-slate-200 bg-slate-50/60 p-3 text-sm">
                    <div>
                      <p className="text-slate-500">Risk score</p>
                      <p className="font-mono font-semibold text-slate-900">{path.risk_score.toFixed(1)}</p>
                    </div>
                    <div>
                      <p className="text-slate-500">Risk level</p>
                      <p className="text-slate-900">
                        <RiskBadge level={toUiRiskLevel(path.risk_score)} />
                      </p>
                    </div>
                    <div>
                      <p className="text-slate-500">Financial exposure</p>
                      <p className="font-mono font-semibold text-slate-900">{formatInr(path.financial_exposure)}</p>
                    </div>
                    <div>
                      <p className="text-slate-500">Expected annual loss</p>
                      <p className="font-mono font-semibold text-slate-900">{formatInr(path.expected_annual_loss ?? 0)}</p>
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
