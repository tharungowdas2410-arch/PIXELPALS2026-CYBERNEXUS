import { apiData } from "@/lib/api/client";
import type { AttackPath, AttackPathsResponse } from "@/lib/types/api";

export async function getAttackPathsResponse(
  limit = 25,
): Promise<AttackPathsResponse> {
  return apiData<AttackPathsResponse>("/attack-paths", { query: { limit } });
}

export async function getAttackPaths(limit = 25): Promise<AttackPath[]> {
  const payload = await getAttackPathsResponse(limit);
  return payload.paths ?? [];
}

export async function getAttackPathDetail(pathId: string): Promise<AttackPath> {
  return apiData<AttackPath>(`/attack-paths/${pathId}`);
}
