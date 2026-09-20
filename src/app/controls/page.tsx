"use client";

import { useState } from "react";
import { z } from "zod";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState, ErrorState, LoadingState } from "@/components/QueryStates";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/misc";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useControlMutations, useControls } from "@/lib/hooks/useInventory";
import { formatInr, formatPercent } from "@/lib/format";
import { ApiError } from "@/lib/api/client";
import type { ImplementationStatus } from "@/lib/types/api";

const schema = z.object({
  name: z.string().min(1),
  framework: z.string().min(1),
  category: z.string().min(1),
  effectiveness: z.coerce.number().min(0).max(1),
  annual_cost: z.coerce.number().min(0),
  implementation_status: z.enum(["planned", "partial", "implemented", "not_implemented"]),
});

export default function ControlsPage() {
  const query = useControls({ page_size: 100 });
  const mutations = useControlMutations();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    framework: "NIST CSF",
    category: "identity",
    effectiveness: "0.5",
    annual_cost: "100000",
    implementation_status: "planned",
  });

  async function save() {
    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      setError("Complete control fields. Effectiveness must be 0–1.");
      return;
    }
    try {
      await mutations.create.mutateAsync({
        ...parsed.data,
        implementation_status: parsed.data.implementation_status as ImplementationStatus,
      });
      setOpen(false);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Save failed.");
    }
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Security Controls"
        description="Effectiveness and implementation status feed residual risk."
        actions={<Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white font-medium shadow-xs" onClick={() => { setError(null); setOpen(true); }}>New control</Button>}
      />
      {query.isLoading ? (
        <LoadingState />
      ) : query.isError ? (
        <ErrorState message="Unable to load controls." onRetry={() => query.refetch()} />
      ) : (query.data?.data.length ?? 0) === 0 ? (
        <EmptyState title="No controls" description="Add a control to reduce residual risk." />
      ) : (
        <div className="rounded-lg border border-slate-200 bg-white shadow-xs overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50 hover:bg-slate-50">
                <TableHead className="text-slate-700 font-semibold">Control</TableHead>
                <TableHead className="text-slate-700 font-semibold">Framework</TableHead>
                <TableHead className="text-slate-700 font-semibold">Category</TableHead>
                <TableHead className="text-slate-700 font-semibold">Effectiveness</TableHead>
                <TableHead className="text-slate-700 font-semibold">Status</TableHead>
                <TableHead className="text-slate-700 font-semibold">Annual cost</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {query.data?.data.map((row) => (
                <TableRow key={row.id} className="hover:bg-slate-50/80">
                  <TableCell className="font-semibold text-slate-900">{row.name}</TableCell>
                  <TableCell className="text-slate-700">{row.framework}</TableCell>
                  <TableCell className="text-slate-600">{row.category}</TableCell>
                  <TableCell className="font-mono font-medium text-blue-700">{formatPercent(row.effectiveness * 100)}</TableCell>
                  <TableCell className="capitalize text-slate-700">{row.implementation_status.replaceAll("_", " ")}</TableCell>
                  <TableCell className="font-mono font-semibold text-slate-900">{formatInr(Number(row.annual_cost))}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="border-slate-200 bg-white text-slate-800 shadow-xl">
          <DialogHeader>
            <DialogTitle className="text-slate-900 font-bold">Add control</DialogTitle>
          </DialogHeader>
          {(["name", "framework", "category", "effectiveness", "annual_cost"] as const).map((key) => (
            <div key={key} className="mt-3">
              <Label className="capitalize text-slate-700 font-medium">{key.replaceAll("_", " ")}</Label>
              <Input className="mt-1 border-slate-200 bg-white text-slate-900 focus:border-blue-500" value={form[key]} onChange={(e) => setForm((c) => ({ ...c, [key]: e.target.value }))} />
            </div>
          ))}
          <div className="mt-3">
            <Label className="text-slate-700 font-medium">Implementation</Label>
            <Select value={form.implementation_status} onValueChange={(v) => setForm((c) => ({ ...c, implementation_status: v }))}>
              <SelectTrigger className="mt-1 border-slate-200 bg-white text-slate-900 focus:border-blue-500"><SelectValue /></SelectTrigger>
              <SelectContent className="bg-white border-slate-200 text-xs shadow-lg">
                {["planned", "partial", "implemented", "not_implemented"].map((item) => (
                  <SelectItem key={item} value={item}>{item.replaceAll("_", " ")}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {error ? <p className="mt-3 text-sm text-rose-600 font-medium">{error}</p> : null}
          <div className="mt-4 flex justify-end">
            <Button onClick={save} disabled={mutations.create.isPending} className="bg-blue-600 hover:bg-blue-700 text-white shadow-xs">Save</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
