import { RiskBadge } from "@/components/RiskBadge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDateTime } from "@/lib/format";
import type { BlockchainEvidence, ComplianceFramework } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function ComplianceCard({ framework }: { framework: ComplianceFramework }) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <CardTitle className="text-base font-semibold normal-case tracking-normal text-white">
            {framework.name}
          </CardTitle>
          <RiskBadge level={framework.gapRisk} />
        </div>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <div>
          <p className="font-mono text-2xl text-cyan-200">{framework.coveragePct}%</p>
          <p className="text-xs text-slate-500">Compliance coverage (mapped)</p>
        </div>
        <p className="text-slate-400">{framework.controlCoverage}</p>
        <div>
          <p className="text-[11px] uppercase tracking-wider text-slate-500">Missing controls</p>
          <ul className="mt-1 list-disc pl-4 text-xs text-slate-400">
            {framework.missingControls.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
        <p className="text-xs text-slate-500">
          Evidence: {framework.evidenceAvailability}. {framework.summary}
        </p>
      </CardContent>
    </Card>
  );
}

export function BlockchainEvidenceTable({ rows }: { rows: BlockchainEvidence[] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Record ID</TableHead>
          <TableHead>Event</TableHead>
          <TableHead>Hash</TableHead>
          <TableHead>Timestamp</TableHead>
          <TableHead>Block number</TableHead>
          <TableHead>Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={row.id}>
            <TableCell className="font-mono">{row.id}</TableCell>
            <TableCell className="capitalize">{row.event.replace("-", " ")}</TableCell>
            <TableCell className="max-w-[220px] truncate font-mono text-xs text-slate-400" title={row.hash}>
              {row.hash}
            </TableCell>
            <TableCell className="font-mono text-xs">{formatDateTime(row.timestamp)}</TableCell>
            <TableCell className="font-mono">{row.blockNumber}</TableCell>
            <TableCell>
              {row.status === "verified" ? (
                <span className="text-xs font-semibold uppercase tracking-wider text-emerald-300">
                  Verified
                </span>
              ) : row.status === "tamper-detected" ? (
                <span className="text-xs font-semibold uppercase tracking-wider text-red-300">
                  Tamper detected
                </span>
              ) : (
                <span className="text-xs uppercase text-amber-200">Pending</span>
              )}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
