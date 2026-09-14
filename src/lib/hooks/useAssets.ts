"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createAsset, deleteAsset, getAsset, getAssets, updateAsset } from "@/lib/api/assets";
import { queryKeys } from "@/lib/query-keys";
import type { AssetWrite } from "@/lib/types/api";

export function useAssets(params?: {
  page?: number;
  page_size?: number;
  search?: string;
  criticality?: number;
  environment?: string;
  asset_type?: string;
}) {
  return useQuery({
    queryKey: queryKeys.assets(params),
    queryFn: () => getAssets({ page_size: 100, ...params }),
  });
}

export function useAsset(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.asset(id ?? ""),
    queryFn: () => getAsset(id!),
    enabled: Boolean(id),
  });
}

export function useAssetMutations() {
  const client = useQueryClient();
  const invalidate = () => client.invalidateQueries({ queryKey: ["assets"] });
  const create = useMutation({ mutationFn: (payload: AssetWrite) => createAsset(payload), onSuccess: invalidate });
  const update = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<AssetWrite> }) => updateAsset(id, payload),
    onSuccess: invalidate,
  });
  const remove = useMutation({ mutationFn: (id: string) => deleteAsset(id), onSuccess: invalidate });
  return { create, update, remove };
}
