import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { QRCodeSVG } from "qrcode.react";
import { api } from "../api";
import "./login.css";

function finishLogin(data, navigate) {
  /* The real session lives in the httpOnly cookie the server just set — never store the
     raw token where JS (and therefore an XSS bug) could read it. We only keep the
     expiry timestamp, which is harmless on its own, so the UI can warn before logout. */
  try {
    const payload = JSON.parse(atob(data.token.split(".")[1]));
    if (payload.exp) sessionStorage.setItem("token_exp", String(payload.exp * 1000));
  } catch {
    // non-fatal — expiry warning just won't show
  }
  localStorage.setItem("user", JSON.stringify(data.user));
  sessionStorage.setItem("_sess", "1");
  navigate("/", { replace: true });
}

export default function Login() {
  const [email,      setEmail]      = useState("");
  const [password,   setPassword]   = useState("");
  const [showPw,     setShowPw]     = useState(false);
  const [remember,   setRemember]   = useState(true);
  const [error,      setError]      = useState("");
  const [loading,    setLoading]    = useState(false);

  /* ── 2FA login challenge (account already enrolled) ── */
  const [challengeToken, setChallengeToken] = useState(null);
  const [code,           setCode]           = useState("");
  const [useBackupCode,  setUseBackupCode]  = useState(false);

  /* ── Forced 2FA enrollment (require_2fa on, account not enrolled yet) ── */
  const [setupToken, setSetupToken] = useState(null);
  const [qrData,     setQrData]     = useState(null); // { secret, otpauth_url }
  const [backupCodes, setBackupCodes] = useState(null);
  const [pendingSession, setPendingSession] = useState(null); // { token, user } — held until backup codes are acknowledged

  const navigate = useNavigate();

  useEffect(() => {
    /* Already have a valid session → go straight to dashboard.
       Check `user` (localStorage), not `_sess`: main.jsx unconditionally re-sets
       _sess on every page load, including the reload a 401 redirect triggers — using
       it here would bounce straight back to "/" before the user ever sees the form. */
    if (localStorage.getItem("user")) navigate("/", { replace: true });

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
      if (res.data.requires_2fa) {
        setChallengeToken(res.data.challenge_token);
      } else if (res.data.setup_2fa_required) {
        setSetupToken(res.data.setup_token);
        const startRes = await api.post("/auth/login/setup-2fa/start", { setup_token: res.data.setup_token });
        setQrData(startRes.data);
      } else {
        finishLogin(res.data, navigate);
      }
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

  const submit2fa = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const body = useBackupCode
        ? { challenge_token: challengeToken, backup_code: code }
        : { challenge_token: challengeToken, code };
      const res = await api.post("/auth/login/2fa", body);
      finishLogin(res.data, navigate);
    } catch (err) {
      setError(err?.response?.data?.message || "ລະຫັດບໍ່ຖືກຕ້ອງ");
    } finally {
      setLoading(false);
    }
  };

  const submitSetup2fa = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await api.post("/auth/login/setup-2fa/confirm", { setup_token: setupToken, code });
      setPendingSession({ token: res.data.token, user: res.data.user });
      setBackupCodes(res.data.backupCodes);
      /* hold here so the user can save their backup codes before continuing */
    } catch (err) {
      setError(err?.response?.data?.message || "ລະຫັດບໍ່ຖືກຕ້ອງ");
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

          {backupCodes ? (
            <>
              <p className="lg-welcome">2FA ENABLED</p>
              <h1 className="lg-title" style={{ fontSize: 22 }}>SAVE YOUR BACKUP CODES</h1>
              <p className="lg-error" style={{ background: "transparent", color: "rgba(255,255,255,.7)", textAlign: "center" }}>
                ບັນທຶກລະຫັດເຫຼົ່ານີ້ໄວ້ບ່ອນປອດໄພ — ໃຊ້ໄດ້ຄັ້ງດຽວຕໍ່ໂຕ ຖ້າເຄື່ອງ Authenticator ເສຍ/ເສຍ
              </p>
              <div className="lg-field" style={{ flexWrap: "wrap", gap: 6, padding: 14, height: "auto" }}>
                {backupCodes.map(c => (
                  <code key={c} style={{ color: "#fff", fontSize: 13, width: "48%" }}>{c}</code>
                ))}
              </div>
              <button type="button" className="lg-btn" onClick={() => finishLogin(pendingSession, navigate)}>
                CONTINUE TO DASHBOARD
              </button>
            </>
          ) : qrData ? (
            <>
              <p className="lg-welcome">SECURITY REQUIRED</p>
              <h1 className="lg-title" style={{ fontSize: 22 }}>SET UP TWO-FACTOR AUTH</h1>
              <p className="lg-error" style={{ background: "transparent", color: "rgba(255,255,255,.7)", textAlign: "center" }}>
                Scan QR ນີ້ດ້ວຍ Google Authenticator / Authy ແລ້ວໃສ່ລະຫັດ 6 ໂຕ
              </p>
              <div style={{ display: "flex", justifyContent: "center", margin: "14px 0", background: "#fff", padding: 12, borderRadius: 10 }}>
                <QRCodeSVG value={qrData.otpauth_url} size={160} />
              </div>
              <form onSubmit={submitSetup2fa} autoComplete="off" noValidate>
                <div className="lg-field">
                  <input
                    className="lg-input"
                    value={code}
                    onChange={e => setCode(e.target.value)}
                    required
                    placeholder="6-digit code"
                    maxLength={6}
                  />
                </div>
                {error && <p className="lg-error">{error}</p>}
                <button type="submit" className="lg-btn" disabled={loading}>
                  {loading ? "VERIFYING..." : "CONFIRM & ENABLE"}
                </button>
              </form>
            </>
          ) : challengeToken ? (
            <>
              <p className="lg-welcome">WELCOME BACK</p>
              <h1 className="lg-title" style={{ fontSize: 22 }}>TWO-FACTOR CODE</h1>
              <form onSubmit={submit2fa} autoComplete="off" noValidate>
                <div className="lg-field">
                  <input
                    className="lg-input"
                    value={code}
                    onChange={e => setCode(e.target.value)}
                    required
                    autoFocus
                    placeholder={useBackupCode ? "Backup code (XXXXX-XXXXX)" : "6-digit code"}
                  />
                </div>
                <div className="lg-row">
                  <button type="button" className="lg-forgot" style={{ background: "none", border: "none", cursor: "pointer" }}
                    onClick={() => { setUseBackupCode(v => !v); setCode(""); setError(""); }}>
                    {useBackupCode ? "Use authenticator code instead" : "Use a backup code instead"}
                  </button>
                </div>
                {error && <p className="lg-error">{error}</p>}
                <button type="submit" className="lg-btn" disabled={loading}>
                  {loading ? "VERIFYING..." : "VERIFY"}
                </button>
              </form>
            </>
          ) : (
          <>
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
          </>
          )}
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
