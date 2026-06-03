import { api } from "./client";

export interface Employee {
  id: string;
  employee_code: string;
  full_name: string;
  email: string;
  mobile_number: string | null;
  department: string | null;
  designation: string | null;
  employment_status: string | null;
  work_location: string | null;
  manager_id: string | null;
}

export const employeesApi = {
  list: (q?: string) =>
    api.get<Employee[]>(`/employees${q ? `?q=${encodeURIComponent(q)}` : ""}`),

  get: (id: string) => api.get<Employee>(`/employees/${id}`),
};
