import { apiData, apiPaginated } from "@/lib/api/client";
import type { Paginated, Threat, ThreatWrite } from "@/lib/types/api";

export async function getThreats(params?: {
  page?: number;
  page_size?: number;
  category?: string;
  active?: boolean;
}): Promise<Paginated<Threat>> {
  return apiPaginated<Threat>("/threats", { query: params });
}

export async function getThreat(id: string): Promise<Threat> {
  return apiData<Threat>(`/threats/${id}`);
}

export async function createThreat(payload: ThreatWrite): Promise<Threat> {
  return apiData<Threat>("/threats", { method: "POST", body: payload });
}

export async function updateThreat(id: string, payload: Partial<ThreatWrite>): Promise<Threat> {
  return apiData<Threat>(`/threats/${id}`, { method: "PUT", body: payload });
}
