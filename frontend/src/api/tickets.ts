import { api } from "./client";

export type TicketType = "leave" | "wfh" | "document_update" | "profile_edit" | "certification" | "salary_query" | "general";
export type TicketPriority = "low" | "medium" | "high";
export type TicketStatus = "open" | "in_progress" | "resolved" | "closed" | "rejected";

export interface TicketComment {
  id: string;
  ticket_id: string;
  user_id: string;
  user_name: string | null;
  message: string;
  is_internal: boolean;
  created_at: string;
}

export interface Ticket {
  id: string;
  ticket_number: string;
  employee_id: string;
  employee_name: string | null;
  ticket_type: TicketType;
  priority: TicketPriority;
  subject: string;
  description: string | null;
  status: TicketStatus;
  metadata: Record<string, unknown> | null;
  assigned_to: string | null;
  resolved_by: string | null;
  resolved_at: string | null;
  resolution_notes: string | null;
  comments: TicketComment[];
  created_at: string;
  updated_at: string;
}

export const ticketsApi = {
  // Employee
  create: (data: {
    ticket_type: TicketType;
    subject: string;
    description?: string;
    priority?: TicketPriority;
    metadata?: Record<string, unknown>;
  }) => api.post<Ticket>("/tickets", data),

  my: (params?: { status?: TicketStatus; ticket_type?: TicketType }) => {
    const qs = new URLSearchParams();
    if (params?.status) qs.set("status", params.status);
    if (params?.ticket_type) qs.set("ticket_type", params.ticket_type);
    const query = qs.toString();
    return api.get<Ticket[]>(`/tickets/my${query ? `?${query}` : ""}`);
  },

  get: (id: string) => api.get<Ticket>(`/tickets/${id}`),

  addComment: (ticketId: string, message: string, isInternal = false) =>
    api.post<TicketComment>(`/tickets/${ticketId}/comments`, { message, is_internal: isInternal }),

  // Manager
  team: (params?: { status?: TicketStatus }) => {
    const qs = new URLSearchParams();
    if (params?.status) qs.set("status", params.status);
    const query = qs.toString();
    return api.get<Ticket[]>(`/tickets/team${query ? `?${query}` : ""}`);
  },

  // HR
  listAll: (params?: { status?: TicketStatus; ticket_type?: TicketType; limit?: number; offset?: number }) => {
    const qs = new URLSearchParams();
    if (params?.status) qs.set("status", params.status);
    if (params?.ticket_type) qs.set("ticket_type", params.ticket_type);
    if (params?.limit) qs.set("limit", params.limit.toString());
    if (params?.offset) qs.set("offset", params.offset.toString());
    const query = qs.toString();
    return api.get<Ticket[]>(`/tickets${query ? `?${query}` : ""}`);
  },

  updateStatus: (id: string, status: TicketStatus, resolutionNotes?: string) =>
    api.put<Ticket>(`/tickets/${id}/status`, { status, resolution_notes: resolutionNotes }),

  assign: (id: string, assignedTo: string) =>
    api.put<Ticket>(`/tickets/${id}/assign`, { assigned_to: assignedTo }),
};
