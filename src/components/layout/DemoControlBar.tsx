"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Play,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getDemoState, triggerDemoScene, resetDemo } from "@/lib/api/demo";
import { cn } from "@/lib/utils";

export function DemoControlBar() {
  const [collapsed, setCollapsed] = useState(false);
  const queryClient = useQueryClient();

  const { data: demoState, isLoading } = useQuery({
    queryKey: ["demoState"],
    queryFn: getDemoState,
    refetchInterval: 5000,
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

  const nextMutation = useMutation({
    mutationFn: (nextScene: number) => triggerDemoScene(nextScene),
    onSuccess: () => {
      invalidateAllQueries();
    },
  });

  const resetMutation = useMutation({
    mutationFn: resetDemo,
    onSuccess: () => {
      invalidateAllQueries();
    },
  });

  if (isLoading || !demoState?.demo_mode) return null;

  const currentScene = demoState.active_scene || 1;
  const currentTitle = demoState.scene_title || "Normal State";

  const handlePrev = () => {
    if (currentScene > 1) {
      nextMutation.mutate(currentScene - 1);
    }
  };

  const handleNext = () => {
    if (currentScene < 11) {
      nextMutation.mutate(currentScene + 1);
    }
  };

  const STEP_ROUTES: Record<number, { label: string; href: string }> = {
    1: { label: "Overview", href: "/" },
    2: { label: "SOC Timeline", href: "/security-operations" },
    3: { label: "Vulnerabilities", href: "/vulnerabilities" },
    4: { label: "Threat Intel", href: "/threat-intelligence" },
    5: { label: "Attack Paths", href: "/attack-paths" },
    6: { label: "Financial Risk", href: "/financial-risk" },
    7: { label: "Optimizer Setup", href: "/investment-optimizer" },
    8: { label: "Optimized Portfolio", href: "/investment-optimizer" },
    9: { label: "AI Advisor", href: "/ai-risk-advisor" },
    10: { label: "Evidence Ledger", href: "/blockchain-evidence" },
    11: { label: "Executive Report", href: "/reports" },
  };

  const currentRoute = STEP_ROUTES[currentScene] || { label: "Overview", href: "/" };

  return (
    <div className="sticky top-0 z-40 w-full border-b border-blue-200 bg-blue-50/90 backdrop-blur px-3 py-1.5 transition-all">
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
        {/* Left: Demo Mode Indicator & Active Scenario */}
        <div className="flex items-center gap-2.5">
          <span className="inline-flex items-center gap-1.5 rounded bg-blue-100 border border-blue-300 px-2 py-0.5 text-[10px] font-bold tracking-wider text-blue-800">
            <span className="h-1.5 w-1.5 rounded-full bg-blue-600 animate-pulse" />
            JUDGE STORYLINE
          </span>
          <span className="text-slate-500 hidden sm:inline">Scenario:</span>
          <span className="font-semibold text-slate-800 hidden sm:inline">
            Cyber Attack & Capital Allocation
          </span>
          <span className="text-slate-300 hidden sm:inline">|</span>
          <span className="font-mono text-blue-700 font-bold bg-white px-2 py-0.5 rounded border border-blue-200">
            STEP {currentScene} / 11
          </span>
          <span className="text-slate-900 font-semibold truncate max-w-[180px] md:max-w-none">
            {currentTitle}
          </span>
          <Link
            href={currentRoute.href}
            className="hidden md:inline-flex items-center gap-1 text-[11px] text-blue-600 hover:text-blue-800 underline underline-offset-2 ml-1"
          >
            <span>Jump to {currentRoute.label}</span>
            <ExternalLink className="h-2.5 w-2.5" />
          </Link>
        </div>

        {/* Right: Controls & Controller Link */}
        <div className="flex items-center gap-1.5">
          <Button
            variant="outline"
            size="sm"
            onClick={handlePrev}
            disabled={currentScene <= 1 || nextMutation.isPending}
            className="h-7 px-2 text-xs border-[#CBD5E1] bg-white text-slate-700 hover:bg-slate-100"
            title="Go to previous scene"
          >
            <ArrowLeft className="h-3 w-3 mr-1" />
            Prev
          </Button>

          <Button
            variant="default"
            size="sm"
            onClick={handleNext}
            disabled={currentScene >= 11 || nextMutation.isPending}
            className="h-7 px-2.5 text-xs bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-xs"
            title="Trigger next storytelling scene"
          >
            Next
            <ArrowRight className="h-3 w-3 ml-1" />
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => resetMutation.mutate()}
            disabled={resetMutation.isPending}
            className="h-7 px-2 text-xs text-red-600 hover:bg-red-50 hover:text-red-700"
            title="Purge synthetic telemetry and reset to Scene 1"
          >
            <RotateCcw className="h-3 w-3 mr-1" />
            Reset
          </Button>

          <Link href="/demo">
            <Button
              variant="default"
              size="sm"
              className="h-7 px-2.5 text-xs bg-blue-700 hover:bg-blue-800 text-white font-medium"
              title="Open full SIH Judge Scenario Deck"
            >
              <Play className="h-3 w-3 mr-1 fill-current" />
              Demo Hub
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
