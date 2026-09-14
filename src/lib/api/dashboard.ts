import { apiData } from "@/lib/api/client";
import type { DashboardOverview } from "@/lib/types/api";

export async function getDashboardOverview(range = "30d"): Promise<DashboardOverview> {
  return apiData<DashboardOverview>("/dashboard/overview", { query: { range } });
}
