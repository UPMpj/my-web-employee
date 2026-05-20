import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { api } from "../api";
import "./login.css";

export default function ResetPassword() {
  const [searchParams]           = useSearchParams();
  const token                    = searchParams.get("token") || "";
  const [password,  setPassword] = useState("");
  const [confirm,   setConfirm]  = useState("");
  const [showPw,    setShowPw]   = useState(false);
  const [loading,   setLoading]  = useState(false);
  const [done,      setDone]     = useState(false);
  const [error,     setError]    = useState("");
  const navigate = useNavigate();

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    if (password !== confirm) { setError("ລະຫັດຜ່ານບໍ່ຕົງກັນ"); return; }
    if (password.length < 6)  { setError("ລະຫັດຜ່ານຕ້ອງຢ່າງໜ້ອຍ 6 ຕົວ"); return; }
    setLoading(true);
    try {
      await api.post("/auth/reset-password", { token, new_password: password });
      setDone(true);
    } catch (err) {
      setError(err?.response?.data?.message || "ລ້ົມເຫຼວ ກະລຸນາລອງຂໍ Link ໃໝ່");
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="lg-bg">
        <div className="lg-center">
          <div className="lg-box" style={{ textAlign: "center" }}>
            <p style={{ color: "#dc2626", marginBottom: 16 }}>Link ບໍ່ຖືກຕ້ອງ</p>
            <button className="lg-btn" onClick={() => navigate("/forgot-password")}>ຂໍ Link ໃໝ່</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="lg-bg">
      <div className="lg-center">
        <div className="lg-box">
          <div className="lg-logo-wrap">
            <img src="/IMG_2041.png" alt="CCMS Logo" className="lg-logo-img" />
          </div>

          {done ? (
            <div style={{ textAlign: "center", padding: "8px 0 16px" }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>✅</div>
              <h2 style={{ color: "#1a1a2e", margin: "0 0 8px", fontSize: 20 }}>ຕັ້ງລະຫັດຜ່ານໃໝ່ສຳເລັດ</h2>
              <p style={{ color: "#6b7280", fontSize: 14, margin: "0 0 24px" }}>
                ທ່ານສາມາດ Login ດ້ວຍລະຫັດຜ່ານໃໝ່ໄດ້ແລ້ວ
              </p>
              <button className="lg-btn" onClick={() => navigate("/login")}>
                ໄປໜ້າ Login
              </button>
            </div>
          ) : (
            <>
              <p className="lg-welcome">NEW PASSWORD</p>
              <h1 className="lg-title" style={{ fontSize: 22 }}>ຕັ້ງລະຫັດຜ່ານໃໝ່</h1>

              <form onSubmit={submit} noValidate>
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
                    placeholder="ລະຫັດຜ່ານໃໝ່"
                  />
                  <button type="button" className="lg-eye" onClick={() => setShowPw(p => !p)} tabIndex={-1}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="18" height="18">
                      {showPw
                        ? <><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></>
                        : <><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></>
                      }
                    </svg>
                  </button>
                </div>

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
                    value={confirm}
                    onChange={e => setConfirm(e.target.value)}
                    required
                    placeholder="ຢືນຢັນລະຫັດຜ່ານໃໝ່"
                  />
                </div>

                {error && <p className="lg-error">{error}</p>}

                <button type="submit" className="lg-btn" disabled={loading}>
                  {loading ? "ກຳລັງບັນທຶກ..." : "ຕັ້ງລະຫັດຜ່ານໃໝ່"}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
