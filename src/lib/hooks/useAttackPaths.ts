"use client";

import { useQuery } from "@tanstack/react-query";
import {
  getAttackPaths,
  getAttackPathsResponse,
  getAttackPathDetail,
} from "@/lib/api/attack-paths";
import {
  getBlastRadius,
  getAssetGraph,
  getCriticalPaths,
  getGraphHealth,
  syncOrganizationGraph,
} from "@/lib/api/graph";
import { queryKeys } from "@/lib/query-keys";
import type { BlastRadiusResponse } from "@/lib/types/api";

export function useAttackPaths(limit = 25) {
  return useQuery({
    queryKey: [...queryKeys.attackPaths, limit],
    queryFn: () => getAttackPaths(limit),
  });
}

export function useAttackPathsResponse(limit = 25) {
  return useQuery({
    queryKey: [...queryKeys.attackPaths, "response", limit],
    queryFn: () => getAttackPathsResponse(limit),
  });
}

export function useAttackPathDetail(pathId: string | null | undefined) {
  return useQuery({
    queryKey: [...queryKeys.attackPaths, "detail", pathId],
    queryFn: () => (pathId ? getAttackPathDetail(pathId) : Promise.reject(new Error("No path id"))),
    enabled: !!pathId,
  });
}

export function useGraphHealth() {
  return useQuery({
    queryKey: ["graph", "health"],
    queryFn: getGraphHealth,
  });
}

export function useSyncGraph() {
  return useQuery({
    queryKey: ["graph", "sync"],
    queryFn: syncOrganizationGraph,
    enabled: false,
  });
}

export function useAssetGraph(assetId: string | null | undefined) {
  return useQuery({
    queryKey: ["graph", "asset", assetId],
    queryFn: () => (assetId ? getAssetGraph(assetId) : Promise.reject(new Error("No asset id"))),
    enabled: !!assetId,
  });
}

export function useBlastRadius(assetId: string | null | undefined) {
  return useQuery({
    queryKey: ["graph", "blast", assetId] as const,
    queryFn: (): Promise<BlastRadiusResponse> => {
      if (!assetId) return Promise.reject(new Error("No asset id"));
      return getBlastRadius(assetId);
    },
    enabled: !!assetId,
  });
}

export function useCriticalPaths(limit = 10) {
  return useQuery({
    queryKey: ["graph", "critical", limit],
    queryFn: () => getCriticalPaths(limit),
  });
}
