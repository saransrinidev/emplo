import { api } from "./client";

export interface HolidayCalendar {
  id: string;
  name: string;
  region: string | null;
  year: number;
  created_at: string;
  updated_at: string;
}

export interface Holiday {
  id: string;
  calendar_id: string;
  holiday_date: string;
  name: string;
  is_optional: boolean;
  created_at: string;
  updated_at: string;
}

export const holidaysApi = {
  listCalendars: (year?: number) =>
    api.get<HolidayCalendar[]>(`/holidays/calendars${year ? `?year=${year}` : ""}`),
  createCalendar: (data: { name: string; region?: string; year: number }) =>
    api.post<HolidayCalendar>("/holidays/calendars", data),
  deleteCalendar: (id: string) => api.delete(`/holidays/calendars/${id}`),

  list: (calendarId?: string, year?: number) => {
    const params = new URLSearchParams();
    if (calendarId) params.set("calendar_id", calendarId);
    if (year) params.set("year", year.toString());
    const qs = params.toString();
    return api.get<Holiday[]>(`/holidays${qs ? `?${qs}` : ""}`);
  },
  create: (data: { calendar_id: string; holiday_date: string; name: string; is_optional?: boolean }) =>
    api.post<Holiday>("/holidays", data),
  delete: (id: string) => api.delete(`/holidays/${id}`),
};
