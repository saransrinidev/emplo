// Thin wrapper around fetch for talking to the FastAPI backend.
// During dev, Vite proxies "/api/*" to http://127.0.0.1:8000 (see vite.config.ts).

const BASE_URL = "/api";

function getAccessToken(): string | null {
  return localStorage.getItem("access_token");
}

function getRefreshToken(): string | null {
  return localStorage.getItem("refresh_token");
}

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

// Attempt to refresh the access token using the stored refresh token.
// Returns the new access token, or null if refresh failed.
let refreshInFlight: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  const refresh_token = getRefreshToken();
  if (!refresh_token) return null;

  // De-dupe concurrent refreshes so a burst of 401s triggers only one refresh.
  if (!refreshInFlight) {
    refreshInFlight = fetch(`${BASE_URL}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token }),
    })
      .then(async (res) => {
        if (!res.ok) return null;
        const data = await res.json();
        localStorage.setItem("access_token", data.access_token);
        localStorage.setItem("refresh_token", data.refresh_token);
        return data.access_token as string;
      })
      .catch(() => null)
      .finally(() => {
        refreshInFlight = null;
      });
  }
  return refreshInFlight;
}

async function rawFetch(
  path: string,
  options: RequestInit,
  token: string | null,
): Promise<Response> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  return fetch(`${BASE_URL}${path}`, { ...options, headers });
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  let res = await rawFetch(path, options, getAccessToken());

  // On 401, try a single token refresh and retry the request once.
  if (res.status === 401 && getRefreshToken()) {
    const newToken = await refreshAccessToken();
    if (newToken) {
      res = await rawFetch(path, options, newToken);
    }
  }

  if (!res.ok) {
    let detail = res.statusText;
    try {
      const body = await res.json();
      detail = body.detail ?? detail;
    } catch {
      // response had no JSON body
    }
    throw new ApiError(res.status, detail);
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export const api = {
  get: <T>(path: string) => apiFetch<T>(path),
  post: <T>(path: string, body?: unknown) =>
    apiFetch<T>(path, {
      method: "POST",
      body: body !== undefined ? JSON.stringify(body) : undefined,
    }),
  put: <T>(path: string, body?: unknown) =>
    apiFetch<T>(path, { method: "PUT", body: JSON.stringify(body) }),
  delete: <T>(path: string) =>
    apiFetch<T>(path, { method: "DELETE" }),
};
