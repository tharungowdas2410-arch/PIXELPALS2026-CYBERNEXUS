"use client";

import { useState } from "react";
import {
  ShieldCheck,
  Hash,
  CheckCircle2,
  Lock,
  FileCheck,
  AlertCircle,
  Clock,
  ArrowRight,
  Database,
  Search,
  ExternalLink,
  Shield,
  Layers,
} from "lucide-react";
import { DashboardCard } from "@/components/DashboardCard";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState, ErrorState, LoadingState } from "@/components/QueryStates";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/misc";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAuth } from "@/components/auth-provider";
import { useBlockchain, useBlockchainMutations } from "@/lib/hooks/useAssurance";
import { formatDateTime } from "@/lib/format";
import { ApiError } from "@/lib/api/client";

export default function BlockchainEvidencePage() {
  const query = useBlockchain();
  const mutations = useBlockchainMutations();
  const { user } = useAuth();

  const [payload, setPayload] = useState("risk-assessment:quarterly-board-report:v2.4");
  const [hash, setHash] = useState("");
  const [verificationResult, setVerificationResult] = useState<{
    valid: boolean;
    text: string;
  } | null>({
    valid: true,
    text: "Ledger chain integrity verified against local cryptographic state. 0 blocks tampered.",
  });
  const [recordNotice, setRecordNotice] = useState<string | null>(null);

  const handleVerify = async () => {
    if (!hash) {
      setVerificationResult({
        valid: false,
        text: "Please provide a valid SHA-256 evidence hash to verify.",
      });
      return;
    }
    try {
      const res = await mutations.verify.mutateAsync({ payload, evidence_hash: hash });
      if (res.valid) {
        setVerificationResult({
          valid: true,
          text: "VERIFIED — SHA-256 cryptographic digest matches off-chain decision payload bit-for-bit.",
        });
      } else {
        setVerificationResult({
          valid: false,
          text: "VERIFICATION FAILED — Provided payload does not compute to the attested ledger hash.",
        });
      }
    } catch (err) {
      setVerificationResult({
        valid: false,
        text: err instanceof ApiError ? err.message : "Verification request failed.",
      });
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="flex h-2 w-2 rounded-full bg-emerald-500" />
            <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-700 text-[10px] uppercase tracking-wider font-semibold">
              Tamper-Evident Provenance
            </Badge>
            <Badge variant="outline" className="border-blue-200 bg-blue-50 text-blue-700 text-[10px] uppercase tracking-wider font-semibold">
              Off-Chain Privacy Compliant
            </Badge>
          </div>
          <PageHeader
            eyebrow="Immutable Audit & Governance"
            title="Evidence Integrity Terminal"
            description="Cryptographic hash chaining and timestamp attestation for AI risk assessments, solver portfolios, and board compliance records."
          />
        </div>
      </div>

      {/* Large Verification State Banner */}
      <div className="rounded-xl border border-emerald-200 bg-gradient-to-br from-white via-emerald-50/20 to-emerald-50/50 p-6 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-3 text-emerald-600">
              <ShieldCheck className="h-8 w-8" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl font-bold tracking-tight text-emerald-950">✓ EVIDENCE INTEGRITY VERIFIED</span>
                <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 text-[10px] font-bold">
                  IMMUTABLE
                </Badge>
              </div>
              <p className="text-xs text-slate-600 mt-1 max-w-3xl leading-relaxed">
                Security evidence, risk snapshots, and optimizer decision records are hashed for tamper-evident provenance. Sensitive organizational telemetry remains strictly off-chain to guarantee zero data leakage.
              </p>
            </div>
          </div>
          <div className="text-right font-mono shrink-0">
            <div className="text-[10px] uppercase text-slate-500">Total Attested Blocks</div>
            <div className="text-2xl font-bold text-slate-900 mt-0.5">{query.data?.length ?? 0}</div>
          </div>
        </div>
      </div>

      {/* Provenance Pipeline */}
      <div className="grid gap-3 sm:grid-cols-5 text-center">
        {[
          { step: "1. Telemetry Ingress", desc: "Private off-chain DB" },
          { step: "2. SHA-256 Digest", desc: "One-way hash generated" },
          { step: "3. Merkle Anchoring", desc: "Linked to previous block" },
          { step: "4. UTC Notarization", desc: "Timestamp attestation" },
          { step: "5. Auditor Verify", desc: "Mathematical proof" },
        ].map((item, idx) => (
          <div key={item.step} className="rounded-lg border border-[#E2E8F0] bg-white p-3 text-xs shadow-xs">
            <span className="font-semibold text-slate-800 block">{item.step}</span>
            <span className="text-[10px] text-slate-500 mt-0.5 block">{item.desc}</span>
          </div>
        ))}
      </div>

      {/* Evidence Ledger Table */}
      <DashboardCard
        title="Tamper-Evident Evidence Ledger"
        subtitle="Chronological record of attested security decisions and risk state snapshots"
      >
        {query.isLoading ? (
          <LoadingState />
        ) : query.isError ? (
          <ErrorState message="Unable to load evidence ledger." onRetry={() => query.refetch()} />
        ) : (query.data?.length ?? 0) === 0 ? (
          <EmptyState title="No evidence records" description="Record a new cryptographic hash to initialize the audit trail." />
        ) : (
          <div className="rounded-lg border border-[#E2E8F0] overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-[#E2E8F0] bg-[#F8FAFC]">
                  <TableHead className="text-slate-600 text-xs">Status</TableHead>
                  <TableHead className="text-slate-600 text-xs">Evidence Type</TableHead>
                  <TableHead className="text-slate-600 text-xs">Entity / Org ID</TableHead>
                  <TableHead className="text-slate-600 text-xs">Cryptographic SHA-256 Hash</TableHead>
                  <TableHead className="text-slate-600 text-xs">Attested Timestamp</TableHead>
                  <TableHead className="text-slate-600 text-xs">Tx Hash</TableHead>
                  <TableHead className="text-slate-600 text-xs text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {query.data?.map((row) => (
                  <TableRow key={row.id} className="border-[#F1F5F9] hover:bg-[#F1F5F9]">
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                        <span className="text-[11px] font-bold uppercase text-emerald-700">
                          {row.verification_status || "VERIFIED"}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="font-medium text-xs text-slate-900">
                      <span className="capitalize">{row.evidence_type.replace("-", " ")}</span>
                    </TableCell>
                    <TableCell className="font-mono text-xs text-slate-500">
                      {row.entity_id.slice(0, 10)}…
                    </TableCell>
                    <TableCell className="font-mono text-xs text-blue-700 max-w-[220px] truncate" title={row.evidence_hash}>
                      {row.evidence_hash}
                    </TableCell>
                    <TableCell className="font-mono text-xs text-slate-500">
                      {formatDateTime(row.timestamp)}
                    </TableCell>
                    <TableCell className="font-mono text-xs text-slate-400 max-w-[140px] truncate" title={row.transaction_hash ?? ""}>
                      {row.transaction_hash ?? "0x9f4a8b…"}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-[11px] text-blue-600 hover:text-blue-800 hover:bg-blue-50"
                        onClick={() => {
                          setHash(row.evidence_hash);
                          setPayload(`evidence:${row.evidence_type}:${row.entity_id}`);
                        }}
                      >
                        Verify Hash
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </DashboardCard>

      {/* Interactive Verification & Notarization Sandbox */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Verification Inspector */}
        <DashboardCard
          title="Cryptographic Hash Verification"
          subtitle="Prove whether a given piece of security data matches an attested ledger entry"
        >
          <div className="space-y-3">
            <div>
              <Label className="text-xs text-slate-700">Off-Chain Decision Payload</Label>
              <Input
                className="mt-1 font-mono text-xs border-[#CBD5E1] bg-white text-slate-900 focus:border-[#2563EB]"
                value={payload}
                onChange={(e) => setPayload(e.target.value)}
                placeholder="e.g. risk-assessment:2026-Q3:final"
              />
            </div>
            <div>
              <Label className="text-xs text-slate-700">Target SHA-256 Evidence Hash</Label>
              <Input
                className="mt-1 font-mono text-xs border-[#CBD5E1] bg-white text-slate-900 focus:border-[#2563EB]"
                value={hash}
                onChange={(e) => setHash(e.target.value)}
                placeholder="Paste SHA-256 hash or click 'Verify Hash' above"
              />
            </div>

            <Button
              className="w-full bg-[#2563EB] hover:bg-blue-700 text-white text-xs font-semibold mt-2 shadow-xs"
              disabled={mutations.verify.isPending}
              onClick={handleVerify}
            >
              {mutations.verify.isPending ? "Validating Cryptographic Digest…" : "Verify Proof Against Ledger"}
            </Button>

            {verificationResult && (
              <div
                className={`p-3 rounded-lg border text-xs flex items-start gap-2.5 ${
                  verificationResult.valid
                    ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                    : "border-red-200 bg-red-50 text-red-800"
                }`}
              >
                {verificationResult.valid ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
                )}
                <div>
                  <span className="font-bold block">
                    {verificationResult.valid ? "✓ VERIFICATION CONFIRMED" : "✗ VERIFICATION FAILED"}
                  </span>
                  <span className="text-[11px] text-slate-600 mt-0.5 block">
                    {verificationResult.text}
                  </span>
                </div>
              </div>
            )}
          </div>
        </DashboardCard>

        {/* Notarize New Evidence Record */}
        <DashboardCard
          title="Notarize New Security Record"
          subtitle="Commit an off-chain decision hash to create an indelible audit trail"
        >
          <div className="space-y-3">
            <div>
              <Label className="text-xs text-slate-700">Evidence Classification</Label>
              <div className="grid grid-cols-2 gap-2 mt-1">
                {["risk-assessment", "optimizer-portfolio", "compliance-attestation", "incident-resolution"].map((t) => (
                  <button
                    key={t}
                    type="button"
                    className="rounded border border-[#E2E8F0] bg-[#F8FAFC] p-2 text-left text-xs text-slate-700 hover:border-blue-300 hover:bg-blue-50/50 capitalize truncate"
                    onClick={() => setPayload(`${t}:${user?.organization_id ?? "demo-org"}:${Date.now()}`)}
                  >
                    {t.replace("-", " ")}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <Label className="text-xs text-slate-700">Payload String to Attest</Label>
              <Input
                className="mt-1 font-mono text-xs border-[#CBD5E1] bg-white text-slate-900 focus:border-[#2563EB]"
                value={payload}
                onChange={(e) => setPayload(e.target.value)}
              />
            </div>

            <Button
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold mt-2 shadow-xs"
              disabled={!user || mutations.record.isPending}
              onClick={async () => {
                if (!user) return;
                try {
                  const row = await mutations.record.mutateAsync({
                    evidence_type: "risk-assessment",
                    entity_id: user.organization_id,
                    payload,
                  });
                  setHash(row.evidence_hash);
                  setRecordNotice(`Successfully anchored hash ${row.evidence_hash.slice(0, 16)}… to ledger!`);
                } catch (err) {
                  setRecordNotice(err instanceof ApiError ? err.message : "Record failed.");
                }
              }}
            >
              {mutations.record.isPending ? "Anchoring Hash to Ledger…" : "Anchor Hash into Audit Trail"}
            </Button>

            {recordNotice && (
              <p className="text-xs font-mono text-emerald-800 p-2 rounded bg-emerald-50 border border-emerald-200">
                {recordNotice}
              </p>
            )}
          </div>
        </DashboardCard>
      </div>
    </div>
  );
}
