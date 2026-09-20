"use client";

import { useState } from "react";
import { z } from "zod";
import {
  Skull,
  ShieldAlert,
  Flame,
  Plus,
  Activity,
  Zap,
  CheckCircle2,
} from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState, ErrorState, LoadingState } from "@/components/QueryStates";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/misc";
import { Badge } from "@/components/ui/badge";
import { EnterpriseDataTable, type ColumnDef } from "@/components/enterprise/EnterpriseDataTable";
import { DetailDrawer, type DrawerEntity } from "@/components/enterprise/DetailDrawer";
import { useThreatMutations, useThreats } from "@/lib/hooks/useInventory";
import { ApiError } from "@/lib/api/client";
import type { Threat } from "@/lib/types/api";

const schema = z.object({
  name: z.string().min(1),
  category: z.string().min(1),
  likelihood: z.coerce.number().min(0).max(1),
  sophistication: z.coerce.number().min(0).max(1),
});

export default function ThreatIntelligencePage() {
  const query = useThreats({ page_size: 100 });
  const mutations = useThreatMutations();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedEntity, setSelectedEntity] = useState<DrawerEntity | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const [form, setForm] = useState({
    name: "",
    category: "identity",
    likelihood: "0.5",
    sophistication: "0.5",
  });

  const rows = query.data?.data ?? [];
  const active = rows.filter((item) => item.active);
  const highSophistication = rows.filter((item) => item.sophistication >= 0.7);

  const handleRowClick = (item: Threat) => {
    setSelectedEntity({
      type: "threat",
      id: item.id,
      title: item.name,
      severity: item.sophistication >= 0.8 ? "CRITICAL" : item.sophistication >= 0.6 ? "HIGH" : "MEDIUM",
      status: item.active ? "ACTIVE THREAT" : "INACTIVE",
      threatActor: item.name,
      recommendedAction: "Harden authentication policies, inspect egress network telemetry, and cross-reference IOCs against SIEM/EDR.",
      details: [
        { label: "Threat Category", value: item.category.toUpperCase() },
        { label: "Threat Likelihood", value: `${(item.likelihood * 100).toFixed(0)}% Probability` },
        { label: "Adversary Sophistication", value: `${(item.sophistication * 100).toFixed(0)}% (Nation-State / Organized)` },
        { label: "Operational State", value: item.active ? "Active in Wild" : "Dormant / Theoretical" },
      ],
    });
    setDrawerOpen(true);
  };

  const columns: ColumnDef<Threat>[] = [
    {
      header: "Threat Actor / Campaign",
      accessorKey: "name",
      cell: (item) => (
        <div>
          <span className="font-semibold text-slate-900 text-xs block">{item.name}</span>
          <span className="text-[10px] text-slate-500 line-clamp-1">{item.description || "Identified threat scenario"}</span>
        </div>
      ),
    },
    {
      header: "Category",
      accessorKey: "category",
      cell: (item) => (
        <Badge variant="outline" className="border-[#E2E8F0] bg-slate-50 text-slate-700 text-[10px] uppercase font-mono">
          {item.category}
        </Badge>
      ),
    },
    {
      header: "Likelihood",
      accessorKey: "likelihood",
      cell: (item) => (
        <div className="flex items-center gap-1.5">
          <div className="w-12 bg-slate-200 rounded-full h-1.5 overflow-hidden">
            <div
              className="h-1.5 rounded-full bg-blue-600"
              style={{ width: `${item.likelihood * 100}%` }}
            />
          </div>
          <span className="font-mono text-xs text-slate-700">{(item.likelihood * 100).toFixed(0)}%</span>
        </div>
      ),
    },
    {
      header: "Sophistication",
      accessorKey: "sophistication",
      cell: (item) => (
        <Badge
          className={`text-[10px] font-bold ${
            item.sophistication >= 0.7
              ? "bg-red-50 text-red-700 border-red-200"
              : item.sophistication >= 0.4
              ? "bg-amber-50 text-amber-700 border-amber-200"
              : "bg-blue-50 text-blue-700 border-blue-200"
          }`}
        >
          {(item.sophistication * 100).toFixed(0)}% Score
        </Badge>
      ),
    },
    {
      header: "Active",
      accessorKey: "active",
      cell: (item) => (
        <Badge
          variant="outline"
          className={`text-[10px] ${item.active ? "border-red-200 text-red-700 bg-red-50 font-bold" : "border-[#E2E8F0] text-slate-500 bg-slate-50"}`}
        >
          {item.active ? "ACTIVE" : "DORMANT"}
        </Badge>
      ),
    },
  ];

  async function save() {
    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      setError("Name, category and 0–1 scores are required.");
      return;
    }
    try {
      await mutations.create.mutateAsync(parsed.data);
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
            <span className="flex h-2 w-2 rounded-full bg-red-500" />
            <Badge variant="outline" className="border-red-200 bg-red-50 text-red-700 text-[10px] uppercase tracking-wider font-semibold">
              Threat Actor Telemetry
            </Badge>
          </div>
          <PageHeader
            eyebrow="External Adversary Profiling"
            title="Threat Intelligence"
            description="Catalogued external threat capabilities and likelihood distributions driving the Open FAIR probability calculations."
          />
        </div>
        <Button
          size="sm"
          className="bg-[#2563EB] hover:bg-blue-700 text-white text-xs font-semibold shadow-xs"
          onClick={() => {
            setError(null);
            setOpen(true);
          }}
        >
          <Plus className="mr-1.5 h-3.5 w-3.5" />
          Catalog Threat
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-[#E2E8F0] bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span className="font-semibold uppercase tracking-wider">Active Adversaries</span>
            <Skull className="h-4 w-4 text-red-600" />
          </div>
          <div className="text-2xl font-bold font-mono text-red-600">{active.length}</div>
          <span className="text-[11px] text-red-600/80">Actively observed in telemetry</span>
        </div>

        <div className="rounded-xl border border-[#E2E8F0] bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span className="font-semibold uppercase tracking-wider">Catalog Size</span>
            <ShieldAlert className="h-4 w-4 text-blue-600" />
          </div>
          <div className="text-2xl font-bold font-mono text-slate-900">{rows.length}</div>
          <span className="text-[11px] text-slate-500">Total threat models</span>
        </div>

        <div className="rounded-xl border border-[#E2E8F0] bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span className="font-semibold uppercase tracking-wider">High Sophistication</span>
            <Flame className="h-4 w-4 text-amber-600" />
          </div>
          <div className="text-2xl font-bold font-mono text-amber-700">{highSophistication.length}</div>
          <span className="text-[11px] text-amber-700/80">Nation-state / APT grade</span>
        </div>

        <div className="rounded-xl border border-[#E2E8F0] bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span className="font-semibold uppercase tracking-wider">Avg Likelihood</span>
            <Activity className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-700">
            {rows.length ? `${((rows.reduce((sum, item) => sum + item.likelihood, 0) / rows.length) * 100).toFixed(0)}%` : "0%"}
          </div>
          <span className="text-[11px] text-emerald-700/80">Mean event probability</span>
        </div>
      </div>

      {/* Main Enterprise Data Table */}
      {query.isLoading ? (
        <LoadingState />
      ) : query.isError ? (
        <ErrorState message="Unable to load threat intelligence." onRetry={() => query.refetch()} />
      ) : (
        <EnterpriseDataTable
          title="Adversary Catalog & Threat Capabilities"
          subtitle="Click any threat to inspect capability score, targeted attack paths, and defense countermeasures"
          data={rows}
          columns={columns}
          searchPlaceholder="Search threat actor, category, or tactic…"
          onRowClick={handleRowClick}
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
        <DialogContent className="border-[#E2E8F0] bg-white text-slate-900 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-slate-900">Catalog Threat Intelligence Entry</DialogTitle>
            <DialogDescription className="text-slate-500 text-xs">
              Define adversary characteristics to feed probability models.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 text-xs">
            <div>
              <Label className="text-slate-700">Threat Name / Actor</Label>
              <Input
                className="mt-1 text-xs border-[#CBD5E1] bg-white text-slate-900 focus:border-[#2563EB]"
                value={form.name}
                onChange={(e) => setForm((c) => ({ ...c, name: e.target.value }))}
                placeholder="e.g. APT29 / Midnight Blizzard"
              />
            </div>
            <div>
              <Label className="text-slate-700">Category</Label>
              <Input
                className="mt-1 text-xs border-[#CBD5E1] bg-white text-slate-900 focus:border-[#2563EB]"
                value={form.category}
                onChange={(e) => setForm((c) => ({ ...c, category: e.target.value }))}
                placeholder="identity, ransomware, espionage, supply-chain"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-slate-700">Likelihood (0.0 to 1.0)</Label>
                <Input
                  className="mt-1 font-mono text-xs border-[#CBD5E1] bg-white text-slate-900 focus:border-[#2563EB]"
                  value={form.likelihood}
                  onChange={(e) => setForm((c) => ({ ...c, likelihood: e.target.value }))}
                />
              </div>
              <div>
                <Label className="text-slate-700">Sophistication (0.0 to 1.0)</Label>
                <Input
                  className="mt-1 font-mono text-xs border-[#CBD5E1] bg-white text-slate-900 focus:border-[#2563EB]"
                  value={form.sophistication}
                  onChange={(e) => setForm((c) => ({ ...c, sophistication: e.target.value }))}
                />
              </div>
            </div>
            {error && <p className="text-xs text-red-600">{error}</p>}
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
                {mutations.create.isPending ? "Saving…" : "Save Threat"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
