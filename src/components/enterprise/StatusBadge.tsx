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
    bg: "bg-emerald-50",
    text: "text-emerald-700",
    border: "border-emerald-200",
    dot: "bg-emerald-600 animate-pulse",
  },
  OPTIMAL: {
    bg: "bg-emerald-50",
    text: "text-emerald-700",
    border: "border-emerald-200",
    dot: "bg-emerald-600",
  },
  RECORDED: {
    bg: "bg-blue-50",
    text: "text-blue-700",
    border: "border-blue-200",
    dot: "bg-blue-600",
  },
  CONTROLLED: {
    bg: "bg-sky-50",
    text: "text-sky-700",
    border: "border-sky-200",
    dot: "bg-sky-600",
  },
  MONITORED: {
    bg: "bg-slate-100",
    text: "text-slate-700",
    border: "border-slate-200",
    dot: "bg-slate-500",
  },
  ELEVATED: {
    bg: "bg-amber-50",
    text: "text-amber-700",
    border: "border-amber-200",
    dot: "bg-amber-600 animate-pulse",
  },
  CRITICAL: {
    bg: "bg-red-50",
    text: "text-red-700",
    border: "border-red-200",
    dot: "bg-red-600 animate-pulse",
  },
  DISRUPTED: {
    bg: "bg-red-50",
    text: "text-red-700",
    border: "border-red-200",
    dot: "bg-red-600 animate-pulse",
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
    bg: "bg-slate-100",
    text: "text-slate-700",
    border: "border-slate-200",
    dot: "bg-slate-500",
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
