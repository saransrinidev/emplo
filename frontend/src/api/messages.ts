import { api } from "./client";

export interface Message {
  id: string;
  sender_id: string;
  sender_name: string | null;
  receiver_id: string;
  receiver_name: string | null;
  content: string;
  is_read: boolean;
  created_at: string;
}

export interface ConversationPreview {
  employee_id: string;
  employee_name: string;
  employee_photo: string | null;
  last_message: string;
  last_message_time: string;
  unread_count: number;
  is_sender: boolean;
}

export interface Contact {
  id: string;
  name: string;
  role: string;
  photo: string | null;
}

export const messagesApi = {
  send: (receiver_id: string, content: string) =>
    api.post<Message>("/messages", { receiver_id, content }),
  conversations: () =>
    api.get<ConversationPreview[]>("/messages/conversations"),
  getConversation: (employeeId: string) =>
    api.get<Message[]>(`/messages/with/${employeeId}`),
  contacts: () =>
    api.get<Contact[]>("/messages/contacts"),
  unreadCount: () =>
    api.get<{ count: number }>("/messages/unread-count"),
};
