import { api } from "./client";
import type { Role } from "./types";

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

export interface CurrentUser {
  id: string;
  email: string;
  role: Role;
  name: string | null;
  profile_photo: string | null;
}

export const authApi = {
  login: (email: string, password: string) =>
    api.post<TokenResponse>("/auth/login", { email, password }),

  me: () => api.get<CurrentUser>("/auth/me"),

  refresh: (refresh_token: string) =>
    api.post<TokenResponse>("/auth/refresh", { refresh_token }),

  logout: () => api.post<void>("/auth/logout"),
};
