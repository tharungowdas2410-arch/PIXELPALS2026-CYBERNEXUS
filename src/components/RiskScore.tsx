import { cn } from "@/lib/utils";

function tone(score: number) {
  if (score >= 85) return "text-red-300";
  if (score >= 70) return "text-amber-200";
  if (score >= 55) return "text-blue-200";
  return "text-emerald-300";
}

export function RiskScore({
  value,
  max = 100,
  size = "md",
}: {
  value: number;
  max?: number;
  size?: "sm" | "md" | "lg";
}) {
  const pct = Math.min(100, (value / max) * 100);
  return (
    <div className="flex items-center gap-3">
      <div
        className={cn(
          "relative rounded-full border border-white/10",
          size === "lg" ? "h-14 w-14" : size === "sm" ? "h-8 w-8" : "h-11 w-11",
        )}
        aria-label={`Risk score ${value} of ${max}`}
      >
        <svg viewBox="0 0 36 36" className="h-full w-full -rotate-90">
          <path
            d="M18 2.5 a 15.5 15.5 0 0 1 0 31 a 15.5 15.5 0 0 1 0 -31"
            fill="none"
            stroke="rgba(255,255,255,0.08)"
            strokeWidth="3"
          />
          <path
            d="M18 2.5 a 15.5 15.5 0 0 1 0 31 a 15.5 15.5 0 0 1 0 -31"
            fill="none"
            stroke="currentColor"
            className={tone(value)}
            strokeWidth="3"
            strokeDasharray={`${pct}, 100`}
          />
        </svg>
        <span className={cn("absolute inset-0 grid place-items-center font-mono text-xs", tone(value))}>
          {Math.round(value)}
        </span>
      </div>
      {size !== "sm" ? (
        <span className="font-mono text-sm text-slate-400">/ {max}</span>
      ) : null}
    </div>
  );
}
