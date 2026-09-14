import React from "react";
import { cn } from "@/lib/utils";

export type SystemStatusType =
  | "OPERATIONAL"
  | "CRITICAL"
  | "ELEVATED"
  | "CONTROLLED"
  | "MONITORED"
  | "OPTIMAL"
  | "DISRUPTED"
  | "RECORDED";

interface StatusBadgeProps {
  status: SystemStatusType | string;
  size?: "sm" | "md";
  showDot?: boolean;
  className?: string;
}

const statusConfig: Record<string, { bg: string; text: string; border: string; dot: string }> = {
  OPERATIONAL: {
    bg: "bg-emerald-950/40",
    text: "text-emerald-300",
    border: "border-emerald-500/30",
    dot: "bg-emerald-400 animate-pulse",
  },
  OPTIMAL: {
    bg: "bg-emerald-950/40",
    text: "text-emerald-300",
    border: "border-emerald-500/30",
    dot: "bg-emerald-400",
  },
  RECORDED: {
    bg: "bg-cyan-950/40",
    text: "text-cyan-300",
    border: "border-cyan-500/30",
    dot: "bg-cyan-400",
  },
  CONTROLLED: {
    bg: "bg-blue-950/40",
    text: "text-blue-300",
    border: "border-blue-500/30",
    dot: "bg-blue-400",
  },
  MONITORED: {
    bg: "bg-sky-950/40",
    text: "text-sky-300",
    border: "border-sky-500/30",
    dot: "bg-sky-400",
  },
  ELEVATED: {
    bg: "bg-amber-950/40",
    text: "text-amber-300",
    border: "border-amber-500/30",
    dot: "bg-amber-400 animate-pulse",
  },
  CRITICAL: {
    bg: "bg-rose-950/40",
    text: "text-rose-300",
    border: "border-rose-500/30",
    dot: "bg-rose-400 animate-pulse",
  },
  DISRUPTED: {
    bg: "bg-rose-950/40",
    text: "text-rose-300",
    border: "border-rose-500/30",
    dot: "bg-rose-400 animate-pulse",
  },
};

export function StatusBadge({
  status,
  size = "sm",
  showDot = true,
  className,
}: StatusBadgeProps) {
  const normKey = status.toUpperCase();
  const cfg = statusConfig[normKey] || {
    bg: "bg-slate-900/60",
    text: "text-slate-300",
    border: "border-slate-700/40",
    dot: "bg-slate-400",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 font-medium tracking-wide rounded-md border",
        size === "sm" ? "px-2 py-0.5 text-[11px]" : "px-2.5 py-1 text-xs",
        cfg.bg,
        cfg.text,
        cfg.border,
        className
      )}
    >
      {showDot && <span className={cn("h-1.5 w-1.5 rounded-full shrink-0", cfg.dot)} />}
      <span className="truncate">{status}</span>
    </span>
  );
}
