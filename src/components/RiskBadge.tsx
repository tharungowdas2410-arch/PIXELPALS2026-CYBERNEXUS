import type { RiskLevel } from "@/lib/types";
import { cn } from "@/lib/utils";

const styles: Record<RiskLevel, string> = {
  critical: "border-red-500/40 bg-red-500/10 text-red-300",
  high: "border-amber-400/40 bg-amber-400/10 text-amber-200",
  medium: "border-blue-400/40 bg-blue-400/10 text-blue-200",
  low: "border-slate-400/30 bg-slate-400/10 text-slate-300",
  protected: "border-emerald-400/40 bg-emerald-400/10 text-emerald-300",
};

export function RiskBadge({ level }: { level: RiskLevel }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider",
        styles[level],
      )}
    >
      {level}
    </span>
  );
}
