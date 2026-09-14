import React from "react";
import { cn } from "@/lib/utils";

export type SeverityType = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "INFO";

interface SeverityBadgeProps {
  severity: SeverityType | string;
  cvss?: number;
  showExecutiveLabel?: boolean;
  className?: string;
}

const severityConfig: Record<
  string,
  { bg: string; text: string; border: string; executive: string }
> = {
  CRITICAL: {
    bg: "bg-rose-950/40",
    text: "text-rose-300",
    border: "border-rose-500/30",
    executive: "Critical business exposure",
  },
  HIGH: {
    bg: "bg-amber-950/40",
    text: "text-amber-300",
    border: "border-amber-500/30",
    executive: "High impact potential",
  },
  MEDIUM: {
    bg: "bg-blue-950/40",
    text: "text-blue-300",
    border: "border-blue-500/30",
    executive: "Moderate exposure",
  },
  LOW: {
    bg: "bg-slate-900/60",
    text: "text-slate-300",
    border: "border-slate-700/40",
    executive: "Controlled risk",
  },
  INFO: {
    bg: "bg-cyan-950/30",
    text: "text-cyan-300",
    border: "border-cyan-600/30",
    executive: "Informational signal",
  },
};

export function SeverityBadge({
  severity,
  cvss,
  showExecutiveLabel = false,
  className,
}: SeverityBadgeProps) {
  const normKey = (severity || "LOW").toUpperCase();
  const cfg = severityConfig[normKey] || severityConfig.LOW;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md border text-[11px] font-medium tracking-wide",
        cfg.bg,
        cfg.text,
        cfg.border,
        className
      )}
      title={showExecutiveLabel ? `${normKey}: ${cfg.executive}` : undefined}
    >
      <span className="font-semibold">{normKey}</span>
      {typeof cvss === "number" && (
        <span className="font-mono text-[10px] opacity-85">({cvss.toFixed(1)})</span>
      )}
      {showExecutiveLabel && (
        <span className="hidden xl:inline border-l border-white/10 pl-1.5 text-[10px] opacity-80">
          {cfg.executive}
        </span>
      )}
    </span>
  );
}
