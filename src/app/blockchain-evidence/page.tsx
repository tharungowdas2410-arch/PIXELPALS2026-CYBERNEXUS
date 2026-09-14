"use client";

import { useState } from "react";
import { ArrowDown } from "lucide-react";
import { DashboardCard } from "@/components/DashboardCard";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState, ErrorState, LoadingState } from "@/components/QueryStates";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/misc";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAuth } from "@/components/auth-provider";
import { useBlockchain, useBlockchainMutations } from "@/lib/hooks/useAssurance";
import { formatDateTime } from "@/lib/format";
import { ApiError } from "@/lib/api/client";

const steps = ["Sensitive data stays off-chain", "Hash", "Prototype ledger", "Timestamp", "Verification"];

function statusClass(status: string) {
  if (status === "verified") return "text-emerald-300";
  if (status === "failed") return "text-red-300";
  return "text-amber-200";
}

export default function BlockchainEvidencePage() {
  const query = useBlockchain();
  const mutations = useBlockchainMutations();
  const { user } = useAuth();
  const [payload, setPayload] = useState("risk-assessment:demo");
  const [hash, setHash] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3">
        <PageHeader
          title="Blockchain Evidence Ledger"
          description="Cryptographic proof and audit trail verification for risk evaluations, optimizer portfolios, and executive decisions."
        />
        <div className="p-3 rounded-lg border border-purple-500/30 bg-purple-950/20 text-xs text-purple-200 flex items-center gap-2">
          <span className="font-semibold uppercase tracking-wider text-purple-400">Architectural Note:</span>
          <span>Blockchain is used as a tamper-evident evidence layer, not as the primary risk calculation engine. Sensitive data remains strictly off-chain.</span>
        </div>
      </div>
      <DashboardCard title="Attestation Flow">
        <div className="flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:gap-4">
          {steps.map((step, index) => (
            <div key={step} className="flex items-center gap-4">
              <div className="rounded-md border border-white/10 bg-[#0a101d] px-3 py-2 text-xs uppercase tracking-wider text-slate-200">
                {step}
              </div>
              {index < steps.length - 1 ? <ArrowDown className="h-4 w-4 rotate-[-90deg] text-cyan-400 max-sm:hidden" /> : null}
            </div>
          ))}
        </div>
        <p className="mt-4 max-w-2xl text-xs text-slate-400">
          Only SHA-256 digest payloads and unix timestamps are committed to the ledger interface, guaranteeing mathematical non-repudiation.
        </p>
      </DashboardCard>
      {query.isLoading ? (
        <LoadingState />
      ) : query.isError ? (
        <ErrorState message="Unable to load evidence ledger." onRetry={() => query.refetch()} />
      ) : (query.data?.length ?? 0) === 0 ? (
        <EmptyState title="No evidence records" description="Record a hash to start the ledger." />
      ) : (
        <div className="rounded-lg border border-white/10 bg-[#0c1322]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Evidence Type</TableHead>
                <TableHead>Entity</TableHead>
                <TableHead>Hash</TableHead>
                <TableHead>Timestamp</TableHead>
                <TableHead>Verification</TableHead>
                <TableHead>Transaction Hash</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {query.data?.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>{row.evidence_type}</TableCell>
                  <TableCell className="font-mono text-xs">{row.entity_id.slice(0, 8)}</TableCell>
                  <TableCell className="max-w-[220px] truncate font-mono text-xs text-slate-400" title={row.evidence_hash}>
                    {row.evidence_hash}
                  </TableCell>
                  <TableCell className="font-mono text-xs">{formatDateTime(row.timestamp)}</TableCell>
                  <TableCell className={`text-xs font-semibold uppercase tracking-wider ${statusClass(row.verification_status)}`}>
                    {row.verification_status}
                  </TableCell>
                  <TableCell className="max-w-[160px] truncate font-mono text-xs">{row.transaction_hash ?? "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
      <div className="grid gap-4 lg:grid-cols-2">
        <DashboardCard title="Record evidence">
          <Label>Payload (off-chain text that is hashed)</Label>
          <Input className="mt-1" value={payload} onChange={(e) => setPayload(e.target.value)} />
          <Button
            className="mt-4"
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
                setMessage("Recorded on the prototype ledger.");
              } catch (err) {
                setMessage(err instanceof ApiError ? err.message : "Record failed.");
              }
            }}
          >
            Record
          </Button>
        </DashboardCard>
        <DashboardCard title="Verify hash">
          <Label>Evidence hash</Label>
          <Input className="mt-1 font-mono" value={hash} onChange={(e) => setHash(e.target.value)} />
          <Button
            className="mt-4"
            disabled={mutations.verify.isPending}
            onClick={async () => {
              try {
                const result = await mutations.verify.mutateAsync({ payload, evidence_hash: hash });
                setMessage(result.valid ? "VERIFIED — hash matches payload." : "FAILED — hash does not match payload.");
              } catch (err) {
                setMessage(err instanceof ApiError ? err.message : "Verify failed.");
              }
            }}
          >
            Verify
          </Button>
        </DashboardCard>
      </div>
      {message ? <p className="text-sm text-cyan-200">{message}</p> : null}
    </div>
  );
}
