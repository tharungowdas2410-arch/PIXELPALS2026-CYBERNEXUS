"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  askAdvisor,
  generateDecisionBrief,
  getAdvisorEvidence,
  getAdvisorHistory,
  getAdvisorQuestions,
  getAdvisorStatus,
  notarizeAdvisorAudit,
  planAdvisor,
} from "@/lib/api/advisor";

export const advisorQueryKeys = {
  questions: ["advisor", "questions"] as const,
  status: ["advisor", "status"] as const,
  history: ["advisor", "history"] as const,
  evidence: (id: string) => ["advisor", "evidence", id] as const,
};

export function useAdvisorQuestions() {
  return useQuery({
    queryKey: advisorQueryKeys.questions,
    queryFn: getAdvisorQuestions,
    staleTime: 60_000,
  });
}

export function useAdvisorStatus() {
  return useQuery({
    queryKey: advisorQueryKeys.status,
    queryFn: getAdvisorStatus,
    refetchInterval: 30_000,
  });
}

export function useAdvisorHistory() {
  return useQuery({
    queryKey: advisorQueryKeys.history,
    queryFn: getAdvisorHistory,
  });
}

export function useAskAdvisor() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ question, budgetOverride }: { question: string; budgetOverride?: number }) =>
      askAdvisor(question, budgetOverride),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: advisorQueryKeys.history });
      queryClient.invalidateQueries({ queryKey: advisorQueryKeys.status });
    },
  });
}

export function useAdvisorPlan() {
  return useMutation({
    mutationFn: (question: string) => planAdvisor(question),
  });
}

export function useDecisionBrief() {
  return useMutation({
    mutationFn: ({ question, budgetOverride }: { question: string; budgetOverride?: number }) =>
      generateDecisionBrief(question, budgetOverride),
  });
}

export function useNotarizeAdvisorAudit() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (auditId: string) => notarizeAdvisorAudit(auditId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: advisorQueryKeys.history });
    },
  });
}

export function useAdvisorEvidence(evidenceId: string | null) {
  return useQuery({
    queryKey: advisorQueryKeys.evidence(evidenceId || ""),
    queryFn: () => (evidenceId ? getAdvisorEvidence(evidenceId) : Promise.resolve(null)),
    enabled: Boolean(evidenceId),
  });
}
