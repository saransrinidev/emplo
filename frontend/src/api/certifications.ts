import { api } from "./client";
import type { VerificationStatus } from "./types";

export interface Certification {
  id: string;
  employee_id: string;
  certificate_name: string;
  certificate_number: string | null;
  category: string;
  issued_date: string | null;
  expiry_date: string | null;
  file_url: string | null;
  verification_status: VerificationStatus;
}

export const certificationsApi = {
  list: (employeeId?: string) =>
    api.get<Certification[]>(
      `/certifications${employeeId ? `?employee_id=${employeeId}` : ""}`,
    ),
  create: (data: {
    employee_id?: string;
    certificate_name: string;
    certificate_number?: string;
    category?: string;
    issued_date?: string;
    expiry_date?: string;
    file_url?: string;
  }) => api.post<Certification>("/certifications", data),
  verify: (certId: string, verification_status: VerificationStatus) =>
    api.put<Certification>(`/certifications/${certId}`, { verification_status }),
};
