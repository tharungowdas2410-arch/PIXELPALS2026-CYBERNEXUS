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
          <p className="font-mono text-3xl font-semibold tracking-tight text-white">{kpi.value}</p>
          {kpi.unit ? <span className="pb-1 text-sm text-slate-500">{kpi.unit}</span> : null}
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded px-1.5 py-0.5",
              kpi.trend.sentiment === "positive" && "bg-emerald-500/10 text-emerald-300",
              kpi.trend.sentiment === "negative" && "bg-red-500/10 text-red-300",
              kpi.trend.sentiment === "neutral" && "bg-slate-500/10 text-slate-300",
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
