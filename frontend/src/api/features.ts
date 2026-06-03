import { api } from "./client";

export type VerificationStatus = "uploaded" | "verified" | "rejected";

export interface DocumentItem {
  id: string;
  employee_id: string;
  document_name: string | null;
  document_type: string;
  file_url: string;
  status: VerificationStatus;
  created_at: string;
}

export interface Certification {
  id: string;
  employee_id: string;
  certificate_name: string;
  certificate_number: string | null;
  category: string;
  issued_date: string | null;
  expiry_date: string | null;
  file_url: string | null;
  verification_status: VerificationStatus;
}

export interface SalaryRevision {
  id: string;
  employee_id: string;
  effective_date: string;
  previous_salary: string | null;
  revised_salary: string;
  revision_percentage: string | null;
  comments: string | null;
  approval_status: string;
}

export interface CurrentSalary {
  current_salary: string | null;
  latest_revision_date: string | null;
}

export interface PerformanceReview {
  id: string;
  employee_id: string;
  review_period: string | null;
  review_date: string | null;
  reviewer_name: string | null;
  rating: string | null;
  strengths: string | null;
  areas_for_improvement: string | null;
  comments: string | null;
}

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

export interface AuditLogItem {
  id: string;
  actor_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  changes: Record<string, unknown> | null;
  approval_status: string | null;
  created_at: string;
}

export interface Permission {
  id: string;
  employee_id: string;
  section: string;
  start_at: string;
  expiry_at: string;
  is_revoked: boolean;
  is_active: boolean;
}

export const documentsApi = {
  list: (employeeId?: string) =>
    api.get<DocumentItem[]>(
      `/documents${employeeId ? `?employee_id=${employeeId}` : ""}`,
    ),
  verify: (docId: string, status: VerificationStatus) =>
    api.put<DocumentItem>(`/documents/${docId}/verify`, { status }),
  create: (data: {
    employee_id?: string;
    document_name: string;
    document_type: string;
    file_url: string;
  }) => api.post<DocumentItem>("/documents", data),
};

export const certificationsApi = {
  list: (employeeId?: string) =>
    api.get<Certification[]>(
      `/certifications${employeeId ? `?employee_id=${employeeId}` : ""}`,
    ),
  create: (data: {
    employee_id?: string;
    certificate_name: string;
    certificate_number?: string;
    category?: string;
    issued_date?: string;
    expiry_date?: string;
    file_url?: string;
  }) => api.post<Certification>("/certifications", data),
  verify: (certId: string, verification_status: VerificationStatus) =>
    api.put<Certification>(`/certifications/${certId}`, { verification_status }),
};

export const salaryApi = {
  history: (employeeId?: string) =>
    api.get<SalaryRevision[]>(
      `/salary/history${employeeId ? `?employee_id=${employeeId}` : ""}`,
    ),
  current: (employeeId?: string) =>
    api.get<CurrentSalary>(
      `/salary/current${employeeId ? `?employee_id=${employeeId}` : ""}`,
    ),
  addRevision: (data: {
    employee_id: string;
    effective_date: string;
    previous_salary?: string;
    revised_salary: string;
    revision_percentage?: string;
    comments?: string;
    approval_status?: string;
  }) => api.post<SalaryRevision>("/salary/revisions", data),
};

export const performanceApi = {
  list: (employeeId?: string) =>
    api.get<PerformanceReview[]>(
      `/performance${employeeId ? `?employee_id=${employeeId}` : ""}`,
    ),
  add: (data: {
    employee_id: string;
    review_period?: string;
    review_date?: string;
    reviewer_id?: string;
    rating?: string;
    strengths?: string;
    areas_for_improvement?: string;
    comments?: string;
  }) => api.post<PerformanceReview>("/performance", data),
};

export const notificationsApi = {
  list: () => api.get<NotificationItem[]>("/notifications"),
  unreadCount: () => api.get<{ count: number }>("/notifications/unread-count"),
  markAllRead: () => api.post<void>("/notifications/read-all"),
};

export const auditApi = {
  list: (entityType?: string) =>
    api.get<AuditLogItem[]>(
      `/audit${entityType ? `?entity_type=${entityType}` : ""}`,
    ),
};

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
