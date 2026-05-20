import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api";
import "./login.css";

export default function ForgotPassword() {
  const [email,   setEmail]   = useState("");
  const [loading, setLoading] = useState(false);
  const [sent,    setSent]    = useState(false);
  const [error,   setError]   = useState("");
  const navigate = useNavigate();

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await api.post("/auth/forgot-password", { email });
      setSent(true);
    } catch {
      setError("ສົ່ງ email ບໍ່ສຳເລັດ ກະລຸນາລອງໃໝ່");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="lg-bg">
      <div className="lg-center">
        <div className="lg-box">
          <div className="lg-logo-wrap">
            <img src="/IMG_2041.png" alt="CCMS Logo" className="lg-logo-img" />
          </div>

          {sent ? (
            <div style={{ textAlign: "center", padding: "8px 0 16px" }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>📧</div>
              <h2 style={{ color: "#1a1a2e", margin: "0 0 8px", fontSize: 20 }}>ສົ່ງ Email ແລ້ວ</h2>
              <p style={{ color: "#6b7280", fontSize: 14, margin: "0 0 24px" }}>
                ກວດ inbox ຂອງທ່ານ (<strong>{email}</strong>)<br/>
                Link ຈະໝົດອາຍຸໃນ 1 ຊົ່ວໂມງ
              </p>
              <button className="lg-btn" onClick={() => navigate("/login")}>
                ກັບຄືນໜ້າ Login
              </button>
            </div>
          ) : (
            <>
              <p className="lg-welcome">RESET PASSWORD</p>
              <h1 className="lg-title" style={{ fontSize: 22 }}>ລືມລະຫັດຜ່ານ</h1>
              <p style={{ color: "#6b7280", fontSize: 13, marginBottom: 20, textAlign: "center" }}>
                ໃສ່ email ຂອງທ່ານ ລະບົບຈະສົ່ງ link ຕັ້ງລະຫັດຜ່ານໃໝ່ໃຫ້
              </p>

              <form onSubmit={submit} noValidate>
                <div className="lg-field">
                  <span className="lg-field-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="18" height="18">
                      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                      <polyline points="22,6 12,13 2,6"/>
                    </svg>
                  </span>
                  <input
                    className="lg-input"
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                    placeholder="Email ຂອງທ່ານ"
                  />
                </div>

                {error && <p className="lg-error">{error}</p>}

                <button type="submit" className="lg-btn" disabled={loading}>
                  {loading ? "ກຳລັງສົ່ງ..." : "ສົ່ງ Link ຕັ້ງລະຫັດໃໝ່"}
                </button>
              </form>

              <p className="lg-signup">
                <a href="/login" style={{ color: "#2f4aad", textDecoration: "none" }}>← ກັບຄືນໜ້າ Login</a>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
