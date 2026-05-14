import { useState } from "react";
import toast from "react-hot-toast";
import { api } from "../../api";
import "./settings.css";

const TABS = ["ບັນຊີຜູ້ໃຊ້", "ປ່ຽນລະຫັດຜ່ານ", "ລະບົບ"];

export default function Settings() {
  const userStr  = localStorage.getItem("user");
  const user     = userStr ? JSON.parse(userStr) : {};
  const [tab, setTab] = useState(0);

  /* ── tab 0: profile ── */
  const [profile, setProfile] = useState({ fullname: user.fullname || "", email: user.email || "" });
  const [savingProfile, setSavingProfile] = useState(false);

  const saveProfile = async () => {
    if (!profile.fullname.trim() || !profile.email.trim()) {
      toast.error("ກະລຸນາໃສ່ຂໍ້ມູນໃຫ້ຄົບ"); return;
    }
    setSavingProfile(true);
    try {
      await api.put(`/users/${user.user_id}`, {
        fullname: profile.fullname,
        email:    profile.email,
        password: "",
        role_id:  user.role_id,
        company_ids: [],
      });
      const updated = { ...user, fullname: profile.fullname, email: profile.email };
      localStorage.setItem("user", JSON.stringify(updated));
      toast.success("ອັບເດດຂໍ້ມູນສຳເລັດ");
    } catch (err) {
      toast.error(err?.response?.data?.message || "ອັບເດດບໍ່ສຳເລັດ");
    }
    setSavingProfile(false);
  };

  /* ── tab 1: password ── */
  const [pw, setPw] = useState({ current: "", next: "", confirm: "" });
  const [savingPw, setSavingPw] = useState(false);

  const savePassword = async () => {
    if (!pw.current || !pw.next || !pw.confirm) {
      toast.error("ກະລຸນາໃສ່ຂໍ້ມູນໃຫ້ຄົບ"); return;
    }
    if (pw.next.length < 6) {
      toast.error("ລະຫັດຜ່ານໃໝ່ຕ້ອງຢ່າງໜ້ອຍ 6 ຕົວ"); return;
    }
    if (pw.next !== pw.confirm) {
      toast.error("ລະຫັດຜ່ານໃໝ່ບໍ່ຕົງກັນ"); return;
    }
    setSavingPw(true);
    try {
      await api.post("/auth/change-password", {
        current_password: pw.current,
        new_password:     pw.next,
      });
      toast.success("ປ່ຽນລະຫັດຜ່ານສຳເລັດ");
      setPw({ current:"", next:"", confirm:"" });
    } catch (err) {
      toast.error(err?.response?.data?.message || "ປ່ຽນລະຫັດຜ່ານບໍ່ສຳເລັດ");
    }
    setSavingPw(false);
  };

  /* ── tab 2: system ── */
  const [sysName, setSysName] = useState(localStorage.getItem("sys_name") || "CMS Web");
  const saveSys = () => {
    localStorage.setItem("sys_name", sysName);
    toast.success("ບັນທຶກການຕັ້ງຄ່າສຳເລັດ");
  };

  return (
    <div className="st-page">
      <div className="st-header">
        <h1 className="st-title">Settings</h1>
        <p className="st-sub">ຈັດການຂໍ້ມູນ ແລະ ການຕັ້ງຄ່າລະບົບ</p>
      </div>

      <div className="st-body">
        {/* Sidebar tabs */}
        <div className="st-tabs">
          {TABS.map((t, i) => (
            <button
              key={t}
              className={`st-tab${tab === i ? " st-tab-active" : ""}`}
              onClick={() => setTab(i)}
            >
              {t}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="st-content">

          {/* ── Tab 0: Profile ── */}
          {tab === 0 && (
            <div className="st-card">
              <h2 className="st-card-title">ຂໍ້ມູນບັນຊີ</h2>
              <p className="st-card-sub">ແກ້ໄຂຊື່ ແລະ email ຂອງທ່ານ</p>

              <div className="st-avatar-row">
                <div className="st-avatar">
                  {(profile.fullname?.[0] || "U").toUpperCase()}
                </div>
                <div>
                  <div className="st-avatar-name">{profile.fullname || "–"}</div>
                  <div className="st-avatar-role">{user.role || "–"}</div>
                </div>
              </div>

              <div className="st-fields">
                <div className="st-field">
                  <label>ຊື່ເຕັມ</label>
                  <input value={profile.fullname} onChange={e => setProfile(p => ({...p, fullname: e.target.value}))} placeholder="ຊື່ ແລະ ນາມສະກຸນ" />
                </div>
                <div className="st-field">
                  <label>Email</label>
                  <input type="email" value={profile.email} onChange={e => setProfile(p => ({...p, email: e.target.value}))} placeholder="email@example.com" />
                </div>
              </div>
              <button className="st-save-btn" onClick={saveProfile} disabled={savingProfile}>
                {savingProfile ? "ກຳລັງບັນທຶກ..." : "ບັນທຶກການປ່ຽນແປງ"}
              </button>
            </div>
          )}

          {/* ── Tab 1: Password ── */}
          {tab === 1 && (
            <div className="st-card">
              <h2 className="st-card-title">ປ່ຽນລະຫັດຜ່ານ</h2>
              <p className="st-card-sub">ລະຫັດຜ່ານໃໝ່ຕ້ອງຢ່າງໜ້ອຍ 6 ຕົວ</p>
              <div className="st-fields">
                {[
                  { label:"ລະຫັດຜ່ານປັດຈຸບັນ", key:"current" },
                  { label:"ລະຫັດຜ່ານໃໝ່",       key:"next"    },
                  { label:"ຢືນຢັນລະຫັດຜ່ານ",    key:"confirm" },
                ].map(({ label, key }) => (
                  <div key={key} className="st-field">
                    <label>{label}</label>
                    <input type="password" value={pw[key]} placeholder="••••••••"
                      onChange={e => setPw(p => ({...p, [key]: e.target.value}))} />
                  </div>
                ))}
              </div>
              <button className="st-save-btn" onClick={savePassword} disabled={savingPw}>
                {savingPw ? "ກຳລັງບັນທຶກ..." : "ປ່ຽນລະຫັດຜ່ານ"}
              </button>
            </div>
          )}

          {/* ── Tab 2: System ── */}
          {tab === 2 && (
            <div className="st-card">
              <h2 className="st-card-title">ການຕັ້ງຄ່າລະບົບ</h2>
              <p className="st-card-sub">ການຕັ້ງຄ່າທົ່ວໄປຂອງ web application</p>
              <div className="st-fields">
                <div className="st-field">
                  <label>ຊື່ລະບົບ (ສະແດງໃນ Sidebar)</label>
                  <input value={sysName} onChange={e => setSysName(e.target.value)} placeholder="CMS Web" />
                </div>
                <div className="st-field">
                  <label>Backend API URL</label>
                  <input
                    value={import.meta.env.VITE_API_URL || "http://localhost:5001"}
                    readOnly
                    style={{ background:"#f3f4f6", color:"#6b7280", cursor:"not-allowed" }}
                  />
                  <span className="st-hint">ແກ້ໄຂໃນໄຟລ໌ <code>.env</code> (VITE_API_URL)</span>
                </div>
              </div>
              <button className="st-save-btn" onClick={saveSys}>ບັນທຶກ</button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
