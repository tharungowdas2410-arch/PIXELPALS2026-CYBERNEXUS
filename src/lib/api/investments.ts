import { apiData, apiPaginated } from "@/lib/api/client";
import type {
  AdvancedPortfolio,
  Investment,
  InvestmentCatalogItem,
  Paginated,
  PortfolioComparisonRow,
  PortfolioSummary,
  RiskCurvePoint,
} from "@/lib/types/api";

export async function getInvestments(): Promise<Paginated<Investment>> {
  return apiPaginated<Investment>("/investments");
}

export async function getInvestmentRecommendations(): Promise<{ items: Investment[] }> {
  return apiData<{ items: Investment[] }>("/investments/recommendations");
}

export async function optimizeInvestments(payload: {
  budget: number;
  baseline_risk?: number;
  control_ids?: string[];
}): Promise<PortfolioSummary> {
  return apiData<PortfolioSummary>("/investments/optimize", { method: "POST", body: payload });
}

export async function getInvestmentCatalog(): Promise<{ items: InvestmentCatalogItem[]; count: number }> {
  return apiData<{ items: InvestmentCatalogItem[]; count: number }>("/investments/catalog");
}

export async function getRiskReductionCurve(params?: {
  objective?: string;
  time_horizon_months?: number;
  max_projects?: number;
}): Promise<{ points: RiskCurvePoint[]; illustrative: boolean }> {
  const query = new URLSearchParams();
  if (params?.objective) query.set("objective", params.objective);
  if (params?.time_horizon_months) query.set("time_horizon_months", String(params.time_horizon_months));
  if (params?.max_projects) query.set("max_projects", String(params.max_projects));
  const qs = query.toString();
  return apiData<{ points: RiskCurvePoint[]; illustrative: boolean }>(
    `/investments/risk-reduction-curve${qs ? "?" + qs : ""}`,
  );
}

export async function getInvestmentDetail(id: string): Promise<any> {
  return apiData<any>(`/investments/${id}`);
}

export async function optimizeAdvanced(payload: {
  budget: number;
  objective?: string;
  time_horizon_months?: number;
  max_projects?: number | null;
  baseline_risk?: number;
  baseline_eal?: number | null;
  custom_weights?: Record<string, number> | null;
}): Promise<AdvancedPortfolio> {
  return apiData<AdvancedPortfolio>("/investments/optimize/advanced", { method: "POST", body: payload });
}

export async function comparePortfolios(payload: {
  scenarios: Array<{
    budget: number;
    objective?: string;
    time_horizon_months?: number;
    max_projects?: number | null;
  }>;
  baseline_risk?: number;
  baseline_eal?: number | null;
}): Promise<{ comparison: PortfolioComparisonRow[]; illustrative: boolean }> {
  return apiData<{ comparison: PortfolioComparisonRow[]; illustrative: boolean }>("/investments/compare", {
    method: "POST",
    body: payload,
  });
}
