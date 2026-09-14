import { apiData } from "@/lib/api/client";
import type { ScenarioResult } from "@/lib/types/api";

export async function getScenarios(): Promise<ScenarioResult[]> {
  return apiData<ScenarioResult[]>("/scenarios");
}

export async function simulateScenario(payload: {
  changes: string[];
  baseline_risk?: number;
  baseline_eal?: number;
  control_effectiveness?: number;
  investment_cost?: number;
  name?: string;
}): Promise<ScenarioResult> {
  return apiData<ScenarioResult>("/scenarios/simulate", { method: "POST", body: payload });
}
