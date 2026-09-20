"use client";

import { useState } from "react";
import { z } from "zod";
import {
  AlertOctagon,
  AlertTriangle,
  Plus,
  DollarSign,
  Activity,
  Clock,
  ShieldAlert,
} from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { RiskBadge } from "@/components/RiskBadge";
import { EmptyState, ErrorState, LoadingState } from "@/components/QueryStates";
import { IllustrativeNote } from "@/components/IllustrativeNote";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/misc";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EnterpriseDataTable, type ColumnDef } from "@/components/enterprise/EnterpriseDataTable";
import { DetailDrawer, type DrawerEntity } from "@/components/enterprise/DetailDrawer";
import { useIncidentMutations, useIncidents } from "@/lib/hooks/useIncidents";
import { formatDateTime, formatInr } from "@/lib/format";
import { toUiRiskLevel } from "@/lib/level";
import { ApiError } from "@/lib/api/client";
import type { Incident, Severity } from "@/lib/types/api";

const schema = z.object({
  title: z.string().min(1),
  severity: z.enum(["low", "medium", "high", "critical"]),
  estimated_loss: z.coerce.number().min(0),
});

export default function IncidentsPage() {
  const query = useIncidents({ page_size: 100 });
  const mutations = useIncidentMutations();

  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedEntity, setSelectedEntity] = useState<DrawerEntity | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const [form, setForm] = useState({
    title: "",
    severity: "high",
    estimated_loss: "500000",
    description: "",
  });

  const items = query.data?.data ?? [];
  const criticalCount = items.filter((i) => i.severity === "critical").length;
  const activeCount = items.filter((i) => i.status !== "resolved" && i.status !== "closed").length;
  const totalLoss = items.reduce((acc, i) => acc + (Number(i.estimated_loss) || 0), 0);

  const handleRowClick = (item: Incident) => {
    setSelectedEntity({
      type: "incident",
      id: item.id,
      title: item.title,
      severity: item.severity.toUpperCase(),
      status: item.status.toUpperCase(),
      financialExposure: Number(item.estimated_loss),
      recommendedAction: "Execute incident containment playbook: isolate affected endpoints via EDR, revoke compromised credentials, and trigger evidence ledger notarization.",
      details: [
        { label: "Incident Status", value: item.status.toUpperCase() },
        { label: "Affected Assets", value: (item.affected_assets ?? []).join(", ") || "General Infrastructure" },
        { label: "Estimated Loss", value: formatInr(Number(item.estimated_loss)) },
        { label: "Detected At", value: item.detected_at ? formatDateTime(item.detected_at) : "Recent" },
        { label: "Description", value: item.description || "Active security incident logged by SIEM/SOC." },
      ],
    });
    setDrawerOpen(true);
  };

  const columns: ColumnDef<Incident>[] = [
    {
      header: "Incident Title",
      accessorKey: "title",
      cell: (item) => (
        <div>
          <span className="font-semibold text-slate-900 text-xs block">{item.title}</span>
          <span className="text-[10px] text-slate-500 line-clamp-1">{item.description || "Operational telemetry alert"}</span>
        </div>
      ),
    },
    {
      header: "Severity",
      accessorKey: "severity",
      cell: (item) => <RiskBadge level={toUiRiskLevel(item.severity)} />,
    },
    {
      header: "Status",
      accessorKey: "status",
      cell: (item) => (
        <Badge
          variant="outline"
          className={`text-[10px] ${
            item.status === "new"
              ? "border-rose-200 text-rose-700 bg-rose-50 font-bold"
              : item.status === "investigating"
              ? "border-amber-200 text-amber-800 bg-amber-50"
              : "border-emerald-200 text-emerald-700 bg-emerald-50"
          }`}
        >
          {item.status.toUpperCase()}
        </Badge>
      ),
    },
    {
      header: "Affected Assets",
      cell: (item) => (
        <span className="text-xs text-slate-700 max-w-xs truncate block">
          {(item.affected_assets ?? []).join(", ") || "—"}
        </span>
      ),
    },
    {
      header: "Estimated Loss",
      accessorKey: "estimated_loss",
      cell: (item) => (
        <span className="font-mono text-xs font-semibold text-rose-700">
          {formatInr(Number(item.estimated_loss))}
        </span>
      ),
    },
    {
      header: "Detected",
      cell: (item) => (
        <span className="font-mono text-[11px] text-slate-500">
          {item.detected_at ? formatDateTime(item.detected_at) : "—"}
        </span>
      ),
    },
  ];

  async function save() {
    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      setError("Title and severity are required.");
      return;
    }
    try {
      await mutations.create.mutateAsync({
        title: parsed.data.title,
        severity: parsed.data.severity as Severity,
        estimated_loss: parsed.data.estimated_loss,
        description: form.description || null,
      });
      setOpen(false);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Save failed.");
    }
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="flex h-2 w-2 rounded-full bg-rose-500 animate-ping" />
            <Badge variant="outline" className="border-rose-200 bg-rose-50 text-rose-700 text-[10px] uppercase tracking-wider font-semibold">
              Live Incident Queue
            </Badge>
          </div>
          <PageHeader
            eyebrow="Security Operations Response"
            title="Operational Incidents"
            description="Active alerts, security breaches, and forensic investigations with mapped business impact and financial loss estimates."
          />
        </div>
        <div className="flex items-center gap-2">
          <IllustrativeNote />
          <Button
            size="sm"
            className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs"
            onClick={() => {
              setError(null);
              setOpen(true);
            }}
          >
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            Log Incident
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span className="font-semibold uppercase tracking-wider">Total Logged</span>
            <Activity className="h-4 w-4 text-blue-600" />
          </div>
          <div className="text-2xl font-bold font-mono text-slate-900">{items.length}</div>
          <span className="text-[11px] text-slate-500">Recorded incident events</span>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span className="font-semibold uppercase tracking-wider">Active / Unresolved</span>
            <AlertOctagon className="h-4 w-4 text-rose-600" />
          </div>
          <div className="text-2xl font-bold font-mono text-rose-600">{activeCount}</div>
          <span className="text-[11px] text-rose-600">Require containment</span>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span className="font-semibold uppercase tracking-wider">Critical Severity</span>
            <ShieldAlert className="h-4 w-4 text-amber-600" />
          </div>
          <div className="text-2xl font-bold font-mono text-amber-800">{criticalCount}</div>
          <span className="text-[11px] text-amber-700">Major breach indicators</span>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span className="font-semibold uppercase tracking-wider">Estimated Direct Loss</span>
            <DollarSign className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-700">{formatInr(totalLoss)}</div>
          <span className="text-[11px] text-emerald-600">Cumulative incident impact</span>
        </div>
      </div>

      {/* Main Enterprise Data Table */}
      {query.isLoading ? (
        <LoadingState />
      ) : query.isError ? (
        <ErrorState message="Unable to load incidents." onRetry={() => query.refetch()} />
      ) : (
        <EnterpriseDataTable
          title="Incident Register & Blast Radius Queue"
          subtitle="Click any incident to inspect affected attack graph, breach containment steps, and loss quantification"
          data={items}
          columns={columns}
          searchPlaceholder="Search incident title, description, or assets…"
          onRowClick={handleRowClick}
          filterOptions={[
            {
              id: "severity",
              label: "Severity",
              options: [
                { label: "Critical", value: "critical" },
                { label: "High", value: "high" },
                { label: "Medium", value: "medium" },
                { label: "Low", value: "low" },
              ],
            },
            {
              id: "status",
              label: "Status",
              options: [
                { label: "New", value: "new" },
                { label: "Investigating", value: "investigating" },
                { label: "Resolved", value: "resolved" },
              ],
            },
          ]}
        />
      )}

      {/* Detail Drawer */}
      <DetailDrawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        entity={selectedEntity}
      />

      {/* Create Modal Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="border-slate-200 bg-white text-slate-800 shadow-xl">
          <DialogHeader>
            <DialogTitle className="text-slate-900 font-bold">Log Operational Incident</DialogTitle>
            <DialogDescription className="text-slate-500 text-xs">
              Record a new operational security event into the timeline.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 text-xs">
            <div>
              <Label className="text-slate-700 font-medium">Incident Title</Label>
              <Input
                className="mt-1 text-xs border-slate-200 bg-white text-slate-900 focus:border-blue-500"
                value={form.title}
                onChange={(e) => setForm((c) => ({ ...c, title: e.target.value }))}
                placeholder="e.g. Unauthorized Credential Access on Core VPN"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-slate-700 font-medium">Severity</Label>
                <Select value={form.severity} onValueChange={(v) => setForm((c) => ({ ...c, severity: v }))}>
                  <SelectTrigger className="mt-1 text-xs border-slate-200 bg-white text-slate-900 focus:border-blue-500">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-slate-200 text-xs shadow-lg">
                    {["critical", "high", "medium", "low"].map((item) => (
                      <SelectItem key={item} value={item} className="capitalize">
                        {item}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-slate-700 font-medium">Estimated Loss (INR)</Label>
                <Input
                  className="mt-1 font-mono text-xs border-slate-200 bg-white text-slate-900 focus:border-blue-500"
                  value={form.estimated_loss}
                  onChange={(e) => setForm((c) => ({ ...c, estimated_loss: e.target.value }))}
                />
              </div>
            </div>
            <div>
              <Label className="text-slate-700 font-medium">Forensic Description</Label>
              <Input
                className="mt-1 text-xs border-slate-200 bg-white text-slate-900 focus:border-blue-500"
                value={form.description}
                onChange={(e) => setForm((c) => ({ ...c, description: e.target.value }))}
                placeholder="Observed anomalous egress traffic to known bulletproof hosting..."
              />
            </div>
            {error && <p className="text-xs text-rose-600 font-medium">{error}</p>}
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" size="sm" onClick={() => setOpen(false)} className="text-xs text-slate-700 hover:bg-slate-100">
                Cancel
              </Button>
              <Button
                size="sm"
                className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs"
                disabled={mutations.create.isPending}
                onClick={save}
              >
                {mutations.create.isPending ? "Logging…" : "Record Incident"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
