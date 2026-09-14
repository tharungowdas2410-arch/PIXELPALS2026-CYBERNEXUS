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
        actions={<Button size="sm" onClick={() => { setError(null); setOpen(true); }}>New control</Button>}
      />
      {query.isLoading ? (
        <LoadingState />
      ) : query.isError ? (
        <ErrorState message="Unable to load controls." onRetry={() => query.refetch()} />
      ) : (query.data?.data.length ?? 0) === 0 ? (
        <EmptyState title="No controls" description="Add a control to reduce residual risk." />
      ) : (
        <div className="rounded-lg border border-white/10 bg-[#0c1322]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Control</TableHead>
                <TableHead>Framework</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Effectiveness</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Annual cost</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {query.data?.data.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="font-medium">{row.name}</TableCell>
                  <TableCell>{row.framework}</TableCell>
                  <TableCell>{row.category}</TableCell>
                  <TableCell className="font-mono">{formatPercent(row.effectiveness * 100)}</TableCell>
                  <TableCell className="capitalize">{row.implementation_status.replaceAll("_", " ")}</TableCell>
                  <TableCell className="font-mono">{formatInr(Number(row.annual_cost))}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-white">Add control</DialogTitle>
          </DialogHeader>
          {(["name", "framework", "category", "effectiveness", "annual_cost"] as const).map((key) => (
            <div key={key} className="mt-3">
              <Label className="capitalize">{key.replaceAll("_", " ")}</Label>
              <Input className="mt-1" value={form[key]} onChange={(e) => setForm((c) => ({ ...c, [key]: e.target.value }))} />
            </div>
          ))}
          <div className="mt-3">
            <Label>Implementation</Label>
            <Select value={form.implementation_status} onValueChange={(v) => setForm((c) => ({ ...c, implementation_status: v }))}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                {["planned", "partial", "implemented", "not_implemented"].map((item) => (
                  <SelectItem key={item} value={item}>{item.replaceAll("_", " ")}</SelectItem>
                ))}
              </SelectContent>
            </Select>
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
