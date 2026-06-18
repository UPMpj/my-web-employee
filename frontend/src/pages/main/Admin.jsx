import { useEffect, useState } from "react";
import { api } from "../../api";
import { useLanguage } from "../../context/LanguageContext";
import toast from "react-hot-toast";
import ConfirmModal from "../../components/ConfirmModal";
import "../../components/ConfirmModal.css";

const EMPTY_FORM = { fullname: "", email: "", password: "", role_id: "", company_ids: [] };

function Badge({ text }) {
  const colors = {
    "Super Admin":   { bg: "#fef3c7", color: "#92400e" },
    "Company Admin": { bg: "#dbeafe", color: "#1e40af" },
    "admin":         { bg: "#f3e8ff", color: "#6b21a8" },
  };
  const s = colors[text] || { bg: "#f3f4f6", color: "#374151" };
  return (
    <span style={{ display:"inline-block", padding:"3px 12px", borderRadius:20, fontSize:12, fontWeight:700, background:s.bg, color:s.color }}>
      {text}
    </span>
  );
}

export default function Admin() {
  const { t } = useLanguage();
  const [users,     setUsers]     = useState([]);
  const [roles,     setRoles]     = useState([]);
  const [companies, setCompanies] = useState([]);
  const [loading,   setLoading]   = useState(false);

  const [showModal,   setShowModal]   = useState(false);
  const [editTarget,  setEditTarget]  = useState(null);
  const [form,        setForm]        = useState(EMPTY_FORM);
  const [saving,      setSaving]      = useState(false);
  const [saveError,   setSaveError]   = useState("");
  const [confirmId,   setConfirmId]   = useState(null);

  const [showNewCo,   setShowNewCo]   = useState(false);
  const [newCoName,   setNewCoName]   = useState("");
  const [creatingCo,  setCreatingCo]  = useState(false);

  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [u, r, c] = await Promise.all([
        api.get("/users"),
        api.get("/users/roles"),
        api.get("/company/all"),
      ]);
      setUsers(u.data.data ?? u.data);
      setRoles(r.data);
      setCompanies(c.data);
    } catch { toast.error(t("load_failed")); }
    setLoading(false);
  };

  const openAdd = () => {
    setEditTarget(null);
    setForm(EMPTY_FORM);
    setSaveError("");
    setShowNewCo(false);
    setNewCoName("");
    setShowModal(true);
  };

  const openEdit = (u) => {
    setEditTarget(u);
    const matchedRole = roles.find(r => r.role_name === u.role_name);
    setForm({
      fullname:    u.fullname    || "",
      email:       u.email       || "",
      password:    "",
      role_id:     String(matchedRole?.role_id || ""),
      company_ids: Array.isArray(u.company_ids) ? u.company_ids : [],
    });
    setSaveError("");
    setShowNewCo(false);
    setNewCoName("");
    setShowModal(true);
  };

  const toggleCompany = (cid) => {
    setForm(f => ({
      ...f,
      company_ids: f.company_ids.includes(cid)
        ? f.company_ids.filter(x => x !== cid)
        : [...f.company_ids, cid],
    }));
  };

  const createCompany = async () => {
    if (!newCoName.trim()) return;
    setCreatingCo(true);
    try {
      const res = await api.post("/company", { companies_name: newCoName.trim(), status: "Active" });
      const created = res.data;
      setCompanies(prev => [...prev, created]);
      setForm(f => ({ ...f, company_ids: [...f.company_ids, created.company_id] }));
      setNewCoName("");
      setShowNewCo(false);
      toast.success(`${t("co_created_ok")}: "${created.companies_name}"`);
    } catch (err) {
      toast.error(err?.response?.data?.message || t("co_create_fail"));
    }
    setCreatingCo(false);
  };

  const save = async () => {
    setSaveError("");
    if (!form.fullname.trim() || !form.email.trim() || !form.role_id) {
      setSaveError(t("fill_required")); return;
    }
    if (!editTarget && !form.password.trim()) {
      setSaveError(t("please_enter_pw")); return;
    }
    setSaving(true);
    try {
      const payload = { ...form, role_id: Number(form.role_id) };
      if (editTarget) {
        await api.put(`/users/${editTarget.user_id}`, payload);
        toast.success(t("user_updated_ok"));
      } else {
        await api.post("/users", payload);
        toast.success(t("user_created_ok"));
      }
      setShowModal(false);
      loadAll();
    } catch (err) {
      setSaveError(err?.response?.data?.message || t("save_failed_msg"));
    }
    setSaving(false);
  };

  const remove = async (id) => {
    try {
      await api.delete(`/users/${id}`);
      toast.success(t("user_deleted_ok"));
      loadAll();
    } catch (err) {
      toast.error(err?.response?.data?.message || t("delete_failed_msg"));
    } finally {
      setConfirmId(null);
    }
  };

  return (
    <div style={{ padding:"28px 32px", background:"#f4f6fb", minHeight:"100vh" }}>

      {/* Header */}
      <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:24 }}>
        <div>
          <h1 style={{ fontSize:24, fontWeight:700, margin:"0 0 4px", color:"#1a1a2e" }}>{t("users_page_title")}</h1>
          <p style={{ color:"#6b7280", margin:0, fontSize:14 }}>{t("users_sub")}</p>
        </div>
        <button onClick={openAdd} style={{ padding:"10px 20px", background:"#2f4aad", color:"#fff", border:"none", borderRadius:9, fontWeight:600, fontSize:14, cursor:"pointer" }}>
          {t("add_user_btn")}
        </button>
      </div>

      {/* Table */}
      <div style={{ background:"#fff", borderRadius:12, boxShadow:"0 1px 4px rgba(0,0,0,.07)", overflow:"hidden" }}>
        {loading ? (
          <div style={{ padding:60, textAlign:"center", color:"#9ca3af" }}>{t("loading")}</div>
        ) : (
          <table style={{ width:"100%", borderCollapse:"collapse" }}>
            <thead>
              <tr style={{ background:"#fafafa", borderBottom:"2px solid #f3f4f6" }}>
                {["#", t("name"), "Email", "Role", "Companies", t("created_at"), t("col_actions")].map(h => (
                  <th key={h} style={{ padding:"12px 16px", textAlign:"left", fontSize:13, fontWeight:600, color:"#374151" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {users.length === 0 ? (
                <tr><td colSpan="7" style={{ padding:40, textAlign:"center", color:"#9ca3af" }}>{t("no_users")}</td></tr>
              ) : users.map((u, i) => (
                <tr key={u.user_id} style={{ borderBottom:"1px solid #f3f4f6" }}>
                  <td style={{ padding:"13px 16px", fontSize:13, color:"#9ca3af" }}>{i + 1}</td>
                  <td style={{ padding:"13px 16px" }}>
                    <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                      <div style={{ width:34, height:34, borderRadius:"50%", background:"#e0e7ff", display:"flex", alignItems:"center", justifyContent:"center", fontWeight:700, color:"#4338ca", fontSize:14, flexShrink:0 }}>
                        {u.fullname?.charAt(0)?.toUpperCase()}
                      </div>
                      <span style={{ fontWeight:600, color:"#1a1a2e", fontSize:14 }}>{u.fullname}</span>
                    </div>
                  </td>
                  <td style={{ padding:"13px 16px", fontSize:14, color:"#6b7280" }}>{u.email}</td>
                  <td style={{ padding:"13px 16px" }}><Badge text={u.role_name} /></td>
                  <td style={{ padding:"13px 16px", fontSize:13, color:"#6b7280" }}>
                    {u.companies?.length > 0
                      ? u.companies.slice(0,2).join(", ") + (u.companies.length > 2 ? ` +${u.companies.length - 2}` : "")
                      : <span style={{ color:"#d1d5db" }}>–</span>
                    }
                  </td>
                  <td style={{ padding:"13px 16px", fontSize:13, color:"#9ca3af" }}>
                    {u.created_at ? new Date(u.created_at).toLocaleDateString("en-GB",{day:"2-digit",month:"short",year:"numeric"}) : "–"}
                  </td>
                  <td style={{ padding:"13px 16px" }}>
                    <div style={{ display:"flex", gap:6 }}>
                      <button onClick={() => openEdit(u)}
                        style={{ width:30, height:30, border:"1px solid #e5e7eb", borderRadius:6, background:"#fff", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", color:"#2563eb" }}
                        title="Edit">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                        </svg>
                      </button>
                      <button onClick={() => setConfirmId(u.user_id)}
                        style={{ width:30, height:30, border:"1px solid #e5e7eb", borderRadius:6, background:"#fff", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", color:"#dc2626" }}
                        title="Delete">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <polyline points="3 6 5 6 21 6"/>
                          <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                          <path d="M10 11v6M14 11v6"/>
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Add / Edit Modal */}
      {showModal && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.45)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:1000 }}
          onClick={() => setShowModal(false)}>
          <div style={{ background:"#fff", borderRadius:14, width:500, maxWidth:"95vw", maxHeight:"90vh", overflowY:"auto", boxShadow:"0 20px 60px rgba(0,0,0,.2)" }}
            onClick={e => e.stopPropagation()}>

            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"22px 24px 0" }}>
              <h2 style={{ fontSize:20, fontWeight:700, margin:0, color:"#1a1a2e" }}>{editTarget ? t("edit_user_title") : t("add_user_title")}</h2>
              <button onClick={() => setShowModal(false)} style={{ background:"none", border:"none", fontSize:18, cursor:"pointer", color:"#9ca3af" }}>✕</button>
            </div>
            <p style={{ fontSize:13, color:"#6b7280", margin:"6px 24px 0" }}>
              {editTarget ? t("edit_user") : t("create_user")}
            </p>

            <div style={{ padding:"16px 24px", display:"flex", flexDirection:"column", gap:14 }}>
              {[
                { label: t("full_name_req"), key:"fullname", type:"text", placeholder: t("name_placeholder") },
                { label:"Email *",           key:"email",    type:"email", placeholder:"example@mail.com" },
                { label: editTarget ? t("new_password_opt") : t("password_req"), key:"password", type:"password", placeholder:"••••••••" },
              ].map(({ label, key, type, placeholder }) => (
                <div key={key} style={{ display:"flex", flexDirection:"column", gap:6 }}>
                  <label style={{ fontSize:13, fontWeight:600, color:"#374151" }}>{label}</label>
                  <input type={type} value={form[key]} placeholder={placeholder}
                    onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                    style={{ padding:"9px 12px", border:"1px solid #d1d5db", borderRadius:8, fontSize:14 }} />
                </div>
              ))}

              <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                <label style={{ fontSize:13, fontWeight:600, color:"#374151" }}>Role *</label>
                <select value={form.role_id} onChange={e => setForm(f => ({ ...f, role_id: e.target.value }))}
                  style={{ padding:"9px 12px", border:"1px solid #d1d5db", borderRadius:8, fontSize:14 }}>
                  <option value="">{t("sel_role_opt")}</option>
                  {roles.map(r => <option key={r.role_id} value={r.role_id}>{r.role_name}</option>)}
                </select>
              </div>

              <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                  <label style={{ fontSize:13, fontWeight:600, color:"#374151" }}>{t("companies_assigned")}</label>
                  <button
                    type="button"
                    onClick={() => { setShowNewCo(v => !v); setNewCoName(""); }}
                    title={t("create_new_co_btn")}
                    style={{ display:"flex", alignItems:"center", gap:4, padding:"4px 10px", background: showNewCo ? "#fee2e2" : "#eff6ff", color: showNewCo ? "#dc2626" : "#2f4aad", border:`1px solid ${showNewCo ? "#fca5a5" : "#bfdbfe"}`, borderRadius:7, fontSize:12, fontWeight:600, cursor:"pointer" }}
                  >
                    {showNewCo ? t("cancel_new_co_btn") : t("create_new_co_btn")}
                  </button>
                </div>

                {showNewCo && (
                  <div style={{ display:"flex", gap:8, alignItems:"center" }}>
                    <input
                      autoFocus
                      value={newCoName}
                      onChange={e => setNewCoName(e.target.value)}
                      onKeyDown={e => { if (e.key === "Enter") createCompany(); if (e.key === "Escape") setShowNewCo(false); }}
                      placeholder={t("new_co_ph")}
                      style={{ flex:1, padding:"8px 12px", border:"1.5px solid #2f4aad", borderRadius:8, fontSize:13, outline:"none" }}
                    />
                    <button
                      type="button"
                      onClick={createCompany}
                      disabled={creatingCo || !newCoName.trim()}
                      style={{ padding:"8px 14px", background:"#2f4aad", color:"#fff", border:"none", borderRadius:8, fontSize:13, fontWeight:600, cursor:"pointer", opacity: (creatingCo || !newCoName.trim()) ? 0.6 : 1, whiteSpace:"nowrap" }}
                    >
                      {creatingCo ? "..." : t("save")}
                    </button>
                  </div>
                )}

                <div style={{ display:"flex", flexWrap:"wrap", gap:8 }}>
                  {companies.map(c => {
                    const checked = form.company_ids.includes(c.company_id);
                    return (
                      <label key={c.company_id} style={{ display:"flex", alignItems:"center", gap:6, padding:"6px 12px", border:`1px solid ${checked ? "#2f4aad" : "#e5e7eb"}`, borderRadius:8, cursor:"pointer", background: checked ? "#eff6ff" : "#fff", fontSize:13 }}>
                        <input type="checkbox" checked={checked} onChange={() => toggleCompany(c.company_id)} style={{ accentColor:"#2f4aad" }} />
                        {c.companies_name}
                      </label>
                    );
                  })}
                </div>
              </div>

              {saveError && <p style={{ color:"#dc2626", fontSize:13, margin:0 }}>{saveError}</p>}
            </div>

            <div style={{ display:"flex", gap:10, justifyContent:"flex-end", padding:"0 24px 22px" }}>
              <button onClick={() => setShowModal(false)}
                style={{ padding:"10px 20px", border:"1px solid #d1d5db", borderRadius:8, background:"#fff", fontSize:14, cursor:"pointer" }}>
                {t("cancel")}
              </button>
              <button onClick={save} disabled={saving}
                style={{ padding:"10px 20px", background:"#2f4aad", color:"#fff", border:"none", borderRadius:8, fontSize:14, fontWeight:600, cursor:"pointer", opacity: saving ? 0.7 : 1 }}>
                {saving ? t("saving") : editTarget ? t("update_btn") : t("create_user_btn")}
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmId && (
        <ConfirmModal
          message={t("confirm_delete_user")}
          subMessage={t("delete_user_permanent")}
          confirmLabel={t("delete")}
          onConfirm={() => remove(confirmId)}
          onCancel={() => setConfirmId(null)}
        />
      )}
    </div>
  );
}
