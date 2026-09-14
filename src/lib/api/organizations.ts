import { apiData } from "@/lib/api/client";
import type { Organization } from "@/lib/types/api";

export async function getMyOrganization(): Promise<Organization> {
  return apiData<Organization>("/organizations/me");
}

export async function updateOrganization(
  id: string,
  payload: Partial<Pick<Organization, "name" | "industry" | "country" | "security_budget" | "description">>,
): Promise<Organization> {
  return apiData<Organization>(`/organizations/${id}`, { method: "PUT", body: payload });
}
