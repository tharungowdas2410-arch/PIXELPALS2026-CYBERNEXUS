"use client";

import Link from "next/link";
import { useState } from "react";
import { z } from "zod";
import { PageHeader } from "@/components/PageHeader";
import { RiskBadge } from "@/components/RiskBadge";
import { EmptyState, ErrorState, LoadingState } from "@/components/QueryStates";
import { IllustrativeNote } from "@/components/IllustrativeNote";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/misc";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useIncidentMutations, useIncidents } from "@/lib/hooks/useIncidents";
import { formatDateTime, formatInr } from "@/lib/format";
import { toUiRiskLevel } from "@/lib/level";
import { ApiError } from "@/lib/api/client";
import type { Severity } from "@/lib/types/api";

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
  const [form, setForm] = useState({ title: "", severity: "high", estimated_loss: "0", description: "" });

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
    <div className="space-y-5">
      <PageHeader
        title="Incidents"
        description="Operational events with estimated loss and affected assets."
        actions={
          <div className="flex items-center gap-3">
            <IllustrativeNote />
            <Button size="sm" onClick={() => { setError(null); setOpen(true); }}>New incident</Button>
          </div>
        }
      />
      {query.isLoading ? (
        <LoadingState />
      ) : query.isError ? (
        <ErrorState message="Unable to load incidents." onRetry={() => query.refetch()} />
      ) : (query.data?.data.length ?? 0) === 0 ? (
        <EmptyState title="No incidents" description="Record an incident to start the operational timeline." />
      ) : (
        <div className="rounded-lg border border-white/10 bg-[#0c1322]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Incident</TableHead>
                <TableHead>Severity</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Affected assets</TableHead>
                <TableHead>Estimated loss</TableHead>
                <TableHead>Detected</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {query.data?.data.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>
                    <Link href={`/incidents/${item.id}`} className="text-cyan-200 hover:underline">{item.title}</Link>
                  </TableCell>
                  <TableCell><RiskBadge level={toUiRiskLevel(item.severity)} /></TableCell>
                  <TableCell className="capitalize">{item.status}</TableCell>
                  <TableCell className="max-w-56 text-xs text-slate-400">{(item.affected_assets ?? []).join(", ") || "—"}</TableCell>
                  <TableCell className="font-mono">{formatInr(Number(item.estimated_loss))}</TableCell>
                  <TableCell className="font-mono text-xs">{item.detected_at ? formatDateTime(item.detected_at) : "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-white">Record incident</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Title</Label>
              <Input className="mt-1" value={form.title} onChange={(e) => setForm((c) => ({ ...c, title: e.target.value }))} />
            </div>
            <div>
              <Label>Severity</Label>
              <Select value={form.severity} onValueChange={(v) => setForm((c) => ({ ...c, severity: v }))}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["critical", "high", "medium", "low"].map((item) => (
                    <SelectItem key={item} value={item}>{item}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Estimated loss</Label>
              <Input className="mt-1 font-mono" value={form.estimated_loss} onChange={(e) => setForm((c) => ({ ...c, estimated_loss: e.target.value }))} />
            </div>
            <div>
              <Label>Description</Label>
              <Input className="mt-1" value={form.description} onChange={(e) => setForm((c) => ({ ...c, description: e.target.value }))} />
            </div>
          </div>
          {error ? <p className="mt-3 text-sm text-amber-200">{error}</p> : null}
          <div className="mt-4 flex justify-end">
            <Button onClick={save} disabled={mutations.create.isPending}>Save</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
