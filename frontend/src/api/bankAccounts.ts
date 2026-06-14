import { api } from "./client";

export interface BankAccount {
  id: string;
  employee_id: string;
  account_holder_name: string;
  bank_name: string;
  account_number_masked: string;
  ifsc_swift_code: string;
  branch: string | null;
  is_primary: boolean;
  created_at: string;
  updated_at: string;
}

export const bankAccountsApi = {
  list: (employeeId?: string) =>
    api.get<BankAccount[]>(`/bank-accounts${employeeId ? `?employee_id=${employeeId}` : ""}`),
  create: (data: {
    employee_id: string;
    account_holder_name: string;
    bank_name: string;
    account_number: string;
    ifsc_swift_code: string;
    branch?: string;
    is_primary?: boolean;
  }) => api.post<BankAccount>("/bank-accounts", data),
  update: (id: string, data: Record<string, unknown>) =>
    api.put<BankAccount>(`/bank-accounts/${id}`, data),
  delete: (id: string) => api.delete(`/bank-accounts/${id}`),
};
