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

  return (
    <div className="sticky top-0 z-40 w-full border-b border-amber-500/30 bg-[#0c1220]/95 backdrop-blur px-3 py-1.5 transition-all">
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
        {/* Left: Demo Mode Indicator & Active Scenario */}
        <div className="flex items-center gap-2.5">
          <span className="inline-flex items-center gap-1.5 rounded bg-amber-500/15 border border-amber-500/40 px-2 py-0.5 text-[10px] font-bold tracking-wider text-amber-300">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
            DEMO MODE
          </span>
          <span className="text-slate-400 hidden sm:inline">Scenario:</span>
          <span className="font-semibold text-slate-200 hidden sm:inline">
            Cyber Attack Simulation
          </span>
          <span className="text-slate-600 hidden sm:inline">|</span>
          <span className="font-mono text-cyan-300 font-medium">
            Step {currentScene} / 11:
          </span>
          <span className="text-white font-medium truncate max-w-[200px] md:max-w-none">
            {currentTitle}
          </span>
        </div>

        {/* Right: Controls & Controller Link */}
        <div className="flex items-center gap-1.5">
          <Button
            variant="outline"
            size="sm"
            onClick={handlePrev}
            disabled={currentScene <= 1 || nextMutation.isPending}
            className="h-7 px-2 text-xs border-white/10 bg-white/5 text-slate-300 hover:bg-white/10"
            title="Go to previous scene"
          >
            <ArrowLeft className="h-3 w-3 mr-1" />
            Prev
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleNext}
            disabled={currentScene >= 11 || nextMutation.isPending}
            className="h-7 px-2.5 text-xs border-cyan-500/40 bg-cyan-500/10 text-cyan-200 hover:bg-cyan-500/20"
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
            className="h-7 px-2 text-xs text-rose-300 hover:bg-rose-950/30 hover:text-rose-200"
            title="Purge synthetic telemetry and reset to Scene 1"
          >
            <RotateCcw className="h-3 w-3 mr-1" />
            Reset
          </Button>

          <Link href="/demo">
            <Button
              variant="default"
              size="sm"
              className="h-7 px-2.5 text-xs bg-cyan-600 hover:bg-cyan-500 text-white font-medium"
              title="Open full SIH Judge Scenario Deck"
            >
              <Play className="h-3 w-3 mr-1 fill-current" />
              Demo Deck
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
