import { api } from "./client";

export interface AuditLogItem {
  id: string;
  actor_id: string | null;
  actor_name: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  changes: Record<string, unknown> | null;
  approval_status: string | null;
  created_at: string;
}

export const auditApi = {
  list: (entityType?: string) =>
    api.get<AuditLogItem[]>(
      `/audit${entityType ? `?entity_type=${entityType}` : ""}`,
    ),
};
