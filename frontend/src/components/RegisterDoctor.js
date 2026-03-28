import React, { useState, useEffect } from "react";
import LocationPicker from "./LocationPicker";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:8000";

const INITIAL = {
  name: "",
  specialty: "",
  experience_years: "",
  hospital_id: "",
  availability: "",
  contact_info: "",
  address: "",
  city: "",
  latitude: null,
  longitude: null,
};

export default function RegisterDoctor() {
  const [form, setForm] = useState(INITIAL);
  const [hospitals, setHospitals] = useState([]);
  const [specialties, setSpecialties] = useState([]);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(null);
  const [error, setError] = useState(null);
  const [locationError, setLocationError] = useState(null);

  useEffect(() => {
    fetch(`${API_URL}/hospitals`)
      .then((r) => r.json())
      .then(setHospitals)
      .catch(() => {});

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

  const isValid = form.name.trim() && form.specialty && form.hospital_id && form.experience_years;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isValid) return;

    setLoading(true);
    setError(null);
    setSuccess(null);
    setLocationError(null);

    try {
      const payload = {
        ...form,
        experience_years: parseInt(form.experience_years, 10) || 0,
        hospital_id: parseInt(form.hospital_id, 10),
      };

      const res = await fetch(`${API_URL}/doctors/add`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.detail || `Error ${res.status}`);
      }

      const data = await res.json();
      setSuccess(`${data.name} has been added successfully!`);
      setForm(INITIAL);
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
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/></svg>
          </div>
          <h2>Register Doctor</h2>
          <p>Add a doctor to the MediMatch directory</p>
        </div>

        <div className="form-body">
          {success && <div className="alert alert-success">{success}</div>}
          {error && <div className="alert alert-error">{error}</div>}

          <div className="form-row">
            <div className="form-group">
              <label className="form-label" htmlFor="d-name">Doctor Name <span className="required">*</span></label>
              <input id="d-name" className="form-input" value={form.name} onChange={(e) => update("name", e.target.value)} placeholder="e.g., Dr. Sarah Mitchell" disabled={loading} />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="d-exp">Experience (years) <span className="required">*</span></label>
              <input id="d-exp" className="form-input" type="number" min="0" max="60" value={form.experience_years} onChange={(e) => update("experience_years", e.target.value)} placeholder="e.g., 10" disabled={loading} />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label" htmlFor="d-specialty">Specialty <span className="required">*</span></label>
              <select id="d-specialty" className="form-select" value={form.specialty} onChange={(e) => update("specialty", e.target.value)} disabled={loading}>
                <option value="">Select specialty...</option>
                {specialties.map((s) => (
                  <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="d-hospital">Hospital <span className="required">*</span></label>
              <select id="d-hospital" className="form-select" value={form.hospital_id} onChange={(e) => update("hospital_id", e.target.value)} disabled={loading}>
                <option value="">Select hospital...</option>
                {hospitals.map((h) => (
                  <option key={h.id} value={h.id}>{h.name} — {h.city}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label" htmlFor="d-avail">Availability <span className="optional">(Optional)</span></label>
              <input id="d-avail" className="form-input" value={form.availability} onChange={(e) => update("availability", e.target.value)} placeholder="e.g., Mon-Fri 9am-5pm" disabled={loading} />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="d-contact">Contact Info <span className="optional">(Optional)</span></label>
              <input id="d-contact" className="form-input" value={form.contact_info} onChange={(e) => update("contact_info", e.target.value)} placeholder="+1-555-0100" disabled={loading} />
            </div>
          </div>

          <LocationPicker
            value={{ address: form.address, latitude: form.latitude, longitude: form.longitude }}
            onChange={handleLocationChange}
            disabled={loading}
          />
          {locationError && <div className="alert alert-error" style={{ marginTop: "-0.5rem" }}>{locationError}</div>}

          <div className="form-group">
            <label className="form-label" htmlFor="d-city">City <span className="optional">(Optional)</span></label>
            <input id="d-city" className="form-input" value={form.city} onChange={(e) => update("city", e.target.value)} placeholder="Auto-filled from address, or enter manually" disabled={loading} />
          </div>

          {hospitals.length === 0 && (
            <div className="alert alert-info">
              No hospitals registered yet. <a href="/register-hospital">Register a hospital first</a>.
            </div>
          )}

          <div className="form-actions">
            <button type="submit" className="btn btn-primary btn-lg" disabled={loading || !isValid} style={{ flex: 1 }}>
              {loading ? "Adding Doctor..." : "Add Doctor"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
