import { apiData } from "@/lib/api/client";
import type {
  AdvisorAuditLogItem,
  AdvisorDecisionBrief,
  AdvisorPlan,
  AdvisorResponse,
  AdvisorStatus,
} from "@/lib/types/api";

export async function getAdvisorQuestions(): Promise<string[]> {
  return apiData<string[]>("/advisor/questions");
}

export async function askAdvisor(
  question: string,
  budgetOverride?: number
): Promise<AdvisorResponse> {
  return apiData<AdvisorResponse>("/advisor/ask", {
    method: "POST",
    body: { question, budget_override: budgetOverride },
  });
}

export async function planAdvisor(question: string): Promise<AdvisorPlan> {
  return apiData<AdvisorPlan>("/advisor/plan", {
    method: "POST",
    body: { question },
  });
}

export async function getAdvisorHistory(): Promise<AdvisorAuditLogItem[]> {
  return apiData<AdvisorAuditLogItem[]>("/advisor/history");
}

export async function getAdvisorStatus(): Promise<AdvisorStatus> {
  return apiData<AdvisorStatus>("/advisor/status");
}

export async function generateDecisionBrief(
  question: string,
  budgetOverride?: number
): Promise<AdvisorDecisionBrief> {
  return apiData<AdvisorDecisionBrief>("/advisor/brief", {
    method: "POST",
    body: { question, budget_override: budgetOverride },
  });
}

export async function notarizeAdvisorAudit(
  auditId: string
): Promise<{ evidence_id: string; evidence_hash: string; transaction_hash: string; verification_status: string }> {
  return apiData<{ evidence_id: string; evidence_hash: string; transaction_hash: string; verification_status: string }>(
    `/advisor/${auditId}/evidence`,
    { method: "POST" }
  );
}

export async function getAdvisorEvidence(evidenceId: string): Promise<Record<string, any>> {
  return apiData<Record<string, any>>(`/advisor/evidence/${evidenceId}`);
}
