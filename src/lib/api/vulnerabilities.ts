import { apiData, apiPaginated } from "@/lib/api/client";
import type { Paginated, Vulnerability, VulnerabilityWrite } from "@/lib/types/api";

export async function getVulnerabilities(params?: {
  page?: number;
  page_size?: number;
  severity?: string;
  remediation_status?: string;
  asset?: string;
}): Promise<Paginated<Vulnerability>> {
  return apiPaginated<Vulnerability>("/vulnerabilities", { query: params });
}

export async function getVulnerability(id: string): Promise<Vulnerability> {
  return apiData<Vulnerability>(`/vulnerabilities/${id}`);
}

export async function createVulnerability(payload: VulnerabilityWrite): Promise<Vulnerability> {
  return apiData<Vulnerability>("/vulnerabilities", { method: "POST", body: payload });
}

export async function updateVulnerability(
  id: string,
  payload: Partial<VulnerabilityWrite>,
): Promise<Vulnerability> {
  return apiData<Vulnerability>(`/vulnerabilities/${id}`, { method: "PUT", body: payload });
}
