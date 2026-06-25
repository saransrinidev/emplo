import { api } from "./client";

export interface SalaryStructure {
  id: string;
  employee_id: string;
  effective_date: string;
  earnings: Record<string, number>;
  deductions: Record<string, number>;
  employer_contributions: Record<string, number>;
  gross_salary: number;
  total_deductions: number;
  net_salary: number;
  employer_cost: number;
  monthly_ctc: number;
  annual_ctc: number;
}

export interface SalaryTotals {
  gross_salary: number;
  total_deductions: number;
  net_salary: number;
  employer_cost: number;
  monthly_ctc: number;
  annual_ctc: number;
}

export const salaryStructureApi = {
  get: (employeeId: string) =>
    api.get<SalaryStructure | null>(`/salary-structure/${employeeId}`),

  getMy: () =>
    api.get<SalaryStructure | null>("/salary-structure/my"),

  getTemplate: () =>
    api.get<{ earnings: Record<string, number>; deductions: Record<string, number>; employer_contributions: Record<string, number> }>("/salary-structure/template/default"),

  save: (employeeId: string, data: {
    earnings: Record<string, number>;
    deductions: Record<string, number>;
    employer_contributions: Record<string, number>;
    effective_date?: string;
  }) => api.put<SalaryStructure>(`/salary-structure/${employeeId}`, data),

  calculate: (data: {
    earnings: Record<string, number>;
    deductions: Record<string, number>;
    employer_contributions: Record<string, number>;
  }) => api.post<SalaryTotals>("/salary-structure/calculate", data),
};
