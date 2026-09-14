"use client";

import Link from "next/link";
import { use } from "react";
import { DashboardCard } from "@/components/DashboardCard";
import { PageHeader } from "@/components/PageHeader";
import { RiskBadge } from "@/components/RiskBadge";
import { ErrorState, LoadingState } from "@/components/QueryStates";
import { IllustrativeNote } from "@/components/IllustrativeNote";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useIncident, useIncidentMutations } from "@/lib/hooks/useIncidents";
import { formatDateTime, formatInr } from "@/lib/format";
import { toUiRiskLevel } from "@/lib/level";
import type { IncidentStatus } from "@/lib/types/api";

export default function IncidentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const query = useIncident(id);
  const mutations = useIncidentMutations();
  const incident = query.data;
  const timeline = incident
    ? [
        incident.created_at ? { at: incident.created_at, event: "Incident recorded" } : null,
        incident.detected_at ? { at: incident.detected_at, event: "Detected" } : null,
        { at: incident.created_at, event: `Status: ${incident.status}` },
        incident.resolved_at ? { at: incident.resolved_at, event: "Resolved" } : null,
      ].filter((item): item is { at: string; event: string } => Boolean(item?.at))
    : [];

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow={<Link href="/incidents" className="text-cyan-300 hover:underline">← Incidents</Link>}
        title={incident?.title ?? "Incident"}
        description={incident?.description ?? undefined}
        actions={<IllustrativeNote />}
      />
      {query.isLoading ? (
        <LoadingState />
      ) : query.isError || !incident ? (
        <ErrorState message="Incident not found." onRetry={() => query.refetch()} />
      ) : (
        <div className="grid gap-4 lg:grid-cols-3">
          <DashboardCard title="Severity & status">
            <div className="flex items-center gap-2">
              <RiskBadge level={toUiRiskLevel(incident.severity)} />
              <Select
                value={incident.status}
                onValueChange={(value) => mutations.update.mutate({ id: incident.id, payload: { status: value as IncidentStatus } })}
              >
                <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["new", "investigating", "contained", "resolved", "closed"].map((item) => (
                    <SelectItem key={item} value={item}>{item}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <p className="mt-3 text-sm text-slate-400">
              Modeled impact: <span className="font-mono text-white">{formatInr(Number(incident.estimated_loss))}</span>
            </p>
          </DashboardCard>
          <DashboardCard title="Affected assets">
            <ul className="list-disc pl-4 text-sm text-slate-300">
              {(incident.affected_assets ?? []).length
                ? (incident.affected_assets ?? []).map((asset) => <li key={asset}>{asset}</li>)
                : <li>None recorded</li>}
            </ul>
          </DashboardCard>
          <DashboardCard title="Notes">
            <p className="text-sm text-slate-300">{incident.description ?? "No additional notes."}</p>
          </DashboardCard>
          <DashboardCard title="Timeline" className="lg:col-span-3">
            <ol className="space-y-2 text-sm">
              {timeline.map((item) => (
                <li key={`${item.at}-${item.event}`} className="flex gap-4 border-b border-white/5 py-2">
                  <span className="w-52 font-mono text-xs text-slate-500">{formatDateTime(item.at)}</span>
                  <span>{item.event}</span>
                </li>
              ))}
            </ol>
          </DashboardCard>
        </div>
      )}
    </div>
  );
}
