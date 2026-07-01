import { api } from "./client";

export type TaskPriority = "low" | "medium" | "high" | "urgent";
export type TaskStatus = "open" | "in_progress" | "completed" | "closed";

export interface Task {
  id: string;
  title: string;
  description: string | null;
  assigned_by: string;
  assigned_by_name: string | null;
  assigned_to: string;
  assigned_to_name: string | null;
  due_date: string | null;
  priority: TaskPriority;
  status: TaskStatus;
  completion_note: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export const tasksApi = {
  // Employee
  myTasks: (status?: TaskStatus) => {
    const qs = status ? `?status=${status}` : "";
    return api.get<Task[]>(`/tasks/my${qs}`);
  },
  complete: (taskId: string, completion_note: string) =>
    api.put<Task>(`/tasks/${taskId}/complete`, { completion_note }),

  // Manager/HR
  create: (data: {
    title: string;
    description?: string;
    assigned_to: string;
    due_date?: string;
    priority?: TaskPriority;
  }) => api.post<Task>("/tasks", data),
  assigned: (status?: TaskStatus) => {
    const qs = status ? `?status=${status}` : "";
    return api.get<Task[]>(`/tasks/assigned${qs}`);
  },
  updateStatus: (taskId: string, status: TaskStatus) =>
    api.put<Task>(`/tasks/${taskId}/status`, { status }),
};
