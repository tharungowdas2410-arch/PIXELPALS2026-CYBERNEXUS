import type { RiskLevel as UiRiskLevel } from "@/lib/types";
import type { RiskLevel as ApiRiskLevel, Severity } from "@/lib/types/api";

export function toUiRiskLevel(value: string | number | null | undefined): UiRiskLevel {
  if (typeof value === "number") {
    if (value >= 5 || value > 75) return "critical";
    if (value >= 4 || value > 50) return "high";
    if (value >= 3 || value > 25) return "medium";
    return "low";
  }
  const key = String(value ?? "").toLowerCase();
  if (key === "critical") return "critical";
  if (key === "high") return "high";
  if (key === "moderate" || key === "medium") return "medium";
  if (key === "protected" || key === "compliant") return "protected";
  if (key === "low") return "low";
  return "medium";
}

export function scoreToApiLevel(score: number): ApiRiskLevel {
  if (score <= 25) return "LOW";
  if (score <= 50) return "MODERATE";
  if (score <= 75) return "HIGH";
  return "CRITICAL";
}

export function severityToUi(severity: Severity | string): UiRiskLevel {
  return toUiRiskLevel(severity);
}

export function num(value: number | string | null | undefined): number {
  const n = typeof value === "number" ? value : Number(value ?? 0);
  return Number.isFinite(n) ? n : 0;
}
