import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router";
import { useAuth } from "../AuthContext";
import LocationPicker from "./LocationPicker";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:8000";

export default function HospitalDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [doctors, setDoctors] = useState([]);
  const [specialties, setSpecialties] = useState([]);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(null);
  const [error, setError] = useState(null);
  const [editingDocId, setEditingDocId] = useState(null);
  const [docForm, setDocForm] = useState({});
  const [docSaving, setDocSaving] = useState(false);
  const [docMsg, setDocMsg] = useState(null);

  const headers = useCallback(() => ({
    "Content-Type": "application/json",
    Authorization: `Bearer ${user?.token}`,
  }), [user]);

  useEffect(() => {
    if (!user || user.role !== "hospital") { navigate("/login"); return; }
    fetch(`${API_URL}/auth/me`, { headers: { Authorization: `Bearer ${user.token}` } })
      .then((r) => r.json())
      .then(setProfile)
      .catch(() => {});
    fetch(`${API_URL}/auth/me/hospital/doctors`, { headers: { Authorization: `Bearer ${user.token}` } })
      .then((r) => r.ok ? r.json() : [])
      .then((data) => setDoctors(Array.isArray(data) ? data : []))
      .catch(() => setDoctors([]));
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
      const { role, id, ...body } = profile;
      const res = await fetch(`${API_URL}/auth/me/hospital`, {
        method: "PUT", headers: headers(), body: JSON.stringify(body),
      });
      if (!res.ok) { const d = await res.json().catch(() => null); throw new Error(d?.detail || "Save failed."); }
      setSuccess("Hospital profile updated!");
    } catch (err) { setError(err.message); }
    finally { setSaving(false); }
  };

  const startEditDoc = (doc) => {
    setEditingDocId(doc.id);
    setDocForm({ name: doc.name, specialty: doc.specialty, experience_years: doc.experience_years, availability: doc.availability, contact_info: doc.contact_info });
    setDocMsg(null);
  };

  const cancelEditDoc = () => { setEditingDocId(null); setDocForm({}); setDocMsg(null); };

  const saveDoc = async (docId) => {
    setDocSaving(true);
    setDocMsg(null);
    try {
      const res = await fetch(`${API_URL}/auth/me/hospital/doctors/${docId}`, {
        method: "PUT", headers: headers(), body: JSON.stringify(docForm),
      });
      if (!res.ok) { const d = await res.json().catch(() => null); throw new Error(d?.detail || "Save failed."); }
      const updated = await res.json();
      setDoctors((prev) => prev.map((d) => (d.id === docId ? updated : d)));
      setEditingDocId(null);
      setDocMsg("Doctor updated!");
    } catch (err) { setDocMsg(err.message); }
    finally { setDocSaving(false); }
  };

  const deleteDoc = async (docId, docName) => {
    if (!window.confirm(`Remove ${docName} from your hospital?`)) return;
    try {
      const res = await fetch(`${API_URL}/auth/me/hospital/doctors/${docId}`, {
        method: "DELETE", headers: headers(),
      });
      if (!res.ok) { const d = await res.json().catch(() => null); throw new Error(d?.detail || "Delete failed."); }
      setDoctors((prev) => prev.filter((d) => d.id !== docId));
      setDocMsg("Doctor removed.");
    } catch (err) { setDocMsg(err.message); }
  };

  if (!profile) return <div className="page-container"><p style={{ textAlign: "center", color: "var(--muted-foreground)" }}>Loading...</p></div>;

  return (
    <div className="page-container">
      <form className="form-card" onSubmit={handleSave}>
        <div className="form-header">
          <div className="form-icon">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 21h18"/><path d="M5 21V7l8-4v18"/><path d="M19 21V11l-6-4"/><path d="M9 9h1"/><path d="M9 13h1"/><path d="M9 17h1"/></svg>
          </div>
          <h2>Hospital Dashboard</h2>
          <p>Manage your hospital profile and doctors</p>
        </div>

        <div className="form-body">
          {success && <div className="alert alert-success">{success}</div>}
          {error && <div className="alert alert-error">{error}</div>}

          <div className="form-group">
            <label className="form-label">Hospital Name</label>
            <input className="form-input" value={profile.name} onChange={(e) => update("name", e.target.value)} disabled={saving} />
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

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Contact Number</label>
              <input className="form-input" value={profile.contact_number} onChange={(e) => update("contact_number", e.target.value)} disabled={saving} />
            </div>
            <div className="form-group">
              <label className="form-label">Email</label>
              <input className="form-input" type="email" value={profile.email} onChange={(e) => update("email", e.target.value)} disabled={saving} />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Description</label>
            <textarea className="form-textarea" rows={3} value={profile.description} onChange={(e) => update("description", e.target.value)} disabled={saving} />
          </div>

          <div className="form-actions">
            <button type="submit" className="btn btn-primary btn-lg" disabled={saving} style={{ flex: 1 }}>
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </div>
      </form>

      {/* Doctors management */}
      <div className="form-card" style={{ marginTop: "1.5rem" }}>
        <div className="form-header">
          <h2>Your Doctors ({doctors.length})</h2>
          <p>Manage the doctors at your hospital</p>
        </div>
        <div className="form-body">
          {docMsg && <div className={`alert ${docMsg.includes("fail") || docMsg.includes("error") ? "alert-error" : "alert-success"}`}>{docMsg}</div>}

          {doctors.length === 0 && <p style={{ color: "var(--muted-foreground)", fontStyle: "italic" }}>No doctors registered yet.</p>}

          {doctors.map((doc) => (
            <div key={doc.id} className="dash-doctor-card">
              {editingDocId === doc.id ? (
                <>
                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label">Name</label>
                      <input className="form-input" value={docForm.name} onChange={(e) => setDocForm((f) => ({ ...f, name: e.target.value }))} disabled={docSaving} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Experience</label>
                      <input className="form-input" type="number" min="0" value={docForm.experience_years} onChange={(e) => setDocForm((f) => ({ ...f, experience_years: parseInt(e.target.value, 10) || 0 }))} disabled={docSaving} />
                    </div>
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label">Specialty</label>
                      <select className="form-select" value={docForm.specialty} onChange={(e) => setDocForm((f) => ({ ...f, specialty: e.target.value }))} disabled={docSaving}>
                        {specialties.map((s) => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
                      </select>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Availability</label>
                      <input className="form-input" value={docForm.availability} onChange={(e) => setDocForm((f) => ({ ...f, availability: e.target.value }))} disabled={docSaving} />
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Contact Info</label>
                    <input className="form-input" value={docForm.contact_info} onChange={(e) => setDocForm((f) => ({ ...f, contact_info: e.target.value }))} disabled={docSaving} />
                  </div>
                  <div className="dash-doctor-actions">
                    <button type="button" className="btn btn-primary" onClick={() => saveDoc(doc.id)} disabled={docSaving}>{docSaving ? "Saving..." : "Save"}</button>
                    <button type="button" className="btn btn-outline" onClick={cancelEditDoc} disabled={docSaving}>Cancel</button>
                  </div>
                </>
              ) : (
                <>
                  <div className="dash-doctor-info">
                    <strong>{doc.name}</strong>
                    <span className="dash-doctor-specialty">{doc.specialty}</span>
                    <span className="dash-doctor-meta">{doc.experience_years} yrs exp &middot; {doc.availability || "N/A"}</span>
                  </div>
                  <div className="dash-doctor-actions">
                    <button type="button" className="btn btn-outline btn-sm" onClick={() => startEditDoc(doc)}>Edit</button>
                    <button type="button" className="btn btn-danger btn-sm" onClick={() => deleteDoc(doc.id, doc.name)}>Remove</button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
