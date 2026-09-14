"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { calculateFinancial, getFinancialSummary, getLossDistribution, runMonteCarlo } from "@/lib/api/financial";
import { queryKeys } from "@/lib/query-keys";

export function useFinancialSummary() {
  return useQuery({
    queryKey: queryKeys.financialSummary,
    queryFn: getFinancialSummary,
  });
}

export function useLossDistribution() {
  return useQuery({
    queryKey: queryKeys.lossDistribution,
    queryFn: getLossDistribution,
  });
}

export function useMonteCarlo() {
  return useMutation({ mutationFn: runMonteCarlo });
}

export function useCalculateFinancial() {
  return useMutation({ mutationFn: calculateFinancial });
}
