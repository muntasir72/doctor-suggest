import React, { useRef, useEffect, useCallback, useState } from "react";

const GOOGLE_API_KEY = process.env.REACT_APP_GOOGLE_MAPS_API_KEY;
const DEFAULT_CENTER = { lat: 28.6139, lng: 77.209 };

/* ───────────────────────────────────────────────
   Browser Geolocation helper
   ─────────────────────────────────────────────── */
function detectLocation() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Geolocation is not supported by your browser"));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      (err) => {
        const msgs = {
          1: "Location access denied. Please allow location permission and try again.",
          2: "Could not detect your location. Please try again.",
          3: "Location request timed out. Please try again.",
        };
        reject(new Error(msgs[err.code] || "Could not detect location"));
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  });
}

const CROSSHAIR_ICON = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="22" y1="12" x2="18" y2="12"/><line x1="6" y1="12" x2="2" y2="12"/><line x1="12" y1="6" x2="12" y2="2"/><line x1="12" y1="22" x2="12" y2="18"/></svg>
);

/* ───────────────────────────────────────────────
   Google Maps loader (de-duplicated)
   ─────────────────────────────────────────────── */
let googleLoadPromise = null;
function loadGoogleMaps(key) {
  if (googleLoadPromise) return googleLoadPromise;
  googleLoadPromise = new Promise((resolve, reject) => {
    if (window.google?.maps?.places) {
      resolve(window.google.maps);
      return;
    }
    const s = document.createElement("script");
    s.src = `https://maps.googleapis.com/maps/api/js?key=${key}&libraries=places`;
    s.async = true;
    s.onload = () =>
      window.google?.maps ? resolve(window.google.maps) : reject(new Error("Init failed"));
    s.onerror = () => reject(new Error("Script load failed"));
    document.head.appendChild(s);
  });
  return googleLoadPromise;
}

function extractCity(components) {
  if (!components) return "";
  for (const c of components) {
    if (c.types.includes("locality") || c.types.includes("sublocality_level_1")) return c.long_name;
  }
  for (const c of components) {
    if (c.types.includes("administrative_area_level_2")) return c.long_name;
  }
  return "";
}

/* ───────────────────────────────────────────────
   Google Maps Implementation
   ─────────────────────────────────────────────── */
function GooglePicker({ value, onChange, disabled }) {
  const mapDiv = useRef(null);
  const inputEl = useRef(null);
  const mapObj = useRef(null);
  const marker = useRef(null);
  const [ready, setReady] = useState(false);
  const [err, setErr] = useState(null);
  const [detecting, setDetecting] = useState(false);
  const [detectErr, setDetectErr] = useState(null);

  const emit = useCallback(
    (data) => onChange(data),
    [onChange]
  );

  const handleDetect = useCallback(async () => {
    setDetecting(true);
    setDetectErr(null);
    try {
      const { lat, lng } = await detectLocation();
      const map = mapObj.current;
      const mk = marker.current;
      if (map && mk) {
        map.setCenter({ lat, lng });
        map.setZoom(16);
        mk.setPosition({ lat, lng });
      }
      const geocoder = new window.google.maps.Geocoder();
      geocoder.geocode({ location: { lat, lng } }, (res, st) => {
        if (st === "OK" && res[0]) {
          const addr = res[0].formatted_address;
          const city = extractCity(res[0].address_components);
          if (inputEl.current) inputEl.current.value = addr;
          emit({ address: addr, city, latitude: lat, longitude: lng });
        } else {
          emit({ address: "", city: "", latitude: lat, longitude: lng });
        }
      });
    } catch (e) {
      setDetectErr(e.message);
    } finally {
      setDetecting(false);
    }
  }, [emit]);

  useEffect(() => {
    let dead = false;
    loadGoogleMaps(GOOGLE_API_KEY)
      .then((maps) => {
        if (dead || !mapDiv.current) return;
        setReady(true);

        const center = value?.latitude
          ? { lat: value.latitude, lng: value.longitude }
          : DEFAULT_CENTER;

        const map = new maps.Map(mapDiv.current, {
          center,
          zoom: value?.latitude ? 15 : 5,
          disableDefaultUI: true,
          zoomControl: true,
          gestureHandling: "cooperative",
        });
        mapObj.current = map;

        const mk = new maps.Marker({
          position: center,
          map,
          draggable: !disabled,
          animation: maps.Animation.DROP,
        });
        marker.current = mk;

        const geocoder = new maps.Geocoder();
        mk.addListener("dragend", () => {
          const p = mk.getPosition();
          const lat = p.lat(), lng = p.lng();
          map.panTo(p);
          geocoder.geocode({ location: { lat, lng } }, (res, st) => {
            if (st === "OK" && res[0]) {
              const addr = res[0].formatted_address;
              const city = extractCity(res[0].address_components);
              if (inputEl.current) inputEl.current.value = addr;
              emit({ address: addr, city, latitude: lat, longitude: lng });
            } else {
              emit({ address: "", city: "", latitude: lat, longitude: lng });
            }
          });
        });

        if (inputEl.current) {
          const ac = new maps.places.Autocomplete(inputEl.current, {
            types: ["establishment", "geocode"],
          });
          ac.bindTo("bounds", map);
          ac.addListener("place_changed", () => {
            const place = ac.getPlace();
            if (!place.geometry?.location) return;
            const lat = place.geometry.location.lat();
            const lng = place.geometry.location.lng();
            const addr = place.formatted_address || place.name || "";
            const city = extractCity(place.address_components);
            map.setCenter({ lat, lng });
            map.setZoom(16);
            mk.setPosition({ lat, lng });
            emit({ address: addr, city, latitude: lat, longitude: lng });
          });
        }
      })
      .catch((e) => !dead && setErr(e.message));

    return () => { dead = true; };
  }, []); // eslint-disable-line

  useEffect(() => {
    if (inputEl.current && value?.address === "") inputEl.current.value = "";
  }, [value?.address]);

  return (
    <div className="location-picker">
      <div className="form-group">
        <label className="form-label">
          Hospital / Clinic Address <span className="required">*</span>
        </label>
        <div className="location-input-wrap">
          <svg className="location-input-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input
            ref={inputEl}
            className="form-input location-autocomplete-input"
            defaultValue={value?.address || ""}
            placeholder="Start typing an address..."
            disabled={disabled}
          />
        </div>
        <button type="button" className={`location-detect-btn${detecting ? " detecting" : ""}`} onClick={handleDetect} disabled={disabled || detecting}>
          {CROSSHAIR_ICON}
          {detecting ? "Detecting..." : "Detect Location"}
        </button>
        {detectErr && <p className="location-detect-error">{detectErr}</p>}
      </div>

      <div className="location-map-wrap">
        <div ref={mapDiv} className="location-map" />
        {!ready && !err && <div className="location-map-loading">Loading map...</div>}
      </div>

      <p className="location-hint">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
        Can't find your address? Drag the pin on the map or use Detect Location.
      </p>

      {value?.latitude != null && value?.longitude != null && (
        <div className="location-coords">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
          {value.latitude.toFixed(6)}, {value.longitude.toFixed(6)}
        </div>
      )}
      {err && <div className="location-error">Map error: {err}</div>}
    </div>
  );
}

/* ───────────────────────────────────────────────
   Leaflet + Nominatim fallback (no API key needed)
   ─────────────────────────────────────────────── */
function LeafletPicker({ value, onChange, disabled }) {
  const mapDiv = useRef(null);
  const mapObj = useRef(null);
  const marker = useRef(null);
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [searching, setSearching] = useState(false);
  const [detecting, setDetecting] = useState(false);
  const [detectErr, setDetectErr] = useState(null);
  const debounce = useRef(null);

  const emit = useCallback(
    (data) => onChange(data),
    [onChange]
  );

  const handleDetect = useCallback(async () => {
    setDetecting(true);
    setDetectErr(null);
    try {
      const { lat, lng } = await detectLocation();
      if (mapObj.current && marker.current) {
        const L = require("leaflet");
        mapObj.current.setView([lat, lng], 16);
        marker.current.setLatLng(L.latLng(lat, lng));
      }
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&addressdetails=1`,
        { headers: { "Accept-Language": "en" } }
      );
      const data = await res.json();
      const addr = data.display_name || "";
      const city = data.address?.city || data.address?.town || data.address?.village || "";
      setQuery(addr);
      emit({ address: addr, city, latitude: lat, longitude: lng });
    } catch (e) {
      setDetectErr(e.message);
    } finally {
      setDetecting(false);
    }
  }, [emit]);

  useEffect(() => {
    const L = require("leaflet");
    require("leaflet/dist/leaflet.css");

    if (!mapDiv.current) return;
    if (mapObj.current) { mapObj.current.remove(); mapObj.current = null; }

    const center = value?.latitude
      ? [value.latitude, value.longitude]
      : [DEFAULT_CENTER.lat, DEFAULT_CENTER.lng];

    const map = L.map(mapDiv.current, { scrollWheelZoom: true }).setView(center, value?.latitude ? 15 : 5);
    mapObj.current = map;

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>',
    }).addTo(map);

    const icon = L.divIcon({
      className: "map-marker-icon",
      html: '<div style="width:32px;height:32px;background:linear-gradient(135deg,#0e7490,#2dd4a0);border-radius:50% 50% 50% 0;transform:rotate(-45deg);display:flex;align-items:center;justify-content:center;box-shadow:0 3px 10px rgba(14,116,144,0.4);cursor:grab"><svg xmlns=\'http://www.w3.org/2000/svg\' width=\'14\' height=\'14\' viewBox=\'0 0 24 24\' fill=\'white\' style=\'transform:rotate(45deg)\'><path d=\'M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z\'/></svg></div>',
      iconSize: [32, 32],
      iconAnchor: [16, 32],
    });

    const mk = L.marker(center, { icon, draggable: !disabled }).addTo(map);
    marker.current = mk;

    mk.on("dragend", () => {
      const { lat, lng } = mk.getLatLng();
      map.panTo([lat, lng]);
      fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&addressdetails=1`, {
        headers: { "Accept-Language": "en" },
      })
        .then((r) => r.json())
        .then((data) => {
          const addr = data.display_name || "";
          const city = data.address?.city || data.address?.town || data.address?.village || "";
          setQuery(addr);
          emit({ address: addr, city, latitude: lat, longitude: lng });
        })
        .catch(() => {
          emit({ address: "", city: "", latitude: lat, longitude: lng });
        });
    });

    return () => { map.remove(); mapObj.current = null; };
  }, []); // eslint-disable-line

  const handleSearch = (text) => {
    setQuery(text);
    clearTimeout(debounce.current);
    if (text.length < 3) { setSuggestions([]); return; }

    debounce.current = setTimeout(() => {
      setSearching(true);
      fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(text)}&format=json&addressdetails=1&limit=5`, {
        headers: { "Accept-Language": "en" },
      })
        .then((r) => r.json())
        .then((results) => {
          setSuggestions(results);
          setSearching(false);
        })
        .catch(() => {
          setSuggestions([]);
          setSearching(false);
        });
    }, 350);
  };

  const selectSuggestion = (s) => {
    const lat = parseFloat(s.lat);
    const lng = parseFloat(s.lon);
    const addr = s.display_name || "";
    const city = s.address?.city || s.address?.town || s.address?.village || "";

    setQuery(addr);
    setSuggestions([]);
    emit({ address: addr, city, latitude: lat, longitude: lng });

    if (mapObj.current && marker.current) {
      const L = require("leaflet");
      mapObj.current.setView([lat, lng], 16);
      marker.current.setLatLng(L.latLng(lat, lng));
    }
  };

  return (
    <div className="location-picker">
      <div className="form-group">
        <label className="form-label">
          Hospital / Clinic Address <span className="required">*</span>
        </label>
        <div className="location-input-wrap">
          <svg className="location-input-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input
            className="form-input location-autocomplete-input"
            value={query}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Start typing an address..."
            disabled={disabled}
          />
          {searching && <span className="location-searching">...</span>}
        </div>
        <button type="button" className={`location-detect-btn${detecting ? " detecting" : ""}`} onClick={handleDetect} disabled={disabled || detecting}>
          {CROSSHAIR_ICON}
          {detecting ? "Detecting..." : "Detect Location"}
        </button>
        {detectErr && <p className="location-detect-error">{detectErr}</p>}

        {suggestions.length > 0 && (
          <ul className="location-suggestions">
            {suggestions.map((s) => (
              <li key={s.place_id} onClick={() => selectSuggestion(s)}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
                <span>{s.display_name}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="location-map-wrap">
        <div ref={mapDiv} className="location-map" />
      </div>

      <p className="location-hint">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
        Can't find your address? Drag the pin on the map or use Detect Location.
      </p>

      {value?.latitude != null && value?.longitude != null && (
        <div className="location-coords">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
          {value.latitude.toFixed(6)}, {value.longitude.toFixed(6)}
        </div>
      )}
    </div>
  );
}

/* ───────────────────────────────────────────────
   Exported component — picks implementation
   ─────────────────────────────────────────────── */
export default function LocationPicker(props) {
  if (GOOGLE_API_KEY) return <GooglePicker {...props} />;
  return <LeafletPicker {...props} />;
}
