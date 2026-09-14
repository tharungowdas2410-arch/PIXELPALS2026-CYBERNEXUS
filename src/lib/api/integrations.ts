import { apiData, apiPaginated } from "@/lib/api/client";
import type { Paginated } from "@/lib/types/api";

export interface IntegrationHealthCard {
  name: string;
  version: string;
  type: string;
  status: "CONNECTED" | "DEMO" | "DISCONNECTED" | "ERROR";
  is_demo: boolean;
  latency_ms: number;
  last_sync: string | null;
  details: string;
}

export interface IntegrationsHealthResponse {
  status: string;
  connectors: Record<string, IntegrationHealthCard>;
  is_demo: boolean;
  notice: string;
}

export interface ContinuousRiskSummary {
  current_risk: number;
  previous_risk: number;
  risk_delta: number;
  current_financial_exposure: number;
  previous_financial_exposure: number;
  financial_delta: number;
  risk_drift_level: "LOW" | "MODERATE" | "HIGH" | "CRITICAL";
  major_drivers: string[];
  active_alerts_count: number;
  critical_alerts_count: number;
  affected_assets_count: number;
  top_attack_paths_count: number;
  is_demo: boolean;
  notice: string;
}

export interface RiskDriftPoint {
  timestamp: string;
  risk_score: number;
  financial_exposure: number;
  event_label?: string;
  severity?: string;
}

export interface RiskDriftResponse {
  points: RiskDriftPoint[];
  summary_drift: number;
  drift_trend: string;
  time_window: string;
}

export interface SecurityEventItem {
  id: string;
  organization_id: string;
  source: string;
  source_event_id?: string;
  event_type: string;
  timestamp: string;
  severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "INFO";
  asset_id?: string;
  identity_id?: string;
  ip_address?: string;
  hostname?: string;
  description: string;
  raw_reference?: string;
  normalized_data: Record<string, any>;
  processed: boolean;
  is_demo: boolean;
  created_at: string;
}

export interface RiskAlertItem {
  id: string;
  organization_id: string;
  severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  title: string;
  description: string;
  asset_id?: string;
  risk_change?: number;
  financial_impact?: number;
  status: "OPEN" | "ACKNOWLEDGED" | "RESOLVED";
  source_event_id?: string;
  created_at: string;
}

export interface IAMRiskSignals {
  mfa_disabled_accounts: number;
  privileged_identities_count: number;
  failed_auth_spike_detected: boolean;
  dormant_privileged_accounts: number;
  excessive_privilege_anomalies: number;
  signals: Array<Record<string, any>>;
}

export interface CSPMRiskSignals {
  public_storage_buckets: number;
  open_sensitive_ports: number;
  insecure_security_groups: number;
  unencrypted_databases: number;
  missing_audit_logging: number;
  signals: Array<Record<string, any>>;
}

export async function getIntegrationsHealth(): Promise<IntegrationsHealthResponse> {
  return apiData<IntegrationsHealthResponse>("/integrations/health");
}

export async function getContinuousRiskSummary(): Promise<ContinuousRiskSummary> {
  return apiData<ContinuousRiskSummary>("/continuous-risk/summary");
}

export async function getContinuousRiskDrift(): Promise<RiskDriftResponse> {
  return apiData<RiskDriftResponse>("/continuous-risk/drift");
}

export async function getSecurityEvents(params?: {
  page?: number;
  page_size?: number;
  source?: string;
  event_type?: string;
  severity?: string;
  asset_id?: string;
}): Promise<Paginated<SecurityEventItem>> {
  return apiPaginated<SecurityEventItem>("/integrations/events", { query: params });
}

export async function generateMockTelemetry(payload: {
  source: string;
  event_type?: string;
  count: number;
  target_asset_id?: string;
}): Promise<any> {
  return apiData<any>("/integrations/mock/generate", {
    method: "POST",
    body: payload,
  });
}

export async function getIAMRiskSignals(): Promise<IAMRiskSignals> {
  return apiData<IAMRiskSignals>("/integrations/iam/risk-signals");
}

export async function getCSPMRiskSignals(): Promise<CSPMRiskSignals> {
  return apiData<CSPMRiskSignals>("/integrations/cspm/risk-signals");
}

export async function getAlerts(status?: string): Promise<Paginated<RiskAlertItem>> {
  return apiPaginated<RiskAlertItem>("/alerts", {
    query: status ? { status } : undefined,
  });
}

export async function updateAlertStatus(
  alertId: string,
  status: "OPEN" | "ACKNOWLEDGED" | "RESOLVED"
): Promise<RiskAlertItem> {
  return apiData<RiskAlertItem>(`/alerts/${alertId}`, {
    method: "PATCH",
    body: { status },
  });
}

export async function notarizeRiskChange(changeId: string): Promise<any> {
  return apiData<any>(`/continuous-risk/${changeId}/notarize`, {
    method: "POST",
  });
}
