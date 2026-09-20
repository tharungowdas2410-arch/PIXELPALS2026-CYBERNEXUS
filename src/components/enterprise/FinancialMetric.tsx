import React from "react";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { formatInr } from "@/lib/format";
import { TooltipExplainer, type MetricExplanationKey } from "./TooltipExplainer";
import { cn } from "@/lib/utils";

interface FinancialMetricProps {
  label: string;
  amountInr: number;
  deltaInr?: number;
  deltaLabel?: string;
  explainerKey?: MetricExplanationKey;
  sentiment?: "positive" | "negative" | "neutral";
  subtext?: string;
  className?: string;
}

export function FinancialMetric({
  label,
  amountInr,
  deltaInr,
  deltaLabel,
  explainerKey,
  sentiment = "neutral",
  subtext,
  className,
}: FinancialMetricProps) {
  const isPositive = sentiment === "positive";
  const isNegative = sentiment === "negative";

  return (
    <div
      className={cn(
        "rounded-lg border border-[#E2E8F0] bg-white p-4 transition-all hover:border-blue-300 shadow-xs",
        className
      )}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-slate-600">
          {explainerKey ? (
            <TooltipExplainer term={explainerKey}>{label}</TooltipExplainer>
          ) : (
            label
          )}
        </span>
        <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400">
          INR
        </span>
      </div>

      <p className="mt-2 font-mono text-2xl font-bold tracking-tight text-slate-900 md:text-3xl">
        {formatInr(amountInr)}
      </p>

      {(deltaInr !== undefined || deltaLabel) && (
        <div className="mt-2 flex items-center gap-1 text-xs">
          {isPositive ? (
            <ArrowDownRight className="h-3.5 w-3.5 text-emerald-600" />
          ) : isNegative ? (
            <ArrowUpRight className="h-3.5 w-3.5 text-red-600" />
          ) : null}
          <span
            className={cn(
              "font-mono font-medium",
              isPositive && "text-emerald-600",
              isNegative && "text-red-600",
              sentiment === "neutral" && "text-slate-600"
            )}
          >
            {deltaInr !== undefined ? formatInr(Math.abs(deltaInr)) : null}{" "}
            {deltaLabel}
          </span>
        </div>
      )}

      {subtext && <p className="mt-1 text-[11px] text-slate-500">{subtext}</p>}
    </div>
  );
}
