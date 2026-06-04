import { api } from "./client";

export interface Permission {
  id: string;
  employee_id: string;
  section: string;
  start_at: string;
  expiry_at: string;
  is_revoked: boolean;
  is_active: boolean;
}

export const permissionsApi = {
  list: (employeeId: string) =>
    api.get<Permission[]>(`/permissions?employee_id=${employeeId}`),
  grant: (data: {
    employee_id: string;
    section: string;
    start_at: string;
    expiry_at: string;
  }) => api.post<Permission>("/permissions", data),
  revoke: (id: string) => api.delete<void>(`/permissions/${id}`),
};
