import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api";
import "./login.css";

export default function Login() {
  const [email,      setEmail]      = useState("");
  const [password,   setPassword]   = useState("");
  const [showPw,     setShowPw]     = useState(false);
  const [remember,   setRemember]   = useState(true);
  const [error,      setError]      = useState("");
  const [loading,    setLoading]    = useState(false);

  const navigate = useNavigate();

  useEffect(() => {
    /* Already have a valid session → go straight to dashboard */
    const token = localStorage.getItem("token");
    const sess  = sessionStorage.getItem("_sess");
    if (token && sess) navigate("/", { replace: true });

    /* Show session-expired banner if redirected from interceptor */
    if (sessionStorage.getItem("session_expired")) {
      setError("ເຊດຊັ່ນໝົດອາຍຸ — ກະລຸນາ Login ໃໝ່");
      sessionStorage.removeItem("session_expired");
    }
  }, [navigate]);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await api.post("/auth/login", { email, password });
      localStorage.setItem("token", res.data.token);
      localStorage.setItem("user", JSON.stringify(res.data.user));
      /* Mark this browser tab as an active session */
      sessionStorage.setItem("_sess", "1");
      navigate("/", { replace: true });
    } catch (err) {
      const msg = err?.response?.data?.message;
      if (msg) {
        setError(msg);
      } else if (err?.code === "ERR_NETWORK" || !err?.response) {
        setError("ເຊື່ອມຕໍ່ server ບໍ່ໄດ້ — ລອງໃໝ່ອີກຄັ້ງ");
      } else {
        setError("Invalid email or password");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="lg-bg">
      <div className="lg-center">

        {/* ── Glass Card ── */}
        <div className="lg-box">

          {/* Logo */}
          <div className="lg-logo-wrap">
            <img src="/IMG_2041.png" alt="CCMS Logo" className="lg-logo-img" />
          </div>

          <p className="lg-welcome">WELCOME BACK</p>
          <h1 className="lg-title">LOGIN</h1>

          <form onSubmit={submit} autoComplete="off" noValidate>

            {/* Username */}
            <div className="lg-field">
              <span className="lg-field-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="18" height="18">
                  <circle cx="12" cy="8" r="4"/>
                  <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
                </svg>
              </span>
              <input
                className="lg-input"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                placeholder="Username"
              />
            </div>

            {/* Password */}
            <div className="lg-field">
              <span className="lg-field-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="18" height="18">
                  <rect x="5" y="11" width="14" height="10" rx="2"/>
                  <path d="M8 11V7a4 4 0 0 1 8 0v4"/>
                </svg>
              </span>
              <input
                className="lg-input"
                type={showPw ? "text" : "password"}
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                placeholder="Password"
              />
              <button type="button" className="lg-eye" onClick={() => setShowPw(p => !p)} tabIndex={-1}>
                {showPw ? (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="18" height="18">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
                    <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
                    <line x1="1" y1="1" x2="23" y2="23"/>
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="18" height="18">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                    <circle cx="12" cy="12" r="3"/>
                  </svg>
                )}
              </button>
            </div>

            {/* Remember + Forgot */}
            <div className="lg-row">
              <label className="lg-remember">
                <input type="checkbox" checked={remember} onChange={e => setRemember(e.target.checked)} />
                <span className="lg-check-box">{remember && <svg viewBox="0 0 12 12" fill="none" stroke="#fff" strokeWidth="2.2" width="9" height="9"><polyline points="2 6 5 9 10 3"/></svg>}</span>
                <span>Remember me</span>
              </label>
              <a href="/forgot-password" className="lg-forgot">Forgot password?</a>
            </div>

            {error && <p className="lg-error">{error}</p>}

            <button type="submit" className="lg-btn" disabled={loading}>
              {loading ? "VERIFYING..." : "SIGN IN"}
            </button>
          </form>

          <p className="lg-signup">
            New here? <a href="#">Create Account</a>
          </p>
        </div>

        {/* ── Bottom feature bar ── */}
        <div className="lg-features" style={{display:"none"}}>
          {[
            {
              icon: (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" width="26" height="26">
                  <path d="M12 2L3 7v6c0 5.25 3.75 10.14 9 11.25C17.25 23.14 21 18.25 21 13V7z"/>
                  <polyline points="9 12 11 14 15 10"/>
                </svg>
              ),
              label: "Secure", sub: "Access"
            },
            {
              icon: (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" width="26" height="26">
                  <rect x="3" y="3" width="7" height="7" rx="1"/>
                  <rect x="14" y="3" width="7" height="7" rx="1"/>
                  <rect x="3" y="14" width="7" height="7" rx="1"/>
                  <rect x="14" y="14" width="7" height="7" rx="1"/>
                </svg>
              ),
              label: "Smart", sub: "Management"
            },
            {
              icon: (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" width="26" height="26">
                  <circle cx="9" cy="8" r="3"/>
                  <circle cx="15" cy="8" r="3"/>
                  <path d="M3 20c0-3.5 2.7-6 6-6"/>
                  <path d="M21 20c0-3.5-2.7-6-6-6"/>
                  <path d="M9 14h6c3.3 0 6 2.5 6 6H3c0-3.5 2.7-6 6-6z"/>
                </svg>
              ),
              label: "Professional", sub: "Team"
            },
            {
              icon: (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" width="26" height="26">
                  <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/>
                  <polyline points="17 6 23 6 23 12"/>
                </svg>
              ),
              label: "Better", sub: "Performance"
            },
          ].map((f, i) => (
            <div key={i} className="lg-feature-item">
              <div className="lg-feature-icon">{f.icon}</div>
              <div className="lg-feature-label">{f.label}</div>
              <div className="lg-feature-sub">{f.sub}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
