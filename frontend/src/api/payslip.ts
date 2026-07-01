/**
 * Payslip PDF download API.
 */

const BASE_URL = "/api";

function getAccessToken(): string | null {
  return localStorage.getItem("access_token");
}

export const payslipApi = {
  download: async (employeeId?: string, month?: number, year?: number): Promise<void> => {
    const params = new URLSearchParams();
    if (employeeId) params.set("employee_id", employeeId);
    if (month) params.set("month", month.toString());
    if (year) params.set("year", year.toString());
    const qs = params.toString();

    const token = getAccessToken();
    const headers: Record<string, string> = {};
    if (token) headers.Authorization = `Bearer ${token}`;

    const res = await fetch(`${BASE_URL}/payslip/download${qs ? `?${qs}` : ""}`, { headers });
    if (!res.ok) {
      const body = await res.json().catch(() => ({ detail: "Failed to generate payslip" }));
      throw new Error(body.detail || "Failed to generate payslip");
    }

    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;

    // Extract filename from Content-Disposition header
    const disposition = res.headers.get("content-disposition");
    const match = disposition?.match(/filename=(.+)/);
    a.download = match ? match[1] : `payslip_${new Date().toISOString().slice(0, 7)}.pdf`;

    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },
};
