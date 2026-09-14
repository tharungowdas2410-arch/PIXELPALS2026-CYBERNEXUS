import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  generateMockTelemetry,
  getAlerts,
  getCSPMRiskSignals,
  getContinuousRiskDrift,
  getContinuousRiskSummary,
  getIAMRiskSignals,
  getIntegrationsHealth,
  getSecurityEvents,
  notarizeRiskChange,
  updateAlertStatus,
} from "@/lib/api/integrations";

export const INTEGRATIONS_KEYS = {
  all: ["integrations"] as const,
  health: () => [...INTEGRATIONS_KEYS.all, "health"] as const,
  summary: () => [...INTEGRATIONS_KEYS.all, "summary"] as const,
  drift: () => [...INTEGRATIONS_KEYS.all, "drift"] as const,
  events: (params?: any) => [...INTEGRATIONS_KEYS.all, "events", params] as const,
  iam: () => [...INTEGRATIONS_KEYS.all, "iam"] as const,
  cspm: () => [...INTEGRATIONS_KEYS.all, "cspm"] as const,
  alerts: (status?: string) => [...INTEGRATIONS_KEYS.all, "alerts", status] as const,
};

export function useIntegrationsHealth() {
  return useQuery({
    queryKey: INTEGRATIONS_KEYS.health(),
    queryFn: getIntegrationsHealth,
    refetchInterval: 10000,
  });
}

export function useContinuousRiskSummary() {
  return useQuery({
    queryKey: INTEGRATIONS_KEYS.summary(),
    queryFn: getContinuousRiskSummary,
    refetchInterval: 6000,
  });
}

export function useContinuousRiskDrift() {
  return useQuery({
    queryKey: INTEGRATIONS_KEYS.drift(),
    queryFn: getContinuousRiskDrift,
    refetchInterval: 10000,
  });
}

export function useSecurityEvents(params?: {
  page?: number;
  page_size?: number;
  source?: string;
  event_type?: string;
  severity?: string;
  asset_id?: string;
}) {
  return useQuery({
    queryKey: INTEGRATIONS_KEYS.events(params),
    queryFn: () => getSecurityEvents(params),
    refetchInterval: 5000,
  });
}

export function useIAMRiskSignals() {
  return useQuery({
    queryKey: INTEGRATIONS_KEYS.iam(),
    queryFn: getIAMRiskSignals,
  });
}

export function useCSPMRiskSignals() {
  return useQuery({
    queryKey: INTEGRATIONS_KEYS.cspm(),
    queryFn: getCSPMRiskSignals,
  });
}

export function useRiskAlerts(status?: string) {
  return useQuery({
    queryKey: INTEGRATIONS_KEYS.alerts(status),
    queryFn: () => getAlerts(status),
    refetchInterval: 5000,
  });
}

export function useUpdateAlertStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ alertId, status }: { alertId: string; status: "OPEN" | "ACKNOWLEDGED" | "RESOLVED" }) =>
      updateAlertStatus(alertId, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: INTEGRATIONS_KEYS.alerts() });
      queryClient.invalidateQueries({ queryKey: INTEGRATIONS_KEYS.summary() });
    },
  });
}

export function useGenerateMockTelemetry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: generateMockTelemetry,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: INTEGRATIONS_KEYS.all });
    },
  });
}

export function useNotarizeRiskChange() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (changeId: string) => notarizeRiskChange(changeId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: INTEGRATIONS_KEYS.drift() });
    },
  });
}
