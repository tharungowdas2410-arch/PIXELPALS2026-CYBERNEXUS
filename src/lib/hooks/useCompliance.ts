"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { addComplianceEvidence, getComplianceFramework, getComplianceSummary } from "@/lib/api/compliance";
import { queryKeys } from "@/lib/query-keys";

export function useCompliance() {
  return useQuery({
    queryKey: queryKeys.complianceSummary,
    queryFn: getComplianceSummary,
  });
}

export function useComplianceFramework(framework: string | undefined) {
  return useQuery({
    queryKey: queryKeys.complianceFramework(framework ?? ""),
    queryFn: () => getComplianceFramework(framework!),
    enabled: Boolean(framework),
  });
}

export function useAddComplianceEvidence() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: addComplianceEvidence,
    onSuccess: () => client.invalidateQueries({ queryKey: ["compliance"] }),
  });
}
