export type Paginated<T> = {
  data: T[];
  total: number;
  page: number;
  page_size: number;
};

export type DataEnvelope<T> = {
  data: T;
  meta?: Record<string, unknown> | null;
};

export type ApiErrorBody = {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
};

export type TokenResponse = {
  access_token: string;
  token_type: string;
};

export type UserRole = "admin" | "ciso" | "security_analyst" | "risk_manager" | "executive";

export type User = {
  id: string;
  organization_id: string;
  email: string;
  full_name: string;
  role: UserRole;
  is_active: boolean;
};

export type Organization = {
  id: string;
  name: string;
  industry: string | null;
  country: string | null;
  security_budget: number | string;
  description: string | null;
  created_at: string;
  updated_at: string;
};

export type AssetType =
  | "server"
  | "application"
  | "database"
  | "endpoint"
  | "cloud_resource"
  | "identity"
  | "network_device"
  | "business_service";

export type Asset = {
  id: string;
  organization_id: string;
  name: string;
  asset_type: AssetType;
  owner: string | null;
  environment: string | null;
  criticality: number;
  business_value: number | string;
  exposure: string | null;
  data_sensitivity: string | null;
  availability_requirement: string | null;
  integrity_requirement: string | null;
  confidentiality_requirement: string | null;
  description: string | null;
  created_at: string;
  updated_at: string;
};

export type AssetWrite = {
  name: string;
  asset_type: AssetType;
  owner?: string | null;
  environment?: string | null;
  criticality: number;
  business_value: number;
  exposure?: string | null;
  data_sensitivity?: string | null;
  description?: string | null;
};

export type Severity = "low" | "medium" | "high" | "critical";
export type RemediationStatus = "open" | "in_progress" | "mitigated" | "accepted" | "closed";

export type Vulnerability = {
  id: string;
  asset_id: string;
  cve_id: string | null;
  title: string;
  description: string | null;
  cvss_score: number | null;
  exploitability: number;
  severity: Severity;
  remediation_status: RemediationStatus;
  discovered_at: string | null;
  due_date: string | null;
  created_at: string;
  updated_at: string;
};

export type VulnerabilityWrite = {
  asset_id: string;
  cve_id?: string | null;
  title: string;
  description?: string | null;
  cvss_score?: number | null;
  exploitability: number;
  severity: Severity;
  remediation_status?: RemediationStatus;
};

export type Threat = {
  id: string;
  name: string;
  category: string;
  likelihood: number;
  sophistication: number;
  active: boolean;
  description: string | null;
  created_at: string;
  updated_at: string;
};

export type ThreatWrite = {
  name: string;
  category: string;
  likelihood: number;
  sophistication: number;
  active?: boolean;
  description?: string | null;
};

export type ImplementationStatus = "planned" | "partial" | "implemented" | "not_implemented";

export type Control = {
  id: string;
  organization_id: string;
  name: string;
  framework: string;
  category: string;
  effectiveness: number;
  implementation_status: ImplementationStatus;
  annual_cost: number | string;
  description: string | null;
  created_at: string;
  updated_at: string;
};

export type ControlWrite = {
  name: string;
  framework: string;
  category: string;
  effectiveness: number;
  implementation_status?: ImplementationStatus;
  annual_cost: number;
  description?: string | null;
};

export type RiskStatus = "open" | "monitoring" | "treated" | "accepted" | "closed";
export type RiskLevel = "LOW" | "MODERATE" | "HIGH" | "CRITICAL";

export type RiskFactor = {
  key: string;
  label: string;
  value: number | string | null;
  normalized: number;
  source: string;
  explanation: string;
};

export type Risk = {
  id: string;
  organization_id: string;
  asset_id: string | null;
  vulnerability_id: string | null;
  threat_id: string | null;
  control_id: string | null;
  likelihood: number;
  impact: number;
  risk_score: number;
  residual_risk: number;
  inherent_risk?: number;
  risk_level?: RiskLevel;
  financial_exposure: number | string;
  expected_annual_loss: number | string;
  status: RiskStatus;
  calculated_at: string;
  explanation: string | null;
  drivers: string[] | null;
  factors: RiskFactor[] | Record<string, unknown>[] | null;
  formula_trace: string | null;
};

export type RiskChain = {
  organization_id: string;
  asset: Record<string, unknown> | null;
  vulnerability: Record<string, unknown> | null;
  threat: Record<string, unknown> | null;
  control: Record<string, unknown> | null;
};

export type RiskDetail = Risk & {
  chain?: RiskChain | null;
  formulas?: Record<string, string>;
};

export type RiskCalculateRequest = {
  asset_id: string;
  vulnerability_id?: string | null;
  threat_id?: string | null;
  control_id?: string | null;
  likelihood: number;
  impact: number;
};

export type RiskCalculateResponse = {
  risk_score: number;
  residual_risk: number;
  inherent_risk: number;
  risk_level: RiskLevel;
  drivers: string[];
  contributing_factors: string[];
  factors: RiskFactor[];
  formula_trace: string;
  applied_control_effectiveness: number;
  formulas: Record<string, string>;
  explanation: string;
  expected_annual_loss: number;
  financial_exposure: number;
  chain: RiskChain | null;
  illustrative: boolean;
  persisted: Risk | null;
};

export type RiskSummary = {
  count: number;
  total_records: number;
  average_inherent_risk: number;
  average_residual_risk: number;
  risk_reduction: number;
  by_level: Record<string, number>;
  top_drivers: Array<{ driver: string; count: number }>;
  linked_chain_complete: number;
  total_expected_annual_loss: number;
  total_financial_exposure: number;
  formulas: Record<string, string>;
  illustrative: boolean;
};

export type DashboardOverview = {
  enterprise_risk_score: number;
  average_inherent_risk: number;
  average_residual_risk: number;
  risk_reduction: number;
  total_financial_exposure: number;
  expected_annual_loss: number;
  risk_reduction_opportunity: number;
  active_critical_risks: number;
  open_risk_count: number;
  by_level: Record<string, number>;
  top_drivers: Array<{ driver: string; count: number }>;
  linked_chain_complete: number;
  risk_trend: Array<{ date: string; risk: number }>;
  top_risk_contributors: Array<{
    id: string;
    residual_risk: number;
    inherent_risk: number;
    risk_level: string;
    financial_exposure: number;
    drivers: string[];
  }>;
  financial_loss_distribution: Array<{ percentile: string; loss: number }>;
  investment_opportunities: Array<{
    id: string;
    name: string;
    cost: number;
    estimated_loss_avoided: number;
    rosi: number | null;
    recommended: boolean;
  }>;
  recent_incidents: Array<{
    id: string;
    title: string;
    severity: string;
    status: string;
    estimated_loss: number;
  }>;
  compliance_summary: ComplianceSummary;
  formulas: Record<string, string>;
  illustrative: boolean;
  as_of: string;
};

export type FinancialSummary = {
  expected_annual_loss: number;
  total_financial_exposure: number;
  risk_count: number;
  assumptions: string;
  illustrative: boolean;
};

export type MonteCarloResult = {
  mean: number;
  median: number;
  p50: number;
  p75: number;
  p90: number;
  p95: number;
  p99: number;
  var: number;
  simulations: number;
  distribution_buckets: Array<{ from: number; to: number; count: number }>;
  assumptions: string;
  illustrative: boolean;
};

export type Investment = {
  id: string;
  organization_id: string;
  control_id: string | null;
  name: string;
  category: string;
  cost: number;
  estimated_risk_reduction: number;
  estimated_loss_avoided: number;
  rosi: number | null;
  priority: number;
  recommended: boolean;
  created_at: string;
};

export type PortfolioSummary = {
  recommended_controls: Array<{
    id: string;
    name: string;
    cost: number;
    estimated_risk_reduction: number;
    estimated_loss_avoided: number;
    rosi: number | null;
    category: string;
  }>;
  total_investment: number;
  expected_risk_reduction: number;
  expected_loss_avoided: number;
  remaining_risk: number;
  budget_utilization: number;
  portfolio_rosi: number | null;
  illustrative: boolean;
};

export type ScenarioResult = {
  id?: string;
  name?: string;
  baseline_risk: number;
  scenario_risk: number;
  risk_reduction: number;
  baseline_eal: number;
  scenario_eal: number;
  financial_loss_avoided: number;
  investment_cost: number;
  rosi: number | null;
  changes: string[];
  illustrative: boolean;
  assumptions?: string;
};

export type AttackPathNode = {
  id: string;
  postgres_id: string;
  label: string;
  kind?: string;
  criticality?: number;
  risk_score?: number;
  business_value?: number;
  financial_exposure?: number;
  exposure?: string;
  environment?: string;
  properties?: Record<string, unknown>;
};

export type AttackPathEdge = {
  source: string;
  target: string;
  relation?: string;
  properties?: Record<string, unknown>;
};

export type AttackPathRiskLevel = "LOW" | "MODERATE" | "HIGH" | "CRITICAL";

export type AttackPath = {
  id: string;
  name: string;
  risk_score: number;
  risk_level: AttackPathRiskLevel;
  financial_exposure: number;
  expected_annual_loss: number;
  entry_point: string;
  entry_point_label?: string | null;
  target: string;
  target_label?: string | null;
  nodes: AttackPathNode[];
  edges: AttackPathEdge[];
  critical_weakness: string | null;
  recommended_action: string | null;
  affected_business_services?: string[];
  highest_value_asset?: string | null;
  hop_count?: number;
  assets_in_path?: string[];
  risk_drivers?: string[];
  explanation?: string[];
};

export type AttackPathsResponse = {
  count: number;
  paths: AttackPath[];
  graph_source: "neo4j" | "fallback_inference";
  scoring_formula: string;
  financial_engine: string;
};

export type GraphHealthResponse = {
  neo4j: "healthy" | "unavailable";
  configured: boolean;
  message?: string | null;
  graph_intelligence_enabled: boolean;
  fallback_inference_available: boolean;
};

export type GraphSyncResponse = {
  organization_id: string;
  organizations_synced?: number;
  assets_synced: number;
  vulnerabilities_synced?: number;
  threats_synced?: number;
  controls_synced?: number;
  relationships_synced?: number;
  idempotent: boolean;
  errors?: string[];
};

export type AssetGraphResponse = {
  nodes: AttackPathNode[];
  edges: AttackPathEdge[];
  center: string | null;
  graph_source: "neo4j" | "fallback_inference";
};

export type BlastRadiusResponse = {
  asset_id: string;
  affected_assets: Array<{
    postgres_id: string;
    name: string;
    criticality: number;
    business_value: number;
  }>;
  affected_count: number;
  affected_business_services: string[];
  risk_propagation_score: number;
  estimated_financial_exposure: number;
  expected_annual_loss: number;
  impact_pct: number;
  propagation_depth: number;
  graph_source: "neo4j" | "fallback_inference";
};

export type CriticalPathsResponse = {
  count: number;
  paths: AttackPath[];
  graph_source: "neo4j" | "fallback_inference";
};

export type IncidentStatus = "new" | "investigating" | "contained" | "resolved" | "closed";

export type Incident = {
  id: string;
  organization_id: string;
  title: string;
  severity: Severity;
  status: IncidentStatus;
  detected_at: string | null;
  resolved_at: string | null;
  estimated_loss: number | string;
  affected_assets: string[] | null;
  description: string | null;
  created_at: string;
};

export type IncidentWrite = {
  title: string;
  severity: Severity;
  status?: IncidentStatus;
  estimated_loss?: number;
  affected_assets?: string[];
  description?: string | null;
};

export type ComplianceStatus = "compliant" | "partial" | "non_compliant" | "not_assessed";

export type ComplianceRecord = {
  id: string;
  organization_id: string;
  framework: string;
  requirement: string;
  status: ComplianceStatus;
  score: number;
  evidence: string | null;
  assessed_at: string;
};

export type ComplianceSummary = {
  overall_score: number;
  frameworks: Array<{
    framework: string;
    score: number;
    controls: number;
    compliant: number;
  }>;
  total_requirements: number;
};

export type VerificationStatus = "pending" | "recorded" | "verified" | "failed";

export type BlockchainEvidence = {
  id: string;
  organization_id: string;
  evidence_type: string;
  entity_id: string;
  evidence_hash: string;
  timestamp: string;
  blockchain_network: string;
  transaction_hash: string | null;
  verification_status: VerificationStatus;
  notes: string | null;
};

export type AdvisorAnswer = {
  answer: string;
  supporting_risks: Array<{
    id: string;
    residual_risk: number;
    expected_annual_loss: number;
  }>;
  recommended_actions?: string[];
  financial_impact?: any;
  confidence?: any;
  assumptions?: string[];
  summary?: string;
  key_findings?: Array<Record<string, any>>;
  recommendations?: Array<Record<string, any>>;
  evidence?: Array<Record<string, any>>;
  tools_used?: string[];
  tool_trace?: Array<Record<string, any>>;
  model?: string;
  audit_id?: string;
  decision_payload_hash?: string;
  illustrative?: boolean;
};

export type CitationItem = {
  source_type: string;
  source_id: string;
  description: string;
  timestamp: string;
  metadata?: Record<string, any>;
};

export type ToolExecutionTrace = {
  tool_name: string;
  arguments: Record<string, any>;
  success: boolean;
  execution_time_ms: number;
  result_hash: string;
};

export type AdvisorResponse = {
  answer: string;
  summary: string;
  key_findings: Array<Record<string, any>>;
  recommendations: Array<Record<string, any>>;
  financial_impact: Record<string, any>;
  why_recommendation: string;
  evidence: CitationItem[];
  assumptions: string[];
  confidence: "HIGH" | "MEDIUM" | "LOW";
  limitations: string;
  tools_used: string[];
  tool_trace: ToolExecutionTrace[];
  model: string;
  model_version: string;
  timestamp: string;
  audit_id?: string;
  decision_payload_hash?: string;
  illustrative: boolean;
};

export type AdvisorPlan = {
  question: string;
  intent: string;
  tools: Array<{
    tool_name: string;
    arguments: Record<string, any>;
    order: number;
    reason: string;
  }>;
  reasoning: string;
  framework_topics: string[];
};

export type AdvisorDecisionBrief = {
  title: string;
  organization_name: string;
  generated_at: string;
  executive_summary: string;
  current_risk: Record<string, any>;
  top_business_risks: Array<Record<string, any>>;
  financial_exposure: Record<string, any>;
  recommended_investment: Record<string, any>;
  expected_risk_reduction: Record<string, any>;
  expected_loss_avoided: Record<string, any>;
  portfolio_rosi: Record<string, any>;
  compliance_implications: Array<Record<string, any>>;
  top_3_actions: string[];
  assumptions: string[];
  evidence: CitationItem[];
  decision_hash: string;
  illustrative: boolean;
};

export type AdvisorStatus = {
  ai_enabled: boolean;
  provider: string;
  model: string;
  has_api_key: boolean;
  rag_documents_indexed: number;
  total_advisory_queries: number;
  zero_hallucination_mode: boolean;
  prompt_injection_guard: boolean;
};

export type AdvisorAuditLogItem = {
  id: string;
  organization_id: string;
  user_id?: string | null;
  question: string;
  selected_tools: string[];
  tool_arguments: Record<string, any>;
  tool_results_hash: string;
  answer: string;
  summary?: string | null;
  recommendations?: Array<Record<string, any>> | null;
  financial_impact?: Record<string, any> | null;
  evidence?: Array<Record<string, any>> | null;
  assumptions?: string[] | null;
  confidence: string;
  model: string;
  model_version: string;
  prompt_version: string;
  blockchain_evidence_id?: string | null;
  created_at: string;
};

export type MLIncidentPrediction = {
  incident_probability: number;
  risk_level: string;
  top_factors: string[];
  model: string;
  model_name: string;
  model_version: string;
  feature_version: string;
  prediction_timestamp: string;
  asset_id?: string;
  asset_name?: string;
  deterministic_residual_risk?: number;
  disclaimer?: string;
  illustrative: boolean;
};

export type MLForecast = {
  status: string;
  message?: string;
  required_points?: number;
  available_points?: number;
  current_risk?: number;
  forecast?: Record<string, number>;
  trend?: string;
  confidence?: number;
  illustrative: boolean;
};

export type MLRiskSignals = {
  signals: Array<{
    asset_id: string;
    asset_name: string;
    incident_probability: number;
    risk_level: string;
    top_factors: string[];
    residual_risk: number;
  }>;
  model_name: string;
  model_version: string;
  feature_version: string;
  illustrative: boolean;
  disclaimer: string;
};

export type MLModelPerformance = {
  model_name: string;
  model_version: string;
  feature_version: string;
  selected_model: string;
  evaluation_dataset: string;
  metrics: {
    accuracy: number;
    precision: number;
    recall: number;
    f1: number;
    roc_auc: number;
  };
  comparison?: Record<string, Record<string, number>>;
  disclaimer: string;
  illustrative: boolean;
  forecasting?: Record<string, unknown>;
};

export type MLStatus = {
  incident_model_ready: boolean;
  model_name: string;
  model_version: string;
  feature_version: string;
  evaluation_dataset: string;
  illustrative: boolean;
};

export type MLAnomalies = {
  series_anomaly: {
    anomaly_detected: boolean;
    severity?: string;
    risk_change?: number;
    z_score?: number;
    reason?: string;
  };
  asset_anomalies: Array<{
    asset_id?: string;
    anomaly_detected: boolean;
    severity: string;
    possible_contributing_factors: string[];
  }>;
  anomaly_detected: boolean;
  illustrative: boolean;
};

export type OptimizationObjective =
  | "MAX_RISK_REDUCTION"
  | "MAX_LOSS_AVOIDED"
  | "MAX_ROSI"
  | "BALANCED";

export type SelectedInvestment = {
  id: string;
  name: string;
  category: string;
  cost: number;
  risk_reduction: number;
  loss_avoided: number;
  rosi: number | null;
  affected_assets: string[];
  affected_attack_paths: string[];
  implementation_time: number;
  priority: "LOW" | "MODERATE" | "HIGH" | "CRITICAL";
  reason: string;
  marginal_value_per_lakh: number;
};

export type AdvancedPortfolio = {
  budget: number;
  total_investment: number;
  remaining_budget: number;
  baseline_risk: number;
  optimized_risk: number;
  risk_reduction: number;
  baseline_eal: number;
  optimized_eal: number;
  loss_avoided: number;
  rosi: number | null;
  budget_utilization: number;
  selected_investments: SelectedInvestment[];
  optimization_method: "OR_TOOLS" | "GREEDY_FALLBACK" | "USER_CURATED";
  objective: OptimizationObjective;
  constraints: {
    budget: number;
    objective: OptimizationObjective;
    time_horizon_months: number;
    max_projects: number | null;
    custom_weights: Record<string, number> | null;
  };
  model_version: string;
  timestamp: number;
  decision_payload_hash: string;
  illustrative: boolean;
};

export type RiskCurvePoint = {
  investment: number;
  residual_risk: number;
  risk_reduction: number;
  loss_avoided: number;
  portfolio_rosi: number;
  selected_count: number;
};

export type PortfolioComparisonRow = {
  scenario: {
    budget: number;
    objective: OptimizationObjective;
    time_horizon_months: number;
    max_projects: number | null;
  };
  total_investment: number;
  risk: number;
  risk_reduction: number;
  eal: number;
  loss_avoided: number;
  rosi: number | null;
  budget_utilization: number;
  selected: string[];
  optimization_method: string;
};

export type InvestmentCatalogItem = {
  id: string;
  name: string;
  category: string;
  cost: number;
  risk_reduction: number;
  loss_avoided: number;
  rosi: number | null;
  implementation_time_months: number;
  annual_operating_cost: number;
  dependencies: string[];
  mutually_exclusive_group: string | null;
  affected_assets: string[];
  affected_asset_criticality: number[];
  affected_attack_paths: string[];
  control_effectiveness_gain: number;
  critical_asset_weight: number;
  reason: string;
};
