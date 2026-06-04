import { api } from "./client";

export interface PerformanceReview {
  id: string;
  employee_id: string;
  review_period: string | null;
  review_date: string | null;
  reviewer_name: string | null;
  rating: string | null;
  strengths: string | null;
  areas_for_improvement: string | null;
  comments: string | null;
}

export const performanceApi = {
  list: (employeeId?: string) =>
    api.get<PerformanceReview[]>(
      `/performance${employeeId ? `?employee_id=${employeeId}` : ""}`,
    ),
  add: (data: {
    employee_id: string;
    review_period?: string;
    review_date?: string;
    reviewer_id?: string;
    rating?: string;
    strengths?: string;
    areas_for_improvement?: string;
    comments?: string;
  }) => api.post<PerformanceReview>("/performance", data),
};
