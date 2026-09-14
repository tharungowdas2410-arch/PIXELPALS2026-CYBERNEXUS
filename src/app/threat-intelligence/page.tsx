"use client";

import { useState } from "react";
import { z } from "zod";
import { DashboardCard } from "@/components/DashboardCard";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState, ErrorState, LoadingState } from "@/components/QueryStates";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/misc";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useThreatMutations, useThreats } from "@/lib/hooks/useInventory";
import { ApiError } from "@/lib/api/client";

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
  const [form, setForm] = useState({ name: "", category: "identity", likelihood: "0.5", sophistication: "0.5" });
  const rows = query.data?.data ?? [];
  const active = rows.filter((item) => item.active);

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
    <div className="space-y-5">
      <PageHeader
        title="Threat Intelligence"
        description="Catalogued threats used by risk quantification. Not a live intel feed."
        actions={<Button size="sm" onClick={() => { setError(null); setOpen(true); }}>New threat</Button>}
      />
      {query.isLoading ? (
        <LoadingState />
      ) : query.isError ? (
        <ErrorState message="Unable to load threat intelligence." onRetry={() => query.refetch()} />
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-3">
            <DashboardCard title="Active threats">
              <p className="font-mono text-3xl text-white">{active.length}</p>
            </DashboardCard>
            <DashboardCard title="Catalog size">
              <p className="font-mono text-3xl text-white">{rows.length}</p>
            </DashboardCard>
            <DashboardCard title="Avg likelihood">
              <p className="font-mono text-3xl text-white">
                {rows.length ? (rows.reduce((sum, item) => sum + item.likelihood, 0) / rows.length).toFixed(2) : "0"}
              </p>
            </DashboardCard>
          </div>
          {rows.length === 0 ? (
            <EmptyState title="No threats" description="Add a threat catalog entry." />
          ) : (
            <div className="rounded-lg border border-white/10 bg-[#0c1322]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Threat</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Likelihood</TableHead>
                    <TableHead>Sophistication</TableHead>
                    <TableHead>Active</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell>
                        <p className="font-medium">{row.name}</p>
                        <p className="mt-1 max-w-md text-xs text-slate-500">{row.description ?? "—"}</p>
                      </TableCell>
                      <TableCell>{row.category}</TableCell>
                      <TableCell className="font-mono">{row.likelihood.toFixed(2)}</TableCell>
                      <TableCell className="font-mono">{row.sophistication.toFixed(2)}</TableCell>
                      <TableCell>{row.active ? "Yes" : "No"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </>
      )}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-white">Add threat</DialogTitle>
          </DialogHeader>
          {(["name", "category", "likelihood", "sophistication"] as const).map((key) => (
            <div key={key} className="mt-3">
              <Label className="capitalize">{key}</Label>
              <Input className="mt-1" value={form[key]} onChange={(e) => setForm((c) => ({ ...c, [key]: e.target.value }))} />
            </div>
          ))}
          {error ? <p className="mt-3 text-sm text-amber-200">{error}</p> : null}
          <div className="mt-4 flex justify-end">
            <Button onClick={save} disabled={mutations.create.isPending}>Save</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
