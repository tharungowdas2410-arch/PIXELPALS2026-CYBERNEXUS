"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Activity,
  AlertOctagon,
  ArrowRight,
  Blocks,
  Brain,
  CheckCircle2,
  ChevronRight,
  Database,
  ExternalLink,
  Eye,
  FileText,
  Flame,
  GitBranch,
  Landmark,
  Play,
  Radio,
  RefreshCw,
  RotateCcw,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Wallet,
  Zap,
} from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StatusBadge } from "@/components/enterprise/StatusBadge";
import { FinancialMetric } from "@/components/enterprise/FinancialMetric";
import { EvidenceChip } from "@/components/enterprise/EvidenceChip";
import { getDemoState, triggerDemoScene, resetDemo, type DemoSceneItem } from "@/lib/api/demo";
import { formatInr } from "@/lib/format";
import { cn } from "@/lib/utils";
import { LoadingState } from "@/components/QueryStates";

const SCENE_ICONS: Record<number, any> = {
  1: ShieldCheck,
  2: Radio,
  3: AlertOctagon,
  4: Activity,
  5: GitBranch,
  6: Landmark,
  7: Wallet,
  8: TrendingUp,
  9: Brain,
  10: Blocks,
  11: FileText,
};

const SCENE_TARGET_ROUTES: Record<number, { href: string; label: string }> = {
  1: { href: "/", label: "Overview Dashboard" },
  2: { href: "/security-operations", label: "Security Operations Stream" },
  3: { href: "/vulnerabilities", label: "Vulnerability Center" },
  4: { href: "/threat-intelligence", label: "Threat Intelligence Feeds" },
  5: { href: "/attack-paths", label: "Neo4j Attack Paths" },
  6: { href: "/financial-risk", label: "Financial Loss Engine" },
  7: { href: "/investment-optimizer", label: "Investment Optimizer" },
  8: { href: "/investment-optimizer", label: "Selected Portfolio" },
  9: { href: "/ai-risk-advisor", label: "AI Risk Advisor" },
  10: { href: "/blockchain-evidence", label: "Blockchain Evidence Ledger" },
  11: { href: "/reports", label: "Executive Reporting Hub" },
};

export default function DemoPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<string>("scenes");
  const [lastActionMessage, setLastActionMessage] = useState<string | null>(null);

  const { data: demoState, isLoading, refetch } = useQuery({
    queryKey: ["demoState"],
    queryFn: getDemoState,
    refetchInterval: 4000,
  });

  const invalidateAllQueries = () => {
    queryClient.invalidateQueries({ queryKey: ["demoState"] });
    queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    queryClient.invalidateQueries({ queryKey: ["continuousRiskSummary"] });
    queryClient.invalidateQueries({ queryKey: ["continuousRiskDrift"] });
    queryClient.invalidateQueries({ queryKey: ["securityEvents"] });
    queryClient.invalidateQueries({ queryKey: ["riskAlerts"] });
    queryClient.invalidateQueries({ queryKey: ["financial"] });
    queryClient.invalidateQueries({ queryKey: ["risks"] });
    queryClient.invalidateQueries({ queryKey: ["attack-paths"] });
    queryClient.invalidateQueries({ queryKey: ["graph"] });
  };

  const sceneMutation = useMutation({
    mutationFn: (sceneId: number) => triggerDemoScene(sceneId),
    onSuccess: (data) => {
      setLastActionMessage(data.message);
      invalidateAllQueries();
    },
  });

  const resetMutation = useMutation({
    mutationFn: resetDemo,
    onSuccess: (data) => {
      setLastActionMessage(data.message);
      invalidateAllQueries();
    },
  });

  if (isLoading || !demoState) {
    return <LoadingState />;
  }

  const currentScene = demoState.active_scene || 1;
  const scenes = demoState.scenes || [];

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      <PageHeader
        eyebrow="Smart India Hackathon 2026 · PS ID SIH26105"
        title="SIH Evaluator Demo Scenario Controller"
        description="Interactive 11-scene storytelling presentation deck demonstrating continuous telemetry, risk drift, attack graph escalation, financial loss quantification, OR-Tools optimization, grounded AI reasoning, and blockchain evidence."
        badges={
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-md border border-amber-500/40 bg-amber-950/30 px-2.5 py-1 text-xs font-semibold text-amber-300">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
              DEMO / SYNTHETIC STORYTELLER
            </span>
            <StatusBadge status="OPERATIONAL" size="sm" />
          </div>
        }
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => resetMutation.mutate()}
              disabled={resetMutation.isPending}
              className="border-rose-500/30 bg-rose-950/20 text-rose-300 hover:bg-rose-950/40 text-xs"
            >
              <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
              One-Click Reset
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={() => sceneMutation.mutate(2)}
              disabled={sceneMutation.isPending}
              className="bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold"
            >
              <Play className="h-3.5 w-3.5 mr-1.5 fill-current" />
              Start Attack Simulation
            </Button>
          </div>
        }
      />

      {/* Live System State Tracker Banner */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-white/10 bg-[#0c1220]/80">
          <CardHeader className="p-4 pb-1">
            <CardDescription className="text-xs">Active Story Scene</CardDescription>
            <CardTitle className="text-lg font-mono text-cyan-300">
              Step {currentScene} / 11
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-1">
            <p className="text-xs font-medium text-white truncate">
              {demoState?.scene_title || "Normal State"}
            </p>
          </CardContent>
        </Card>

        <Card className="border-white/10 bg-[#0c1220]/80">
          <CardHeader className="p-4 pb-1">
            <CardDescription className="text-xs">Enterprise Residual Risk</CardDescription>
            <CardTitle className="text-lg font-mono text-white flex items-center gap-2">
              <span>{demoState?.current_risk?.toFixed(1) ?? "72.0"}</span>
              <span
                className={cn(
                  "text-xs px-1.5 py-0.5 rounded font-bold",
                  (demoState?.current_risk ?? 72) >= 80
                    ? "bg-rose-500/20 text-rose-300"
                    : "bg-sky-500/20 text-sky-300"
                )}
              >
                {(demoState?.current_risk ?? 72) >= 80 ? "DRIFTED HIGH" : "OPTIMAL"}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-1">
            <p className="text-[11px] text-slate-400">
              Baseline: {demoState?.baseline_risk?.toFixed(1) ?? "72.0"} / 100
            </p>
          </CardContent>
        </Card>

        <Card className="border-white/10 bg-[#0c1220]/80">
          <CardHeader className="p-4 pb-1">
            <CardDescription className="text-xs">Expected Annual Loss (EAL)</CardDescription>
            <CardTitle className="text-lg font-mono text-white">
              {formatInr(demoState?.expected_annual_loss ?? 4500000)}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-1">
            <p className="text-[11px] text-slate-400">
              Exposure: {formatInr(demoState?.total_financial_exposure ?? 48200000)}
            </p>
          </CardContent>
        </Card>

        <Card className="border-white/10 bg-[#0c1220]/80">
          <CardHeader className="p-4 pb-1">
            <CardDescription className="text-xs">Telemetry & Alerts</CardDescription>
            <CardTitle className="text-lg font-mono text-white flex items-center gap-2">
              <span className="text-amber-400">{demoState?.active_alerts_count ?? 0} Alerts</span>
              <span className="text-slate-500">·</span>
              <span className="text-cyan-300">{demoState?.simulated_events_count ?? 0} Events</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-1">
            <p className="text-[11px] text-slate-400 truncate">
              Last action: {lastActionMessage ? "Executed" : "Ready for judge test"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Jump Buttons Bar */}
      <Card className="border-white/10 bg-[#0a101d] p-4">
        <div className="flex items-center justify-between gap-2 mb-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Quick Scenario Execution Triggers
          </h3>
          <span className="text-[11px] text-slate-500">
            Directly trigger any key milestone in the judge demo
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => sceneMutation.mutate(1)}
            className="text-xs border-white/10 bg-white/5 hover:bg-white/10 text-slate-200"
          >
            1. Normal State
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => sceneMutation.mutate(2)}
            className="text-xs border-white/10 bg-white/5 hover:bg-white/10 text-slate-200"
          >
            2. Attack Begins
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => sceneMutation.mutate(3)}
            className="text-xs border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 text-amber-200"
          >
            3. Risk Escalates (+12)
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => sceneMutation.mutate(4)}
            className="text-xs border-white/10 bg-white/5 hover:bg-white/10 text-slate-200"
          >
            4. Threat Intel (APT29)
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => sceneMutation.mutate(5)}
            className="text-xs border-white/10 bg-white/5 hover:bg-white/10 text-slate-200"
          >
            5. Attack Path Critical
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => sceneMutation.mutate(6)}
            className="text-xs border-white/10 bg-white/5 hover:bg-white/10 text-slate-200"
          >
            6. Financial Exposure Shift
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => sceneMutation.mutate(7)}
            className="text-xs border-cyan-500/30 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-200 font-semibold"
          >
            7. Optimize ₹50 Lakh
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => sceneMutation.mutate(9)}
            className="text-xs border-cyan-500/30 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-200"
          >
            9. AI Explains
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => sceneMutation.mutate(10)}
            className="text-xs border-white/10 bg-white/5 hover:bg-white/10 text-slate-200"
          >
            10. Blockchain Evidence
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => sceneMutation.mutate(11)}
            className="text-xs border-white/10 bg-white/5 hover:bg-white/10 text-slate-200"
          >
            11. Executive Report
          </Button>
        </div>
      </Card>

      {/* 11-Scene Storytelling Visual Stepper Deck */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold tracking-wide uppercase text-slate-300">
            End-to-End Judge Storyline (Scenes 1 to 11)
          </h2>
          <span className="text-xs text-slate-500">
            Click &quot;Trigger Scene&quot; to advance system state, then inspect the corresponding portal
          </span>
        </div>

        <div className="space-y-3">
          {scenes.map((scene) => {
            const Icon = SCENE_ICONS[scene.scene_id] || Shield;
            const target = SCENE_TARGET_ROUTES[scene.scene_id];
            const isCurrent = scene.scene_id === currentScene;
            const isPast = scene.scene_id < currentScene;

            return (
              <div
                key={scene.scene_id}
                className={cn(
                  "rounded-lg border p-4 transition-all",
                  isCurrent
                    ? "border-cyan-500/60 bg-cyan-950/20 ring-1 ring-cyan-400/40 shadow-lg"
                    : isPast
                    ? "border-white/10 bg-[#0a101d]/60 opacity-80"
                    : "border-white/5 bg-[#080d18]/40 hover:border-white/15"
                )}
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  {/* Left info */}
                  <div className="flex items-start gap-3.5 min-w-0 flex-1">
                    <div
                      className={cn(
                        "p-2.5 rounded-lg shrink-0 mt-0.5",
                        isCurrent
                          ? "bg-cyan-500 text-black font-bold"
                          : isPast
                          ? "bg-emerald-950/60 text-emerald-400 border border-emerald-500/30"
                          : "bg-white/5 text-slate-400"
                      )}
                    >
                      {isPast ? (
                        <CheckCircle2 className="h-5 w-5" />
                      ) : (
                        <Icon className="h-5 w-5" />
                      )}
                    </div>

                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-xs font-bold text-cyan-400">
                          SCENE {scene.scene_id}
                        </span>
                        <h4 className="text-sm font-semibold text-white truncate">
                          {scene.title}
                        </h4>
                        {isCurrent && (
                          <Badge className="bg-cyan-500/20 text-cyan-200 border-cyan-400/30 text-[10px]">
                            ACTIVE IN LIVE CORE
                          </Badge>
                        )}
                      </div>

                      <p className="mt-1 text-xs text-slate-300 leading-relaxed">
                        {scene.description}
                      </p>

                      <div className="mt-2 flex flex-wrap items-center gap-3 text-[11px] text-slate-400 font-mono">
                        <span>Risk Score: <strong className="text-white">{(scene.current_risk ?? scene.risk_score).toFixed(1)}</strong></span>
                        <span>·</span>
                        <span>EAL: <strong className="text-white">{formatInr(scene.expected_annual_loss ?? scene.eal)}</strong></span>
                        <span>·</span>
                        <span>Exposure: <strong className="text-white">{formatInr(scene.total_financial_exposure ?? scene.exposure)}</strong></span>
                      </div>
                    </div>
                  </div>

                  {/* Right: Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    {target && (
                      <Link href={target.href}>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-xs text-slate-300 hover:text-cyan-200 hover:bg-white/5 border border-white/5"
                        >
                          {target.label}
                          <ExternalLink className="h-3 w-3 ml-1.5 text-slate-500" />
                        </Button>
                      </Link>
                    )}

                    <Button
                      variant={isCurrent ? "default" : "outline"}
                      size="sm"
                      onClick={() => sceneMutation.mutate(scene.scene_id)}
                      disabled={sceneMutation.isPending}
                      className={cn(
                        "text-xs font-semibold",
                        isCurrent
                          ? "bg-cyan-600 hover:bg-cyan-500 text-white"
                          : "border-white/10 bg-white/5 hover:bg-white/10 text-slate-200"
                      )}
                    >
                      <Play className="h-3 w-3 mr-1 fill-current" />
                      {isCurrent ? "Re-Trigger" : "Trigger Scene"}
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Narrative Legend for Presentation */}
      <Card className="border-white/10 bg-[#0a101d] p-5">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
          Judge Presentation Narrative Core
        </h3>
        <p className="text-xs text-slate-300 leading-relaxed mb-3">
          &quot;Cyber risk is not just a technical score. We continuously connect Threats, Vulnerabilities, Assets, Attack Paths, Business Impact, Financial Exposure, and Security Investments — and use AI to recommend where the organization should spend money to reduce the most risk.&quot;
        </p>
        <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono text-cyan-300">
          <span className="p-1 px-2 rounded bg-white/5 border border-white/10">TELEMETRY</span>
          <span>→</span>
          <span className="p-1 px-2 rounded bg-white/5 border border-white/10">RISK JUMP</span>
          <span>→</span>
          <span className="p-1 px-2 rounded bg-white/5 border border-white/10">ATTACK PATH</span>
          <span>→</span>
          <span className="p-1 px-2 rounded bg-white/5 border border-white/10">FINANCIAL EAL</span>
          <span>→</span>
          <span className="p-1 px-2 rounded bg-white/5 border border-white/10">₹50L OPTIMIZER</span>
          <span>→</span>
          <span className="p-1 px-2 rounded bg-white/5 border border-white/10">AI DECISION</span>
          <span>→</span>
          <span className="p-1 px-2 rounded bg-white/5 border border-white/10">BLOCKCHAIN NOTARIZATION</span>
        </div>
      </Card>
    </div>
  );
}
