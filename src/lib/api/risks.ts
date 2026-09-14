import { apiData, apiPaginated } from "@/lib/api/client";
import type {
  Paginated,
  Risk,
  RiskCalculateRequest,
  RiskCalculateResponse,
  RiskDetail,
  RiskSummary,
} from "@/lib/types/api";

export async function getRisks(params?: {
  page?: number;
  page_size?: number;
  status?: string;
}): Promise<Paginated<Risk>> {
  return apiPaginated<Risk>("/risks", { query: params });
}

export async function getRisk(id: string): Promise<RiskDetail> {
  return apiData<RiskDetail>(`/risks/${id}`);
}

export async function calculateRisk(payload: RiskCalculateRequest): Promise<RiskCalculateResponse> {
  return apiData<RiskCalculateResponse>("/risks/calculate", { method: "POST", body: payload });
}

export async function getRiskSummary(): Promise<RiskSummary> {
  return apiData<RiskSummary>("/risks/summary");
}
