import { apiData } from "@/lib/api/client";
import type { ComplianceRecord, ComplianceSummary } from "@/lib/types/api";

export async function getComplianceSummary(): Promise<ComplianceSummary> {
  return apiData<ComplianceSummary>("/compliance/summary");
}

export async function getComplianceFramework(framework: string): Promise<ComplianceRecord[]> {
  return apiData<ComplianceRecord[]>(`/compliance/${encodeURIComponent(framework)}`);
}

export async function addComplianceEvidence(payload: {
  framework: string;
  requirement: string;
  status: string;
  score?: number;
  evidence?: string | null;
}): Promise<ComplianceRecord> {
  return apiData<ComplianceRecord>("/compliance/evidence", { method: "POST", body: payload });
}
