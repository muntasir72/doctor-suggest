import React from "react";

function getInitials(name) {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("");
}

export default function DoctorCard({ doctor, isTopMatch, animDelay }) {
  return (
    <div className={`doctor-card slide-up${isTopMatch ? " top-match" : ""}`} style={animDelay ? { animationDelay: `${animDelay}s` } : undefined}>
      <div className="doctor-card-body">
        <div className={`doctor-avatar ${isTopMatch ? "highlight" : "default"}`}>
          {getInitials(doctor.name)}
        </div>

        <div className="doctor-details">
          <div className="doctor-name-row">
            <span className="doctor-name">{doctor.name}</span>
            {isTopMatch && (
              <span className="top-match-badge">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="6"/><path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11"/></svg>
                Top Match
              </span>
            )}
          </div>

          <div className="doctor-specialty">{doctor.specialty}</div>

          <div className="doctor-meta">
            <span className="doctor-meta-item">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
              {doctor.hospital || "Independent Clinic"}
            </span>
            {doctor.experience_years != null && (
              <span className="doctor-meta-item">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                {doctor.experience_years} yrs exp
              </span>
            )}
            {doctor.availability && (
              <span className="doctor-meta-item">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                {doctor.availability}
              </span>
            )}
          </div>

          <div className="doctor-footer">
            <div>
              <div className="doctor-phone-label">Contact</div>
              <div className="doctor-phone">{doctor.phone || "N/A"}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
