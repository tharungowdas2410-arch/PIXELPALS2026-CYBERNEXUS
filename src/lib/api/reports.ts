import { apiRequest } from "./client";
import type { DataEnvelope } from "@/lib/types/api";

export interface ExecutiveReportData {
  report_metadata: {
    report_id: string;
    generated_at: string;
    organization_id: string;
    disclaimer: string;
  };
  executive_summary: {
    posture_score: number;
    posture_grade: string;
    posture_status: string;
    narrative: string;
  };
  financial_risk_quantification: {
    total_assets: number;
    total_financial_exposure_inr: number;
    expected_annual_loss_inr: number;
    value_at_risk_95_inr: number;
    loss_exceedance_scenarios: Array<{
      scenario: string;
      confidence: string;
      simulated_loss_inr: number;
    }>;
  };
  compliance_alignment: {
    overall_score: number;
    total_requirements: number;
    frameworks: Array<{
      framework: string;
      score: number;
      controls: number;
      status: string;
    }>;
    critical_gaps_count: number;
  };
  investment_recommendations: {
    available_budget_inr: number;
    recommended_portfolio_cost_inr: number;
    projected_risk_reduction_pct: number;
    projected_loss_avoided_inr: number;
    portfolio_rosi: number;
    recommended_controls: Array<{
      name: string;
      category: string;
      cost: number;
      estimated_risk_reduction: number;
      estimated_loss_avoided: number;
      rosi: number;
    }>;
  };
  top_risk_drivers: Array<{
    title: string;
    severity: string;
    residual_risk: number;
    loss: number;
  }>;
}

export async function getExecutiveReport(): Promise<ExecutiveReportData> {
  const res = await apiRequest<DataEnvelope<ExecutiveReportData>>("/reports/executive");
  return res.data;
}

export async function getSecurityPostureReport(): Promise<Record<string, unknown>> {
  const res = await apiRequest<DataEnvelope<Record<string, unknown>>>("/reports/security-posture");
  return res.data;
}
