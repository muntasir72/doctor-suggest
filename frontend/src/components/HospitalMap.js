import React, { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const CITY_COORDS = {
  "new york": [40.7128, -74.006],
  "los angeles": [34.0522, -118.2437],
  "chicago": [41.8781, -87.6298],
  "houston": [29.7604, -95.3698],
  "san francisco": [37.7749, -122.4194],
  "boston": [42.3601, -71.0589],
  "seattle": [47.6062, -122.3321],
  "miami": [25.7617, -80.1918],
  "srinagar": [34.0837, 74.7973],
  "delhi": [28.6139, 77.209],
  "mumbai": [19.076, 72.8777],
};

const DEFAULT_CENTER = [40.7128, -74.006];

function getCityFallback(cityName, index) {
  const base = CITY_COORDS[(cityName || "").toLowerCase()] || DEFAULT_CENTER;
  const jitter = (index * 0.008) % 0.04;
  const angle = (index * 137.5 * Math.PI) / 180;
  return [base[0] + jitter * Math.cos(angle), base[1] + jitter * Math.sin(angle)];
}

function createIcon() {
  return L.divIcon({
    className: "map-marker-icon",
    html: `<div style="width:32px;height:32px;background:linear-gradient(135deg,#0e7490,#2dd4a0);border-radius:50% 50% 50% 0;transform:rotate(-45deg);display:flex;align-items:center;justify-content:center;box-shadow:0 3px 10px rgba(14,116,144,0.4)"><svg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 24 24' fill='white' style='transform:rotate(45deg)'><path d='M3 21h18M5 21V7l8-4v18M19 21V11l-6-4M9 9h1M9 13h1M9 17h1'/></svg></div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -34],
  });
}

function resolveCoords(item) {
  if (item.lat != null && item.lng != null) return [item.lat, item.lng];
  return getCityFallback(item.city, item.idx);
}

export default function HospitalMap({ doctors, hospitals }) {
  const mapRef = useRef(null);
  const mapInstance = useRef(null);

  const items = doctors
    ? doctors.map((d, i) => ({
        name: d.hospital || d.name,
        label: `${d.name} — ${d.specialty}`,
        lat: d.hospital_latitude ?? null,
        lng: d.hospital_longitude ?? null,
        city: "",
        idx: i,
      }))
    : (hospitals || []).map((h, i) => ({
        name: h.name,
        label: `${h.name} — ${h.city}`,
        lat: h.latitude ?? null,
        lng: h.longitude ?? null,
        city: h.city,
        idx: i,
      }));

  useEffect(() => {
    if (!mapRef.current || items.length === 0) return;

    if (mapInstance.current) {
      mapInstance.current.remove();
    }

    const map = L.map(mapRef.current, { scrollWheelZoom: false }).setView(DEFAULT_CENTER, 11);
    mapInstance.current = map;

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map);

    const icon = createIcon();
    const bounds = [];

    items.forEach((item) => {
      const coords = resolveCoords(item);
      bounds.push(coords);
      L.marker(coords, { icon })
        .bindPopup(`<strong>${item.name}</strong><br/>${item.label}`)
        .addTo(map);
    });

    if (bounds.length > 0) {
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 13 });
    }

    return () => {
      map.remove();
      mapInstance.current = null;
    };
  }, [JSON.stringify(items)]); // eslint-disable-line

  if (items.length === 0) return null;

  return (
    <div className="map-wrapper slide-up">
      <h3 className="map-title">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
        Hospital Locations
      </h3>
      <div ref={mapRef} className="map-container" />
    </div>
  );
}
