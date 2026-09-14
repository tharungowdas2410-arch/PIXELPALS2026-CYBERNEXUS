"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createThreat, getThreats, updateThreat } from "@/lib/api/threats";
import { createControl, deleteControl, getControls, updateControl } from "@/lib/api/controls";
import { queryKeys } from "@/lib/query-keys";
import type { ControlWrite, ThreatWrite } from "@/lib/types/api";

export function useThreats(params?: { page?: number; page_size?: number; category?: string; active?: boolean }) {
  return useQuery({
    queryKey: queryKeys.threats(params),
    queryFn: () => getThreats({ page_size: 100, ...params }),
  });
}

export function useThreatMutations() {
  const client = useQueryClient();
  const invalidate = () => client.invalidateQueries({ queryKey: ["threats"] });
  return {
    create: useMutation({ mutationFn: (payload: ThreatWrite) => createThreat(payload), onSuccess: invalidate }),
    update: useMutation({
      mutationFn: ({ id, payload }: { id: string; payload: Partial<ThreatWrite> }) => updateThreat(id, payload),
      onSuccess: invalidate,
    }),
  };
}

export function useControls(params?: {
  page?: number;
  page_size?: number;
  framework?: string;
  implementation_status?: string;
}) {
  return useQuery({
    queryKey: queryKeys.controls(params),
    queryFn: () => getControls({ page_size: 100, ...params }),
  });
}

export function useControlMutations() {
  const client = useQueryClient();
  const invalidate = () => client.invalidateQueries({ queryKey: ["controls"] });
  return {
    create: useMutation({ mutationFn: (payload: ControlWrite) => createControl(payload), onSuccess: invalidate }),
    update: useMutation({
      mutationFn: ({ id, payload }: { id: string; payload: Partial<ControlWrite> }) => updateControl(id, payload),
      onSuccess: invalidate,
    }),
    remove: useMutation({ mutationFn: (id: string) => deleteControl(id), onSuccess: invalidate }),
  };
}
