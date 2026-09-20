"use client";

import Link from "next/link";
import { useState, useMemo } from "react";
import { z } from "zod";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  ArrowUpRight,
  Building2,
  Calendar,
  ChevronRight,
  Eye,
  FileCheck,
  Landmark,
  Plus,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Target,
  Wallet,
} from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { RiskBadge } from "@/components/RiskBadge";
import { EmptyState, ErrorState, LoadingState } from "@/components/QueryStates";
import { EnterpriseDataTable, type ColumnDef } from "@/components/enterprise/EnterpriseDataTable";
import { DetailDrawer } from "@/components/enterprise/DetailDrawer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/misc";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAssets } from "@/lib/hooks/useAssets";
import { useControls, useThreats } from "@/lib/hooks/useInventory";
import { useCalculateRisk, useRiskSummary, useRisks } from "@/lib/hooks/useRisks";
import { useVulnerabilities } from "@/lib/hooks/useVulnerabilities";
import { formatInr } from "@/lib/format";
import { toUiRiskLevel } from "@/lib/level";
import { ApiError } from "@/lib/api/client";
import type { Risk } from "@/lib/types/api";

const schema = z.object({
  asset_id: z.string().uuid(),
  likelihood: z.coerce.number().min(0).max(1),
  impact: z.coerce.number().min(0).max(1),
  vulnerability_id: z.string().optional(),
  threat_id: z.string().optional(),
  control_id: z.string().optional(),
});

export default function RisksPage() {
  const list = useRisks({ page_size: 100 });
  const summary = useRiskSummary();
  const assets = useAssets({ page_size: 100 });
  const vulns = useVulnerabilities({ page_size: 100 });
  const threats = useThreats({ page_size: 100 });
  const controls = useControls({ page_size: 100 });
  const calculate = useCalculateRisk();

  const [open, setOpen] = useState(false);
  const [selectedRisk, setSelectedRisk] = useState<Risk | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    asset_id: "",
    vulnerability_id: "none",
    threat_id: "none",
    control_id: "none",
    likelihood: "0.6",
    impact: "0.7",
  });

  const assetNameMap = useMemo(() => {
    const map = new Map<string, string>();
    (assets.data?.data || []).forEach((a) => map.set(a.id, a.name));
    return map;
  }, [assets.data]);

  async function run() {
    const parsed = schema.safeParse({
      ...form,
      vulnerability_id: form.vulnerability_id === "none" ? undefined : form.vulnerability_id,
      threat_id: form.threat_id === "none" ? undefined : form.threat_id,
      control_id: form.control_id === "none" ? undefined : form.control_id,
    });
    if (!parsed.success) {
      setError("Select an asset and provide likelihood/impact between 0 and 1.");
      return;
    }
    try {
      await calculate.mutateAsync({
        asset_id: parsed.data.asset_id,
        likelihood: parsed.data.likelihood,
        impact: parsed.data.impact,
        vulnerability_id: parsed.data.vulnerability_id ?? null,
        threat_id: parsed.data.threat_id ?? null,
        control_id: parsed.data.control_id ?? null,
      });
      setOpen(false);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Calculation failed.");
    }
  }

  const columns: ColumnDef<Risk>[] = [
    {
      key: "title",
      header: "Risk & Asset",
      sortable: true,
      render: (row) => {
        const title = (row as any).title || (row.drivers ?? [])[0] || `Risk #${row.id.slice(0, 8)}`;
        const assetName = row.asset_id ? (assetNameMap.get(row.asset_id) || "Monitored Asset") : "Monitored Asset";
        return (
          <div className="space-y-0.5">
            <span className="font-semibold text-slate-900 hover:text-blue-600 transition-colors block">
              {title}
            </span>
            <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
              <Building2 className="h-3 w-3 text-blue-600" />
              <span>{assetName}</span>
            </div>
          </div>
        );
      },
    },
    {
      key: "risk_level",
      header: "Severity",
      sortable: true,
      render: (row) => <RiskBadge level={toUiRiskLevel(row.risk_level)} />,
    },
    {
      key: "residual_risk",
      header: "Residual Risk",
      sortable: true,
      render: (row) => (
        <div className="flex items-center gap-2">
          <span className="font-mono font-bold text-slate-900 text-xs">{row.residual_risk.toFixed(1)}</span>
          <span className="text-[10px] text-slate-500 font-mono">/ 100</span>
        </div>
      ),
    },
    {
      key: "inherent_risk",
      header: "Inherent Risk",
      sortable: true,
      render: (row) => (
        <span className="font-mono text-slate-600 text-xs">{row.inherent_risk ? row.inherent_risk.toFixed(1) : "—"}</span>
      ),
    },
    {
      key: "expected_annual_loss",
      header: "Expected Annual Loss",
      sortable: true,
      render: (row) => (
        <span className="font-mono font-semibold text-amber-800 text-xs">
          {formatInr(Number(row.expected_annual_loss || 0))}
        </span>
      ),
    },
    {
      key: "actions",
      header: "",
      render: (row) => (
        <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
          <Button variant="ghost" size="sm" asChild className="h-7 px-2 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50">
            <Link href={`/risks/${row.id}`}>
              Workspace
              <ArrowRight className="h-3 w-3 ml-1" />
            </Link>
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        title="Risk Intelligence Center"
        description="Continuous, explainable risk quantification connecting telemetry, assets, vulnerabilities, threats, controls, and financial exposure."
      >
        <div className="flex items-center gap-2">
          <Button size="sm" onClick={() => { setError(null); setOpen(true); }} className="h-8 text-xs bg-blue-600 hover:bg-blue-700 text-white font-medium shadow-xs">
            <Plus className="h-3.5 w-3.5 mr-1" />
            Quantify New Risk
          </Button>
        </div>
      </PageHeader>

      {/* Summary Stat Cards */}
      {summary.data && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-[10px] font-bold uppercase tracking-wider">Quantified Risks</span>
              <Target className="h-4 w-4 text-blue-600" />
            </div>
            <p className="mt-2 text-2xl font-bold font-mono text-slate-900">{summary.data.count}</p>
            <p className="mt-0.5 text-xs text-slate-500">Active records in enterprise register</p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-[10px] font-bold uppercase tracking-wider">Mean Inherent Risk</span>
              <ShieldAlert className="h-4 w-4 text-rose-600" />
            </div>
            <p className="mt-2 text-2xl font-bold font-mono text-slate-900">
              {summary.data.average_inherent_risk.toFixed(1)}
              <span className="text-xs text-slate-500 font-normal"> / 100</span>
            </p>
            <p className="mt-0.5 text-xs text-slate-500">Before mitigating security controls</p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-[10px] font-bold uppercase tracking-wider">Mean Residual Risk</span>
              <ShieldCheck className="h-4 w-4 text-emerald-600" />
            </div>
            <p className="mt-2 text-2xl font-bold font-mono text-emerald-700">
              {summary.data.average_residual_risk.toFixed(1)}
              <span className="text-xs text-slate-500 font-normal"> / 100</span>
            </p>
            <p className="mt-0.5 text-xs text-slate-500">Post-control operational baseline</p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-[10px] font-bold uppercase tracking-wider">Modeled EAL</span>
              <Landmark className="h-4 w-4 text-amber-600" />
            </div>
            <p className="mt-2 text-2xl font-bold font-mono text-amber-800">
              {formatInr(summary.data.total_expected_annual_loss)}
            </p>
            <p className="mt-0.5 text-xs text-slate-500">Open FAIR aggregate expected loss</p>
          </div>
        </div>
      )}

      {/* Enterprise Data Table */}
      {list.isLoading ? (
        <LoadingState label="Loading risk register..." />
      ) : list.isError ? (
        <ErrorState message="Unable to load risks." onRetry={() => list.refetch()} />
      ) : (
        <EnterpriseDataTable
          data={list.data?.data || []}
          columns={columns}
          searchPlaceholder="Search risks by title, asset, severity..."
          filters={[
            {
              key: "risk_level",
              label: "Severity",
              options: [
                { label: "Critical", value: "critical" },
                { label: "High", value: "high" },
                { label: "Medium", value: "medium" },
                { label: "Low", value: "low" },
              ],
            },
          ]}
          onRowClick={(row) => setSelectedRisk(row)}
        />
      )}

      {/* Contextual Detail Drawer */}
      <DetailDrawer
        open={Boolean(selectedRisk)}
        onClose={() => setSelectedRisk(null)}
        title={selectedRisk ? ((selectedRisk as any).title || (selectedRisk.drivers ?? [])[0] || `Risk #${selectedRisk.id.slice(0, 8)}`) : ""}
        eyebrow="Risk Intelligence Drawer"
        subtitle={selectedRisk?.asset_id ? `Asset: ${assetNameMap.get(selectedRisk.asset_id) || selectedRisk.asset_id}` : undefined}
        badge={{
          label: String(selectedRisk?.risk_level || "HIGH").toUpperCase(),
          color: String(selectedRisk?.risk_level).toLowerCase() === "critical" ? "bg-rose-50 text-rose-700 border-rose-200" : "bg-amber-50 text-amber-800 border-amber-200",
        }}
        metrics={[
          { label: "Residual Risk", value: `${selectedRisk?.residual_risk.toFixed(1) || 0}/100`, color: "text-rose-600" },
          { label: "Inherent Risk", value: `${selectedRisk?.inherent_risk?.toFixed(1) || 0}/100`, color: "text-slate-700" },
          { label: "Expected Loss", value: formatInr(Number(selectedRisk?.expected_annual_loss || 0)), color: "text-amber-800" },
        ]}
        recommendation={{
          title: "Recommended Remediation",
          action: "Deploy targeted FIDO2 authentication and patch perimeter CVEs to reduce residual risk by ~35%.",
          impact: `Projected EAL savings: ${formatInr(Number(selectedRisk?.expected_annual_loss || 1000000) * 0.35)}`,
        }}
        fields={[
          { label: "Risk ID", value: selectedRisk?.id || "", mono: true },
          { label: "Monitored Asset", value: selectedRisk?.asset_id ? (assetNameMap.get(selectedRisk.asset_id) || selectedRisk.asset_id) : "General Asset" },
          { label: "Quantification Model", value: "Open FAIR (Loss Frequency × Magnitude)" },
          { label: "Mitigating Controls Active", value: selectedRisk?.control_id ? "Configured" : "None Active (Elevated Gap)" },
        ]}
        actions={
          selectedRisk ? (
            <Button size="sm" asChild className="bg-blue-600 hover:bg-blue-700 text-white text-xs shadow-xs">
              <Link href={`/risks/${selectedRisk.id}`}>
                Open Full Investigation Workspace
                <ArrowUpRight className="h-3 w-3 ml-1" />
              </Link>
            </Button>
          ) : undefined
        }
      />

      {/* Calculate Risk Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="border-slate-200 bg-white text-slate-900 sm:max-w-md shadow-xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">Quantify Enterprise Risk</DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Calculate deterministic residual risk using FAIR parameters.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2 text-xs">
            {error && <p className="text-xs text-rose-600 font-medium">{error}</p>}
            <div className="space-y-1">
              <Label htmlFor="c-asset">Target Asset</Label>
              <Select value={form.asset_id} onValueChange={(v) => setForm((p) => ({ ...p, asset_id: v }))}>
                <SelectTrigger id="c-asset" className="h-8 border-slate-200 bg-white text-xs text-slate-900 focus:border-blue-500">
                  <SelectValue placeholder="Select asset" />
                </SelectTrigger>
                <SelectContent className="border-slate-200 bg-white text-slate-900 text-xs shadow-lg">
                  {(assets.data?.data ?? []).map((a) => (
                    <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="c-like">Likelihood (0 to 1)</Label>
                <Input
                  id="c-like"
                  value={form.likelihood}
                  onChange={(e) => setForm((p) => ({ ...p, likelihood: e.target.value }))}
                  className="h-8 border-slate-200 bg-white text-xs text-slate-900 focus:border-blue-500"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="c-imp">Impact (0 to 1)</Label>
                <Input
                  id="c-imp"
                  value={form.impact}
                  onChange={(e) => setForm((p) => ({ ...p, impact: e.target.value }))}
                  className="h-8 border-slate-200 bg-white text-xs text-slate-900 focus:border-blue-500"
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label htmlFor="c-vuln">Linked Vulnerability (Optional)</Label>
              <Select value={form.vulnerability_id} onValueChange={(v) => setForm((p) => ({ ...p, vulnerability_id: v }))}>
                <SelectTrigger id="c-vuln" className="h-8 border-slate-200 bg-white text-xs text-slate-900 focus:border-blue-500">
                  <SelectValue placeholder="None" />
                </SelectTrigger>
                <SelectContent className="border-slate-200 bg-white text-slate-900 text-xs shadow-lg">
                  <SelectItem value="none">None</SelectItem>
                  {(vulns.data?.data ?? []).map((v) => (
                    <SelectItem key={v.id} value={v.id}>{v.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2 pt-3">
              <Button variant="outline" size="sm" onClick={() => setOpen(false)} className="h-8 text-xs border-slate-200 text-slate-700 hover:bg-slate-50">
                Cancel
              </Button>
              <Button size="sm" onClick={run} disabled={calculate.isPending} className="h-8 text-xs bg-blue-600 hover:bg-blue-700 text-white shadow-xs">
                Calculate & Store
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
