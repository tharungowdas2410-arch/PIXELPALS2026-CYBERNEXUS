import { apiRequest } from "./client";
import type { Paginated } from "@/lib/types/api";

export interface AuditLogItem {
  id: string;
  organization_id: string;
  user_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  result: string;
  ip_address: string | null;
  user_agent: string | null;
  correlation_id: string | null;
  details: Record<string, unknown>;
  timestamp: string;
}

export interface AuditLogsParams {
  page?: number;
  page_size?: number;
  action?: string;
  entity_type?: string;
  result?: string;
  user_id?: string;
  start_date?: string;
  end_date?: string;
}

export async function getAuditLogs(params: AuditLogsParams = {}): Promise<Paginated<AuditLogItem>> {
  return apiRequest<Paginated<AuditLogItem>>("/audit", {
    query: {
      page: params.page ?? 1,
      page_size: params.page_size ?? 25,
      action: params.action,
      entity_type: params.entity_type,
      result: params.result,
      user_id: params.user_id,
      start_date: params.start_date,
      end_date: params.end_date,
    },
  });
}
