import { apiRequest } from "./client";

export interface DemoSceneItem {
  scene_id: number;
  title: string;
  description: string;
  risk_score: number;
  current_risk?: number;
  eal: number;
  expected_annual_loss?: number;
  exposure: number;
  total_financial_exposure?: number;
}

export interface DemoState {
  demo_mode: boolean;
  active_scene: number;
  scene_title: string;
  description: string;
  baseline_risk: number;
  current_risk: number;
  total_financial_exposure: number;
  expected_annual_loss: number;
  active_alerts_count: number;
  simulated_events_count: number;
  last_updated: string;
  scenes: DemoSceneItem[];
}

export async function getDemoState(): Promise<DemoState> {
  const res = await apiRequest<{ data: DemoState }>("/demo/state");
  return res.data;
}

export interface TriggerSceneResponse {
  scene_id: number;
  scene_title: string;
  description: string;
  current_risk: number;
  expected_annual_loss: number;
  total_financial_exposure: number;
  message: string;
}

export interface ResetDemoResponse {
  status: string;
  active_scene: number;
  scene_title: string;
  message: string;
}

export async function triggerDemoScene(sceneId: number): Promise<TriggerSceneResponse> {
  const res = await apiRequest<{ data: TriggerSceneResponse }>(`/demo/scene/${sceneId}`, {
    method: "POST",
  });
  return res.data;
}

export async function resetDemo(): Promise<ResetDemoResponse> {
  const res = await apiRequest<{ data: ResetDemoResponse }>("/demo/reset", {
    method: "POST",
  });
  return res.data;
}

