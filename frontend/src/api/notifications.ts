import { api } from "./client";

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

export const notificationsApi = {
  list: () => api.get<NotificationItem[]>("/notifications"),
  unreadCount: () => api.get<{ count: number }>("/notifications/unread-count"),
  markAllRead: () => api.post<void>("/notifications/read-all"),
  markOneRead: (id: string) => api.put<void>(`/notifications/${id}/read`),
  deleteOne: (id: string) => api.delete<void>(`/notifications/${id}`),
  clearAll: () => api.delete<void>("/notifications"),
  sendAlert: (data: {
    employee_id: string;
    title: string;
    message: string;
    notify_manager: boolean;
  }) => api.post<{ sent_to: string[] }>("/notifications/send-alert", data),
};
