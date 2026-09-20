import { apiRequest } from "./client";
import type { DataEnvelope } from "@/lib/types/api";

export interface SecurityDomainScore {
  domain?: string;
  key?: string;
  score: number;
  grade: string;
  status?: string;
  findings_count?: number;
  weight: number;
  weighted_score: number;
  critical_controls: number;
  compliant_controls: number;
  gaps: string[];
  explanation?: string;
}

export interface SecurityPostureResponse {
  organization_id: string;
  posture_score: number;
  overall_posture_score?: number;
  overall_grade: string;
  status: string;
  posture_level?: string;
  posture_timestamp: string;
  evaluated_at?: string;
  summary_narrative: string;
  domains: Record<string, SecurityDomainScore>;
  strengths: string[];
  immediate_priorities: string[];
  compliance_alignment_index: number;
  model_version: string;
  disclaimer: string;
}

export interface SystemStatusResponse {
  status: string;
  timestamp: string;
  version: string;
  environment: string;
  tenant_isolation: string;
  zero_trust_baseline: {
    authentication: string;
    encryption_transit: string;
    encryption_rest: string;
    audit_trail: string;
    rate_limiting: string;
    password_policy: string;
  };
  services: Record<string, { status: string; latency_ms: number }>;
}

export async function getSystemStatus(): Promise<SystemStatusResponse> {
  const res = await apiRequest<DataEnvelope<SystemStatusResponse>>("/system/status");
  return res.data;
}

export async function getSecurityPosture(): Promise<SecurityPostureResponse> {
  const res = await apiRequest<DataEnvelope<SecurityPostureResponse>>("/system/security-posture");
  return res.data;
}
