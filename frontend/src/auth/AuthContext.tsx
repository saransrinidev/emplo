import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { authApi, type TokenResponse } from "../api/auth";

export type Role = "employee" | "manager" | "hr_admin";

export interface SessionUser {
  id: string;
  email: string;
  role: Role;
  name: string;
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
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);

  // On startup, if we have a token, restore the session from /auth/me.
  useEffect(() => {
    const token = localStorage.getItem(ACCESS_KEY);
    if (!token) {
      setLoading(false);
      return;
    }
    authApi
      .me()
      .then((me) =>
        setUser({
          id: me.id,
          email: me.email,
          role: me.role,
          name: nameFromEmail(me.email),
        }),
      )
      .catch(() => clearTokens())
      .finally(() => setLoading(false));
  }, []);

  const login = async (email: string, password: string) => {
    const tokens = await authApi.login(email, password);
    storeTokens(tokens);
    const me = await authApi.me();
    setUser({
      id: me.id,
      email: me.email,
      role: me.role,
      name: nameFromEmail(me.email),
    });
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
