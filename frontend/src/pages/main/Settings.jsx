import { useState, useEffect, useRef } from "react";
import toast from "react-hot-toast";
import { api, API_BASE, validatePassword } from "../../api";
import { useCurrentUser } from "../../hooks/useCurrentUser";
import { useLogoUpload } from "../../hooks/useLogoUpload";
import { useLanguage } from "../../context/LanguageContext";
import TwoFactorSetupModal from "../../components/TwoFactorSetupModal";
import "./settings.css";

function FeatureToggle({ label, desc, checked, disabled, saving, onChange }) {
  return (
    <div className="st-feature-row">
      <div>
        <div className="st-feature-label">{label}</div>
        {desc && <div className="st-feature-desc">{desc}</div>}
      </div>
      <input
        type="checkbox"
        className="st-toggle"
        checked={checked}
        disabled={disabled || saving}
        onChange={e => onChange(e.target.checked)}
      />
    </div>
  );
}

export default function Settings() {
  const user = useCurrentUser();
  const { t, lang, toggleLang } = useLanguage();
  const isSuperAdmin = user.role === "Super Admin";

  const ALL_TABS = [
    { key: "general",       label: t("tab_general") },
    { key: "notifications", label: t("tab_notifications"), superAdminOnly: true },
    { key: "security",      label: t("tab_security") },
    { key: "appearance",    label: t("tab_appearance"),    superAdminOnly: true },
    { key: "language",      label: t("tab_language") },
    { key: "backup",        label: t("tab_backup"),        superAdminOnly: true },
  ];
  const TABS = ALL_TABS.filter(tb => !tb.superAdminOnly || isSuperAdmin);
  const [tab, setTab] = useState("general");

  /* ── Appearance: logo (shared with Sidebar.jsx via useLogoUpload) ── */
  const { logoSrc, uploading: uploadingLogo, uploadLogo, removeLogo } = useLogoUpload();
  const logoFileRef = useRef(null);

  /* ── General: profile ── */
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

  /* ── General: system name (Super Admin only) ── */
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

  const saveGeneral = async () => {
    await saveSys();
    await saveFeature("admin_email", features.admin_email || "").catch(() => {});
  };

  /* ── Security: password ── */
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

  /* ── Security: 2FA ── */
  const [twoFaEnabled, setTwoFaEnabled] = useState(false);
  const [showSetupModal, setShowSetupModal] = useState(false);
  const [showDisableForm, setShowDisableForm] = useState(false);
  const [disablePw, setDisablePw] = useState("");
  const [disabling, setDisabling] = useState(false);

  useEffect(() => {
    api.get("/2fa/status").then(r => setTwoFaEnabled(r.data.enabled)).catch(() => {});
  }, []);

  const disable2fa = async () => {
    if (!disablePw) { toast.error(t("st_fill_all")); return; }
    setDisabling(true);
    try {
      await api.post("/2fa/disable", { current_password: disablePw });
      setTwoFaEnabled(false);
      setShowDisableForm(false);
      setDisablePw("");
      toast.success(t("tfa_disabled_ok"));
    } catch (err) {
      toast.error(err?.response?.data?.message || t("save_failed_msg"));
    }
    setDisabling(false);
  };

  /* ── Feature toggles (app_settings) ── */
  const [features, setFeatures] = useState({});
  const [savingFeature, setSavingFeature] = useState(null);

  useEffect(() => {
    api.get("/settings/features").then(r => setFeatures(r.data)).catch(() => {});
  }, []);

  const saveFeature = async (key, value) => {
    setSavingFeature(key);
    try {
      await api.put(`/settings/features/${key}`, { value: String(value) });
      setFeatures(f => ({ ...f, [key]: String(value) }));
    } catch (err) {
      toast.error(err?.response?.data?.message || t("save_failed_msg"));
      throw err;
    } finally {
      setSavingFeature(null);
    }
  };

  /* ── Notifications: expiry alert check ── */
  const [checkingExpiry, setCheckingExpiry] = useState(false);

  const runExpiryCheckNow = async () => {
    setCheckingExpiry(true);
    try {
      const res = await api.post("/settings/run-expiry-check");
      toast.success(`ກວດ ${res.data.checked} ລາຍການ — ແຈ້ງເຕືອນ ${res.data.alertsSent} ລາຍການ`);
    } catch (err) {
      toast.error(err?.response?.data?.message || t("save_failed_msg"));
    }
    setCheckingExpiry(false);
  };

  /* ── Backup & Export ── */
  const [backupHistory, setBackupHistory] = useState([]);
  const [runningBackup, setRunningBackup] = useState(false);

  const loadBackupHistory = () => {
    if (!isSuperAdmin) return;
    api.get("/settings/backup/history").then(r => setBackupHistory(r.data)).catch(() => {});
  };
  useEffect(() => { loadBackupHistory(); }, [isSuperAdmin]);

  const runBackupNow = async () => {
    setRunningBackup(true);
    try {
      const res = await api.post("/settings/backup/run-now");
      if (res.data.ok) toast.success(t("backup_success"));
      else toast.error(res.data.error || t("save_failed_msg"));
      loadBackupHistory();
    } catch (err) {
      toast.error(err?.response?.data?.message || t("save_failed_msg"));
    }
    setRunningBackup(false);
  };

  const downloadBackup = async (id) => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_BASE}/api/settings/backup/${id}/download`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error("download failed");
      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement("a");
      a.href     = url;
      a.download = `backup_${id}.zip`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error(t("save_failed_msg"));
    }
  };

  return (
    <div className="st-page">

      {/* ── Header ── */}
      <div className="st-header">
        <h1 className="st-title">{t("settings_title")}</h1>
        <p className="st-sub">{t("settings_sub")}</p>
      </div>

      <div className="st-body">
        {/* Sidebar tabs */}
        <div className="st-tabs">
          {TABS.map(tb => (
            <button
              key={tb.key}
              className={`st-tab${tab === tb.key ? " st-tab-active" : ""}`}
              onClick={() => setTab(tb.key)}
            >
              {tb.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="st-content">

          {/* ── General ── */}
          {tab === "general" && (
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

              {isSuperAdmin && (
                <>
                  <h2 className="st-card-title" style={{ marginTop: 32 }}>{t("system_settings")}</h2>
                  <p className="st-card-sub">{t("system_sub")}</p>
                  <div className="st-fields">
                    <div className="st-field">
                      <label>{t("sys_name_label")}</label>
                      <input value={sysName} onChange={e => setSysName(e.target.value)} placeholder="CCMS" />
                    </div>
                    <div className="st-field">
                      <label>{t("admin_email_label")}</label>
                      <input
                        type="email"
                        value={features.admin_email || ""}
                        onChange={e => setFeatures(f => ({ ...f, admin_email: e.target.value }))}
                        placeholder="admin@example.com"
                      />
                    </div>
                    <div className="st-field">
                      <label>{t("tab_language")}</label>
                      <select value={lang} onChange={e => { if (e.target.value !== lang) toggleLang(); }}>
                        <option value="lo">🇱🇦 ລາວ</option>
                        <option value="en">🇬🇧 English</option>
                      </select>
                    </div>
                    <div className="st-field">
                      <label>{t("timezone_label")}</label>
                      <input value="Asia/Vientiane (ICT, UTC+7)" readOnly
                        style={{ background:"#f3f4f6", color:"#6b7280", cursor:"not-allowed" }} />
                    </div>
                  </div>
                  <button className="st-save-btn" onClick={saveGeneral} disabled={savingSys}>
                    {savingSys ? t("saving") : t("save_changes")}
                  </button>

                  <h2 className="st-card-title" style={{ marginTop: 32 }}>{t("feature_toggles_title")}</h2>
                  <FeatureToggle
                    label={t("feat_audit_logging")} desc={t("feat_audit_logging_desc")}
                    checked={features.audit_logging_enabled !== "false"}
                    saving={savingFeature === "audit_logging_enabled"}
                    onChange={v => saveFeature("audit_logging_enabled", v)}
                  />
                  <FeatureToggle
                    label={t("feat_expiry_alerts")} desc={t("feat_expiry_alerts_desc")}
                    checked={features.id_card_expiry_alerts_enabled !== "false"}
                    saving={savingFeature === "id_card_expiry_alerts_enabled"}
                    onChange={v => saveFeature("id_card_expiry_alerts_enabled", v)}
                  />
                  <FeatureToggle
                    label={t("feat_2fa")} desc={t("tfa_require_desc")}
                    checked={features.require_2fa === "true"}
                    saving={savingFeature === "require_2fa"}
                    onChange={v => saveFeature("require_2fa", v)}
                  />
                  <FeatureToggle
                    label={t("feat_auto_backup")} desc={t("feat_auto_backup_desc")}
                    checked={features.auto_backup_enabled === "true"}
                    saving={savingFeature === "auto_backup_enabled"}
                    onChange={v => saveFeature("auto_backup_enabled", v)}
                  />
                </>
              )}
            </div>
          )}

          {/* ── Notifications ── */}
          {tab === "notifications" && (
            <div className="st-card">
              <h2 className="st-card-title">{t("tab_notifications")}</h2>
              <p className="st-card-sub">{t("super_admin_only")}</p>

              <FeatureToggle
                label={t("feat_expiry_alerts")}
                desc={t("feat_expiry_alerts_desc")}
                checked={features.id_card_expiry_alerts_enabled !== "false"}
                saving={savingFeature === "id_card_expiry_alerts_enabled"}
                onChange={v => saveFeature("id_card_expiry_alerts_enabled", v)}
              />

              <div className="st-fields" style={{ marginTop: 16 }}>
                <div className="st-field">
                  <label>{t("feat_expiry_alert_days_label")}</label>
                  <input
                    type="number"
                    min="1"
                    max="365"
                    value={features.id_card_expiry_alert_days || "30"}
                    onChange={e => setFeatures(f => ({ ...f, id_card_expiry_alert_days: e.target.value }))}
                    onBlur={e => saveFeature("id_card_expiry_alert_days", e.target.value || "30")}
                  />
                </div>
              </div>

              <button className="st-save-btn" style={{ marginTop: 20 }} onClick={runExpiryCheckNow} disabled={checkingExpiry}>
                {checkingExpiry ? t("loading") : t("feat_check_now")}
              </button>
            </div>
          )}

          {/* ── Security ── */}
          {tab === "security" && (
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

              <h2 className="st-card-title" style={{ marginTop: 32 }}>{t("feat_2fa")}</h2>
              <p className="st-card-sub">
                {twoFaEnabled ? t("tfa_status_on") : t("tfa_status_off")}
              </p>
              {twoFaEnabled ? (
                showDisableForm ? (
                  <div className="st-fields" style={{ marginBottom: 12 }}>
                    <div className="st-field">
                      <label>{t("current_password")}</label>
                      <input type="password" value={disablePw} onChange={e => setDisablePw(e.target.value)} placeholder="••••••••" />
                    </div>
                    <div style={{ display: "flex", gap: 8 }}>
                      <button className="st-save-btn" style={{ background: "#dc2626" }} onClick={disable2fa} disabled={disabling}>
                        {disabling ? t("saving") : t("tfa_confirm_disable")}
                      </button>
                      <button className="st-backup-download" onClick={() => { setShowDisableForm(false); setDisablePw(""); }}>
                        {t("cancel")}
                      </button>
                    </div>
                  </div>
                ) : (
                  <button className="st-backup-download" onClick={() => setShowDisableForm(true)}>{t("tfa_disable_btn")}</button>
                )
              ) : (
                <button className="st-save-btn" onClick={() => setShowSetupModal(true)}>{t("tfa_enable_btn")}</button>
              )}

              {isSuperAdmin && (
                <div style={{ marginTop: 20 }}>
                  <FeatureToggle
                    label={t("tfa_require_label")}
                    desc={t("tfa_require_desc")}
                    checked={features.require_2fa === "true"}
                    saving={savingFeature === "require_2fa"}
                    onChange={v => saveFeature("require_2fa", v)}
                  />
                </div>
              )}

              <h2 className="st-card-title" style={{ marginTop: 32 }}>{t("feat_audit_logging")}</h2>
              <p className="st-card-sub">{t("super_admin_only")}</p>
              <FeatureToggle
                label={t("feat_audit_logging")}
                desc={t("feat_audit_logging_desc")}
                checked={features.audit_logging_enabled !== "false"}
                disabled={!isSuperAdmin}
                saving={savingFeature === "audit_logging_enabled"}
                onChange={v => saveFeature("audit_logging_enabled", v)}
              />

              {showSetupModal && (
                <TwoFactorSetupModal
                  onClose={() => setShowSetupModal(false)}
                  onEnabled={() => setTwoFaEnabled(true)}
                />
              )}
            </div>
          )}

          {/* ── Appearance ── */}
          {tab === "appearance" && (
            <div className="st-card">
              <h2 className="st-card-title">{t("tab_appearance")}</h2>
              <p className="st-card-sub">{t("super_admin_only")}</p>

              <div className="st-logo-row">
                <div className="st-logo-preview">
                  {logoSrc
                    ? <img src={logoSrc} alt="logo" />
                    : <img src="/IMG_2041.png" alt="logo" />}
                </div>
                <div>
                  <input ref={logoFileRef} type="file" accept="image/*" hidden onChange={e => e.target.files[0] && uploadLogo(e.target.files[0])} />
                  <button className="st-save-btn" onClick={() => logoFileRef.current.click()} disabled={uploadingLogo}>
                    {uploadingLogo ? t("saving") : t("appearance_upload_logo")}
                  </button>
                  {logoSrc && (
                    <button className="st-backup-download" style={{ marginLeft: 10 }} onClick={removeLogo}>
                      {t("appearance_remove_logo")}
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ── Language ── */}
          {tab === "language" && (
            <div className="st-card">
              <h2 className="st-card-title">{t("tab_language")}</h2>
              <div className="st-fields">
                <div className="st-field">
                  <label>{t("tab_language")}</label>
                  <select value={lang} onChange={e => { if (e.target.value !== lang) toggleLang(); }}>
                    <option value="lo">🇱🇦 ລາວ</option>
                    <option value="en">🇬🇧 English</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* ── Backup & Export ── */}
          {tab === "backup" && (
            <div className="st-card">
              <h2 className="st-card-title">{t("tab_backup")}</h2>
              <p className="st-card-sub">{t("super_admin_only")}</p>

              <FeatureToggle
                label={t("feat_auto_backup")}
                desc={t("feat_auto_backup_desc")}
                checked={features.auto_backup_enabled === "true"}
                saving={savingFeature === "auto_backup_enabled"}
                onChange={v => saveFeature("auto_backup_enabled", v)}
              />

              <p className="st-hint" style={{ marginTop: 10 }}>{t("backup_sleep_note")}</p>

              <button className="st-save-btn" style={{ marginTop: 16 }} onClick={runBackupNow} disabled={runningBackup}>
                {runningBackup ? t("loading") : t("backup_run_now")}
              </button>

              <h2 className="st-card-title" style={{ marginTop: 32 }}>{t("backup_history_title")}</h2>
              {backupHistory.length === 0 ? (
                <div className="st-placeholder">{t("no_data")}</div>
              ) : (
                <table className="st-backup-table">
                  <thead>
                    <tr>
                      <th>{t("backup_col_date")}</th>
                      <th>{t("status")}</th>
                      <th>{t("backup_col_size")}</th>
                      <th>{t("backup_col_trigger")}</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {backupHistory.map(b => (
                      <tr key={b.id}>
                        <td>{new Date(b.started_at).toLocaleString("en-GB")}</td>
                        <td>
                          <span className={`st-backup-status st-backup-${b.status}`}>{b.status}</span>
                        </td>
                        <td>{b.file_size_kb ? `${b.file_size_kb} KB` : "–"}</td>
                        <td>{b.triggered_by}</td>
                        <td>
                          {b.status === "success" && (
                            <button className="st-backup-download" onClick={() => downloadBackup(b.id)}>{t("backup_download")}</button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
