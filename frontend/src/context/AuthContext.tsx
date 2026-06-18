import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { authApi, type TokenResponse } from "../api/auth";
import type { Role } from "../api/types";

export type { Role };

export interface SessionUser {
  id: string;
  email: string;
  role: Role;
  name: string;
  profile_photo: string | null;
}

interface AuthState {
  user: SessionUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

const ACCESS_KEY = "access_token";
const REFRESH_KEY = "refresh_token";
const USER_KEY = "cached_user";

// Derive a friendly display name from the email local-part.
function nameFromEmail(email: string): string {
  return email
    .split("@")[0]
    .replace(/[._]/g, " ")
    .split(" ")
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function storeTokens(tokens: TokenResponse) {
  localStorage.setItem(ACCESS_KEY, tokens.access_token);
  localStorage.setItem(REFRESH_KEY, tokens.refresh_token);
}

function clearTokens() {
  localStorage.removeItem(ACCESS_KEY);
  localStorage.removeItem(REFRESH_KEY);
  localStorage.removeItem(USER_KEY);
}

function getCachedUser(): SessionUser | null {
  try {
    const raw = localStorage.getItem(USER_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as SessionUser;
  } catch {
    return null;
  }
}

function setCachedUser(user: SessionUser) {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(getCachedUser);
  const [loading, setLoading] = useState(() => {
    // If we have a cached user, no need to show loading state
    return !getCachedUser() && !!localStorage.getItem(ACCESS_KEY);
  });

  // On startup, if we have a token, validate session in background.
  // If we have cached user, render immediately and revalidate silently.
  useEffect(() => {
    const token = localStorage.getItem(ACCESS_KEY);
    if (!token) {
      setLoading(false);
      return;
    }
    authApi
      .me()
      .then((me) => {
        const sessionUser: SessionUser = {
          id: me.id,
          email: me.email,
          role: me.role,
          name: me.name || nameFromEmail(me.email),
          profile_photo: me.profile_photo || null,
        };
        setUser(sessionUser);
        setCachedUser(sessionUser);
      })
      .catch(() => {
        clearTokens();
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  const login = async (email: string, password: string) => {
    const tokens = await authApi.login(email, password);
    storeTokens(tokens);
    const me = await authApi.me();
    const sessionUser: SessionUser = {
      id: me.id,
      email: me.email,
      role: me.role,
      name: me.name || nameFromEmail(me.email),
      profile_photo: me.profile_photo || null,
    };
    setUser(sessionUser);
    setCachedUser(sessionUser);
  };

  const logout = () => {
    authApi.logout().catch(() => undefined); // best-effort; stateless JWT
    clearTokens();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
