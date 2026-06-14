import { api } from "./client";

export interface AttendanceRecord {
  id: string;
  employee_id: string;
  work_date: string;
  check_in: string | null;
  check_out: string | null;
  work_hours: number | null;
  status: string;
  source: string | null;
  created_at: string;
  updated_at: string;
}

export const attendanceRecordsApi = {
  checkIn: (source = "web") =>
    api.post<AttendanceRecord>("/attendance-records/check-in", { source }),
  checkOut: () =>
    api.post<AttendanceRecord>("/attendance-records/check-out"),
  my: (month?: number, year?: number) => {
    const params = new URLSearchParams();
    if (month) params.set("month", month.toString());
    if (year) params.set("year", year.toString());
    const qs = params.toString();
    return api.get<AttendanceRecord[]>(`/attendance-records/my${qs ? `?${qs}` : ""}`);
  },
  team: (workDate?: string) =>
    api.get<AttendanceRecord[]>(`/attendance-records/team${workDate ? `?work_date=${workDate}` : ""}`),
};
