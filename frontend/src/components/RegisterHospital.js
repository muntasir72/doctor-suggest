import React, { useState, useEffect } from "react";
import LocationPicker from "./LocationPicker";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:8000";

const INITIAL = {
  name: "",
  address: "",
  city: "",
  contact_number: "",
  email: "",
  password: "",
  confirm_password: "",
  description: "",
  latitude: null,
  longitude: null,
};

const EMPTY_DOCTOR = {
  name: "",
  specialty: "",
  experience_years: "",
  availability: "",
  contact_info: "",
};

export default function RegisterHospital() {
  const [form, setForm] = useState(INITIAL);
  const [doctors, setDoctors] = useState([]);
  const [specialties, setSpecialties] = useState([]);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(null);
  const [error, setError] = useState(null);
  const [locationError, setLocationError] = useState(null);

  useEffect(() => {
    fetch(`${API_URL}/specialties`)
      .then((r) => r.json())
      .then(setSpecialties)
      .catch(() => {});
  }, []);

  const update = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));

  const handleLocationChange = (loc) => {
    setLocationError(null);
    setForm((prev) => ({
      ...prev,
      address: loc.address || prev.address,
      city: loc.city || prev.city,
      latitude: loc.latitude,
      longitude: loc.longitude,
    }));
  };

  const addDoctor = () => setDoctors((prev) => [...prev, { ...EMPTY_DOCTOR }]);

  const removeDoctor = (index) => setDoctors((prev) => prev.filter((_, i) => i !== index));

  const updateDoctor = (index, field, value) => {
    setDoctors((prev) => prev.map((d, i) => (i === index ? { ...d, [field]: value } : d)));
  };

  const isValid =
    form.name.trim() &&
    form.address.trim() &&
    form.city.trim() &&
    form.contact_number.trim() &&
    form.email.trim() &&
    form.password.length >= 6 &&
    form.password === form.confirm_password;

  const doctorsValid = doctors.every(
    (d) => d.name.trim() && d.specialty && d.experience_years !== ""
  );

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.address.trim()) {
      setLocationError("Please select a valid address using the search or map.");
      return;
    }

    if (!isValid || !doctorsValid) return;

    setLoading(true);
    setError(null);
    setSuccess(null);
    setLocationError(null);

    try {
      const { confirm_password, ...formData } = form;
      const payload = {
        ...formData,
        doctors: doctors.map((d) => ({
          ...d,
          experience_years: parseInt(d.experience_years, 10) || 0,
        })),
      };

      const res = await fetch(`${API_URL}/hospitals/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.detail || `Error ${res.status}`);
      }

      const data = await res.json();
      const doctorCount = doctors.length;
      setSuccess(
        `"${data.name}" registered successfully${doctorCount ? ` with ${doctorCount} doctor${doctorCount > 1 ? "s" : ""}` : ""}!`
      );
      setForm(INITIAL);
      setDoctors([]);
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
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 21h18"/><path d="M5 21V7l8-4v18"/><path d="M19 21V11l-6-4"/><path d="M9 9h1"/><path d="M9 13h1"/><path d="M9 17h1"/></svg>
          </div>
          <h2>Register Hospital</h2>
          <p>Add your hospital or clinic to the MediMatch network</p>
        </div>

        <div className="form-body">
          {success && <div className="alert alert-success">{success}</div>}
          {error && <div className="alert alert-error">{error}</div>}

          <div className="form-group">
            <label className="form-label" htmlFor="h-name">Hospital Name <span className="required">*</span></label>
            <input id="h-name" className="form-input" value={form.name} onChange={(e) => update("name", e.target.value)} placeholder="e.g., City General Hospital" disabled={loading} />
          </div>

          <LocationPicker
            value={{ address: form.address, latitude: form.latitude, longitude: form.longitude }}
            onChange={handleLocationChange}
            disabled={loading}
          />
          {locationError && <div className="alert alert-error" style={{ marginTop: "-0.5rem" }}>{locationError}</div>}

          <div className="form-group">
            <label className="form-label" htmlFor="h-city">City <span className="required">*</span></label>
            <input id="h-city" className="form-input" value={form.city} onChange={(e) => update("city", e.target.value)} placeholder="Auto-filled from address, or enter manually" disabled={loading} />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label" htmlFor="h-contact">Contact Number <span className="required">*</span></label>
              <input id="h-contact" className="form-input" type="tel" value={form.contact_number} onChange={(e) => update("contact_number", e.target.value)} placeholder="+1-555-0100" disabled={loading} />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="h-email">Email <span className="required">*</span></label>
              <input id="h-email" className="form-input" type="email" value={form.email} onChange={(e) => update("email", e.target.value)} placeholder="hospital@example.com" disabled={loading} />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label" htmlFor="h-pass">Password <span className="required">*</span></label>
              <input id="h-pass" className="form-input" type="password" value={form.password} onChange={(e) => update("password", e.target.value)} placeholder="Min 6 characters" disabled={loading} />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="h-pass2">Confirm Password <span className="required">*</span></label>
              <input id="h-pass2" className="form-input" type="password" value={form.confirm_password} onChange={(e) => update("confirm_password", e.target.value)} placeholder="Re-enter password" disabled={loading} />
              {form.confirm_password && form.password !== form.confirm_password && (
                <span style={{ color: "var(--destructive)", fontSize: "0.8rem", marginTop: "0.25rem", display: "block" }}>Passwords do not match</span>
              )}
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="h-desc">Description <span className="optional">(Optional)</span></label>
            <textarea id="h-desc" className="form-textarea" rows={3} value={form.description} onChange={(e) => update("description", e.target.value)} placeholder="Brief description of the hospital..." disabled={loading} />
          </div>

          {/* ── Doctors Section ── */}
          <div className="doctors-section-divider">
            <div className="divider-line" />
            <span className="divider-label">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/></svg>
              Hospital Doctors
            </span>
            <div className="divider-line" />
          </div>

          <p className="doctors-section-hint">
            Add doctors who practice at this hospital. They will be registered to the MediMatch directory automatically.
          </p>

          {doctors.map((doc, idx) => (
            <div className="doctor-entry" key={idx}>
              <div className="doctor-entry-header">
                <span className="doctor-entry-number">Doctor #{idx + 1}</span>
                <button
                  type="button"
                  className="doctor-entry-remove"
                  onClick={() => removeDoctor(idx)}
                  disabled={loading}
                  title="Remove doctor"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Name <span className="required">*</span></label>
                  <input className="form-input" value={doc.name} onChange={(e) => updateDoctor(idx, "name", e.target.value)} placeholder="e.g., Dr. Sarah Mitchell" disabled={loading} />
                </div>
                <div className="form-group">
                  <label className="form-label">Experience (years) <span className="required">*</span></label>
                  <input className="form-input" type="number" min="0" max="60" value={doc.experience_years} onChange={(e) => updateDoctor(idx, "experience_years", e.target.value)} placeholder="e.g., 10" disabled={loading} />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Specialty <span className="required">*</span></label>
                  <select className="form-select" value={doc.specialty} onChange={(e) => updateDoctor(idx, "specialty", e.target.value)} disabled={loading}>
                    <option value="">Select specialty...</option>
                    {specialties.map((s) => (
                      <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Availability <span className="optional">(Optional)</span></label>
                  <input className="form-input" value={doc.availability} onChange={(e) => updateDoctor(idx, "availability", e.target.value)} placeholder="e.g., Mon-Fri 9am-5pm" disabled={loading} />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Contact Info <span className="optional">(Optional)</span></label>
                <input className="form-input" value={doc.contact_info} onChange={(e) => updateDoctor(idx, "contact_info", e.target.value)} placeholder="+1-555-0100" disabled={loading} />
              </div>
            </div>
          ))}

          <button type="button" className="btn btn-outline add-doctor-btn" onClick={addDoctor} disabled={loading}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Add a Doctor
          </button>

          <div className="form-actions">
            <button type="submit" className="btn btn-primary btn-lg" disabled={loading || !isValid || !doctorsValid} style={{ flex: 1 }}>
              {loading
                ? "Registering..."
                : doctors.length
                  ? `Register Hospital & ${doctors.length} Doctor${doctors.length > 1 ? "s" : ""}`
                  : "Register Hospital"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
