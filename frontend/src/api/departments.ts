import { api } from "./client";

export interface Department {
  id: string;
  name: string;
  code: string;
  head_employee_id: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Designation {
  id: string;
  title: string;
  department_id: string | null;
  level: number | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export const departmentsApi = {
  list: (activeOnly = true) =>
    api.get<Department[]>(`/departments?active_only=${activeOnly}`),
  create: (data: { name: string; code: string; head_employee_id?: string; is_active?: boolean }) =>
    api.post<Department>("/departments", data),
  update: (id: string, data: Partial<Department>) =>
    api.put<Department>(`/departments/${id}`, data),
  delete: (id: string) => api.delete(`/departments/${id}`),

  // Designations
  listDesignations: (departmentId?: string, activeOnly = true) =>
    api.get<Designation[]>(
      `/departments/designations?active_only=${activeOnly}${departmentId ? `&department_id=${departmentId}` : ""}`,
    ),
  createDesignation: (data: { title: string; department_id?: string; level?: number; is_active?: boolean }) =>
    api.post<Designation>("/departments/designations", data),
  updateDesignation: (id: string, data: Partial<Designation>) =>
    api.put<Designation>(`/departments/designations/${id}`, data),
  deleteDesignation: (id: string) => api.delete(`/departments/designations/${id}`),
};
