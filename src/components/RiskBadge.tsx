import type { RiskLevel } from "@/lib/types";
import { cn } from "@/lib/utils";

const styles: Record<RiskLevel, string> = {
  critical: "border-red-200 bg-red-50 text-red-700",
  high: "border-orange-200 bg-orange-50 text-orange-700",
  medium: "border-amber-200 bg-amber-50 text-amber-700",
  low: "border-green-200 bg-green-50 text-green-700",
  protected: "border-emerald-200 bg-emerald-50 text-emerald-700",
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
