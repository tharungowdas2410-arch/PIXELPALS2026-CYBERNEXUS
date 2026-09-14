"use client";

import { useQuery } from "@tanstack/react-query";
import { DashboardCard } from "@/components/DashboardCard";
import { PageHeader } from "@/components/PageHeader";
import { ErrorState, LoadingState } from "@/components/QueryStates";
import { useAuth } from "@/components/auth-provider";
import { getMyOrganization } from "@/lib/api/organizations";
import { queryKeys } from "@/lib/query-keys";
import { formatInr } from "@/lib/format";

export default function SettingsPage() {
  const { user, logout } = useAuth();
  const org = useQuery({ queryKey: queryKeys.organization, queryFn: getMyOrganization });

  return (
    <div className="space-y-5">
      <PageHeader title="Settings" description="Organization and session from the FastAPI backend." />
      {org.isLoading ? (
        <LoadingState />
      ) : org.isError || !org.data || !user ? (
        <ErrorState message="Unable to load settings." onRetry={() => org.refetch()} />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          <DashboardCard title="Organization">
            <p className="text-white">{org.data.name}</p>
            <p className="text-sm text-slate-500">{org.data.industry ?? "—"} · {org.data.country ?? "—"}</p>
            <p className="mt-2 font-mono text-sm text-slate-300">Budget {formatInr(Number(org.data.security_budget))}</p>
          </DashboardCard>
          <DashboardCard title="Signed-in user">
            <p className="text-white">{user.full_name}</p>
            <p className="text-sm text-slate-500">{user.email}</p>
            <p className="mt-2 text-xs uppercase tracking-wider text-slate-400">{user.role.replaceAll("_", " ")}</p>
            <button type="button" className="mt-4 text-sm text-cyan-300 hover:underline" onClick={logout}>
              Sign out
            </button>
          </DashboardCard>
          <DashboardCard title="Risk model">
            <p className="text-sm text-slate-300">Deterministic inherent × residual scoring. No ML in this phase.</p>
          </DashboardCard>
          <DashboardCard title="Integrations">
            <p className="text-sm text-slate-300">FastAPI + PostgreSQL connected.</p>
            <p className="mt-2 text-xs text-slate-500">Neo4j, public blockchain, OR-Tools and LLM remain replaceable stubs.</p>
          </DashboardCard>
        </div>
      )}
    </div>
  );
}
