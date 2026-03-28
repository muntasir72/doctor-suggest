import React, { useState, useRef, useEffect, useCallback } from "react";
import { BrowserRouter, Routes, Route, Link, useLocation } from "react-router";
import DoctorCard from "./components/DoctorCard";
import RegisterHospital from "./components/RegisterHospital";
import RegisterDoctor from "./components/RegisterDoctor";
import SymptomChat from "./components/SymptomChat";
import HospitalMap from "./components/HospitalMap";
import "./App.css";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:8000";

/* ── Shared Layout ── */
function Layout({ children }) {
  const location = useLocation();
  const isHome = location.pathname === "/";

  return (
    <div className="app">
      <header className="header">
        <div className="header-inner">
          <Link to="/" className="logo" style={{ textDecoration: "none" }}>
            <div className="logo-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
            </div>
            <div className="logo-text">
              <span className="logo-title">MediMatch</span>
              <span className="logo-subtitle">Healthcare Simplified</span>
            </div>
          </Link>
          <nav className="header-nav">
            <Link to="/" className={isHome ? "nav-active" : ""}>Find Doctor</Link>
            <Link to="/register-hospital">Register Hospital</Link>
            <Link to="/register-doctor">Register Doctor</Link>
            <Link to="/map">Map</Link>
            <Link to="/" className="nav-cta">Get Started</Link>
          </nav>
        </div>
      </header>

      {children}

      <footer className="footer">
        <div className="footer-inner">
          <div className="footer-logo">
            <div className="footer-logo-icon">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
            </div>
            <span>MediMatch</span>
          </div>
          <div className="footer-links">
            <a href="#privacy">Privacy Policy</a>
            <a href="#terms">Terms of Service</a>
            <a href="#contact">Contact Us</a>
            <a href="#help">Help Center</a>
          </div>
          <p className="footer-copy">&copy; 2026 MediMatch. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}

/* ── Voice Input Hook ── */
function useVoiceInput(onResult) {
  const [listening, setListening] = useState(false);
  const recRef = useRef(null);
  const supported = typeof window !== "undefined" && ("webkitSpeechRecognition" in window || "SpeechRecognition" in window);

  const toggle = useCallback(() => {
    if (!supported) return;
    if (listening) {
      recRef.current?.stop();
      return;
    }
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    const rec = new SR();
    rec.continuous = true;
    rec.interimResults = false;
    rec.lang = "en-US";
    rec.onresult = (e) => {
      const transcript = Array.from(e.results).map((r) => r[0].transcript).join(" ");
      onResult(transcript);
    };
    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);
    recRef.current = rec;
    rec.start();
    setListening(true);
  }, [listening, supported, onResult]);

  useEffect(() => () => recRef.current?.stop(), []);

  return { listening, toggle, supported };
}

/* ── Home Page (Symptom Analysis) ── */
function HomePage() {
  const [symptoms, setSymptoms] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [mode, setMode] = useState("chat"); // "chat" or "quick"

  const onVoiceResult = useCallback((text) => setSymptoms((prev) => (prev ? prev + " " : "") + text), []);
  const voice = useVoiceInput(onVoiceResult);

  const runAnalysis = useCallback(async (text) => {
    if (!text.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const response = await fetch(`${API_URL}/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ symptoms: text.trim() }),
      });
      if (!response.ok) {
        const errData = await response.json().catch(() => null);
        throw new Error(errData?.detail || `Server error (${response.status})`);
      }
      setResult(await response.json());
    } catch (err) {
      setError(err.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    runAnalysis(symptoms);
  };

  const handleStartOver = () => {
    setSymptoms("");
    setResult(null);
    setError(null);
  };

  const showHero = !loading && !result && !error;

  return (
    <>
      {showHero && (
        <section className="hero">
          <div className="hero-bg-blob-1" />
          <div className="hero-bg-blob-2" />
          <div className="hero-inner">
            <div className="hero-badge">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/></svg>
              AI-Powered Doctor Matching
            </div>
            <h1>
              Find Your Perfect
              <span className="accent-text">Healthcare Match</span>
            </h1>
            <p className="hero-description">
              Tell us your symptoms and we'll connect you with the right specialist.
              Fast, secure, and personalized healthcare starts here.
            </p>
            <div className="trust-indicators">
              <div className="trust-item">
                <div className="trust-icon primary">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                </div>
                <span>Private & Secure</span>
              </div>
              <div className="trust-item">
                <div className="trust-icon accent">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                </div>
                <span>Instant Analysis</span>
              </div>
              <div className="trust-item">
                <div className="trust-icon primary">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
                </div>
                <span>500+ Specialists</span>
              </div>
            </div>
          </div>
        </section>
      )}

      <section className="main-content">
        <div className="main-inner">
          {/* Skeleton Loading */}
          {loading && (
            <div className="skeleton-container fade-in">
              <div className="loading-container" style={{ padding: "3rem 1rem" }}>
                <div className="loading-spinner">
                  <div className="track" />
                  <div className="spin" />
                  <div className="heart">
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="var(--primary)" stroke="none"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
                  </div>
                </div>
                <p className="loading-text">Finding your perfect match...</p>
                <p className="loading-subtext">Analyzing your symptoms with AI</p>
              </div>
              <div className="skeleton-card skeleton-specialist" />
              <div className="skeleton-tags">
                <div className="skeleton-tag" /><div className="skeleton-tag" /><div className="skeleton-tag" />
              </div>
              <div className="skeleton-grid">
                <div className="skeleton-card skeleton-doctor" />
                <div className="skeleton-card skeleton-doctor" />
              </div>
            </div>
          )}

          {/* Error */}
          {error && !loading && (
            <div className="fade-in">
              <div className="error-card">
                <span className="error-icon">&#9888;</span>
                <p>{error}</p>
              </div>
              <div style={{ textAlign: "center" }}>
                <button className="btn btn-outline" onClick={handleStartOver}>&#8592; Try Again</button>
              </div>
            </div>
          )}

          {/* Results */}
          {result && !loading && (
            <div className="fade-in">
              <div className="results-header slide-up">
                <button className="btn btn-ghost" onClick={handleStartOver} style={{ marginBottom: "0.75rem" }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
                  &nbsp;Start Over
                </button>

                {result.emergency ? (
                  <div className="results-badge" style={{ background: "rgba(239,68,68,0.1)", color: "#dc2626" }}>&#128680; Emergency Detected</div>
                ) : (
                  <div className="results-badge">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/></svg>
                    AI Match Complete
                  </div>
                )}
                <h2>{result.emergency ? "Emergency Alert" : "Your Recommended Doctors"}</h2>
                {!result.emergency && <p>We found {result.doctors.length} specialist{result.doctors.length !== 1 ? "s" : ""} matched to your needs</p>}
              </div>

              {result.emergency && (
                <div className="emergency-card slide-up">
                  <div className="emergency-icon">&#128680;</div>
                  <h3>Seek Immediate Medical Attention</h3>
                  <p>{result.emergency_message}</p>
                </div>
              )}

              {!result.emergency && (
                <>
                  <div className="specialist-card slide-up">
                    <div className="specialist-card-inner">
                      <div className="specialist-icon">
                        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4.8 2.3A.3.3 0 1 0 5 2H4a2 2 0 0 0-2 2v5a6 6 0 0 0 6 6v0a6 6 0 0 0 6-6V4a2 2 0 0 0-2-2h-1a.2.2 0 1 0 .3.3"/><path d="M8 15v1a6 6 0 0 0 6 6v0a6 6 0 0 0 6-6v-4"/><circle cx="20" cy="10" r="2"/></svg>
                      </div>
                      <div className="specialist-info">
                        <h3>Recommended Specialist</h3>
                        <div className="specialist-name">{result.specialist}</div>
                      </div>
                    </div>
                  </div>

                  {result.extracted_symptoms?.length > 0 && (
                    <div className="symptoms-section slide-up" style={{ animationDelay: "0.1s" }}>
                      <h3>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                        Extracted Symptoms
                      </h3>
                      <div className="symptom-tags">
                        {result.extracted_symptoms.map((s, i) => (
                          <span key={i} className="symptom-tag fade-in" style={{ animationDelay: `${0.15 + i * 0.05}s` }}>{s}</span>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="doctors-section slide-up" style={{ animationDelay: "0.2s" }}>
                    <h3>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                      Available Doctors ({result.doctors.length})
                    </h3>
                    {result.doctors.length > 0 ? (
                      <div className="doctors-grid">
                        {result.doctors.map((doc, i) => (
                          <DoctorCard key={i} doctor={doc} isTopMatch={i === 0} animDelay={0.25 + i * 0.1} />
                        ))}
                      </div>
                    ) : (
                      <p style={{ color: "var(--muted-foreground)", fontStyle: "italic" }}>
                        No matching doctors found. Please consult a general physician.
                      </p>
                    )}
                  </div>

                  {/* Map of doctor locations */}
                  <div className="slide-up" style={{ animationDelay: "0.4s" }}>
                    <HospitalMap doctors={result.doctors} />
                  </div>
                </>
              )}

              <div className="disclaimer slide-up" style={{ animationDelay: "0.5s" }}>{result.disclaimer}</div>
            </div>
          )}

          {/* Input Form (default view) */}
          {!loading && !result && !error && (
            <div className="fade-in">
              {/* Mode Toggle */}
              <div className="mode-toggle">
                <button className={`mode-btn ${mode === "chat" ? "active" : ""}`} onClick={() => setMode("chat")}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                  Chat with AI
                </button>
                <button className={`mode-btn ${mode === "quick" ? "active" : ""}`} onClick={() => setMode("quick")}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
                  Quick Mode
                </button>
              </div>

              {mode === "chat" ? (
                <SymptomChat onAnalyze={runAnalysis} />
              ) : (
                <form className="form-card" onSubmit={handleSubmit}>
                  <div className="form-header">
                    <div className="form-icon">
                      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4.8 2.3A.3.3 0 1 0 5 2H4a2 2 0 0 0-2 2v5a6 6 0 0 0 6 6v0a6 6 0 0 0 6-6V4a2 2 0 0 0-2-2h-1a.2.2 0 1 0 .3.3"/><path d="M8 15v1a6 6 0 0 0 6 6v0a6 6 0 0 0 6-6v-4"/><circle cx="20" cy="10" r="2"/></svg>
                    </div>
                    <h2>Describe Your Symptoms</h2>
                    <p>Help us understand your health concerns to find the right specialist</p>
                  </div>
                  <div className="form-body">
                    <div className="form-group">
                      <label className="form-label" htmlFor="symptoms">What are you experiencing? <span className="required">*</span></label>
                      <div className="textarea-wrap">
                        <textarea id="symptoms" className="form-textarea" value={symptoms} onChange={(e) => setSymptoms(e.target.value)} placeholder="Please describe what you're experiencing in detail. Include any specific areas of pain, when symptoms occur, and what makes them better or worse..." disabled={loading} />
                        {voice.supported && (
                          <button type="button" className={`mic-btn ${voice.listening ? "recording" : ""}`} onClick={voice.toggle} title={voice.listening ? "Stop recording" : "Speak your symptoms"}>
                            {voice.listening && <span className="mic-pulse" />}
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="22"/></svg>
                          </button>
                        )}
                      </div>
                      {voice.listening && <p className="voice-status">Listening... speak now</p>}
                    </div>
                    <div className="form-actions">
                      <button type="submit" className="btn btn-accent btn-lg" disabled={loading || !symptoms.trim()} style={{ flex: 1 }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                        Find My Doctor
                      </button>
                    </div>
                  </div>
                </form>
              )}
            </div>
          )}
        </div>
      </section>
    </>
  );
}

/* ── Map Page ── */
function MapPage() {
  const [hospitals, setHospitals] = useState([]);
  useEffect(() => {
    fetch(`${API_URL}/hospitals`)
      .then((r) => r.json())
      .then(setHospitals)
      .catch(() => {});
  }, []);

  return (
    <section className="main-content">
      <div className="main-inner">
        <div className="results-header slide-up">
          <div className="results-badge">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
            Hospital Network
          </div>
          <h2>Our Hospital Locations</h2>
          <p>{hospitals.length} hospitals in the MediMatch network</p>
        </div>
        <HospitalMap hospitals={hospitals} />
      </div>
    </section>
  );
}

/* ── App Root ── */
function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/register-hospital" element={<RegisterHospital />} />
          <Route path="/register-doctor" element={<RegisterDoctor />} />
          <Route path="/map" element={<MapPage />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}

export default App;
