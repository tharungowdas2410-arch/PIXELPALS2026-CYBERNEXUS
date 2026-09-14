import { apiData, apiPaginated, apiRequest } from "@/lib/api/client";
import type { Asset, AssetWrite, Paginated } from "@/lib/types/api";

export async function getAssets(params?: {
  page?: number;
  page_size?: number;
  search?: string;
  criticality?: number;
  environment?: string;
  asset_type?: string;
}): Promise<Paginated<Asset>> {
  return apiPaginated<Asset>("/assets", { query: params });
}

export async function getAsset(id: string): Promise<Asset> {
  return apiData<Asset>(`/assets/${id}`);
}

export async function createAsset(payload: AssetWrite): Promise<Asset> {
  return apiData<Asset>("/assets", { method: "POST", body: payload });
}

export async function updateAsset(id: string, payload: Partial<AssetWrite>): Promise<Asset> {
  return apiData<Asset>(`/assets/${id}`, { method: "PUT", body: payload });
}

export async function deleteAsset(id: string): Promise<void> {
  await apiRequest<void>(`/assets/${id}`, { method: "DELETE" });
}
