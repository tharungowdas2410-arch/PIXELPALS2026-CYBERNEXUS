"use client";

import { useMemo, useState } from "react";
import { z } from "zod";
import { FilterBar } from "@/components/FilterBar";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState, ErrorState, LoadingState } from "@/components/QueryStates";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/misc";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAssetMutations, useAssets } from "@/lib/hooks/useAssets";
import { formatDate, formatInr } from "@/lib/format";
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
  const [search, setSearch] = useState("");
  const [criticality, setCriticality] = useState("all");
  const [environment, setEnvironment] = useState("all");
  const [page, setPage] = useState(1);
  const query = useAssets({
    page,
    page_size: 20,
    search: search || undefined,
    criticality: criticality === "all" ? undefined : Number(criticality),
    environment: environment === "all" ? undefined : environment,
  });
  const mutations = useAssetMutations();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Asset | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    asset_type: "application",
    criticality: "3",
    business_value: "0",
    owner: "",
    environment: "",
    exposure: "",
  });

  const environments = useMemo(
    () => [...new Set((query.data?.data ?? []).map((item) => item.environment).filter(Boolean))] as string[],
    [query.data],
  );

  function startCreate() {
    setEditing(null);
    setForm({
      name: "",
      asset_type: "application",
      criticality: "3",
      business_value: "0",
      owner: "",
      environment: "",
      exposure: "",
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
    <div className="space-y-5">
      <PageHeader
        title="Assets"
        description="Enterprise inventory used by the risk and attack-path models."
        actions={
          <Button size="sm" onClick={startCreate}>
            New asset
          </Button>
        }
      />
      <FilterBar>
        <div>
          <Label>Search</Label>
          <Input className="mt-1 w-56" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder="Name or owner" />
        </div>
        <div>
          <Label>Criticality</Label>
          <Select value={criticality} onValueChange={(v) => { setCriticality(v); setPage(1); }}>
            <SelectTrigger className="mt-1 w-32"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              {[1, 2, 3, 4, 5].map((n) => (
                <SelectItem key={n} value={String(n)}>{n}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Environment</Label>
          <Select value={environment} onValueChange={(v) => { setEnvironment(v); setPage(1); }}>
            <SelectTrigger className="mt-1 w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              {environments.map((item) => (
                <SelectItem key={item} value={item}>{item}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </FilterBar>
      {query.isLoading ? (
        <LoadingState />
      ) : query.isError ? (
        <ErrorState message="Unable to load assets." onRetry={() => query.refetch()} />
      ) : (query.data?.data.length ?? 0) === 0 ? (
        <EmptyState title="No assets" description="Create an asset or adjust filters." />
      ) : (
        <div className="rounded-lg border border-white/10 bg-[#0c1322]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Asset</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Owner</TableHead>
                <TableHead>Criticality</TableHead>
                <TableHead>Exposure</TableHead>
                <TableHead>Business value</TableHead>
                <TableHead>Updated</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {query.data?.data.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="font-medium">{row.name}</TableCell>
                  <TableCell className="capitalize">{row.asset_type.replaceAll("_", " ")}</TableCell>
                  <TableCell>{row.owner ?? "—"}</TableCell>
                  <TableCell className="font-mono">{row.criticality}</TableCell>
                  <TableCell>{row.exposure ?? "—"}</TableCell>
                  <TableCell className="font-mono">{formatInr(Number(row.business_value))}</TableCell>
                  <TableCell className="font-mono text-xs">{formatDate(row.updated_at)}</TableCell>
                  <TableCell className="space-x-2 text-right">
                    <Button size="sm" variant="secondary" onClick={() => startEdit(row)}>Edit</Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => mutations.remove.mutate(row.id)}
                    >
                      Delete
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <div className="flex items-center justify-between px-4 py-3 text-xs text-slate-500">
            <span>{query.data?.total} records</span>
            <div className="space-x-2">
              <Button size="sm" variant="secondary" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Prev</Button>
              <Button size="sm" variant="secondary" disabled={(query.data?.total ?? 0) <= page * 20} onClick={() => setPage((p) => p + 1)}>Next</Button>
            </div>
          </div>
        </div>
      )}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-white">{editing ? "Update asset" : "Create asset"}</DialogTitle>
            <DialogDescription className="text-slate-400">Zod-validated inventory record.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 md:grid-cols-2">
            {(["name", "owner", "environment", "exposure", "business_value", "criticality"] as const).map((key) => (
              <div key={key}>
                <Label className="capitalize">{key.replaceAll("_", " ")}</Label>
                <Input className="mt-1" value={form[key]} onChange={(e) => setForm((c) => ({ ...c, [key]: e.target.value }))} />
              </div>
            ))}
            <div className="md:col-span-2">
              <Label>Type</Label>
              <Select value={form.asset_type} onValueChange={(v) => setForm((c) => ({ ...c, asset_type: v }))}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {types.map((item) => (
                    <SelectItem key={item} value={item}>{item.replaceAll("_", " ")}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          {formError ? <p className="mt-3 text-sm text-amber-200">{formError}</p> : null}
          <div className="mt-4 flex justify-end">
            <Button onClick={save} disabled={mutations.create.isPending || mutations.update.isPending}>Save</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
