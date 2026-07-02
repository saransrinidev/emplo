import { api } from "./client";

export interface Employee {
  id: string;
  employee_code: string;
  full_name: string;
  email: string;
  mobile_number: string | null;
  date_of_birth: string | null;
  gender: string | null;
  marital_status: string | null;
  date_of_joining: string | null;
  department: string | null;
  designation: string | null;
  employment_status: string | null;
  work_location: string | null;
  manager_id: string | null;
  profile_photo: string | null;
}

export interface EmployeeCreate {
  employee_code: string;
  full_name: string;
  email: string;
  mobile_number?: string;
  date_of_birth?: string;
  gender?: string;
  marital_status?: string;
  date_of_joining?: string;
  department?: string;
  designation?: string;
  employment_status?: string;
  work_location?: string;
  manager_id?: string;
  initial_salary?: number;
}

export interface UserAccount {
  id: string;
  email: string;
  role: string;
  employee_id: string;
}

export interface EmployeeWithRole {
  id: string;
  employee_code: string;
  full_name: string;
  email: string;
  department: string | null;
  designation: string | null;
  employment_status: string | null;
  work_location: string | null;
  manager_id: string | null;
  role: string | null;
  profile_photo: string | null;
}

export interface BulkImportResult {
  total: number;
  created: number;
  errors: string[];
}

export const employeesApi = {
  list: (q?: string) =>
    api.get<Employee[]>(`/employees${q ? `?q=${encodeURIComponent(q)}` : ""}`),

  listWithRoles: (q?: string) =>
    api.get<EmployeeWithRole[]>(`/employees/with-roles${q ? `?q=${encodeURIComponent(q)}` : ""}`),

  get: (id: string) => api.get<Employee>(`/employees/${id}`),

  create: (data: EmployeeCreate) => api.post<Employee>("/employees", data),

  bulkImport: (employees: Record<string, string | null>[]) =>
    api.post<BulkImportResult>("/employees/bulk-import", { employees }),

  update: (id: string, data: Partial<EmployeeCreate>) =>
    api.put<Employee>(`/employees/${id}`, data),

  createLogin: (employeeId: string, data: { password: string; role: string }) =>
    api.post<UserAccount>(`/employees/${employeeId}/create-login`, data),

  bulkCreateLogins: (data: { employee_ids: string[]; password: string; role: string }) =>
    api.post<{ total: number; created: number; errors: string[] }>("/employees/bulk-create-login", data),

  changeRole: (employeeId: string, role: string) =>
    api.put<UserAccount>(`/employees/${employeeId}/change-role`, { role }),

  terminate: (id: string) => api.delete<void>(`/employees/${id}`),
};
