"use client";

import { useState } from "react";
import { DashboardCard } from "@/components/DashboardCard";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState, ErrorState, LoadingState } from "@/components/QueryStates";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/misc";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAddComplianceEvidence, useCompliance, useComplianceFramework } from "@/lib/hooks/useCompliance";
import { ApiError } from "@/lib/api/client";

const CATALOG = ["NIST CSF", "ISO 27001", "CIS Controls", "RBI", "SEBI"];

export default function CompliancePage() {
  const summary = useCompliance();
  const [framework, setFramework] = useState("NIST CSF");
  const detail = useComplianceFramework(framework);
  const add = useAddComplianceEvidence();
  const [form, setForm] = useState({ requirement: "", status: "partial", score: "60", evidence: "" });
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3">
        <PageHeader
          title="Compliance & Regulatory Assurance"
          description="Continuous control alignment across NIST CSF, ISO 27001, CIS Controls, RBI, and SEBI cyber frameworks."
        />
        <div className="p-3 rounded-lg border border-cyan-500/20 bg-cyan-950/20 text-xs text-cyan-200 flex items-center gap-2">
          <span className="font-semibold uppercase tracking-wider text-cyan-400">Assurance Disclaimer:</span>
          <span>Control alignment assessment — not an official statutory audit certification. Hashes anchored for tamper-evident assurance.</span>
        </div>
      </div>

      {summary.isLoading ? (
        <LoadingState />
      ) : summary.isError ? (
        <ErrorState message="Unable to load compliance." onRetry={() => summary.refetch()} />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {CATALOG.map((name) => {
              const row = summary.data?.frameworks.find((item) => item.framework === name);
              const coveragePct = row && row.controls > 0 ? Math.round((row.compliant / row.controls) * 100) : 0;
              const gaps = row ? row.controls - row.compliant : 0;
              return (
                <button
                  key={name}
                  type="button"
                  onClick={() => setFramework(name)}
                  className={`rounded-lg border p-4 text-left transition-all ${
                    framework === name
                      ? "border-cyan-400 bg-cyan-950/40 shadow-lg shadow-cyan-950/40"
                      : "border-white/10 bg-[#0c1322] hover:border-slate-700"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-200">{name}</p>
                    <span className="font-mono text-xs text-cyan-400 font-bold">{row ? `${row.score}/100` : "—"}</span>
                  </div>
                  <div className="mt-3 flex items-baseline justify-between">
                    <p className="font-mono text-2xl font-bold text-white">{coveragePct}%</p>
                    <span className="text-[10px] text-slate-400 uppercase">Coverage</span>
                  </div>
                  <div className="mt-2 w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                    <div
                      className="bg-cyan-400 h-1.5 rounded-full transition-all duration-500"
                      style={{ width: `${coveragePct}%` }}
                    />
                  </div>
                  <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400">
                    <span>{row ? `${row.compliant}/${row.controls} Passed` : "0 Controls"}</span>
                    {gaps > 0 ? (
                      <span className="text-rose-400 font-medium">{gaps} Gaps</span>
                    ) : (
                      <span className="text-emerald-400 font-medium">Aligned</span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
          <DashboardCard title={`${framework} requirements`}>
            {detail.isLoading ? (
              <LoadingState />
            ) : detail.isError ? (
              <EmptyState title="No mapped controls" description={`${framework} has no stored evidence yet. Add a requirement below.`} />
            ) : (detail.data?.length ?? 0) === 0 ? (
              <EmptyState title="No mapped controls" description="Add evidence to start a gap analysis." />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Requirement</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Score</TableHead>
                    <TableHead>Evidence</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {detail.data?.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell>{row.requirement}</TableCell>
                      <TableCell className="capitalize">{row.status.replaceAll("_", " ")}</TableCell>
                      <TableCell className="font-mono">{row.score}</TableCell>
                      <TableCell className="text-xs text-slate-400">{row.evidence ?? "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </DashboardCard>
          <DashboardCard title="Add evidence">
            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <Label>Requirement</Label>
                <Input className="mt-1" value={form.requirement} onChange={(e) => setForm((c) => ({ ...c, requirement: e.target.value }))} />
              </div>
              <div>
                <Label>Status</Label>
                <Select value={form.status} onValueChange={(v) => setForm((c) => ({ ...c, status: v }))}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["compliant", "partial", "non_compliant", "not_assessed"].map((item) => (
                      <SelectItem key={item} value={item}>{item.replaceAll("_", " ")}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Score</Label>
                <Input className="mt-1 font-mono" value={form.score} onChange={(e) => setForm((c) => ({ ...c, score: e.target.value }))} />
              </div>
              <div>
                <Label>Evidence note</Label>
                <Input className="mt-1" value={form.evidence} onChange={(e) => setForm((c) => ({ ...c, evidence: e.target.value }))} />
              </div>
            </div>
            {error ? <p className="mt-2 text-sm text-amber-200">{error}</p> : null}
            <Button
              className="mt-4"
              onClick={async () => {
                if (!form.requirement) {
                  setError("Requirement is required.");
                  return;
                }
                setError(null);
                try {
                  await add.mutateAsync({
                    framework,
                    requirement: form.requirement,
                    status: form.status,
                    score: Number(form.score),
                    evidence: form.evidence || null,
                  });
                  setForm({ requirement: "", status: "partial", score: "60", evidence: "" });
                } catch (err) {
                  setError(err instanceof ApiError ? err.message : "Save failed.");
                }
              }}
              disabled={add.isPending}
            >
              Record evidence
            </Button>
          </DashboardCard>
        </>
      )}
    </div>
  );
}
