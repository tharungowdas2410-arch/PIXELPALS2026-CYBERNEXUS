"use client";

import { useQuery } from "@tanstack/react-query";
import { getDashboardOverview } from "@/lib/api/dashboard";
import { queryKeys } from "@/lib/query-keys";

export function useDashboard(range = "30d", enabled = true) {
  return useQuery({
    queryKey: queryKeys.dashboard(range),
    queryFn: () => getDashboardOverview(range),
    enabled,
  });
}
