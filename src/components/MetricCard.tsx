import { ArrowDownRight, ArrowRight, ArrowUpRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { MetricKpi } from "@/lib/types";
import { cn } from "@/lib/utils";

export function MetricCard({ kpi }: { kpi: MetricKpi }) {
  const Icon =
    kpi.trend.direction === "up"
      ? ArrowUpRight
      : kpi.trend.direction === "down"
        ? ArrowDownRight
        : ArrowRight;

  return (
    <Card className="min-w-0">
      <CardHeader className="pb-2">
        <CardTitle>{kpi.title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-end gap-2">
          <p className="font-mono text-3xl font-bold tracking-tight text-slate-900">{kpi.value}</p>
          {kpi.unit ? <span className="pb-1 text-sm text-slate-500">{kpi.unit}</span> : null}
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded px-1.5 py-0.5 border font-medium",
              kpi.trend.sentiment === "positive" && "bg-emerald-50 text-emerald-700 border-emerald-200",
              kpi.trend.sentiment === "negative" && "bg-red-50 text-red-700 border-red-200",
              kpi.trend.sentiment === "neutral" && "bg-slate-100 text-slate-700 border-slate-200",
            )}
          >
            <Icon className="h-3 w-3" />
            {kpi.trend.label}
          </span>
          <span className="text-slate-500">{kpi.comparison}</span>
        </div>
        <p className="text-xs leading-5 text-slate-500">{kpi.explanation}</p>
      </CardContent>
    </Card>
  );
}
