"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  comparePortfolios,
  getInvestmentCatalog,
  getInvestmentDetail,
  getInvestmentRecommendations,
  getInvestments,
  getRiskReductionCurve,
  optimizeAdvanced,
  optimizeInvestments,
} from "@/lib/api/investments";
import { queryKeys } from "@/lib/query-keys";

export function useInvestments() {
  return useQuery({
    queryKey: queryKeys.investments,
    queryFn: getInvestments,
  });
}

export function useInvestmentRecommendations() {
  return useQuery({
    queryKey: queryKeys.investmentRecommendations,
    queryFn: getInvestmentRecommendations,
  });
}

export function useOptimizeInvestments() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: optimizeInvestments,
    onSuccess: () => client.invalidateQueries({ queryKey: ["investments"] }),
  });
}

export function useInvestmentCatalog() {
  return useQuery({
    queryKey: ["investment-catalog"],
    queryFn: getInvestmentCatalog,
  });
}

export function useRiskReductionCurve(params?: {
  objective?: string;
  time_horizon_months?: number;
  max_projects?: number;
}) {
  return useQuery({
    queryKey: ["risk-reduction-curve", params?.objective, params?.time_horizon_months, params?.max_projects],
    queryFn: () => getRiskReductionCurve(params),
  });
}

export function useInvestmentDetail(id: string | null) {
  return useQuery({
    queryKey: ["investment-detail", id],
    queryFn: () => (id ? getInvestmentDetail(id) : Promise.reject(new Error("no id"))),
    enabled: !!id,
  });
}

export function useOptimizeAdvanced() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: optimizeAdvanced,
    onSuccess: () => client.invalidateQueries({ queryKey: ["investments"] }),
  });
}

export function useComparePortfolios() {
  return useMutation({ mutationFn: comparePortfolios });
}
