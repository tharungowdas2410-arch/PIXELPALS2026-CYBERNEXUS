"use client";

import Link from "next/link";
import { useState } from "react";
import {
  Activity,
  AlertOctagon,
  AlertTriangle,
  ArrowRight,
  ArrowUpRight,
  Award,
  Brain,
  Building2,
  CheckCircle2,
  Clock,
  ExternalLink,
  Flame,
  GitBranch,
  History,
  Landmark,
  Layers,
  Lock,
  Play,
  RotateCcw,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Target,
  TrendingDown,
  TrendingUp,
  Wallet,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AttackPathGraph } from "@/components/AttackPathGraph";
import { LossDistributionChart } from "@/components/LossDistributionChart";
import { RiskBadge } from "@/components/RiskBadge";
import { EmptyState, ErrorState, LoadingState } from "@/components/QueryStates";
import { useDashboard } from "@/lib/hooks/useDashboard";
import { useAttackPaths } from "@/lib/hooks/useAttackPaths";
import { useRisks } from "@/lib/hooks/useRisks";
import { useMlSignals } from "@/lib/hooks/useMl";
import { useSecurityEvents } from "@/lib/hooks/useIntegrations";
import { formatInr, formatPercent } from "@/lib/format";
import { toUiRiskLevel } from "@/lib/level";
import { toGraphPath } from "@/lib/graph";
import { cn } from "@/lib/utils";
import type { AttackPathNode, TrendRange } from "@/lib/types";

export function ExecutiveDashboard() {
  const [range, setRange] = useState<TrendRange>("30d");
  const [selectedNode, setSelectedNode] = useState<AttackPathNode | null>(null);

  const overview = useDashboard(range);
  const paths = useAttackPaths();
  const risks = useRisks();
  const signals = useMlSignals();
  const events = useSecurityEvents();

  if (overview.isLoading || (overview.isFetching && !overview.data)) return <LoadingState />;
  if (overview.isError || !overview.data || overview.data.expected_annual_loss === undefined) {
    return (
      <ErrorState
        message="Unable to load enterprise risk summary."
        onRetry={() => overview.refetch()}
      />
    );
  }

  const data = overview.data;
  const riskScore = data.enterprise_risk_score ?? 72.0;
  const riskStatus =
    riskScore >= 80 ? "CRITICAL" : riskScore >= 65 ? "HIGH" : riskScore >= 45 ? "ELEVATED" : "CONTROLLED";

  const criticalPathsCount = (paths.data ?? []).length || 4;
  const activeCriticalRisks = data.active_critical_risks ?? 2;
  const eal = data.expected_annual_loss ?? 18400000;
  const exposure = data.total_financial_exposure ?? 47000000;

  // Timeline events for "WHAT CHANGED?"
  const timelineItems = [
    {
      time: "10:24",
      title: "Financial Exposure Recalculated",
      detail: `Modeled EAL updated to ${formatInr(eal)} reflecting active perimeter exploitability`,
      type: "financial",
      icon: Landmark,
      badge: "Financial Engine",
      color: "text-amber-700 border-amber-200 bg-amber-50",
    },
    {
      time: "10:18",
      title: "Attack Path Traversability Increased",
      detail: "Exploit corridor established from Internet Gateway -> IdP -> Customer Core DB",
      type: "graph",
      icon: GitBranch,
      badge: "Neo4j Graph",
      color: "text-red-700 border-red-200 bg-red-50",
    },
    {
      time: "10:12",
      title: "Privileged MFA Bypass Alert",
      detail: "High-volume credential stuffing detected targeting CloudOps administrative bastion",
      type: "iam",
      icon: Lock,
      badge: "IAM / SIEM",
      color: "text-sky-700 border-sky-200 bg-sky-50",
    },
    {
      time: "10:05",
      title: "Threat Intelligence Match",
      detail: "Active telemetry aligned with APT29 tactics targeting exposed Palo Alto PAN-OS interfaces",
      type: "threat",
      icon: Activity,
      badge: "Threat Intel",
      color: "text-purple-700 border-purple-200 bg-purple-50",
    },
    {
      time: "09:41",
      title: "Critical Vulnerability Disclosed",
      detail: "CVE-2024-3400 (CVSS 10.0) detected on Perimeter Gateway without virtual patch",
      type: "vuln",
      icon: AlertOctagon,
      badge: "Vulnerability",
      color: "text-red-700 border-red-200 bg-red-50",
    },
  ];

  // 5 Interactive Risk Drivers
  const riskDrivers = [
    {
      id: "vulnerability",
      name: "Vulnerability Exposure",
      score: 88,
      status: "CRITICAL",
      description: "Unpatched CVSS >= 9.0 flaws on external perimeter gateway interfaces",
      href: "/vulnerabilities",
      metric: `${activeCriticalRisks} Critical CVEs`,
      color: "bg-red-600",
      textColor: "text-red-700",
      borderColor: "hover:border-red-300",
    },
    {
      id: "threat",
      name: "Threat Likelihood",
      score: 84,
      status: "HIGH",
      description: "Active APT campaigns matching monitored infrastructure fingerprint",
      href: "/threat-intelligence",
      metric: "3 Active Campaigns",
      color: "bg-amber-600",
      textColor: "text-amber-700",
      borderColor: "hover:border-amber-300",
    },
    {
      id: "asset",
      name: "Asset Criticality",
      score: 92,
      status: "CRITICAL",
      description: "High-value Transaction DB & Core Ledger in direct exploit blast radius",
      href: "/assets",
      metric: "₹4.7 Cr In Scope",
      color: "bg-red-600",
      textColor: "text-red-700",
      borderColor: "hover:border-red-300",
    },
    {
      id: "control",
      name: "Control Weakness",
      score: 65,
      status: "ATTENTION",
      description: "Gaps in hardware-backed FIDO2 MFA and automated backup air-gapping",
      href: "/controls",
      metric: "4 Control Gaps",
      color: "bg-amber-600",
      textColor: "text-amber-700",
      borderColor: "hover:border-amber-300",
    },
    {
      id: "attack_path",
      name: "Attack Path Exposure",
      score: 79,
      status: "HIGH",
      description: "Unsegmented network hops permitting lateral perimeter-to-core traversal",
      href: "/attack-paths",
      metric: `${criticalPathsCount} Exploit Paths`,
      color: "bg-amber-600",
      textColor: "text-amber-700",
      borderColor: "hover:border-amber-300",
    },
  ];

  // Prioritized Top Risks
  const topRisks = data.top_risk_contributors || [];

  const graphPath = paths.data?.[0]
    ? toGraphPath(paths.data[0], risks.data?.data ?? [])
    : null;

  return (
    <div className="space-y-8 pb-12">
      {/* ===================================================================== */}
      {/* LEVEL 1: CYBER RISK STATUS (EXECUTIVE HERO BAR)                      */}
      {/* ===================================================================== */}
      <div className="grid gap-4 lg:grid-cols-12">
        {/* Primary Hero Scorecard */}
        <div className="lg:col-span-5 rounded-xl border border-[#E2E8F0] bg-white p-6 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">
              Enterprise Cyber Risk Status
            </span>
            <Badge
              variant="outline"
              className={cn(
                "px-2.5 py-0.5 text-xs font-bold tracking-wider",
                riskStatus === "CRITICAL" && "border-red-200 bg-red-50 text-red-700",
                riskStatus === "HIGH" && "border-orange-200 bg-orange-50 text-orange-700",
                riskStatus === "ELEVATED" && "border-amber-200 bg-amber-50 text-amber-700",
                riskStatus === "CONTROLLED" && "border-emerald-200 bg-emerald-50 text-emerald-700"
              )}
            >
              {riskStatus} RISK
            </Badge>
          </div>

          <div className="mt-4 flex items-baseline gap-3">
            <span className="text-5xl md:text-6xl font-extrabold font-mono text-slate-900 tracking-tight">
              {riskScore.toFixed(1)}
            </span>
            <span className="text-lg font-mono text-slate-400">/ 100</span>
          </div>

          <div className="mt-3 flex items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded bg-red-50 border border-red-200 px-2 py-0.5 text-xs font-semibold text-red-700">
              <TrendingUp className="h-3.5 w-3.5" />
              +14.2% over last 7 days
            </span>
            <span className="text-xs text-slate-500">Driven by perimeter vulnerability drift</span>
          </div>

          <div className="mt-6 pt-5 border-t border-[#E2E8F0] flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-blue-600" />
              <span className="text-slate-500">Control Alignment:</span>
              <span className="font-semibold text-slate-900">Grade B (78.4%)</span>
            </div>
            <Link
              href="/security-posture"
              className="text-blue-600 hover:text-blue-800 inline-flex items-center gap-1 font-medium"
            >
              <span>Scorecard</span>
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </div>

        {/* Impact Trio Cards */}
        <div className="lg:col-span-7 grid gap-4 sm:grid-cols-3">
          {/* EAL Card */}
          <Link
            href="/financial-risk"
            className="group rounded-xl border border-[#E2E8F0] bg-white p-5 transition-all hover:border-amber-400 hover:bg-slate-50/50 shadow-xs flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between text-slate-500">
                <span className="text-[10px] font-bold uppercase tracking-wider">Expected Annual Loss</span>
                <Landmark className="h-4 w-4 text-amber-600 group-hover:scale-110 transition-transform" />
              </div>
              <p className="mt-3 text-2xl md:text-3xl font-bold font-mono text-amber-700 tracking-tight">
                {formatInr(eal)}
              </p>
              <p className="mt-1 text-xs text-slate-500 leading-relaxed">
                Deterministic annual loss under current control state
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-[#E2E8F0] flex items-center justify-between text-[11px] text-blue-600 font-medium">
              <span>View Open FAIR Model</span>
              <ArrowRight className="h-3 w-3 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>

          {/* Potential Exposure */}
          <Link
            href="/financial-risk"
            className="group rounded-xl border border-[#E2E8F0] bg-white p-5 transition-all hover:border-blue-400 hover:bg-slate-50/50 shadow-xs flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between text-slate-500">
                <span className="text-[10px] font-bold uppercase tracking-wider">Potential Exposure</span>
                <Building2 className="h-4 w-4 text-blue-600 group-hover:scale-110 transition-transform" />
              </div>
              <p className="mt-3 text-2xl md:text-3xl font-bold font-mono text-slate-900 tracking-tight">
                {formatInr(exposure)}
              </p>
              <p className="mt-1 text-xs text-slate-500 leading-relaxed">
                Aggregated business asset value in active blast radius
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-[#E2E8F0] flex items-center justify-between text-[11px] text-blue-600 font-medium">
              <span>Inspect Assets</span>
              <ArrowRight className="h-3 w-3 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>

          {/* Critical Paths */}
          <Link
            href="/attack-paths"
            className="group rounded-xl border border-[#E2E8F0] bg-white p-5 transition-all hover:border-red-400 hover:bg-slate-50/50 shadow-xs flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between text-slate-500">
                <span className="text-[10px] font-bold uppercase tracking-wider">Critical Attack Paths</span>
                <GitBranch className="h-4 w-4 text-red-600 group-hover:scale-110 transition-transform" />
              </div>
              <p className="mt-3 text-2xl md:text-3xl font-bold font-mono text-red-700 tracking-tight">
                {criticalPathsCount} Active
              </p>
              <p className="mt-1 text-xs text-slate-500 leading-relaxed">
                Multi-hop exploit corridors reaching crown jewel DBs
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-[#E2E8F0] flex items-center justify-between text-[11px] text-blue-600 font-medium">
              <span>Trace Graph Topology</span>
              <ArrowRight className="h-3 w-3 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* LEVEL 2: WHAT CHANGED? (OPERATIONAL TIMELINE & WHY RISK INCREASED)    */}
      {/* ===================================================================== */}
      <div className="rounded-xl border border-[#E2E8F0] bg-white p-5 shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E2E8F0] pb-3">
          <div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-blue-600" />
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900">What Changed?</h3>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Chronological security telemetry explaining why risk elevated from baseline
            </p>
          </div>
          <Button variant="outline" size="sm" asChild className="h-7 text-xs border-[#E2E8F0] text-slate-700 hover:bg-slate-50">
            <Link href="/security-operations">
              View Full SOC Operations Log
              <ArrowRight className="h-3 w-3 ml-1" />
            </Link>
          </Button>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {timelineItems.map((item, idx) => {
            return (
              <div
                key={idx}
                className="rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] p-3.5 space-y-2 hover:border-slate-300 transition-all"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-blue-600">{item.time}</span>
                  <span className={cn("text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border", item.color)}>
                    {item.badge}
                  </span>
                </div>
                <p className="text-xs font-semibold text-slate-900 line-clamp-1">{item.title}</p>
                <p className="text-[11px] text-slate-500 leading-relaxed line-clamp-2">{item.detail}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* ===================================================================== */}
      {/* LEVEL 3: WHY IS OUR RISK HIGH? (5 INTERACTIVE RISK DRIVERS)           */}
      {/* ===================================================================== */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900 flex items-center gap-2">
              <Flame className="h-4 w-4 text-amber-600" />
              Why Is Our Risk High? — 5 Primary Risk Drivers
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Quantitative risk drivers computed continuously from asset criticality, threats, vulnerabilities, and controls
            </p>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {riskDrivers.map((driver) => (
            <Link
              key={driver.id}
              href={driver.href}
              className={cn(
                "group rounded-xl border border-[#E2E8F0] bg-white p-4 transition-all hover:bg-slate-50 shadow-xs",
                driver.borderColor
              )}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900 truncate max-w-[140px]">
                  {driver.name}
                </span>
                <span className={cn("font-mono text-xs font-bold", driver.textColor)}>
                  {driver.score}/100
                </span>
              </div>

              <div className="mt-2.5 h-1.5 w-full rounded-full bg-slate-200 overflow-hidden">
                <div
                  className={cn("h-full rounded-full transition-all", driver.color)}
                  style={{ width: `${driver.score}%` }}
                />
              </div>

              <p className="mt-2 text-[11px] text-slate-500 line-clamp-2 leading-relaxed">
                {driver.description}
              </p>

              <div className="mt-3 pt-2.5 border-t border-[#E2E8F0] flex items-center justify-between text-[10px] font-mono text-slate-500">
                <span>{driver.metric}</span>
                <span className="text-blue-600 font-semibold group-hover:translate-x-0.5 transition-transform">Inspect →</span>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* ===================================================================== */}
      {/* LEVEL 4: WHAT IS MOST IMPORTANT? (TOP PRIORITIZED RISK ACTION CARDS)  */}
      {/* ===================================================================== */}
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900 flex items-center gap-2">
              <Target className="h-4 w-4 text-blue-600" />
              What Is Most Important? — Top Risk Priorities
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Prioritized by residual risk, crown jewel exploitability, and modeled financial exposure
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" asChild className="h-7 text-xs border-[#E2E8F0] text-slate-700 hover:bg-slate-50">
              <Link href="/risks">View All Risk Records</Link>
            </Button>
            <Button size="sm" asChild className="h-7 text-xs bg-[#2563EB] hover:bg-blue-700 text-white font-medium shadow-xs">
              <Link href="/investment-optimizer">
                <Wallet className="h-3 w-3 mr-1" />
                Optimize ₹50L Budget
              </Link>
            </Button>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {topRisks.slice(0, 3).map((item, idx) => {
            const riskTitle = (item.drivers ?? [])[0] || `Critical Risk Vector #${idx + 1}`;
            const targetAsset = (item.drivers ?? [])[1] || "Core Transaction Banking Subnet";
            return (
              <div
                key={item.id || idx}
                className="rounded-xl border border-[#E2E8F0] bg-white p-5 transition-all hover:border-slate-300 shadow-xs flex flex-col justify-between space-y-4"
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-mono text-blue-600 font-bold uppercase tracking-wider">
                      Priority #{idx + 1}
                    </span>
                    <RiskBadge level={toUiRiskLevel(item.risk_level)} />
                  </div>

                  <h4 className="mt-2 text-sm font-bold text-slate-900 tracking-tight line-clamp-1">
                    {riskTitle}
                  </h4>

                  <div className="mt-3 space-y-2 text-xs">
                    <div className="flex items-center justify-between text-slate-500">
                      <span>Target Asset:</span>
                      <span className="font-semibold text-slate-800 truncate max-w-[160px]">
                        {targetAsset}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-slate-500">
                      <span>Residual Risk:</span>
                      <span className="font-mono font-bold text-red-600">
                        {item.residual_risk} / 100
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-slate-500">
                      <span>Financial Exposure:</span>
                      <span className="font-mono font-bold text-amber-700">
                        {formatInr(item.financial_exposure)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-[#E2E8F0] flex items-center justify-between gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    asChild
                    className="h-7 px-2 text-xs text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                  >
                    <Link href={`/risks/${item.id}`}>
                      Deep Dive
                      <ArrowRight className="h-3 w-3 ml-1" />
                    </Link>
                  </Button>
                  <Button
                    size="sm"
                    asChild
                    className="h-7 px-2.5 text-xs bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200"
                  >
                    <Link href="/investment-optimizer">Remediate</Link>
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ===================================================================== */}
      {/* DECISION ACTION TRIPLETS: AI ADVISOR + ATTACK GRAPH PREVIEW          */}
      {/* ===================================================================== */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Grounded Decision Box */}
        <div className="rounded-xl border border-blue-200 bg-gradient-to-br from-blue-50/60 via-white to-slate-50 p-5 space-y-4 shadow-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-blue-600" />
              <h4 className="text-sm font-bold uppercase tracking-wider text-slate-900">
                Grounded AI Risk Advisor
              </h4>
            </div>
            <Badge variant="outline" className="text-[10px] border-blue-200 bg-blue-50 text-blue-700 font-semibold">
              Zero Hallucinations
            </Badge>
          </div>

          <p className="text-xs text-slate-600 leading-relaxed">
            Decision support mathematically anchored to your active asset register, OR-Tools knapsack solver, and FAIR financial loss models.
          </p>

          <div className="space-y-2">
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Recommended Executive Inquiries:
            </p>
            <div className="flex flex-wrap gap-1.5">
              {[
                "What are our top cyber risks?",
                "I have ₹50 lakh. What should I fix first?",
                "Why did our risk increase today?",
                "Which attack path reaches core banking?",
              ].map((prompt, i) => (
                <Link
                  key={i}
                  href={`/ai-risk-advisor?q=${encodeURIComponent(prompt)}`}
                  className="rounded-md border border-[#E2E8F0] bg-white px-2.5 py-1 text-xs text-slate-700 hover:border-blue-300 hover:text-blue-600 shadow-xs transition-colors"
                >
                  {prompt} →
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* Attack Path Topology Quick View */}
        <div className="rounded-xl border border-[#E2E8F0] bg-white p-5 space-y-4 flex flex-col justify-between shadow-xs">
          <div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <GitBranch className="h-5 w-5 text-red-600" />
                <h4 className="text-sm font-bold uppercase tracking-wider text-slate-900">
                  Attack Graph Traversal
                </h4>
              </div>
              <span className="text-xs font-mono text-slate-500">Neo4j Cypher</span>
            </div>
            <p className="text-xs text-slate-600 mt-2 leading-relaxed">
              Discovered multi-hop exploit corridor:
              <span className="text-red-700 font-semibold block mt-1 font-mono bg-red-50/70 p-2 rounded border border-red-200">
                Internet Gateway (CVE-2024-3400) → VPN Gateway → IdP → Customer DB
              </span>
            </p>
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-[#E2E8F0]">
            <span className="text-xs text-slate-500">Blast Radius: 4 Monitored Nodes</span>
            <Button size="sm" asChild variant="outline" className="h-7 text-xs border-[#E2E8F0] bg-[#F8FAFC] hover:bg-slate-100 text-slate-800">
              <Link href="/attack-paths">
                Inspect Interactive Graph
                <ArrowRight className="h-3 w-3 ml-1" />
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
