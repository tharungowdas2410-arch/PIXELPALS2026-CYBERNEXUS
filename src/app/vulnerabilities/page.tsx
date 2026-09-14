"use client";

import { useMemo, useState } from "react";
import { z } from "zod";
import { FilterBar } from "@/components/FilterBar";
import { IllustrativeNote } from "@/components/IllustrativeNote";
import { PageHeader } from "@/components/PageHeader";
import { RiskBadge } from "@/components/RiskBadge";
import { EmptyState, ErrorState, LoadingState } from "@/components/QueryStates";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/misc";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAssets } from "@/lib/hooks/useAssets";
import { useVulnerabilities, useVulnerabilityMutations } from "@/lib/hooks/useVulnerabilities";
import { ApiError } from "@/lib/api/client";
import { toUiRiskLevel } from "@/lib/level";
import type { Severity } from "@/lib/types/api";

const schema = z.object({
  asset_id: z.string().uuid(),
  title: z.string().min(1),
  cve_id: z.string().optional(),
  severity: z.enum(["low", "medium", "high", "critical"]),
  exploitability: z.coerce.number().min(0).max(1),
  cvss_score: z.coerce.number().min(0).max(10).optional(),
});

export default function VulnerabilitiesPage() {
  const [severity, setSeverity] = useState("all");
  const [status, setStatus] = useState("all");
  const assets = useAssets({ page_size: 100 });
  const query = useVulnerabilities({
    page_size: 100,
    severity: severity === "all" ? undefined : severity,
    remediation_status: status === "all" ? undefined : status,
  });
  const mutations = useVulnerabilityMutations();
  const [open, setOpen] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [form, setForm] = useState({
    asset_id: "",
    title: "",
    cve_id: "",
    severity: "high",
    exploitability: "0.5",
    cvss_score: "7.5",
  });

  const assetName = useMemo(() => {
    const map = new Map((assets.data?.data ?? []).map((item) => [item.id, item.name]));
    return (id: string) => map.get(id) ?? id.slice(0, 8);
  }, [assets.data]);

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
    <div className="space-y-5">
      <PageHeader
        title="Vulnerabilities"
        description="Findings linked to assets, CVSS and exploitability."
        actions={
          <div className="flex items-center gap-3">
            <IllustrativeNote />
            <Button size="sm" onClick={() => { setFormError(null); setOpen(true); }}>New finding</Button>
          </div>
        }
      />
      <FilterBar>
        <SelectFilter label="Severity" value={severity} onChange={setSeverity} options={["all", "critical", "high", "medium", "low"]} />
        <SelectFilter label="Status" value={status} onChange={setStatus} options={["all", "open", "in_progress", "mitigated", "accepted", "closed"]} />
      </FilterBar>
      {query.isLoading ? (
        <LoadingState />
      ) : query.isError ? (
        <ErrorState message="Unable to load vulnerabilities." onRetry={() => query.refetch()} />
      ) : (query.data?.data.length ?? 0) === 0 ? (
        <EmptyState title="No findings" description="No vulnerabilities match the current filters." />
      ) : (
        <div className="rounded-lg border border-white/10 bg-[#0c1322]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>CVE</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Asset</TableHead>
                <TableHead>Severity</TableHead>
                <TableHead>CVSS</TableHead>
                <TableHead>Exploitability</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {query.data?.data.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="font-mono text-cyan-200">{row.cve_id ?? "—"}</TableCell>
                  <TableCell>{row.title}</TableCell>
                  <TableCell>{assetName(row.asset_id)}</TableCell>
                  <TableCell><RiskBadge level={toUiRiskLevel(row.severity)} /></TableCell>
                  <TableCell className="font-mono">{row.cvss_score ?? "—"}</TableCell>
                  <TableCell className="font-mono">{row.exploitability.toFixed(2)}</TableCell>
                  <TableCell className="capitalize">{row.remediation_status.replaceAll("_", " ")}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-white">Create vulnerability</DialogTitle>
            <DialogDescription className="text-slate-400">Linked to an existing asset.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <div>
              <Label>Asset</Label>
              <Select value={form.asset_id} onValueChange={(v) => setForm((c) => ({ ...c, asset_id: v }))}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Select asset" /></SelectTrigger>
                <SelectContent>
                  {(assets.data?.data ?? []).map((item) => (
                    <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {(["title", "cve_id", "exploitability", "cvss_score"] as const).map((key) => (
              <div key={key}>
                <Label className="capitalize">{key.replaceAll("_", " ")}</Label>
                <Input className="mt-1" value={form[key]} onChange={(e) => setForm((c) => ({ ...c, [key]: e.target.value }))} />
              </div>
            ))}
            <div>
              <Label>Severity</Label>
              <Select value={form.severity} onValueChange={(v) => setForm((c) => ({ ...c, severity: v }))}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(["critical", "high", "medium", "low"] as const).map((item) => (
                    <SelectItem key={item} value={item}>{item}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          {formError ? <p className="mt-3 text-sm text-amber-200">{formError}</p> : null}
          <div className="mt-4 flex justify-end">
            <Button onClick={save} disabled={mutations.create.isPending}>Save</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SelectFilter({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
}) {
  return (
    <div>
      <Label>{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="mt-1 w-40"><SelectValue /></SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option} value={option}>{option.replaceAll("_", " ")}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
