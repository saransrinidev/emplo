import { api } from "./client";

export interface AuditLogItem {
  id: string;
  actor_id: string | null;
  actor_name: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  changes: Record<string, unknown> | null;
  before_data: Record<string, unknown> | null;
  after_data: Record<string, unknown> | null;
  approval_status: string | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

export const auditApi = {
  list: (params?: { entity_type?: string; action?: string; actor_id?: string; limit?: number; offset?: number }) => {
    const qs = new URLSearchParams();
    if (params?.entity_type) qs.set("entity_type", params.entity_type);
    if (params?.action) qs.set("action", params.action);
    if (params?.actor_id) qs.set("actor_id", params.actor_id);
    if (params?.limit) qs.set("limit", params.limit.toString());
    if (params?.offset) qs.set("offset", params.offset.toString());
    const query = qs.toString();
    return api.get<AuditLogItem[]>(`/audit${query ? `?${query}` : ""}`);
  },
  actions: () => api.get<string[]>("/audit/actions"),
  entityTypes: () => api.get<string[]>("/audit/entity-types"),
};
