"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { calculateRisk, getRisk, getRisks, getRiskSummary } from "@/lib/api/risks";
import { queryKeys } from "@/lib/query-keys";
import type { RiskCalculateRequest } from "@/lib/types/api";

export function useRisks(params?: { page?: number; page_size?: number; status?: string }) {
  return useQuery({
    queryKey: queryKeys.risks(params),
    queryFn: () => getRisks({ page_size: 100, ...params }),
  });
}

export function useRisk(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.risk(id ?? ""),
    queryFn: () => getRisk(id!),
    enabled: Boolean(id),
  });
}

export function useRiskSummary() {
  return useQuery({
    queryKey: queryKeys.riskSummary,
    queryFn: getRiskSummary,
  });
}

export function useCalculateRisk() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (payload: RiskCalculateRequest) => calculateRisk(payload),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ["risks"] });
      client.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}
