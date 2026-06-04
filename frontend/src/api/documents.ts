import { api } from "./client";
import type { VerificationStatus } from "./types";

export interface DocumentItem {
  id: string;
  employee_id: string;
  document_name: string | null;
  document_type: string;
  file_url: string;
  status: VerificationStatus;
  created_at: string;
}

export const documentsApi = {
  list: (employeeId?: string) =>
    api.get<DocumentItem[]>(
      `/documents${employeeId ? `?employee_id=${employeeId}` : ""}`,
    ),
  verify: (docId: string, status: VerificationStatus) =>
    api.put<DocumentItem>(`/documents/${docId}/verify`, { status }),
  create: (data: {
    employee_id?: string;
    document_name: string;
    document_type: string;
    file_url: string;
  }) => api.post<DocumentItem>("/documents", data),
};
