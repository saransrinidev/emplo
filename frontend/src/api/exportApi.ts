/**
 * CSV Export API — downloads directly as file.
 */

const BASE_URL = "/api";

function getAccessToken(): string | null {
  return localStorage.getItem("access_token");
}

async function downloadCsv(path: string, filename: string): Promise<void> {
  const token = getAccessToken();
  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${BASE_URL}${path}`, { headers });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ detail: "Export failed" }));
    throw new Error(body.detail || "Export failed");
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export const exportApi = {
  employees: () => downloadCsv("/export/employees", `employees_${new Date().toISOString().slice(0, 10)}.csv`),
  salaryRevisions: () => downloadCsv("/export/salary-revisions", `salary_revisions_${new Date().toISOString().slice(0, 10)}.csv`),
  leaveRequests: () => downloadCsv("/export/leave-requests", `leave_requests_${new Date().toISOString().slice(0, 10)}.csv`),
  attendance: (month?: number, year?: number) => {
    let path = "/export/attendance";
    const params = new URLSearchParams();
    if (month) params.set("month", month.toString());
    if (year) params.set("year", year.toString());
    const qs = params.toString();
    if (qs) path += `?${qs}`;
    return downloadCsv(path, `attendance_${new Date().toISOString().slice(0, 10)}.csv`);
  },
};
