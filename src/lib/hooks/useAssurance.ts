"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getScenarios, simulateScenario } from "@/lib/api/scenarios";
import { getBlockchainEvidence, recordEvidence, verifyEvidence } from "@/lib/api/blockchain";
import { askAdvisor, getAdvisorQuestions } from "@/lib/api/advisor";
import { queryKeys } from "@/lib/query-keys";

export function useScenarios() {
  return useQuery({ queryKey: queryKeys.scenarios, queryFn: getScenarios });
}

export function useSimulateScenario() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: simulateScenario,
    onSuccess: () => client.invalidateQueries({ queryKey: queryKeys.scenarios }),
  });
}

export function useBlockchain() {
  return useQuery({ queryKey: queryKeys.blockchain, queryFn: getBlockchainEvidence });
}

export function useBlockchainMutations() {
  const client = useQueryClient();
  return {
    record: useMutation({
      mutationFn: recordEvidence,
      onSuccess: () => client.invalidateQueries({ queryKey: queryKeys.blockchain }),
    }),
    verify: useMutation({ mutationFn: verifyEvidence }),
  };
}

export function useAdvisorQuestions() {
  return useQuery({ queryKey: queryKeys.advisorQuestions, queryFn: getAdvisorQuestions });
}

export function useAskAdvisor() {
  return useMutation({ mutationFn: (question: string) => askAdvisor(question) });
}
