import type {
  AdvisorQuestion,
  AIRecommendation,
  AttackPath,
  LossDistributionPoint,
  MetricKpi,
  RiskContributor,
  RiskSummary,
  RiskTrendSeries,
  TrendRange,
} from "@/lib/types";

export const organizations = [
  {
    id: "org-nbhc",
    name: "Northbridge Holdings",
    sector: "Financial services (illustrative)",
  },
  {
    id: "org-grid",
    name: "Aarohan Grid Co.",
    sector: "Energy (illustrative)",
  },
] as const;

export const kpis: MetricKpi[] = [
  {
    id: "enterprise-risk",
    title: "Enterprise Risk Score",
    value: "72",
    unit: "/ 100",
    trend: {
      direction: "down",
      delta: 3,
      label: "-3 vs 30d",
      sentiment: "positive",
    },
    comparison: "Appetite: 55",
    explanation:
      "Composite of exposure, control coverage and modeled attack-path likelihood. Lower is better.",
  },
  {
    id: "financial-exposure",
    title: "Financial Exposure",
    value: "₹4.82 Cr",
    trend: {
      direction: "down",
      delta: 0.18,
      label: "-₹0.18 Cr vs prior",
      sentiment: "positive",
    },
    comparison: "P95 modeled loss",
    explanation:
      "Illustrative modeled loss at the 95th percentile across quantified scenarios.",
  },
  {
    id: "eal",
    title: "Expected Annual Loss",
    value: "₹2.14 Cr",
    trend: {
      direction: "up",
      delta: 0.09,
      label: "+₹0.09 Cr vs FY",
      sentiment: "negative",
    },
    comparison: "Mean of loss distribution",
    explanation:
      "Probability-weighted annualized cyber loss from the current control set.",
  },
  {
    id: "opportunity",
    title: "Risk Reduction Opportunity",
    value: "₹1.37 Cr",
    trend: {
      direction: "up",
      delta: 0.12,
      label: "+₹0.12 Cr addressable",
      sentiment: "positive",
    },
    comparison: "Vs recommended portfolio",
    explanation:
      "Modeled expected-loss reduction if the current investment set is fully deployed.",
  },
  {
    id: "critical",
    title: "Active Critical Risks",
    value: "8",
    trend: {
      direction: "down",
      delta: 1,
      label: "-1 this week",
      sentiment: "positive",
    },
    comparison: "Open, unaccepted",
    explanation:
      "Critical findings with a quantified business-impact path still open.",
  },
];

export const riskSummary: RiskSummary = {
  enterpriseRiskScore: 72,
  previousRiskScore: 75,
  riskAppetite: 55,
  financialExposureInr: 4_82_00_000,
  expectedAnnualLossInr: 2_14_00_000,
  riskReductionOpportunityInr: 1_37_00_000,
  activeCriticalRisks: 8,
  asOf: "2026-09-12T08:00:00+05:30",
  illustrative: true,
  kpis,
};

function series(
  range: TrendRange,
  count: number,
  stepDays: number,
): RiskTrendSeries {
  const points = Array.from({ length: count }, (_, i) => {
    const day = new Date(Date.UTC(2026, 8, 12));
    day.setUTCDate(day.getUTCDate() - (count - 1 - i) * stepDays);
    const wave = Math.sin(i / 4) * 3;
    return {
      date: day.toISOString().slice(0, 10),
      currentRisk: Math.round(74 + wave - i * 0.08),
      previousPeriod: Math.round(78 + wave * 0.6 - i * 0.05),
      riskAppetite: 55,
    };
  });
  return { range, points, illustrative: true };
}

export const riskTrends: Record<TrendRange, RiskTrendSeries> = {
  "7d": series("7d", 7, 1),
  "30d": series("30d", 30, 1),
  "90d": series("90d", 30, 3),
  "1y": series("1y", 24, 15),
};

export const lossDistribution: LossDistributionPoint[] = [
  { percentile: "Expected", lossInr: 2_14_00_000 },
  { percentile: "P50", lossInr: 1_68_00_000 },
  { percentile: "P75", lossInr: 2_91_00_000 },
  { percentile: "P90", lossInr: 3_84_00_000 },
  { percentile: "P95", lossInr: 4_82_00_000 },
  { percentile: "P99", lossInr: 7_10_00_000 },
];

export const riskContributors: RiskContributor[] = [
  {
    rank: 1,
    name: "Internet-facing VPN",
    riskScore: 91,
    financialExposureInr: 1_12_00_000,
    trend: {
      direction: "up",
      delta: 4,
      label: "+4",
      sentiment: "negative",
    },
    affectedAssets: 6,
    level: "critical",
  },
  {
    rank: 2,
    name: "Privileged Identity",
    riskScore: 86,
    financialExposureInr: 98_00_000,
    trend: {
      direction: "flat",
      delta: 0,
      label: "0",
      sentiment: "neutral",
    },
    affectedAssets: 14,
    level: "critical",
  },
  {
    rank: 3,
    name: "Customer Database",
    riskScore: 81,
    financialExposureInr: 87_00_000,
    trend: {
      direction: "down",
      delta: 2,
      label: "-2",
      sentiment: "positive",
    },
    affectedAssets: 3,
    level: "high",
  },
  {
    rank: 4,
    name: "Cloud Storage",
    riskScore: 74,
    financialExposureInr: 54_00_000,
    trend: {
      direction: "up",
      delta: 1,
      label: "+1",
      sentiment: "negative",
    },
    affectedAssets: 9,
    level: "high",
  },
  {
    rank: 5,
    name: "Legacy Application",
    riskScore: 69,
    financialExposureInr: 41_00_000,
    trend: {
      direction: "down",
      delta: 3,
      label: "-3",
      sentiment: "positive",
    },
    affectedAssets: 2,
    level: "medium",
  },
];

export const primaryAttackPath: AttackPath = {
  id: "path-payments",
  name: "Internet → Payment service",
  riskScore: 92,
  potentialExposureInr: 42_00_000,
  criticalWeakness: "Insufficient MFA coverage on privileged VPN and IdP paths",
  recommendedAction: "Deploy MFA to privileged accounts and restrict VPN admin roles",
  probability: 0.34,
  businessImpact: "Customer payment processing disruption and potential PII exposure",
  illustrative: true,
  nodes: [
    {
      id: "internet",
      label: "Internet",
      type: "entry",
      level: "medium",
      controls: ["WAF (partial)"],
      businessService: "External access",
      probability: 0.9,
      impactInr: 0,
    },
    {
      id: "vpn",
      label: "VPN",
      type: "network",
      level: "critical",
      controls: ["TLS", "Split tunnel policy"],
      businessService: "Remote access",
      probability: 0.62,
      impactInr: 18_00_000,
    },
    {
      id: "idp",
      label: "Identity Provider",
      type: "identity",
      level: "high",
      controls: ["SSO", "Conditional access (partial)"],
      businessService: "Workforce identity",
      probability: 0.48,
      impactInr: 26_00_000,
    },
    {
      id: "app",
      label: "Application Server",
      type: "application",
      level: "high",
      controls: ["EDR (partial)", "Patch SLA 14d"],
      businessService: "Customer portal",
      probability: 0.41,
      impactInr: 31_00_000,
    },
    {
      id: "db",
      label: "Customer Database",
      type: "database",
      level: "critical",
      controls: ["TDE", "Network ACL"],
      businessService: "Customer records",
      probability: 0.29,
      impactInr: 38_00_000,
    },
    {
      id: "pay",
      label: "Payment Service",
      type: "application",
      level: "protected",
      controls: ["Tokenization", "Network segmentation"],
      businessService: "Payments",
      probability: 0.12,
      impactInr: 42_00_000,
    },
  ],
  edges: [
    { id: "e1", source: "internet", target: "vpn", technique: "T1190" },
    { id: "e2", source: "vpn", target: "idp", technique: "T1078" },
    {
      id: "e3",
      source: "idp",
      target: "app",
      technique: "T1078.004",
    },
    { id: "e4", source: "app", target: "db", technique: "T1505.003" },
    {
      id: "e5",
      source: "db",
      target: "pay",
      technique: "T1530",
      blockedBy: "Payment network segmentation",
    },
  ],
};

export const advisorQuestions: AdvisorQuestion[] = [
  {
    id: "q1",
    prompt: "What is our highest financial cyber risk?",
  },
  {
    id: "q2",
    prompt: "Which vulnerabilities contribute most to expected losses?",
  },
  {
    id: "q3",
    prompt: "What happens if we delay remediation by 30 days?",
  },
  {
    id: "q4",
    prompt: "Where should we invest our next ₹25 lakh?",
  },
];

const advisorLimitations =
  "This is an explainable ranking over mock telemetry and loss assumptions, not a prediction of an incident. Confidence reflects completeness of control evidence in the sample set, not certainty of outcomes.";

export const advisorAnswers: Record<string, AIRecommendation> = {
  q1: {
    id: "rec-q1",
    question: "What is our highest financial cyber risk?",
    recommendation:
      "Prioritize MFA on privileged VPN and identity-provider accounts before expanding endpoint coverage.",
    reasoning: [
      "The highest-ranked contributor is the internet-facing VPN, with an illustrative exposure of ₹1.12 Cr.",
      "The modeled attack path from Internet → VPN → IdP → Application → Customer Database carries a 92/100 path risk.",
      "MFA shows the highest ROSI in the current control catalogue (2.17x) for the lowest capital outlay.",
    ],
    evidence: [
      { source: "Risk engine (illustrative)", detail: "VPN contributor rank 1, score 91, 6 affected assets" },
      { source: "Attack-path graph (illustrative)", detail: "Critical weakness: insufficient MFA coverage" },
      { source: "Investment model (illustrative)", detail: "MFA: ₹12L investment, ₹26L expected loss avoided" },
    ],
    confidence: 0.78,
    expectedRiskReduction: "≈18% path-risk reduction if MFA coverage is completed",
    limitations: advisorLimitations,
    generatedAt: "2026-09-12T07:40:00+05:30",
    illustrative: true,
  },
  q2: {
    id: "rec-q2",
    question: "Which vulnerabilities contribute most to expected losses?",
    recommendation:
      "Close internet-facing VPN and identity findings first; they sit on the highest-loss attack path rather than the highest CVSS score alone.",
    reasoning: [
      "Financial exposure is concentrated on assets that enable reachability to customer records and payments.",
      "Exploitability without a business-impact path is deprioritized relative to path-connected findings.",
      "Patch and MFA together reduce both exploit likelihood and privilege persistence.",
    ],
    evidence: [
      { source: "Vulnerability inventory (illustrative)", detail: "Highest modeled exposure is tied to VPN and IdP assets" },
      { source: "Loss model (illustrative)", detail: "Customer database conditional impact ₹38L on the primary path" },
    ],
    confidence: 0.71,
    expectedRiskReduction: "Largest modeled EAL reduction comes from path-connected VPN/IdP findings",
    limitations: advisorLimitations,
    generatedAt: "2026-09-12T07:41:00+05:30",
    illustrative: true,
  },
  q3: {
    id: "rec-q3",
    question: "What happens if we delay remediation by 30 days?",
    recommendation:
      "Treat a 30-day delay as additional expected-loss carry, not as a binary incident forecast.",
    reasoning: [
      "The current control gaps remain on an active credential-stuffing trend against the VPN.",
      "Delay keeps residual path risk near 92/100 with no modeled reduction from MFA or EDR.",
      "Opportunity cost is the unused portion of the ₹1.37 Cr risk-reduction opportunity this cycle.",
    ],
    evidence: [
      { source: "Threat feed (illustrative)", detail: "+12% VPN authentication probes over 7 days" },
      { source: "Financial model (illustrative)", detail: "EAL remains ₹2.14 Cr if the control set is unchanged" },
    ],
    confidence: 0.64,
    expectedRiskReduction: "No reduction while delayed; opportunity cost ≈ ₹1.37 Cr addressable this cycle",
    limitations: advisorLimitations,
    generatedAt: "2026-09-12T07:42:00+05:30",
    illustrative: true,
  },
  q4: {
    id: "rec-q4",
    question: "Where should we invest our next ₹25 lakh?",
    recommendation:
      "Allocate the next ₹25 lakh to completing privileged MFA first, then residual budget to backup immutability — not a full EDR refresh.",
    reasoning: [
      "₹12L MFA is inside the ₹25L envelope and has the highest ROSI (2.17x).",
      "The remaining ~₹13L does not fund EDR (₹30L) but can start backup hardening (₹25L package can be staged).",
      "This ordering attacks the critical weakness on the payment path before endpoint scale-out.",
    ],
    evidence: [
      { source: "Investment catalogue (illustrative)", detail: "MFA ₹12L / 18% / ROSI 2.17x" },
      { source: "Budget constraint (illustrative)", detail: "₹25L cannot fully fund EDR at ₹30L" },
    ],
    confidence: 0.74,
    expectedRiskReduction: "MFA-first package ≈18% path-risk reduction within a ₹25L cap",
    limitations: advisorLimitations,
    generatedAt: "2026-09-12T07:43:00+05:30",
    illustrative: true,
  },
};

export const advisorAnswer = advisorAnswers.q1;
