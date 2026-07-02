import { api } from "./client";

export interface EmployeeDashboard {
  designation: string | null;
  date_of_joining: string | null;
  manager_name: string | null;
  current_salary: string | null;
  latest_rating: string | null;
  certification_count: number;
  expiring_soon: number;
}

export interface ManagerDashboard {
  team_members: number;
  avg_team_rating: string | null;
  cert_expiry_alerts: number;
  missing_documents: number;
  upcoming_anniversaries: number;
}

export interface HrDashboard {
  total_employees: number;
  active_employees: number;
  new_joiners: number;
  employees_missing_documents: number;
  expired_certifications: number;
  pending_verifications: number;
  certs_expiring_30: number;
  certs_expiring_60: number;
  certs_expiring_90: number;
  recent_salary_revisions: number;
}

export const dashboardApi = {
  employee: () => api.get<EmployeeDashboard>("/dashboard/employee"),
  manager: () => api.get<ManagerDashboard>("/dashboard/manager"),
  hr: () => api.get<HrDashboard>("/dashboard/hr"),
  missingDocuments: () =>
    api.get<MissingDocumentsResponse>("/dashboard/missing-documents"),
};

export interface MissingDocEmployee {
  id: string;
  full_name: string;
  employee_code: string | null;
  department: string | null;
  designation: string | null;
  missing_documents: string[];
}

export interface MissingDocumentsResponse {
  total: number;
  employees: MissingDocEmployee[];
}


export interface DepartmentStat {
  department: string;
  count: number;
}

export interface Analytics {
  total_employees: number;
  active_employees: number;
  attrition_rate: number;
  avg_tenure_months: number;
  department_distribution: DepartmentStat[];
  monthly_joiners: { month: string; count: number }[];
  gender_distribution: { gender: string; count: number }[];
}

export const analyticsApi = {
  get: () => api.get<Analytics>("/dashboard/analytics"),
};
