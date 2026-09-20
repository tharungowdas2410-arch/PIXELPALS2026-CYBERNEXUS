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
    bg: "bg-red-50",
    text: "text-red-700",
    border: "border-red-200",
    executive: "Critical business exposure",
  },
  HIGH: {
    bg: "bg-orange-50",
    text: "text-orange-700",
    border: "border-orange-200",
    executive: "High impact potential",
  },
  MEDIUM: {
    bg: "bg-amber-50",
    text: "text-amber-700",
    border: "border-amber-200",
    executive: "Moderate exposure",
  },
  LOW: {
    bg: "bg-green-50",
    text: "text-green-700",
    border: "border-green-200",
    executive: "Controlled risk",
  },
  INFO: {
    bg: "bg-sky-50",
    text: "text-sky-700",
    border: "border-sky-200",
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
        <span className="hidden xl:inline border-l border-slate-300 pl-1.5 text-[10px] opacity-80">
          {cfg.executive}
        </span>
      )}
    </span>
  );
}
