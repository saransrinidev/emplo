import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth, type Role } from "../auth/AuthContext";

// The backend auth endpoints (login/logout/refresh) are not built yet.
// Until they are, this screen signs you in locally so the UI is fully
// navigable. Swap `demoLogin` for a real `api.post("/auth/login", ...)` call
// once the backend is ready.
export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<Role>("employee");
  const [error, setError] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!email || !password) {
      setError("Enter an email and password to continue.");
      return;
    }
    const name = email.split("@")[0].replace(/\./g, " ");
    login(
      { email, role, name: titleCase(name) },
      "demo-token", // placeholder until JWT auth is wired up
    );
    navigate("/");
  };

  return (
    <div className="login-wrap">
      <form className="card login-card" onSubmit={handleSubmit}>
        <div className="login-brand">Employee & HR Portal</div>
        <p className="muted login-sub">Sign in to continue</p>

        <div className="field">
          <label htmlFor="email">Email</label>
          <input
            id="email"
            className="input"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@company.com"
          />
        </div>

        <div className="field">
          <label htmlFor="password">Password</label>
          <input
            id="password"
            className="input"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
          />
        </div>

        <div className="field">
          <label htmlFor="role">Sign in as (demo)</label>
          <select
            id="role"
            className="input"
            value={role}
            onChange={(e) => setRole(e.target.value as Role)}
          >
            <option value="employee">Employee</option>
            <option value="manager">Manager</option>
            <option value="hr_admin">HR Administrator</option>
          </select>
        </div>

        {error && <p className="error-text" style={{ marginBottom: 16 }}>{error}</p>}

        <button className="btn" type="submit" style={{ width: "100%" }}>
          Sign in
        </button>
      </form>
    </div>
  );
}

function titleCase(value: string): string {
  return value
    .split(" ")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}
