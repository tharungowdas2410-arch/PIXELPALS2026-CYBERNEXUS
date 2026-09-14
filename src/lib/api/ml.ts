import { apiData } from "@/lib/api/client";
import type {
  MLAnomalies,
  MLForecast,
  MLIncidentPrediction,
  MLModelPerformance,
  MLRiskSignals,
  MLStatus,
} from "@/lib/types/api";

export async function getMlStatus(): Promise<MLStatus> {
  return apiData<MLStatus>("/ml/status");
}

export async function predictIncident(payload: {
  asset_id: string;
  vulnerability_ids?: string[];
  threat_ids?: string[];
}): Promise<MLIncidentPrediction> {
  return apiData<MLIncidentPrediction>("/ml/predict-incident", { method: "POST", body: payload });
}

export async function forecastRisk(payload: {
  asset_id?: string;
  history?: number[];
} = {}): Promise<MLForecast> {
  return apiData<MLForecast>("/ml/forecast-risk", { method: "POST", body: payload });
}

export async function getMlAnomalies(): Promise<MLAnomalies> {
  return apiData<MLAnomalies>("/ml/anomalies");
}

export async function getMlPerformance(): Promise<MLModelPerformance> {
  return apiData<MLModelPerformance>("/ml/model-performance");
}

export async function getMlRiskSignals(): Promise<MLRiskSignals> {
  return apiData<MLRiskSignals>("/ml/risk-signals");
}
