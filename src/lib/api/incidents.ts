import { apiData, apiPaginated } from "@/lib/api/client";
import type { Incident, IncidentWrite, Paginated } from "@/lib/types/api";

export async function getIncidents(params?: {
  page?: number;
  page_size?: number;
  severity?: string;
  status?: string;
}): Promise<Paginated<Incident>> {
  return apiPaginated<Incident>("/incidents", { query: params });
}

export async function getIncident(id: string): Promise<Incident> {
  return apiData<Incident>(`/incidents/${id}`);
}

export async function createIncident(payload: IncidentWrite): Promise<Incident> {
  return apiData<Incident>("/incidents", { method: "POST", body: payload });
}

export async function updateIncident(id: string, payload: Partial<IncidentWrite>): Promise<Incident> {
  return apiData<Incident>(`/incidents/${id}`, { method: "PUT", body: payload });
}
