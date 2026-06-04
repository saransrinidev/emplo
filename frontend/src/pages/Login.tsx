import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Eye, EyeOff, Lock, Mail, Users, Shield, TrendingUp } from "lucide-react";
import { ApiError } from "../api/client";
import { useAuth } from "../context/AuthContext";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!email || !password) {
      setError("Enter an email and password to continue.");
      return;
    }
    setSubmitting(true);
    try {
      await login(email, password);
      navigate("/");
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        setError("Invalid email or password.");
      } else if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("Could not reach the server. Is the backend running?");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-shell">
      {/* Left cinematic panel */}
      <div className="auth-hero">
        <div className="auth-hero-overlay" />
        <div className="auth-hero-grid" />
        <div className="auth-orb auth-orb-1" />
        <div className="auth-orb auth-orb-2" />
        <div className="auth-orb auth-orb-3" />

        <motion.div
          className="auth-hero-content"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: "easeOut" }}
        >
          <div className="auth-logo">Emplo</div>
          <h1 className="auth-hero-title">
            Manage your workforce with clarity and control.
          </h1>
          <p className="auth-hero-subtitle">
            A unified platform for employee records, certifications, performance,
            and organizational insight — all in one place.
          </p>

          <div className="auth-features">
            {[
              { icon: <Users size={18} />, label: "Centralized employee management" },
              { icon: <Shield size={18} />, label: "Role-based secure access" },
              { icon: <TrendingUp size={18} />, label: "Performance & growth tracking" },
            ].map((f, i) => (
              <motion.div
                key={i}
                className="auth-feature"
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.4 + i * 0.15 }}
              >
                <span className="auth-feature-icon">{f.icon}</span>
                {f.label}
              </motion.div>
            ))}
          </div>
        </motion.div>

        <div className="auth-hero-footer">
          © {new Date().getFullYear()} Emplo. All rights reserved.
        </div>
      </div>

      {/* Right form panel */}
      <div className="auth-form-panel">
        <motion.form
          className="auth-form"
          onSubmit={handleSubmit}
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut", delay: 0.1 }}
        >
          <div className="auth-form-brand">Emplo</div>
          <h2 className="auth-form-title">Welcome back</h2>
          <p className="auth-form-sub">Sign in to your account to continue</p>

          <div className="field">
            <label htmlFor="email">Email address</label>
            <div className="auth-input-wrap">
              <Mail size={18} className="auth-input-icon" />
              <input
                id="email"
                className="input auth-input"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                autoComplete="email"
              />
            </div>
          </div>

          <div className="field">
            <label htmlFor="password">Password</label>
            <div className="auth-input-wrap">
              <Lock size={18} className="auth-input-icon" />
              <input
                id="password"
                className="input auth-input"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
              />
              <button
                type="button"
                className="auth-input-toggle"
                onClick={() => setShowPassword((s) => !s)}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {error && (
            <motion.p
              className="error-text"
              style={{ marginBottom: 16 }}
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
            >
              {error}
            </motion.p>
          )}

          <button
            className="btn auth-submit"
            type="submit"
            disabled={submitting}
          >
            {submitting ? "Signing in…" : "Sign in"}
          </button>

          <p className="auth-form-hint">
            Need access? Contact your HR administrator.
          </p>
        </motion.form>
      </div>
    </div>
  );
}
