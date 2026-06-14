import { api } from "./client";

export type LeaveType = "casual" | "sick" | "earned" | "maternity" | "paternity" | "unpaid";
export type LeaveStatus = "pending" | "forwarded_to_hr" | "approved" | "rejected";

export interface LeaveRequest {
  id: string;
  employee_id: string;
  leave_type: LeaveType;
  start_date: string;
  end_date: string;
  reason: string | null;
  status: LeaveStatus;
  manager_id: string | null;
  manager_remarks: string | null;
  hr_id: string | null;
  hr_remarks: string | null;
  created_at: string;
  updated_at: string;
  employee_name: string | null;
  department: string | null;
}

export const attendanceApi = {
  /** Employee: apply for leave */
  apply: (data: {
    leave_type: LeaveType;
    start_date: string;
    end_date: string;
    reason?: string;
  }) => api.post<LeaveRequest>("/attendance", data),

  /** Employee: own leave requests */
  myRequests: () => api.get<LeaveRequest[]>("/attendance/my"),

  /** Manager: team pending requests */
  teamRequests: () => api.get<LeaveRequest[]>("/attendance/team"),

  /** HR: all requests */
  allRequests: (status?: LeaveStatus) =>
    api.get<LeaveRequest[]>(`/attendance/all${status ? `?status=${status}` : ""}`),

  /** Manager: forward or reject */
  managerAction: (leaveId: string, action: "forward" | "reject", remarks?: string) =>
    api.put<LeaveRequest>(`/attendance/${leaveId}/manager`, { action, remarks }),

  /** HR: approve or reject */
  hrAction: (leaveId: string, action: "approve" | "reject", remarks?: string) =>
    api.put<LeaveRequest>(`/attendance/${leaveId}/hr`, { action, remarks }),
};
