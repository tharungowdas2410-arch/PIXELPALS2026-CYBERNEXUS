import { apiData, apiPaginated, apiRequest } from "@/lib/api/client";
import type { Control, ControlWrite, Paginated } from "@/lib/types/api";

export async function getControls(params?: {
  page?: number;
  page_size?: number;
  framework?: string;
  implementation_status?: string;
}): Promise<Paginated<Control>> {
  return apiPaginated<Control>("/controls", { query: params });
}

export async function getControl(id: string): Promise<Control> {
  return apiData<Control>(`/controls/${id}`);
}

export async function createControl(payload: ControlWrite): Promise<Control> {
  return apiData<Control>("/controls", { method: "POST", body: payload });
}

export async function updateControl(id: string, payload: Partial<ControlWrite>): Promise<Control> {
  return apiData<Control>(`/controls/${id}`, { method: "PUT", body: payload });
}

export async function deleteControl(id: string): Promise<void> {
  await apiRequest<void>(`/controls/${id}`, { method: "DELETE" });
}
