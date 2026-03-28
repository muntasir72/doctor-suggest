import React, { useState } from "react";
import LocationPicker from "./LocationPicker";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:8000";

const INITIAL = {
  name: "",
  address: "",
  city: "",
  contact_number: "",
  email: "",
  description: "",
  latitude: null,
  longitude: null,
};

export default function RegisterHospital() {
  const [form, setForm] = useState(INITIAL);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(null);
  const [error, setError] = useState(null);
  const [locationError, setLocationError] = useState(null);

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

  const isValid =
    form.name.trim() &&
    form.address.trim() &&
    form.city.trim() &&
    form.contact_number.trim() &&
    form.email.trim();

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.address.trim()) {
      setLocationError("Please select a valid address using the search or map.");
      return;
    }

    if (!isValid) return;

    setLoading(true);
    setError(null);
    setSuccess(null);
    setLocationError(null);

    try {
      const res = await fetch(`${API_URL}/hospitals/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.detail || `Error ${res.status}`);
      }

      const data = await res.json();
      setSuccess(`"${data.name}" registered successfully!`);
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

          {/* Location Picker — autocomplete + interactive map */}
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

          <div className="form-group">
            <label className="form-label" htmlFor="h-desc">Description <span className="optional">(Optional)</span></label>
            <textarea id="h-desc" className="form-textarea" rows={3} value={form.description} onChange={(e) => update("description", e.target.value)} placeholder="Brief description of the hospital..." disabled={loading} />
          </div>

          <div className="form-actions">
            <button type="submit" className="btn btn-primary btn-lg" disabled={loading || !isValid} style={{ flex: 1 }}>
              {loading ? "Registering..." : "Register Hospital"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
