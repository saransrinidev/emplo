import { api } from "./client";

export interface SalaryRevision {
  id: string;
  employee_id: string;
  effective_date: string;
  previous_salary: string | null;
  revised_salary: string;
  revision_percentage: string | null;
  comments: string | null;
  approval_status: "pending" | "approved" | "rejected";
}

export interface CurrentSalary {
  current_salary: string | null;
  latest_revision_date: string | null;
}

export const salaryApi = {
  history: (employeeId?: string) =>
    api.get<SalaryRevision[]>(
      `/salary/history${employeeId ? `?employee_id=${employeeId}` : ""}`,
    ),
  current: (employeeId?: string) =>
    api.get<CurrentSalary>(
      `/salary/current${employeeId ? `?employee_id=${employeeId}` : ""}`,
    ),
  pending: () => api.get<SalaryRevision[]>("/salary/pending"),
  addRevision: (data: {
    employee_id: string;
    effective_date: string;
    previous_salary?: string;
    revised_salary: string;
    revision_percentage?: string;
    comments?: string;
  }) => api.post<SalaryRevision>("/salary/revisions", data),
  approve: (revisionId: string) =>
    api.put<SalaryRevision>(`/salary/revisions/${revisionId}/approve`),
  reject: (revisionId: string) =>
    api.put<SalaryRevision>(`/salary/revisions/${revisionId}/reject`),
};
