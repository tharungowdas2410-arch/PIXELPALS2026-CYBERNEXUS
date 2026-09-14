import { apiData } from "@/lib/api/client";
import type { BlockchainEvidence } from "@/lib/types/api";

export async function getBlockchainEvidence(): Promise<BlockchainEvidence[]> {
  return apiData<BlockchainEvidence[]>("/blockchain");
}

export async function recordEvidence(payload: {
  evidence_type: string;
  entity_id: string;
  payload: string;
}): Promise<BlockchainEvidence> {
  return apiData<BlockchainEvidence>("/blockchain/record", { method: "POST", body: payload });
}

export async function verifyEvidence(payload: {
  payload: string;
  evidence_hash: string;
}): Promise<{ valid: boolean; verification_status: string }> {
  return apiData("/blockchain/verify", { method: "POST", body: payload });
}
