import React, { useState } from "react";
import { useNavigate } from "react-router";
import { useAuth } from "../AuthContext";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [role, setRole] = useState("hospital");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const isValid = email.trim() && password;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isValid) return;
    setLoading(true);
    setError(null);
    try {
      const data = await login(email.trim(), password, role);
      navigate(data.role === "hospital" ? "/dashboard/hospital" : "/dashboard/doctor");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-container">
      <form className="form-card" onSubmit={handleSubmit}>
        <div className="form-header">
          <div className="form-icon">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
          </div>
          <h2>Login</h2>
          <p>Sign in to manage your profile</p>
        </div>

        <div className="form-body">
          {error && <div className="alert alert-error">{error}</div>}

          <div className="login-role-toggle">
            <button type="button" className={`role-btn ${role === "hospital" ? "active" : ""}`} onClick={() => setRole("hospital")}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 21h18"/><path d="M5 21V7l8-4v18"/><path d="M19 21V11l-6-4"/></svg>
              Hospital
            </button>
            <button type="button" className={`role-btn ${role === "doctor" ? "active" : ""}`} onClick={() => setRole("doctor")}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/></svg>
              Doctor
            </button>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="login-email">Email <span className="required">*</span></label>
            <input id="login-email" className="form-input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder={role === "hospital" ? "hospital@example.com" : "doctor@example.com"} disabled={loading} />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="login-pass">Password <span className="required">*</span></label>
            <input id="login-pass" className="form-input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Enter your password" disabled={loading} />
          </div>

          <div className="form-actions">
            <button type="submit" className="btn btn-primary btn-lg" disabled={loading || !isValid} style={{ flex: 1 }}>
              {loading ? "Signing in..." : "Sign In"}
            </button>
          </div>

          <p className="login-register-hint">
            Don't have an account?{" "}
            <a href={role === "hospital" ? "/register-hospital" : "/register-doctor"}>
              Register as {role === "hospital" ? "a Hospital" : "a Doctor"}
            </a>
          </p>
        </div>
      </form>
    </div>
  );
}
