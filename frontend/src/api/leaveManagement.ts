import { api } from "./client";

export interface LeaveType {
  id: string;
  name: string;
  code: string;
  default_annual_quota: number;
  is_paid: boolean;
  carry_forward: boolean;
  created_at: string;
  updated_at: string;
}

export interface LeaveBalance {
  id: string;
  employee_id: string;
  leave_type_id: string;
  year: number;
  allocated: number;
  used: number;
  pending: number;
  leave_type_name: string | null;
}

export const leaveManagementApi = {
  // Leave Types
  listTypes: () => api.get<LeaveType[]>("/leave-management/types"),
  createType: (data: { name: string; code: string; default_annual_quota?: number; is_paid?: boolean; carry_forward?: boolean }) =>
    api.post<LeaveType>("/leave-management/types", data),
  updateType: (id: string, data: Partial<LeaveType>) =>
    api.put<LeaveType>(`/leave-management/types/${id}`, data),
  deleteType: (id: string) => api.delete(`/leave-management/types/${id}`),

  // Leave Balances
  getBalances: (employeeId?: string, year?: number) => {
    const params = new URLSearchParams();
    if (employeeId) params.set("employee_id", employeeId);
    if (year) params.set("year", year.toString());
    const qs = params.toString();
    return api.get<LeaveBalance[]>(`/leave-management/balances${qs ? `?${qs}` : ""}`);
  },
  allocateBalance: (data: { employee_id: string; leave_type_id: string; year: number; allocated: number }) =>
    api.post<LeaveBalance>("/leave-management/balances", data),
};
