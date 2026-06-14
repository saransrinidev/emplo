import { api } from "./client";

export type EditRequestStatus =
  | "pending"
  | "approved"
  | "changes_submitted"
  | "confirmed"
  | "rejected"
  | "expired";

export interface EditRequest {
  id: string;
  employee_id: string;
  employee_name: string | null;
  section: string;
  reason: string | null;
  status: EditRequestStatus;
  window_hours: number | null;
  window_start: string | null;
  window_end: string | null;
  hr_remarks: string | null;
  previous_data: Record<string, unknown> | null;
  submitted_data: Record<string, unknown> | null;
  submitted_at: string | null;
  confirm_remarks: string | null;
  created_at: string;
  updated_at: string;
}

export const editRequestsApi = {
  /** Employee/Manager: request edit access to a profile section */
  create: (data: { section: string; reason?: string }) =>
    api.post<EditRequest>("/edit-requests", data),

  /** Employee/Manager: view my requests */
  my: () => api.get<EditRequest[]>("/edit-requests/my"),

  /** HR: view pending requests (pending + changes_submitted) */
  pending: () => api.get<EditRequest[]>("/edit-requests/pending"),

  /** HR: approve a request with time window */
  approve: (id: string, data: { window_hours: number; remarks?: string }) =>
    api.put<EditRequest>(`/edit-requests/${id}/approve`, data),

  /** HR: reject a request */
  reject: (id: string, remarks?: string) =>
    api.put<EditRequest>(`/edit-requests/${id}/reject`, { action: "reject", remarks }),

  /** Employee: submit edited data for HR confirmation */
  submitChanges: (id: string, data: Record<string, unknown>) =>
    api.put<EditRequest>(`/edit-requests/${id}/submit`, { data }),

  /** HR: confirm submitted changes (keep data) or reject (revert) */
  confirm: (id: string, action: "confirm" | "reject", remarks?: string) =>
    api.put<EditRequest>(`/edit-requests/${id}/confirm`, { action, remarks }),
};
