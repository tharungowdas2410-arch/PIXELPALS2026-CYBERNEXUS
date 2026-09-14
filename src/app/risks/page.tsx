"use client";

import Link from "next/link";
import { useState } from "react";
import { z } from "zod";
import { DashboardCard } from "@/components/DashboardCard";
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
import { useControls, useThreats } from "@/lib/hooks/useInventory";
import { useCalculateRisk, useRiskSummary, useRisks } from "@/lib/hooks/useRisks";
import { useVulnerabilities } from "@/lib/hooks/useVulnerabilities";
import { formatInr } from "@/lib/format";
import { num, toUiRiskLevel } from "@/lib/level";
import { ApiError } from "@/lib/api/client";

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
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    asset_id: "",
    vulnerability_id: "none",
    threat_id: "none",
    control_id: "none",
    likelihood: "0.6",
    impact: "0.7",
  });

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

  return (
    <div className="space-y-5">
      <PageHeader
        title="Risk Center"
        description="Deterministic quantification across Organization → Asset → Vulnerability → Threat → Control."
        actions={
          <div className="flex items-center gap-3">
            <IllustrativeNote />
            <Button size="sm" onClick={() => { setError(null); setOpen(true); }}>Calculate risk</Button>
          </div>
        }
      />
      {summary.isLoading ? (
        <LoadingState />
      ) : summary.isError ? (
        <ErrorState message="Unable to load risk summary." onRetry={() => summary.refetch()} />
      ) : summary.data ? (
        <div className="grid gap-4 md:grid-cols-4">
          <Stat label="Open risks" value={String(summary.data.count)} />
          <Stat label="Avg inherent" value={summary.data.average_inherent_risk.toFixed(1)} />
          <Stat label="Avg residual" value={summary.data.average_residual_risk.toFixed(1)} />
          <Stat label="Illustrative EAL" value={formatInr(summary.data.total_expected_annual_loss)} />
        </div>
      ) : null}

      {list.isLoading ? (
        <LoadingState />
      ) : list.isError ? (
        <ErrorState message="Unable to load risks." onRetry={() => list.refetch()} />
      ) : (list.data?.data.length ?? 0) === 0 ? (
        <EmptyState title="No quantified risks" description="Calculate a risk to persist a scored record." />
      ) : (
        <div className="rounded-lg border border-white/10 bg-[#0c1322]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Risk</TableHead>
                <TableHead>Level</TableHead>
                <TableHead>Inherent</TableHead>
                <TableHead>Residual</TableHead>
                <TableHead>EAL</TableHead>
                <TableHead>Drivers</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {list.data?.data.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>
                    <Link href={`/risks/${row.id}`} className="text-cyan-200 hover:underline">{row.id.slice(0, 8)}</Link>
                  </TableCell>
                  <TableCell><RiskBadge level={toUiRiskLevel(row.risk_level ?? row.residual_risk)} /></TableCell>
                  <TableCell className="font-mono">{num(row.inherent_risk ?? row.risk_score).toFixed(2)}</TableCell>
                  <TableCell className="font-mono">{row.residual_risk.toFixed(2)}</TableCell>
                  <TableCell className="font-mono">{formatInr(num(row.expected_annual_loss ?? 0))}</TableCell>
                  <TableCell className="max-w-64 text-xs text-slate-400">{(row.drivers ?? []).slice(0, 2).join(" · ")}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-white">Calculate risk</DialogTitle>
            <DialogDescription className="text-slate-400">Deterministic formula. No ML.</DialogDescription>
          </DialogHeader>
          <FieldSelect label="Asset" value={form.asset_id} onChange={(v) => setForm((c) => ({ ...c, asset_id: v }))} options={(assets.data?.data ?? []).map((i) => ({ value: i.id, label: i.name }))} />
          <FieldSelect label="Vulnerability" value={form.vulnerability_id} onChange={(v) => setForm((c) => ({ ...c, vulnerability_id: v }))} options={[{ value: "none", label: "None" }, ...(vulns.data?.data ?? []).map((i) => ({ value: i.id, label: i.title }))]} />
          <FieldSelect label="Threat" value={form.threat_id} onChange={(v) => setForm((c) => ({ ...c, threat_id: v }))} options={[{ value: "none", label: "None" }, ...(threats.data?.data ?? []).map((i) => ({ value: i.id, label: i.name }))]} />
          <FieldSelect label="Control" value={form.control_id} onChange={(v) => setForm((c) => ({ ...c, control_id: v }))} options={[{ value: "none", label: "None" }, ...(controls.data?.data ?? []).map((i) => ({ value: i.id, label: i.name }))]} />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Likelihood</Label>
              <Input className="mt-1 font-mono" value={form.likelihood} onChange={(e) => setForm((c) => ({ ...c, likelihood: e.target.value }))} />
            </div>
            <div>
              <Label>Impact</Label>
              <Input className="mt-1 font-mono" value={form.impact} onChange={(e) => setForm((c) => ({ ...c, impact: e.target.value }))} />
            </div>
          </div>
          {error ? <p className="text-sm text-amber-200">{error}</p> : null}
          <div className="mt-4 flex justify-end">
            <Button onClick={run} disabled={calculate.isPending}>Run</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <DashboardCard title={label}>
      <p className="font-mono text-2xl text-white">{value}</p>
    </DashboardCard>
  );
}

function FieldSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
}) {
  return (
    <div className="mt-3">
      <Label>{label}</Label>
      <Select value={value || undefined} onValueChange={onChange}>
        <SelectTrigger className="mt-1"><SelectValue placeholder={label} /></SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
