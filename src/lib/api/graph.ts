import { apiData } from "@/lib/api/client";
import type {
  AssetGraphResponse,
  BlastRadiusResponse,
  CriticalPathsResponse,
  GraphHealthResponse,
  GraphSyncResponse,
} from "@/lib/types/api";

export async function getGraphHealth(): Promise<GraphHealthResponse> {
  return apiData<GraphHealthResponse>("/graph/health");
}

export async function syncOrganizationGraph(): Promise<GraphSyncResponse> {
  return apiData<GraphSyncResponse>("/graph/sync", { method: "POST" });
}

export async function syncAssetGraph(assetId: string): Promise<GraphSyncResponse> {
  return apiData<GraphSyncResponse>(`/graph/sync/asset/${assetId}`, { method: "POST" });
}

export async function getAssetGraph(assetId: string): Promise<AssetGraphResponse> {
  return apiData<AssetGraphResponse>(`/graph/assets/${assetId}`);
}

export async function getBlastRadius(assetId: string): Promise<BlastRadiusResponse> {
  return apiData<BlastRadiusResponse>(`/graph/asset/${assetId}/blast-radius`);
}

export async function getCriticalPaths(limit = 10): Promise<CriticalPathsResponse> {
  return apiData<CriticalPathsResponse>("/graph/critical-paths", { query: { limit } });
}
