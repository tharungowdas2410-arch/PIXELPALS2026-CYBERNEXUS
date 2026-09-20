"use client";

import { useMemo, useState } from "react";
import { z } from "zod";
import {
  ShieldAlert,
  AlertTriangle,
  Bug,
  Plus,
  Flame,
  CheckCircle2,
  Sliders,
} from "lucide-react";
import { IllustrativeNote } from "@/components/IllustrativeNote";
import { PageHeader } from "@/components/PageHeader";
import { RiskBadge } from "@/components/RiskBadge";
import { ErrorState, LoadingState } from "@/components/QueryStates";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/misc";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EnterpriseDataTable, type ColumnDef } from "@/components/enterprise/EnterpriseDataTable";
import { DetailDrawer, type DrawerEntity } from "@/components/enterprise/DetailDrawer";
import { useAssets } from "@/lib/hooks/useAssets";
import { useVulnerabilities, useVulnerabilityMutations } from "@/lib/hooks/useVulnerabilities";
import { ApiError } from "@/lib/api/client";
import { toUiRiskLevel } from "@/lib/level";
import type { Severity, Vulnerability } from "@/lib/types/api";

const schema = z.object({
  asset_id: z.string().uuid(),
  title: z.string().min(1),
  cve_id: z.string().optional(),
  severity: z.enum(["low", "medium", "high", "critical"]),
  exploitability: z.coerce.number().min(0).max(1),
  cvss_score: z.coerce.number().min(0).max(10).optional(),
});

export default function VulnerabilitiesPage() {
  const [severityFilter, setSeverityFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const assets = useAssets({ page_size: 100 });
  const query = useVulnerabilities({
    page_size: 100,
    severity: severityFilter === "all" ? undefined : severityFilter,
    remediation_status: statusFilter === "all" ? undefined : statusFilter,
  });
  const mutations = useVulnerabilityMutations();

  const [open, setOpen] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [selectedEntity, setSelectedEntity] = useState<DrawerEntity | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const [form, setForm] = useState({
    asset_id: "",
    title: "",
    cve_id: "",
    severity: "high",
    exploitability: "0.5",
    cvss_score: "7.5",
  });

  const assetMap = useMemo(() => {
    return new Map((assets.data?.data ?? []).map((item) => [item.id, item.name]));
  }, [assets.data]);

  const items = query.data?.data ?? [];
  const criticalCount = items.filter((v) => v.severity === "critical").length;
  const highCount = items.filter((v) => v.severity === "high").length;
  const exploitableCount = items.filter((v) => v.exploitability > 0.6).length;

  const handleRowClick = (item: Vulnerability) => {
    setSelectedEntity({
      type: "vulnerability",
      id: item.id,
      title: item.cve_id ? `${item.cve_id} — ${item.title}` : item.title,
      severity: item.severity.toUpperCase(),
      status: item.remediation_status,
      cve: item.cve_id ?? undefined,
      cvss: item.cvss_score ?? undefined,
      exploitability: item.exploitability,
      assetName: assetMap.get(item.asset_id) ?? item.asset_id.slice(0, 8),
      financialExposure: item.cvss_score ? item.cvss_score * 450000 : 1200000,
      recommendedAction: item.cvss_score && item.cvss_score > 8.5
        ? "Emergency Patch: Apply vendor security update and isolate host behind perimeter WAF immediately."
        : "Standard Remediation: Schedule patch in next sprint maintenance cycle.",
      details: [
        { label: "Vulnerability Title", value: item.title },
        { label: "Target Asset", value: assetMap.get(item.asset_id) ?? item.asset_id },
        { label: "Remediation Status", value: item.remediation_status.replace("_", " ").toUpperCase() },
        { label: "Weaponization Index", value: `${(item.exploitability * 100).toFixed(0)}% EPSS probability` },
      ],
    });
    setDrawerOpen(true);
  };

  const columns: ColumnDef<Vulnerability>[] = [
    {
      header: "CVE Identifier",
      accessorKey: "cve_id",
      cell: (item) => (
        <span className="font-mono text-xs font-bold text-blue-700">
          {item.cve_id || "CVE-INTERNAL"}
        </span>
      ),
    },
    {
      header: "Title",
      accessorKey: "title",
      cell: (item) => <span className="font-medium text-slate-900 max-w-xs truncate block">{item.title}</span>,
    },
    {
      header: "Affected Asset",
      cell: (item) => (
        <Badge variant="outline" className="border-[#E2E8F0] bg-slate-50 text-slate-700 text-[11px]">
          {assetMap.get(item.asset_id) ?? item.asset_id.slice(0, 8)}
        </Badge>
      ),
    },
    {
      header: "Severity",
      accessorKey: "severity",
      cell: (item) => <RiskBadge level={toUiRiskLevel(item.severity)} />,
    },
    {
      header: "CVSS Score",
      accessorKey: "cvss_score",
      cell: (item) => (
        <span className={`font-mono text-xs font-bold ${
          (item.cvss_score ?? 0) >= 9 ? "text-red-600" : (item.cvss_score ?? 0) >= 7 ? "text-amber-600" : "text-slate-800"
        }`}>
          {item.cvss_score ? item.cvss_score.toFixed(1) : "—"}
        </span>
      ),
    },
    {
      header: "Exploitability",
      accessorKey: "exploitability",
      cell: (item) => (
        <div className="flex items-center gap-1.5">
          <div className="w-12 bg-slate-200 rounded-full h-1.5 overflow-hidden">
            <div
              className={`h-1.5 rounded-full ${item.exploitability >= 0.7 ? "bg-red-500" : "bg-blue-600"}`}
              style={{ width: `${item.exploitability * 100}%` }}
            />
          </div>
          <span className="font-mono text-[11px] text-slate-600">
            {item.exploitability.toFixed(2)}
          </span>
        </div>
      ),
    },
    {
      header: "Status",
      accessorKey: "remediation_status",
      cell: (item) => (
        <span className="text-[11px] uppercase tracking-wider font-semibold text-slate-600">
          {item.remediation_status.replaceAll("_", " ")}
        </span>
      ),
    },
  ];

  async function save() {
    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      setFormError("Asset, title, severity and exploitability (0–1) are required.");
      return;
    }
    try {
      await mutations.create.mutateAsync({
        asset_id: parsed.data.asset_id,
        title: parsed.data.title,
        cve_id: parsed.data.cve_id || null,
        severity: parsed.data.severity as Severity,
        exploitability: parsed.data.exploitability,
        cvss_score: parsed.data.cvss_score,
      });
      setOpen(false);
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : "Save failed.");
    }
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="flex h-2 w-2 rounded-full bg-red-500" />
            <Badge variant="outline" className="border-red-200 bg-red-50 text-red-700 text-[10px] uppercase tracking-wider font-semibold">
              Live CVE Feed Active
            </Badge>
          </div>
          <PageHeader
            eyebrow="Exposure & Vulnerability Management"
            title="Vulnerability Intelligence"
            description="Continuous weakness detection linked to attack-path exploitability, CVSS telemetry, and financial exposure impact."
          />
        </div>
        <div className="flex items-center gap-2">
          <IllustrativeNote />
          <Button
            size="sm"
            className="bg-[#2563EB] hover:bg-blue-700 text-white text-xs font-semibold shadow-xs"
            onClick={() => {
              setFormError(null);
              setOpen(true);
            }}
          >
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            Record Finding
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-[#E2E8F0] bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span className="font-semibold uppercase tracking-wider">Total Findings</span>
            <Bug className="h-4 w-4 text-blue-600" />
          </div>
          <div className="text-2xl font-bold font-mono text-slate-900">{items.length}</div>
          <span className="text-[11px] text-slate-500">Tracked in asset register</span>
        </div>

        <div className="rounded-xl border border-[#E2E8F0] bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span className="font-semibold uppercase tracking-wider">Critical Severity</span>
            <ShieldAlert className="h-4 w-4 text-red-600" />
          </div>
          <div className="text-2xl font-bold font-mono text-red-600">{criticalCount}</div>
          <span className="text-[11px] text-red-600/80">Require immediate intervention</span>
        </div>

        <div className="rounded-xl border border-[#E2E8F0] bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span className="font-semibold uppercase tracking-wider">High Severity</span>
            <AlertTriangle className="h-4 w-4 text-amber-600" />
          </div>
          <div className="text-2xl font-bold font-mono text-amber-700">{highCount}</div>
          <span className="text-[11px] text-amber-700/80">Scheduled for patching</span>
        </div>

        <div className="rounded-xl border border-[#E2E8F0] bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span className="font-semibold uppercase tracking-wider">Exploitable (EPSS &gt; 0.6)</span>
            <Flame className="h-4 w-4 text-purple-600" />
          </div>
          <div className="text-2xl font-bold font-mono text-purple-700">{exploitableCount}</div>
          <span className="text-[11px] text-purple-700/80">Weaponized attack vectors</span>
        </div>
      </div>

      {/* Main Enterprise Data Table with Drawer trigger */}
      {query.isLoading ? (
        <LoadingState />
      ) : query.isError ? (
        <ErrorState message="Unable to load vulnerabilities." onRetry={() => query.refetch()} />
      ) : (
        <EnterpriseDataTable
          title="Identified Vulnerabilities & CVE Catalog"
          subtitle="Click any finding to inspect CVSS vectors, affected attack graph, and remediation impact"
          data={items}
          columns={columns}
          searchPlaceholder="Search CVE, title, or asset…"
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
                { label: "Open", value: "open" },
                { label: "In Progress", value: "in_progress" },
                { label: "Mitigated", value: "mitigated" },
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

      {/* Modal Dialog for Recording Finding */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="border-[#E2E8F0] bg-white text-slate-900 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-slate-900">Record New Vulnerability Finding</DialogTitle>
            <DialogDescription className="text-slate-500 text-xs">
              Attach a CVE or application flaw directly to an enterprise asset.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 text-xs">
            <div>
              <Label className="text-slate-700">Target Asset</Label>
              <Select value={form.asset_id} onValueChange={(v) => setForm((c) => ({ ...c, asset_id: v }))}>
                <SelectTrigger className="mt-1 text-xs border-[#CBD5E1] bg-white text-slate-900 focus:border-[#2563EB]">
                  <SelectValue placeholder="Select asset" />
                </SelectTrigger>
                <SelectContent className="bg-white border-[#E2E8F0] text-xs">
                  {(assets.data?.data ?? []).map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.name} ({item.asset_type})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-slate-700">Finding Title</Label>
              <Input
                className="mt-1 text-xs border-[#CBD5E1] bg-white text-slate-900 focus:border-[#2563EB]"
                value={form.title}
                onChange={(e) => setForm((c) => ({ ...c, title: e.target.value }))}
                placeholder="e.g. Remote Code Execution via Log4j"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-slate-700">CVE ID</Label>
                <Input
                  className="mt-1 font-mono text-xs border-[#CBD5E1] bg-white text-slate-900 focus:border-[#2563EB]"
                  value={form.cve_id}
                  onChange={(e) => setForm((c) => ({ ...c, cve_id: e.target.value }))}
                  placeholder="CVE-2024-XXXX"
                />
              </div>
              <div>
                <Label className="text-slate-700">Severity</Label>
                <Select value={form.severity} onValueChange={(v) => setForm((c) => ({ ...c, severity: v }))}>
                  <SelectTrigger className="mt-1 text-xs border-[#CBD5E1] bg-white text-slate-900 focus:border-[#2563EB]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-[#E2E8F0] text-xs">
                    {["critical", "high", "medium", "low"].map((s) => (
                      <SelectItem key={s} value={s} className="capitalize">
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-slate-700">CVSS v3.1 Score</Label>
                <Input
                  className="mt-1 font-mono text-xs border-[#CBD5E1] bg-white text-slate-900 focus:border-[#2563EB]"
                  value={form.cvss_score}
                  onChange={(e) => setForm((c) => ({ ...c, cvss_score: e.target.value }))}
                  placeholder="0.0 - 10.0"
                />
              </div>
              <div>
                <Label className="text-slate-700">Exploitability Factor</Label>
                <Input
                  className="mt-1 font-mono text-xs border-[#CBD5E1] bg-white text-slate-900 focus:border-[#2563EB]"
                  value={form.exploitability}
                  onChange={(e) => setForm((c) => ({ ...c, exploitability: e.target.value }))}
                  placeholder="0.0 - 1.0"
                />
              </div>
            </div>
            {formError && <p className="text-xs text-red-600">{formError}</p>}
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" size="sm" onClick={() => setOpen(false)} className="text-xs text-slate-600 hover:text-slate-900">
                Cancel
              </Button>
              <Button
                size="sm"
                className="bg-[#2563EB] hover:bg-blue-700 text-white text-xs font-semibold shadow-xs"
                disabled={mutations.create.isPending}
                onClick={save}
              >
                {mutations.create.isPending ? "Recording…" : "Save Finding"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
