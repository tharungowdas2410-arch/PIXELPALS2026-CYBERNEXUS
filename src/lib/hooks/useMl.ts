"use client";

import { useQuery } from "@tanstack/react-query";
import {
  forecastRisk,
  getMlAnomalies,
  getMlPerformance,
  getMlRiskSignals,
  getMlStatus,
  predictIncident,
} from "@/lib/api/ml";
import { queryKeys } from "@/lib/query-keys";

export function useMlStatus(enabled = true) {
  return useQuery({ queryKey: queryKeys.mlStatus, queryFn: getMlStatus, enabled });
}

export function useMlSignals(enabled = true) {
  return useQuery({ queryKey: queryKeys.mlSignals, queryFn: getMlRiskSignals, enabled });
}

export function useMlPerformance(enabled = true) {
  return useQuery({ queryKey: queryKeys.mlPerformance, queryFn: getMlPerformance, enabled });
}

export function useMlAnomalies(enabled = true) {
  return useQuery({ queryKey: queryKeys.mlAnomalies, queryFn: getMlAnomalies, enabled });
}

export function useMlForecast(enabled = true) {
  return useQuery({ queryKey: queryKeys.mlForecast, queryFn: () => forecastRisk({}), enabled });
}

export function useMlIncidentPrediction(assetId: string | null | undefined) {
  return useQuery({
    queryKey: queryKeys.mlIncident(assetId ?? ""),
    queryFn: () => predictIncident({ asset_id: assetId! }),
    enabled: Boolean(assetId),
  });
}
