export type RiskLevel =
  | "critical"
  | "high"
  | "medium"
  | "low"
  | "protected";

export type TrendDirection = "up" | "down" | "flat";
export type Sentiment = "positive" | "negative" | "neutral";
export type AssetType =
  | "network"
  | "identity"
  | "application"
  | "database"
  | "cloud"
  | "endpoint"
  | "ot";
export type HostingModel = "cloud" | "on-prem" | "hybrid";
export type IncidentType =
  | "ransomware"
  | "credential-compromise"
  | "data-breach"
  | "ddos"
  | "insider-threat";
export type IncidentStatus =
  | "detected"
  | "contained"
  | "eradicated"
  | "recovered"
  | "closed";
export type EvidenceStatus = "verified" | "tamper-detected" | "pending";
export type EvidenceEvent =
  | "risk-assessment"
  | "ai-recommendation"
  | "investment-decision"
  | "incident-evidence"
  | "compliance-evidence";
export type ControlStatus = "in-place" | "partial" | "planned" | "missing";
export type VulnerabilityStatus =
  | "open"
  | "in-progress"
  | "accepted"
  | "resolved";

export interface Trend {
  direction: TrendDirection;
  delta: number;
  label: string;
  sentiment: Sentiment;
}

export interface Organization {
  id: string;
  name: string;
  sector: string;
}

export interface RiskSummary {
  enterpriseRiskScore: number;
  previousRiskScore: number;
  riskAppetite: number;
  financialExposureInr: number;
  expectedAnnualLossInr: number;
  riskReductionOpportunityInr: number;
  activeCriticalRisks: number;
  asOf: string;
  illustrative: true;
  kpis: MetricKpi[];
}

export interface MetricKpi {
  id: string;
  title: string;
  value: string;
  unit?: string;
  trend: Trend;
  comparison: string;
  explanation: string;
}

export type TrendRange = "7d" | "30d" | "90d" | "1y";

export interface RiskTrendPoint {
  date: string;
  currentRisk: number;
  previousPeriod: number;
  riskAppetite: number;
}

export interface RiskTrendSeries {
  range: TrendRange;
  points: RiskTrendPoint[];
  illustrative: true;
}

export interface LossDistributionPoint {
  percentile: string;
  lossInr: number;
}

export interface FinancialExposure {
  expectedLossInr: number;
  p50Inr: number;
  p75Inr: number;
  p90Inr: number;
  p95Inr: number;
  p99Inr: number;
  valueAtRisk95Inr: number;
  exceedanceCurve: Array<{ lossInr: number; probability: number }>;
  businessUnitExposure: Array<{
    unit: string;
    exposureInr: number;
    expectedAnnualLossInr: number;
  }>;
  assetExposure: Array<{
    assetId: string;
    assetName: string;
    exposureInr: number;
  }>;
  riskAppetiteInr: number;
  illustrative: true;
}

export interface RiskContributor {
  rank: number;
  name: string;
  riskScore: number;
  financialExposureInr: number;
  trend: Trend;
  affectedAssets: number;
  level: RiskLevel;
}

export interface AttackPathNode {
  id: string;
  label: string;
  type: AssetType | "entry";
  level: RiskLevel;
  controls: string[];
  businessService: string;
  probability: number;
  impactInr: number;
}

export interface AttackPathEdge {
  id: string;
  source: string;
  target: string;
  technique: string;
  blockedBy?: string;
}

export interface AttackPath {
  id: string;
  name: string;
  riskScore: number;
  potentialExposureInr: number;
  criticalWeakness: string;
  recommendedAction: string;
  probability: number;
  businessImpact: string;
  nodes: AttackPathNode[];
  edges: AttackPathEdge[];
  illustrative: true;
}

export interface InvestmentOpportunity {
  id: string;
  control: string;
  investmentInr: number;
  riskReductionPct: number;
  expectedLossAvoidedInr: number;
  rosi: number;
  priority: RiskLevel;
}

export interface InvestmentPortfolio {
  budgetInr: number;
  riskAppetite: number;
  targetRisk: number;
  businessPriorities: string[];
  selectedControls: string[];
  recommended: InvestmentOpportunity[];
  curve: Array<{ investmentInr: number; residualRisk: number }>;
  totals: {
    investmentInr: number;
    riskReductionPct: number;
    lossAvoidedInr: number;
    rosi: number;
  };
  illustrative: true;
}

export interface AdvisorQuestion {
  id: string;
  prompt: string;
}

export interface AIRecommendation {
  id: string;
  question: string;
  recommendation: string;
  reasoning: string[];
  evidence: Array<{ source: string; detail: string }>;
  confidence: number;
  expectedRiskReduction: string;
  limitations: string;
  generatedAt: string;
  illustrative: true;
}

export interface Asset {
  id: string;
  name: string;
  type: AssetType;
  businessService: string;
  businessUnit: string;
  hosting: HostingModel;
  criticality: RiskLevel;
  exposure: RiskLevel;
  riskScore: number;
  controls: string[];
  lastAssessment: string;
}

export interface Vulnerability {
  id: string;
  cve: string;
  assetId: string;
  assetName: string;
  severity: RiskLevel;
  exploitability: number;
  threatActivity: "observed" | "likely" | "possible" | "none";
  businessCriticality: RiskLevel;
  financialExposureInr: number;
  recommendedAction: string;
  status: VulnerabilityStatus;
}

export interface Threat {
  id: string;
  name: string;
  category: "active" | "emerging";
  actor?: string;
  mitreTechniques: string[];
  affectedAssets: number;
  trend: Trend;
  summary: string;
}

export interface Incident {
  id: string;
  title: string;
  type: IncidentType;
  severity: RiskLevel;
  status: IncidentStatus;
  affectedAssets: string[];
  financialImpactInr: number;
  attackPathId: string;
  detectedAt: string;
  summary: string;
  timeline: Array<{ at: string; event: string }>;
  responseNotes: string;
}

export interface ComplianceFramework {
  id: string;
  name: string;
  coveragePct: number;
  controlCoverage: string;
  missingControls: string[];
  evidenceAvailability: "complete" | "partial" | "limited";
  gapRisk: RiskLevel;
  summary: string;
}

export interface BlockchainEvidence {
  id: string;
  event: EvidenceEvent;
  hash: string;
  timestamp: string;
  blockNumber: number;
  status: EvidenceStatus;
  description: string;
}

export interface ReportDefinition {
  id: string;
  title: string;
  audience: string;
  summary: string;
  lastGenerated: string;
}

export interface ScenarioControl {
  id: string;
  name: string;
  enabled: boolean;
  investmentInr: number;
}

export interface ScenarioResult {
  id: string;
  name: string;
  createdAt: string;
  currentRisk: number;
  currentExposureInr: number;
  resultRisk: number;
  resultExposureInr: number;
  riskReductionPoints: number;
  investmentInr: number;
  modeledLossAvoidedInr: number;
  rosi: number;
  controls: string[];
  illustrative: true;
}

export interface NotificationItem {
  id: string;
  title: string;
  detail: string;
  at: string;
  level: RiskLevel;
}

export interface UserProfile {
  name: string;
  role: string;
  email: string;
}

export interface SettingsModel {
  organization: Organization;
  users: Array<{ name: string; role: string; email: string }>;
  integrations: Array<{ name: string; status: "connected" | "configured" | "planned" }>;
  riskModel: {
    method: string;
    timeHorizonDays: number;
    notes: string;
  };
  financialAssumptions: {
    currency: "INR";
    discountRatePct: number;
    incidentCostBasis: string;
  };
}
