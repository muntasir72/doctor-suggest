import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { useAuth } from "../AuthContext";
import LocationPicker from "./LocationPicker";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:8000";

export default function DoctorDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [specialties, setSpecialties] = useState([]);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!user || user.role !== "doctor") { navigate("/login"); return; }
    fetch(`${API_URL}/auth/me`, { headers: { Authorization: `Bearer ${user.token}` } })
      .then((r) => r.json())
      .then(setProfile)
      .catch(() => {});
    fetch(`${API_URL}/specialties`).then((r) => r.json()).then(setSpecialties).catch(() => {});
  }, [user, navigate]);

  const update = (field, value) => setProfile((p) => ({ ...p, [field]: value }));

  const handleLocationChange = (loc) => {
    setProfile((p) => ({
      ...p,
      address: loc.address || p.address,
      city: loc.city || p.city,
      latitude: loc.latitude,
      longitude: loc.longitude,
    }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const { role, id, email, hospital_id, hospital_name, ...body } = profile;
      const res = await fetch(`${API_URL}/auth/me/doctor`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${user.token}` },
        body: JSON.stringify(body),
      });
      if (!res.ok) { const d = await res.json().catch(() => null); throw new Error(d?.detail || "Save failed."); }
      setSuccess("Profile updated!");
    } catch (err) { setError(err.message); }
    finally { setSaving(false); }
  };

  if (!profile) return <div className="page-container"><p style={{ textAlign: "center", color: "var(--muted-foreground)" }}>Loading...</p></div>;

  return (
    <div className="page-container">
      <form className="form-card" onSubmit={handleSave}>
        <div className="form-header">
          <div className="form-icon">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/></svg>
          </div>
          <h2>Doctor Dashboard</h2>
          <p>Manage your profile information</p>
        </div>

        <div className="form-body">
          {success && <div className="alert alert-success">{success}</div>}
          {error && <div className="alert alert-error">{error}</div>}

          {profile.hospital_name ? (
            <div className="dash-hospital-badge">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 21h18"/><path d="M5 21V7l8-4v18"/><path d="M19 21V11l-6-4"/></svg>
              <span>{profile.hospital_name}</span>
            </div>
          ) : (
            <div className="dash-hospital-badge">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
              <span>Independent Clinic</span>
            </div>
          )}

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Name</label>
              <input className="form-input" value={profile.name} onChange={(e) => update("name", e.target.value)} disabled={saving} />
            </div>
            <div className="form-group">
              <label className="form-label">Experience (years)</label>
              <input className="form-input" type="number" min="0" max="60" value={profile.experience_years} onChange={(e) => update("experience_years", parseInt(e.target.value, 10) || 0)} disabled={saving} />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Specialty</label>
              <select className="form-select" value={profile.specialty} onChange={(e) => update("specialty", e.target.value)} disabled={saving}>
                {specialties.map((s) => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Availability</label>
              <input className="form-input" value={profile.availability} onChange={(e) => update("availability", e.target.value)} disabled={saving} />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Contact Info</label>
            <input className="form-input" value={profile.contact_info} onChange={(e) => update("contact_info", e.target.value)} disabled={saving} />
          </div>

          <LocationPicker
            value={{ address: profile.address, latitude: profile.latitude, longitude: profile.longitude }}
            onChange={handleLocationChange}
            disabled={saving}
          />

          <div className="form-group">
            <label className="form-label">City</label>
            <input className="form-input" value={profile.city} onChange={(e) => update("city", e.target.value)} disabled={saving} />
          </div>

          <div className="form-actions">
            <button type="submit" className="btn btn-primary btn-lg" disabled={saving} style={{ flex: 1 }}>
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
