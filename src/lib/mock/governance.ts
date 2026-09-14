import type {
  BlockchainEvidence,
  ComplianceFramework,
  NotificationItem,
  ReportDefinition,
  SettingsModel,
  UserProfile,
} from "@/lib/types";
import { organizations } from "@/lib/mock/risk";

export const complianceFrameworks: ComplianceFramework[] = [
  {
    id: "iso27001",
    name: "ISO/IEC 27001",
    coveragePct: 78,
    controlCoverage: "91 / 117 mapped controls",
    missingControls: ["A.8.5 Secure authentication (privileged)", "A.8.22 Segregation of networks"],
    evidenceAvailability: "partial",
    gapRisk: "high",
    summary: "Identity and network-segregation gaps drive residual certification risk.",
  },
  {
    id: "nist-csf",
    name: "NIST CSF",
    coveragePct: 71,
    controlCoverage: "Protect and Respond functions lag Identify",
    missingControls: ["PR.AC-7 MFA", "RS.AN-5 forensics readiness"],
    evidenceAvailability: "partial",
    gapRisk: "high",
    summary: "Detect is stronger than Protect for privileged remote access.",
  },
  {
    id: "cis",
    name: "CIS Controls",
    coveragePct: 64,
    controlCoverage: "IG1 largely met; IG2 incomplete",
    missingControls: ["CIS 6.5 MFA", "CIS 12.2 network segmentation"],
    evidenceAvailability: "limited",
    gapRisk: "critical",
    summary: "Implementation Group 2 controls around identity are the material gap.",
  },
  {
    id: "rbi",
    name: "RBI Cyber Security Framework",
    coveragePct: 82,
    controlCoverage: "Board reporting in place; privileged access lagging",
    missingControls: ["Multi-factor for privileged users"],
    evidenceAvailability: "partial",
    gapRisk: "high",
    summary: "Illustrative mapping for a regulated financial entity.",
  },
  {
    id: "sebi",
    name: "SEBI Cybersecurity & Cyber Resilience Framework",
    coveragePct: 75,
    controlCoverage: "SOC monitoring mapped; resilience testing partial",
    missingControls: ["VAPT closure SLAs", "Immutable backup evidence"],
    evidenceAvailability: "partial",
    gapRisk: "medium",
    summary: "Resilience evidence is present but not continuously attested.",
  },
];

export const blockchainEvidence: BlockchainEvidence[] = [
  {
    id: "ev-1001",
    event: "risk-assessment",
    hash: "0x7c1a9e4b2f80d31a55c8e91b0a44d2c17e6f3b90aa12c4d8e7f1a0b3c5d6e8f2",
    timestamp: "2026-09-12T06:00:00+05:30",
    blockNumber: 18422109,
    status: "verified",
    description: "Hash of enterprise risk pack (score, contributors, model version).",
  },
  {
    id: "ev-1002",
    event: "ai-recommendation",
    hash: "0x91b0e3c4a77d12f8c0aa45e19b33d6f27c18e90a1b2c3d4e5f60718293a4b5c6",
    timestamp: "2026-09-12T07:40:00+05:30",
    blockNumber: 18422188,
    status: "verified",
    description: "Hash of advisor output, evidence pointers and model identifier.",
  },
  {
    id: "ev-1003",
    event: "investment-decision",
    hash: "0x44d2c17e6f3b90aa12c4d8e7f1a0b3c5d6e8f27c1a9e4b2f80d31a55c8e91b0a",
    timestamp: "2026-09-10T18:15:00+05:30",
    blockNumber: 18419802,
    status: "verified",
    description: "Hash of approved MFA investment decision record.",
  },
  {
    id: "ev-1004",
    event: "incident-evidence",
    hash: "0x0a44d2c17e6f3b90aa12c4d8e7f1a0b3c5d6e8f27c1a9e4b2f80d31a55c8e91b",
    timestamp: "2026-09-06T05:00:00+05:30",
    blockNumber: 18415044,
    status: "verified",
    description: "Hash of ransomware incident timeline export.",
  },
  {
    id: "ev-1005",
    event: "compliance-evidence",
    hash: "0xdeadbeef00000000000000000000000000000000000000000000000000001111",
    timestamp: "2026-09-01T09:00:00+05:30",
    blockNumber: 18409001,
    status: "tamper-detected",
    description: "Recomputed hash diverged from on-chain record for CIS evidence bundle.",
  },
];

export const reports: ReportDefinition[] = [
  {
    id: "rep-exec",
    title: "Executive Risk Report",
    audience: "Board / CEO",
    summary: "Enterprise score, financial exposure and investment ask.",
    lastGenerated: "2026-09-12",
  },
  {
    id: "rep-ciso",
    title: "CISO Risk Report",
    audience: "CISO / security leadership",
    summary: "Attack paths, control gaps and operational risk movement.",
    lastGenerated: "2026-09-12",
  },
  {
    id: "rep-fin",
    title: "Financial Exposure Report",
    audience: "CFO / risk committee",
    summary: "Loss distribution, VaR and business-unit exposure.",
    lastGenerated: "2026-09-11",
  },
  {
    id: "rep-cmp",
    title: "Compliance Report",
    audience: "GRC",
    summary: "Framework coverage, missing controls and evidence status.",
    lastGenerated: "2026-09-08",
  },
  {
    id: "rep-inv",
    title: "Investment Optimization Report",
    audience: "CISO + CFO",
    summary: "Recommended portfolio, ROSI and residual risk path.",
    lastGenerated: "2026-09-10",
  },
  {
    id: "rep-inc",
    title: "Incident Report",
    audience: "SOC / crisis team",
    summary: "Open incidents, modeled impact and response status.",
    lastGenerated: "2026-09-10",
  },
];

export const notifications: NotificationItem[] = [
  {
    id: "n1",
    title: "Critical path risk unchanged",
    detail: "Internet → Payment service remains 92/100 after 7 days.",
    at: "2026-09-12T08:10:00+05:30",
    level: "critical",
  },
  {
    id: "n2",
    title: "Evidence attestation complete",
    detail: "Risk assessment hash verified on block 18422109.",
    at: "2026-09-12T06:02:00+05:30",
    level: "low",
  },
  {
    id: "n3",
    title: "MFA investment pending approval",
    detail: "Illustrative ROSI 2.17x — awaiting CFO sign-off.",
    at: "2026-09-11T17:40:00+05:30",
    level: "medium",
  },
];

export const currentUser: UserProfile = {
  name: "A. Mehta",
  role: "CISO",
  email: "a.mehta@northbridge.example",
};

export const settings: SettingsModel = {
  organization: organizations[0],
  users: [
    { name: "A. Mehta", role: "CISO", email: "a.mehta@northbridge.example" },
    { name: "R. Iyer", role: "CFO", email: "r.iyer@northbridge.example" },
    { name: "S. Khan", role: "Head of GRC", email: "s.khan@northbridge.example" },
  ],
  integrations: [
    { name: "SIEM", status: "connected" },
    { name: "CMDB", status: "configured" },
    { name: "Vulnerability scanner", status: "connected" },
    { name: "Identity provider", status: "connected" },
    { name: "Blockchain attest service", status: "planned" },
  ],
  riskModel: {
    method: "FAIR-inspired loss exceedance (illustrative)",
    timeHorizonDays: 365,
    notes: "Replace with calibrated frequency/magnitude from production telemetry.",
  },
  financialAssumptions: {
    currency: "INR",
    discountRatePct: 8.5,
    incidentCostBasis: "Downtime + regulatory + response (illustrative)",
  },
};
