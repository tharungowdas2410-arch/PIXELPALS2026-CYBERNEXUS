"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createIncident, getIncident, getIncidents, updateIncident } from "@/lib/api/incidents";
import { queryKeys } from "@/lib/query-keys";
import type { IncidentWrite } from "@/lib/types/api";

export function useIncidents(
  params?: { page?: number; page_size?: number; severity?: string; status?: string },
  enabled = true,
) {
  return useQuery({
    queryKey: queryKeys.incidents(params),
    queryFn: () => getIncidents({ page_size: 100, ...params }),
    enabled,
  });
}

export function useIncident(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.incident(id ?? ""),
    queryFn: () => getIncident(id!),
    enabled: Boolean(id),
  });
}

export function useIncidentMutations() {
  const client = useQueryClient();
  const invalidate = () => client.invalidateQueries({ queryKey: ["incidents"] });
  return {
    create: useMutation({ mutationFn: (payload: IncidentWrite) => createIncident(payload), onSuccess: invalidate }),
    update: useMutation({
      mutationFn: ({ id, payload }: { id: string; payload: Partial<IncidentWrite> }) => updateIncident(id, payload),
      onSuccess: invalidate,
    }),
  };
}
