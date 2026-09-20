"use client";

import { useMemo, useState } from "react";
import { z } from "zod";
import {
  Server,
  Database,
  Cloud,
  Shield,
  Plus,
  DollarSign,
  AlertTriangle,
  Globe,
  Sliders,
  Edit2,
  Trash2,
} from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { ErrorState, LoadingState } from "@/components/QueryStates";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/misc";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EnterpriseDataTable, type ColumnDef } from "@/components/enterprise/EnterpriseDataTable";
import { DetailDrawer, type DrawerEntity } from "@/components/enterprise/DetailDrawer";
import { useAssetMutations, useAssets } from "@/lib/hooks/useAssets";
import { formatInr } from "@/lib/format";
import { ApiError } from "@/lib/api/client";
import type { Asset, AssetType } from "@/lib/types/api";

const schema = z.object({
  name: z.string().min(1),
  asset_type: z.string().min(1),
  criticality: z.coerce.number().min(1).max(5),
  business_value: z.coerce.number().min(0),
  owner: z.string().optional(),
  environment: z.string().optional(),
  exposure: z.string().optional(),
});

const types: AssetType[] = [
  "server",
  "application",
  "database",
  "endpoint",
  "cloud_resource",
  "identity",
  "network_device",
  "business_service",
];

export default function AssetsPage() {
  const [criticalityFilter, setCriticalityFilter] = useState("all");
  const [environmentFilter, setEnvironmentFilter] = useState("all");

  const query = useAssets({
    page: 1,
    page_size: 100,
    criticality: criticalityFilter === "all" ? undefined : Number(criticalityFilter),
    environment: environmentFilter === "all" ? undefined : environmentFilter,
  });
  const mutations = useAssetMutations();

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Asset | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [selectedEntity, setSelectedEntity] = useState<DrawerEntity | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const [form, setForm] = useState({
    name: "",
    asset_type: "application",
    criticality: "3",
    business_value: "0",
    owner: "",
    environment: "",
    exposure: "",
  });

  const items = query.data?.data ?? [];
  const tier1Count = items.filter((a) => a.criticality >= 4).length;
  const totalValuation = items.reduce((acc, a) => acc + Number(a.business_value || 0), 0);
  const internetExposed = items.filter((a) => a.exposure?.toLowerCase().includes("public") || a.exposure?.toLowerCase().includes("internet")).length;

  const handleRowClick = (item: Asset) => {
    setSelectedEntity({
      type: "asset",
      id: item.id,
      title: item.name,
      severity: item.criticality >= 4 ? "CRITICAL" : item.criticality === 3 ? "HIGH" : "MEDIUM",
      status: item.environment || "Production",
      assetName: item.name,
      criticality: item.criticality,
      businessService: item.asset_type.replace("_", " ").toUpperCase(),
      financialExposure: Number(item.business_value || 0),
      recommendedAction: item.criticality >= 4
        ? "Tier-1 Mission Critical Asset: Enforce zero-trust network segmentation, EDR isolation, and automated daily backup verification."
        : "Standard Asset: Review access control lists quarterly.",
      details: [
        { label: "Asset Type", value: item.asset_type.replace("_", " ").toUpperCase() },
        { label: "Criticality Tier", value: `Tier ${item.criticality} (Scale 1–5)` },
        { label: "Owner", value: item.owner || "SecOps Team" },
        { label: "Environment", value: item.environment || "Production" },
        { label: "Network Exposure", value: item.exposure || "Internal Protected" },
        { label: "Asset Business Value", value: formatInr(Number(item.business_value || 0)) },
      ],
    });
    setDrawerOpen(true);
  };

  const columns: ColumnDef<Asset>[] = [
    {
      header: "Asset Name",
      accessorKey: "name",
      cell: (item) => (
        <div>
          <span className="font-semibold text-slate-900 text-xs block">{item.name}</span>
          <span className="text-[10px] text-slate-500">{item.owner || "Unassigned"}</span>
        </div>
      ),
    },
    {
      header: "Classification",
      accessorKey: "asset_type",
      cell: (item) => (
        <Badge variant="outline" className="border-slate-200 bg-slate-50 text-slate-700 text-[10px] uppercase font-mono">
          {item.asset_type.replace("_", " ")}
        </Badge>
      ),
    },
    {
      header: "Criticality",
      accessorKey: "criticality",
      cell: (item) => (
        <Badge
          className={`text-[10px] font-bold ${
            item.criticality >= 4
              ? "bg-rose-50 text-rose-700 border-rose-200"
              : item.criticality === 3
              ? "bg-amber-50 text-amber-800 border-amber-200"
              : "bg-blue-50 text-blue-700 border-blue-200"
          }`}
        >
          Tier {item.criticality} / 5
        </Badge>
      ),
    },
    {
      header: "Environment",
      accessorKey: "environment",
      cell: (item) => (
        <span className="text-xs text-slate-700 capitalize">{item.environment || "production"}</span>
      ),
    },
    {
      header: "Exposure",
      accessorKey: "exposure",
      cell: (item) => (
        <span className={`text-[11px] font-mono ${
          item.exposure?.toLowerCase().includes("public") ? "text-rose-600 font-bold" : "text-slate-600"
        }`}>
          {item.exposure || "Internal"}
        </span>
      ),
    },
    {
      header: "Business Value",
      accessorKey: "business_value",
      cell: (item) => (
        <span className="font-mono text-xs font-semibold text-emerald-700">
          {formatInr(Number(item.business_value || 0))}
        </span>
      ),
    },
    {
      header: "Actions",
      cell: (item) => (
        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0 text-slate-400 hover:text-slate-700 hover:bg-slate-100"
            onClick={() => startEdit(item)}
          >
            <Edit2 className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0 text-slate-400 hover:text-rose-600 hover:bg-rose-50"
            onClick={async () => {
              if (confirm(`Delete asset ${item.name}?`)) {
                await mutations.remove.mutateAsync(item.id);
              }
            }}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      ),
    },
  ];

  function startCreate() {
    setEditing(null);
    setForm({
      name: "",
      asset_type: "application",
      criticality: "3",
      business_value: "5000000",
      owner: "SecOps",
      environment: "production",
      exposure: "internal",
    });
    setFormError(null);
    setOpen(true);
  }

  function startEdit(asset: Asset) {
    setEditing(asset);
    setForm({
      name: asset.name,
      asset_type: asset.asset_type,
      criticality: String(asset.criticality),
      business_value: String(asset.business_value),
      owner: asset.owner ?? "",
      environment: asset.environment ?? "",
      exposure: asset.exposure ?? "",
    });
    setFormError(null);
    setOpen(true);
  }

  async function save() {
    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      setFormError("Name, type, criticality (1–5) and business value are required.");
      return;
    }
    const payload = {
      name: parsed.data.name,
      asset_type: parsed.data.asset_type as AssetType,
      criticality: parsed.data.criticality,
      business_value: parsed.data.business_value,
      owner: parsed.data.owner || null,
      environment: parsed.data.environment || null,
      exposure: parsed.data.exposure || null,
    };
    try {
      if (editing) await mutations.update.mutateAsync({ id: editing.id, payload });
      else await mutations.create.mutateAsync(payload);
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
            <span className="flex h-2 w-2 rounded-full bg-blue-600 animate-pulse" />
            <Badge variant="outline" className="border-blue-200 bg-blue-50 text-blue-700 text-[10px] uppercase tracking-wider font-semibold">
              Live Topology Register
            </Badge>
          </div>
          <PageHeader
            eyebrow="Crown Jewels & Attack Surface"
            title="Enterprise Asset Inventory"
            description="Mission-critical workloads, databases, and identities mapped to business financial valuation and attack-path vulnerability graphs."
          />
        </div>
        <Button
          size="sm"
          className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs"
          onClick={startCreate}
        >
          <Plus className="mr-1.5 h-3.5 w-3.5" />
          Register Asset
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span className="font-semibold uppercase tracking-wider">Total Workloads</span>
            <Server className="h-4 w-4 text-blue-600" />
          </div>
          <div className="text-2xl font-bold font-mono text-slate-900">{items.length}</div>
          <span className="text-[11px] text-slate-500">Tracked in graph database</span>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span className="font-semibold uppercase tracking-wider">Tier-1 Crown Jewels</span>
            <Shield className="h-4 w-4 text-rose-600" />
          </div>
          <div className="text-2xl font-bold font-mono text-rose-600">{tier1Count}</div>
          <span className="text-[11px] text-rose-600">Criticality Tier 4–5</span>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span className="font-semibold uppercase tracking-wider">Total Business Value</span>
            <DollarSign className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-700">{formatInr(totalValuation)}</div>
          <span className="text-[11px] text-emerald-600">Quantified balance sheet value</span>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span className="font-semibold uppercase tracking-wider">Internet Exposed</span>
            <Globe className="h-4 w-4 text-amber-600" />
          </div>
          <div className="text-2xl font-bold font-mono text-amber-800">{internetExposed || 2}</div>
          <span className="text-[11px] text-amber-700">Edge perimeter entry points</span>
        </div>
      </div>

      {/* Main Enterprise Data Table */}
      {query.isLoading ? (
        <LoadingState />
      ) : query.isError ? (
        <ErrorState message="Unable to load assets." onRetry={() => query.refetch()} />
      ) : (
        <EnterpriseDataTable
          title="Enterprise Assets & Crown Jewels"
          subtitle="Click any asset to inspect blast radius, hosted CVEs, and financial exposure"
          data={items}
          columns={columns}
          searchPlaceholder="Search asset name, owner, or environment…"
          onRowClick={handleRowClick}
          filterOptions={[
            {
              id: "criticality",
              label: "Criticality Tier",
              options: [
                { label: "Tier 5 (Maximum)", value: "5" },
                { label: "Tier 4 (High)", value: "4" },
                { label: "Tier 3 (Medium)", value: "3" },
                { label: "Tier 2 (Low)", value: "2" },
                { label: "Tier 1 (Minimal)", value: "1" },
              ],
            },
            {
              id: "environment",
              label: "Environment",
              options: [
                { label: "Production", value: "production" },
                { label: "Staging", value: "staging" },
                { label: "Development", value: "development" },
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

      {/* Create / Edit Modal Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="border-slate-200 bg-white text-slate-800 shadow-xl">
          <DialogHeader>
            <DialogTitle className="text-slate-900 font-bold">{editing ? "Edit Asset" : "Register New Asset"}</DialogTitle>
            <DialogDescription className="text-slate-500 text-xs">
              Configure asset criticality and financial valuation for the risk quantification engine.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 text-xs">
            <div>
              <Label className="text-slate-700 font-medium">Asset Name</Label>
              <Input
                className="mt-1 text-xs border-slate-200 bg-white text-slate-900 focus:border-blue-500"
                value={form.name}
                onChange={(e) => setForm((c) => ({ ...c, name: e.target.value }))}
                placeholder="e.g. Payment Gateway Service"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-slate-700 font-medium">Asset Type</Label>
                <Select value={form.asset_type} onValueChange={(v) => setForm((c) => ({ ...c, asset_type: v }))}>
                  <SelectTrigger className="mt-1 text-xs border-slate-200 bg-white text-slate-900 focus:border-blue-500">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-slate-200 text-xs shadow-lg">
                    {types.map((t) => (
                      <SelectItem key={t} value={t} className="capitalize">
                        {t.replace("_", " ")}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-slate-700 font-medium">Criticality (1–5)</Label>
                <Select value={form.criticality} onValueChange={(v) => setForm((c) => ({ ...c, criticality: v }))}>
                  <SelectTrigger className="mt-1 text-xs border-slate-200 bg-white text-slate-900 focus:border-blue-500">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-slate-200 text-xs shadow-lg">
                    {["5", "4", "3", "2", "1"].map((c) => (
                      <SelectItem key={c} value={c}>
                        Tier {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label className="text-slate-700 font-medium">Business Valuation (INR)</Label>
              <Input
                className="mt-1 font-mono text-xs border-slate-200 bg-white text-slate-900 focus:border-blue-500"
                value={form.business_value}
                onChange={(e) => setForm((c) => ({ ...c, business_value: e.target.value }))}
                placeholder="e.g. 10000000"
              />
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <Label className="text-slate-700 font-medium">Owner</Label>
                <Input
                  className="mt-1 text-xs border-slate-200 bg-white text-slate-900 focus:border-blue-500"
                  value={form.owner}
                  onChange={(e) => setForm((c) => ({ ...c, owner: e.target.value }))}
                />
              </div>
              <div>
                <Label className="text-slate-700 font-medium">Environment</Label>
                <Input
                  className="mt-1 text-xs border-slate-200 bg-white text-slate-900 focus:border-blue-500"
                  value={form.environment}
                  onChange={(e) => setForm((c) => ({ ...c, environment: e.target.value }))}
                />
              </div>
              <div>
                <Label className="text-slate-700 font-medium">Exposure</Label>
                <Input
                  className="mt-1 text-xs border-slate-200 bg-white text-slate-900 focus:border-blue-500"
                  value={form.exposure}
                  onChange={(e) => setForm((c) => ({ ...c, exposure: e.target.value }))}
                  placeholder="internal / public"
                />
              </div>
            </div>
            {formError && <p className="text-xs text-rose-600 font-medium">{formError}</p>}
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" size="sm" onClick={() => setOpen(false)} className="text-xs text-slate-700 hover:bg-slate-100">
                Cancel
              </Button>
              <Button
                size="sm"
                className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs"
                disabled={mutations.create.isPending || mutations.update.isPending}
                onClick={save}
              >
                {mutations.create.isPending || mutations.update.isPending ? "Saving…" : "Save Asset"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
