"use client";

import { useState } from "react";
import {
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  FileText,
  Plus,
  ArrowRight,
  ExternalLink,
  ChevronRight,
  Layers,
  Sparkles,
  Search,
} from "lucide-react";
import { DashboardCard } from "@/components/DashboardCard";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState, ErrorState, LoadingState } from "@/components/QueryStates";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/misc";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAddComplianceEvidence, useCompliance, useComplianceFramework } from "@/lib/hooks/useCompliance";
import { ApiError } from "@/lib/api/client";
import type { ComplianceRecord } from "@/lib/types/api";

const CATALOG = [
  { id: "NIST CSF", name: "NIST CSF 2.0", desc: "Identify · Protect · Detect · Respond · Recover" },
  { id: "ISO 27001", name: "ISO/IEC 27001", desc: "Information Security Management Standard" },
  { id: "CIS Controls", name: "CIS Controls v8", desc: "Prioritized Actions for Cyber Defense" },
  { id: "RBI", name: "RBI Master Direction", desc: "Cyber Security Framework for Banking Entities" },
  { id: "SEBI", name: "SEBI Framework", desc: "Cyber Resilience Framework for Securities Markets" },
];

export default function CompliancePage() {
  const summary = useCompliance();
  const [framework, setFramework] = useState("NIST CSF");
  const detail = useComplianceFramework(framework);
  const add = useAddComplianceEvidence();

  const [selectedControl, setSelectedControl] = useState<ComplianceRecord | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState({ requirement: "", status: "partial", score: "60", evidence: "" });
  const [error, setError] = useState<string | null>(null);

  const activeFrameworkData = summary.data?.frameworks.find((item) => item.framework === framework);
  const compliantCount = activeFrameworkData?.compliant ?? 0;
  const totalCount = activeFrameworkData?.controls ?? 0;
  const gapCount = Math.max(0, totalCount - compliantCount);
  const complianceScore = activeFrameworkData?.score ?? 78;

  const filteredControls = (detail.data ?? []).filter((c) =>
    c.requirement.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (c.evidence ?? "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="flex h-2 w-2 rounded-full bg-blue-600" />
            <Badge variant="outline" className="border-blue-200 bg-blue-50 text-blue-700 text-[10px] uppercase tracking-wider font-semibold">
              Continuous Governance
            </Badge>
            <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-700 text-[10px] uppercase tracking-wider font-semibold">
              Tamper-Evident Evidence
            </Badge>
          </div>
          <PageHeader
            eyebrow="Continuous Regulatory Assurance"
            title="Compliance Command Center"
            description="Continuous alignment across global and statutory frameworks: ISO 27001, NIST CSF, CIS Controls, RBI, and SEBI cyber directives."
          />
        </div>
        <Button
          size="sm"
          className="bg-[#2563EB] hover:bg-blue-700 text-white text-xs font-semibold shadow-xs"
          onClick={() => setFormOpen(!formOpen)}
        >
          <Plus className="mr-1.5 h-3.5 w-3.5" />
          {formOpen ? "Close Evidence Form" : "Record Control Evidence"}
        </Button>
      </div>

      {summary.isLoading ? (
        <LoadingState />
      ) : summary.isError ? (
        <ErrorState message="Unable to load compliance." onRetry={() => summary.refetch()} />
      ) : (
        <>
          {/* Framework Selector Strip */}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {CATALOG.map((item) => {
              const row = summary.data?.frameworks.find((f) => f.framework === item.id);
              const coveragePct = row && row.controls > 0 ? Math.round((row.compliant / row.controls) * 100) : 0;
              const isSelected = framework === item.id;

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setFramework(item.id);
                    setSelectedControl(null);
                  }}
                  className={`rounded-xl border p-4 text-left transition-all relative ${
                    isSelected
                      ? "border-blue-500 bg-blue-50/70 shadow-xs ring-1 ring-blue-500/30"
                      : "border-[#E2E8F0] bg-white hover:border-slate-300 hover:bg-slate-50 shadow-xs"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-800">{item.name}</p>
                    <span className="font-mono text-xs font-bold text-blue-700">{row ? `${row.score}/100` : "—"}</span>
                  </div>
                  <div className="mt-2 text-[10px] text-slate-500 line-clamp-1">{item.desc}</div>
                  <div className="mt-3 flex items-baseline justify-between">
                    <p className="font-mono text-2xl font-bold text-slate-900">{coveragePct}%</p>
                    <span className="text-[10px] text-slate-500 uppercase">Coverage</span>
                  </div>
                  <div className="mt-2 w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                    <div
                      className={`h-1.5 rounded-full transition-all duration-500 ${
                        coveragePct >= 75 ? "bg-emerald-600" : coveragePct >= 50 ? "bg-amber-500" : "bg-red-600"
                      }`}
                      style={{ width: `${coveragePct}%` }}
                    />
                  </div>
                  <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500">
                    <span>{row ? `${row.compliant}/${row.controls} Passed` : "0 Controls"}</span>
                    {row && row.controls - row.compliant > 0 ? (
                      <span className="text-red-600 font-semibold">{row.controls - row.compliant} Gaps</span>
                    ) : (
                      <span className="text-emerald-700 font-semibold">Aligned</span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Add Evidence Drawer/Form */}
          {formOpen && (
            <div className="rounded-xl border border-[#E2E8F0] bg-white p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-900">
                  Record Control Evidence for {framework}
                </span>
                <span className="text-xs text-slate-500">Attestation anchors SHA-256 hash</span>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <Label className="text-xs text-slate-700">Requirement Identifier</Label>
                  <Input
                    className="mt-1 text-xs border-[#CBD5E1] bg-white text-slate-900 focus:border-[#2563EB]"
                    placeholder="e.g. PR.AC-1: Identity Management"
                    value={form.requirement}
                    onChange={(e) => setForm((c) => ({ ...c, requirement: e.target.value }))}
                  />
                </div>
                <div>
                  <Label className="text-xs text-slate-700">Control Status</Label>
                  <Select value={form.status} onValueChange={(v) => setForm((c) => ({ ...c, status: v }))}>
                    <SelectTrigger className="mt-1 text-xs border-[#CBD5E1] bg-white text-slate-900 focus:border-[#2563EB]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-white border-[#E2E8F0] text-xs">
                      <SelectItem value="compliant">Compliant (Passed)</SelectItem>
                      <SelectItem value="partial">Partial (In Remediation)</SelectItem>
                      <SelectItem value="non_compliant">Non-Compliant (Failed)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs text-slate-700">Control Score (0 - 100)</Label>
                  <Input
                    className="mt-1 font-mono text-xs border-[#CBD5E1] bg-white text-slate-900 focus:border-[#2563EB]"
                    value={form.score}
                    onChange={(e) => setForm((c) => ({ ...c, score: e.target.value }))}
                  />
                </div>
                <div>
                  <Label className="text-xs text-slate-700">Evidence Note / Hash Reference</Label>
                  <Input
                    className="mt-1 text-xs border-[#CBD5E1] bg-white text-slate-900 focus:border-[#2563EB]"
                    placeholder="e.g. Okta SAML enforced on all VPN gateways"
                    value={form.evidence}
                    onChange={(e) => setForm((c) => ({ ...c, evidence: e.target.value }))}
                  />
                </div>
              </div>
              {error && <p className="text-xs text-red-600">{error}</p>}
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="ghost" size="sm" onClick={() => setFormOpen(false)} className="text-xs text-slate-600 hover:text-slate-900">
                  Cancel
                </Button>
                <Button
                  size="sm"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs"
                  disabled={add.isPending}
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
                      setFormOpen(false);
                    } catch (err) {
                      setError(err instanceof ApiError ? err.message : "Save failed.");
                    }
                  }}
                >
                  {add.isPending ? "Anchoring Evidence…" : "Commit Evidence"}
                </Button>
              </div>
            </div>
          )}

          {/* Active Framework Summary & Control Browser */}
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
            {/* Left: Controls Table */}
            <DashboardCard
              title={`${framework} Controls & Requirements`}
              subtitle={`Audited requirements with continuous compliance validation`}
              action={
                <div className="relative w-64">
                  <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                  <Input
                    className="pl-8 text-xs h-8 border-[#CBD5E1] bg-white text-slate-900 focus:border-[#2563EB]"
                    placeholder="Search controls or evidence…"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              }
            >
              {detail.isLoading ? (
                <LoadingState />
              ) : detail.isError || (detail.data?.length ?? 0) === 0 ? (
                <EmptyState
                  title="No mapped controls"
                  description={`${framework} has no stored evidence records yet. Click 'Record Control Evidence' above to add requirements.`}
                />
              ) : (
                <div className="rounded-lg border border-[#E2E8F0] overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-[#E2E8F0] bg-[#F8FAFC]">
                        <TableHead className="text-slate-600 text-xs">Requirement</TableHead>
                        <TableHead className="text-slate-600 text-xs">Status</TableHead>
                        <TableHead className="text-slate-600 text-xs">Score</TableHead>
                        <TableHead className="text-slate-600 text-xs">Evidence Snapshot</TableHead>
                        <TableHead className="text-slate-600 text-xs text-right">Inspect</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredControls.map((row) => {
                        const isSelected = selectedControl?.id === row.id;
                        const isPass = row.status === "compliant";
                        const isPartial = row.status === "partial";

                        return (
                          <TableRow
                            key={row.id}
                            className={`border-[#F1F5F9] cursor-pointer transition ${
                              isSelected ? "bg-blue-50/60" : "hover:bg-[#F8FAFC]"
                            }`}
                            onClick={() => setSelectedControl(row)}
                          >
                            <TableCell className="font-medium text-xs text-slate-900 max-w-xs truncate">
                              {row.requirement}
                            </TableCell>
                            <TableCell>
                              {isPass ? (
                                <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] font-bold">
                                  COMPLIANT
                                </Badge>
                              ) : isPartial ? (
                                <Badge className="bg-amber-50 text-amber-700 border-amber-200 text-[10px] font-bold">
                                  PARTIAL GAP
                                </Badge>
                              ) : (
                                <Badge className="bg-red-50 text-red-700 border-red-200 text-[10px] font-bold">
                                  NON-COMPLIANT
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell className="font-mono text-xs text-slate-700">{row.score}/100</TableCell>
                            <TableCell className="text-xs text-slate-500 max-w-xs truncate font-mono">
                              {row.evidence ?? "—"}
                            </TableCell>
                            <TableCell className="text-right">
                              <ChevronRight className="h-4 w-4 text-slate-400 inline" />
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </DashboardCard>

            {/* Right: Selected Control Deep-Dive Panel */}
            <div className="space-y-4">
              {selectedControl ? (
                <div className="rounded-xl border border-[#E2E8F0] bg-white p-5 shadow-xs space-y-4 sticky top-6">
                  <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-2.5">
                    <span className="text-xs font-bold uppercase tracking-wider text-blue-700">
                      Control Deep-Dive
                    </span>
                    <Badge
                      className={
                        selectedControl.status === "compliant"
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : "bg-amber-50 text-amber-700 border-amber-200"
                      }
                    >
                      {selectedControl.status.toUpperCase()}
                    </Badge>
                  </div>

                  <div>
                    <h4 className="text-sm font-bold text-slate-900">{selectedControl.requirement}</h4>
                    <p className="text-xs text-slate-500 mt-1">Framework: {framework}</p>
                  </div>

                  <div className="rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] p-3 space-y-1">
                    <span className="text-[10px] uppercase font-bold text-slate-500">Audit Score</span>
                    <div className="font-mono text-xl font-bold text-blue-700">{selectedControl.score} / 100</div>
                  </div>

                  <div className="space-y-1">
                    <span className="text-[10px] uppercase font-bold text-slate-500">Attested Evidence</span>
                    <div className="rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] p-3 text-xs text-slate-700 font-mono leading-relaxed">
                      {selectedControl.evidence || "No evidence uploaded yet."}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <span className="text-[10px] uppercase font-bold text-slate-500">Recommended Action</span>
                    <div className="rounded-lg border border-blue-200 bg-blue-50/50 p-3 text-xs text-slate-700 space-y-2">
                      <p className="leading-relaxed">
                        {selectedControl.status === "compliant"
                          ? "Control is operating effectively. Continue quarterly review and automated drift checks."
                          : "Remediate gap by allocating recommended controls via the Investment Optimizer."}
                      </p>
                      {selectedControl.status !== "compliant" && (
                        <a
                          href="/investment-optimizer"
                          className="inline-flex items-center gap-1 text-xs font-semibold text-blue-700 hover:text-blue-800"
                        >
                          <span>Open in Investment Optimizer</span>
                          <ArrowRight className="h-3 w-3" />
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="rounded-xl border border-[#E2E8F0] bg-white p-6 text-center text-slate-500 space-y-2 shadow-xs">
                  <ShieldCheck className="h-8 w-8 mx-auto text-slate-400" />
                  <p className="text-xs font-medium">Select any control on the left to inspect its requirement, gap analysis, and attested evidence.</p>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
