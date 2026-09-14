import { apiData } from "@/lib/api/client";
import type { FinancialSummary, MonteCarloResult } from "@/lib/types/api";

export async function getFinancialSummary(): Promise<FinancialSummary> {
  return apiData<FinancialSummary>("/financial/summary");
}

export async function getLossDistribution(): Promise<MonteCarloResult> {
  return apiData<MonteCarloResult>("/financial/loss-distribution");
}

export async function calculateFinancial(payload: {
  likelihood: number;
  asset_business_value: number;
  impact: number;
}): Promise<Record<string, number | string>> {
  return apiData("/financial/calculate", { method: "POST", body: payload });
}

export async function runMonteCarlo(payload: {
  expected_loss: number;
  min_loss: number;
  max_loss: number;
  probability: number;
  simulations?: number;
  seed?: number;
}): Promise<MonteCarloResult> {
  return apiData<MonteCarloResult>("/financial/monte-carlo", { method: "POST", body: payload });
}
