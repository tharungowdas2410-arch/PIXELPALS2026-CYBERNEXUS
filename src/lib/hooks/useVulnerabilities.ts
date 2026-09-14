"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createVulnerability, getVulnerabilities, updateVulnerability } from "@/lib/api/vulnerabilities";
import { queryKeys } from "@/lib/query-keys";
import type { VulnerabilityWrite } from "@/lib/types/api";

export function useVulnerabilities(params?: {
  page?: number;
  page_size?: number;
  severity?: string;
  remediation_status?: string;
  asset?: string;
}) {
  return useQuery({
    queryKey: queryKeys.vulnerabilities(params),
    queryFn: () => getVulnerabilities({ page_size: 100, ...params }),
  });
}

export function useVulnerabilityMutations() {
  const client = useQueryClient();
  const invalidate = () => client.invalidateQueries({ queryKey: ["vulnerabilities"] });
  return {
    create: useMutation({
      mutationFn: (payload: VulnerabilityWrite) => createVulnerability(payload),
      onSuccess: invalidate,
    }),
    update: useMutation({
      mutationFn: ({ id, payload }: { id: string; payload: Partial<VulnerabilityWrite> }) =>
        updateVulnerability(id, payload),
      onSuccess: invalidate,
    }),
  };
}
