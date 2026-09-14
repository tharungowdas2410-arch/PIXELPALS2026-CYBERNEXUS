import { RiskBadge } from "@/components/RiskBadge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatInr, formatMultiple, formatPercent } from "@/lib/format";
import type { Asset, InvestmentOpportunity, Threat, Vulnerability } from "@/lib/types";

export function InvestmentTable({ rows }: { rows: InvestmentOpportunity[] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Control</TableHead>
          <TableHead>Investment</TableHead>
          <TableHead>Risk reduction</TableHead>
          <TableHead>Expected loss avoided</TableHead>
          <TableHead>ROSI</TableHead>
          <TableHead>Priority</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={row.id}>
            <TableCell className="font-medium">{row.control}</TableCell>
            <TableCell className="font-mono">{formatInr(row.investmentInr)}</TableCell>
            <TableCell>{formatPercent(row.riskReductionPct)}</TableCell>
            <TableCell className="font-mono">{formatInr(row.expectedLossAvoidedInr)}</TableCell>
            <TableCell className="font-mono">{formatMultiple(row.rosi)}</TableCell>
            <TableCell>
              <RiskBadge level={row.priority} />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

export function AssetTable({ rows }: { rows: Asset[] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Asset</TableHead>
          <TableHead>Type</TableHead>
          <TableHead>Business service</TableHead>
          <TableHead>Criticality</TableHead>
          <TableHead>Exposure</TableHead>
          <TableHead>Risk</TableHead>
          <TableHead>Controls</TableHead>
          <TableHead>Last assessment</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={row.id}>
            <TableCell className="font-medium">{row.name}</TableCell>
            <TableCell className="capitalize">{row.type}</TableCell>
            <TableCell>{row.businessService}</TableCell>
            <TableCell>
              <RiskBadge level={row.criticality} />
            </TableCell>
            <TableCell>
              <RiskBadge level={row.exposure} />
            </TableCell>
            <TableCell className="font-mono">{row.riskScore}</TableCell>
            <TableCell className="max-w-48 text-xs text-slate-400">{row.controls.join(", ")}</TableCell>
            <TableCell className="font-mono text-xs">{row.lastAssessment}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

export function VulnerabilityTable({ rows }: { rows: Vulnerability[] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>CVE</TableHead>
          <TableHead>Asset</TableHead>
          <TableHead>Severity</TableHead>
          <TableHead>Exploitability</TableHead>
          <TableHead>Threat activity</TableHead>
          <TableHead>Business criticality</TableHead>
          <TableHead>Financial exposure</TableHead>
          <TableHead>Recommended action</TableHead>
          <TableHead>Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={row.id}>
            <TableCell className="font-mono text-cyan-200">{row.cve}</TableCell>
            <TableCell>{row.assetName}</TableCell>
            <TableCell>
              <RiskBadge level={row.severity} />
            </TableCell>
            <TableCell className="font-mono">{row.exploitability.toFixed(2)}</TableCell>
            <TableCell className="capitalize">{row.threatActivity}</TableCell>
            <TableCell>
              <RiskBadge level={row.businessCriticality} />
            </TableCell>
            <TableCell className="font-mono">{formatInr(row.financialExposureInr)}</TableCell>
            <TableCell className="max-w-64 text-xs text-slate-400">{row.recommendedAction}</TableCell>
            <TableCell className="capitalize">{row.status.replace("-", " ")}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

export function ThreatTable({ rows }: { rows: Threat[] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Threat</TableHead>
          <TableHead>Category</TableHead>
          <TableHead>Actor</TableHead>
          <TableHead>MITRE ATT&CK</TableHead>
          <TableHead>Affected assets</TableHead>
          <TableHead>Trend</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={row.id}>
            <TableCell>
              <p className="font-medium">{row.name}</p>
              <p className="mt-1 max-w-md text-xs text-slate-500">{row.summary}</p>
            </TableCell>
            <TableCell className="capitalize">{row.category}</TableCell>
            <TableCell>{row.actor ?? "—"}</TableCell>
            <TableCell className="font-mono text-xs">{row.mitreTechniques.join(", ")}</TableCell>
            <TableCell>{row.affectedAssets}</TableCell>
            <TableCell>{row.trend.label}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
