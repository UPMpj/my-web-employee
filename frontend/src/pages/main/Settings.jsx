import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { api, validatePassword } from "../../api";
import { useCurrentUser } from "../../hooks/useCurrentUser";
import { useLanguage } from "../../context/LanguageContext";
import "./settings.css";

export default function Settings() {
  const user = useCurrentUser();
  const { t } = useLanguage();
  const isSuperAdmin = user.role === "Super Admin";
  const TABS = [t("tab_account"), t("tab_password"), ...(isSuperAdmin ? [t("tab_system")] : [])];
  const [tab, setTab] = useState(0);

  /* ── tab 0: profile ── */
  const [profile, setProfile] = useState({ fullname: user.fullname || "", email: user.email || "" });
  const [savingProfile, setSavingProfile] = useState(false);

  const saveProfile = async () => {
    if (!profile.fullname.trim() || !profile.email.trim()) {
      toast.error(t("st_fill_all")); return;
    }
    setSavingProfile(true);
    try {
      const res = await api.patch("/auth/profile", {
        fullname: profile.fullname,
        email:    profile.email,
      });
      const updated = { ...user, fullname: res.data.fullname, email: res.data.email };
      localStorage.setItem("user", JSON.stringify(updated));
      window.dispatchEvent(new CustomEvent("user_changed"));
      toast.success(t("st_update_ok"));
    } catch (err) {
      toast.error(err?.response?.data?.message || t("st_update_fail"));
    }
    setSavingProfile(false);
  };

  /* ── tab 1: password ── */
  const [pw, setPw] = useState({ current: "", next: "", confirm: "" });
  const [savingPw, setSavingPw] = useState(false);

  const savePassword = async () => {
    if (!pw.current || !pw.next || !pw.confirm) {
      toast.error(t("st_fill_all")); return;
    }
    const pwErr = validatePassword(pw.next);
    if (pwErr) { toast.error(pwErr); return; }
    if (pw.next !== pw.confirm) {
      toast.error(t("st_pw_mismatch")); return;
    }
    setSavingPw(true);
    try {
      await api.post("/auth/change-password", {
        current_password: pw.current,
        new_password:     pw.next,
      });
      toast.success(t("st_pw_ok"));
      setPw({ current:"", next:"", confirm:"" });
    } catch (err) {
      toast.error(err?.response?.data?.message || t("st_pw_fail"));
    }
    setSavingPw(false);
  };

  /* ── tab 2: system (Super Admin only) ── */
  const [sysName, setSysName] = useState(localStorage.getItem("sys_name") || "CCMS");
  const [savingSys, setSavingSys] = useState(false);

  useEffect(() => {
    api.get("/settings").then(r => {
      const name = r.data.sys_name || "CCMS";
      setSysName(name);
      localStorage.setItem("sys_name", name);
    }).catch(() => {});
  }, []);

  const saveSys = async () => {
    setSavingSys(true);
    try {
      const res = await api.put("/settings/sys-name", { sys_name: sysName });
      const saved = res.data.sys_name;
      localStorage.setItem("sys_name", saved);
      window.dispatchEvent(new CustomEvent("sys_name_changed", { detail: saved }));
      toast.success(t("st_sys_ok"));
    } catch {
      toast.error(t("st_save_fail"));
    }
    setSavingSys(false);
  };

  return (
    <div className="st-page">
      <div className="st-header">
        <h1 className="st-title">{t("settings_title")}</h1>
        <p className="st-sub">{t("settings_sub")}</p>
      </div>

      <div className="st-body">
        {/* Sidebar tabs */}
        <div className="st-tabs">
          {TABS.map((tabLabel, i) => (
            <button
              key={tabLabel}
              className={`st-tab${tab === i ? " st-tab-active" : ""}`}
              onClick={() => setTab(i)}
            >
              {tabLabel}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="st-content">

          {/* ── Tab 0: Profile ── */}
          {tab === 0 && (
            <div className="st-card">
              <h2 className="st-card-title">{t("account_info")}</h2>
              <p className="st-card-sub">{t("account_sub")}</p>

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
                  <label>{t("full_name")}</label>
                  <input value={profile.fullname} onChange={e => setProfile(p => ({...p, fullname: e.target.value}))} placeholder={t("name_placeholder")} />
                </div>
                <div className="st-field">
                  <label>Email</label>
                  <input type="email" value={profile.email} onChange={e => setProfile(p => ({...p, email: e.target.value}))} placeholder="email@example.com" />
                </div>
              </div>
              <button className="st-save-btn" onClick={saveProfile} disabled={savingProfile}>
                {savingProfile ? t("saving") : t("save_changes")}
              </button>
            </div>
          )}

          {/* ── Tab 1: Password ── */}
          {tab === 1 && (
            <div className="st-card">
              <h2 className="st-card-title">{t("tab_password")}</h2>
              <p className="st-card-sub">{t("password_min")}</p>
              <div className="st-fields">
                {[
                  { label: t("current_password"), key:"current" },
                  { label: t("new_password"),     key:"next"    },
                  { label: t("confirm_password"), key:"confirm" },
                ].map(({ label, key }) => (
                  <div key={key} className="st-field">
                    <label>{label}</label>
                    <input type="password" value={pw[key]} placeholder="••••••••"
                      onChange={e => setPw(p => ({...p, [key]: e.target.value}))} />
                  </div>
                ))}
              </div>
              <button className="st-save-btn" onClick={savePassword} disabled={savingPw}>
                {savingPw ? t("saving") : t("change_password")}
              </button>
            </div>
          )}

          {/* ── Tab 2: System ── */}
          {tab === 2 && (
            <div className="st-card">
              <h2 className="st-card-title">{t("system_settings")}</h2>
              <p className="st-card-sub">{t("system_sub")}</p>
              <div className="st-fields">
                <div className="st-field">
                  <label>{t("sys_name_label")}</label>
                  <input value={sysName} onChange={e => setSysName(e.target.value)} placeholder="CCMS" />
                </div>
                <div className="st-field">
                  <label>{t("st_backend_api")}</label>
                  <input
                    value={import.meta.env.VITE_API_URL || "http://localhost:5001"}
                    readOnly
                    style={{ background:"#f3f4f6", color:"#6b7280", cursor:"not-allowed" }}
                  />
                  <span className="st-hint">{t("st_edit_env")}</span>
                </div>
              </div>
              <button className="st-save-btn" onClick={saveSys} disabled={savingSys}>
                {savingSys ? t("saving") : t("save_btn")}
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
