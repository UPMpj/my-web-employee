import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api, API_BASE, photoUrl as getPhotoUrl } from "../../api";
import toast from "react-hot-toast";
import "./employee-detail.css";

const TABS = ["Basic Info", "Profile", "Documents", "Permits", "Timeline", "Employee Cards"];

function fmt(d) {
  if (!d) return "–";
  return new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

const STATUS_STYLE = {
  "Active":   { bg: "#d1fae5", color: "#065f46" },
  "On Leave": { bg: "#fef3c7", color: "#92400e" },
  "Inactive": { bg: "#f3f4f6", color: "#374151" },
  "Resigned": { bg: "#fee2e2", color: "#991b1b" },
};

function IconEdit() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
    </svg>
  );
}

/* ── helpers ── */
const DOC_TYPES = ["Passport","Work Permit","Visa","ID Card","Contract","Certificate","Other"];
const PERMIT_TYPES = ["Work Permit","Business Visa","Tourist Visa","Non-Immigrant Visa","Residence Permit","Other"];
const PERMIT_STATUS = ["Valid","Expired","Pending","Revoked"];

function daysLeft(dateStr) {
  if (!dateStr) return null;
  const diff = Math.ceil((new Date(dateStr) - new Date()) / 86400000);
  return diff;
}

function ExpiryBadge({ date }) {
  if (!date) return <span className="ed-val">–</span>;
  const d = daysLeft(date);
  let cls = "ed-exp-ok", label = fmt(date);
  if (d < 0)   { cls = "ed-exp-expired"; label = `${fmt(date)} (ໝົດອາຍຸ)`; }
  else if (d <= 30)  { cls = "ed-exp-warn30";  label = `${fmt(date)} (ຍັງ ${d} ມື້)`; }
  else if (d <= 90)  { cls = "ed-exp-warn90";  label = `${fmt(date)} (ຍັງ ${d} ມື້)`; }
  return <span className={`ed-exp-badge ${cls}`}>{label}</span>;
}

/* ── Documents Tab ── */
function DocumentsTab({ empId }) {
  const [docs, setDocs]         = useState([]);
  const [loading, setLoading]   = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm]         = useState({ doc_type: "Passport", doc_name: "", expires_at: "", notes: "" });
  const [file, setFile]         = useState(null);
  const [saving, setSaving]     = useState(false);
  const fileRef = useRef();

  const load = () => {
    setLoading(true);
    api.get(`/documents/${empId}`).then(r => setDocs(r.data)).catch(() => {}).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, [empId]);

  const submit = async (e) => {
    e.preventDefault();
    if (!form.doc_name.trim()) { toast.error("ກະລຸນາໃສ່ຊື່ເອກະສານ"); return; }
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append("doc_type",   form.doc_type);
      fd.append("doc_name",   form.doc_name);
      fd.append("expires_at", form.expires_at);
      fd.append("notes",      form.notes);
      if (file) fd.append("file", file);
      await api.post(`/documents/${empId}`, fd, { headers: { "Content-Type": "multipart/form-data" } });
      toast.success("ບັນທຶກເອກະສານສຳເລັດ");
      setShowForm(false);
      setForm({ doc_type: "Passport", doc_name: "", expires_at: "", notes: "" });
      setFile(null);
      load();
    } catch { toast.error("ບໍ່ສາມາດບັນທຶກໄດ້"); }
    setSaving(false);
  };

  const del = async (docId) => {
    if (!window.confirm("ລຶບເອກະສານນີ້ແທ້ບໍ?")) return;
    try {
      await api.delete(`/documents/doc/${docId}`);
      toast.success("ລຶບສຳເລັດ");
      load();
    } catch { toast.error("ລຶບບໍ່ໄດ້"); }
  };

  return (
    <div>
      <div className="ed-tab-topbar">
        <h2 className="ed-section-title" style={{margin:0}}>ເອກະສານ</h2>
        <button className="ed-add-btn" onClick={() => setShowForm(v => !v)}>
          {showForm ? "ຍົກເລີກ" : "+ ເພີ້ມເອກະສານ"}
        </button>
      </div>

      {showForm && (
        <form className="ed-doc-form" onSubmit={submit}>
          <div className="ed-form-row">
            <div className="ed-form-group">
              <label className="ed-form-label">ປະເພດ</label>
              <select className="ed-form-input" value={form.doc_type}
                onChange={e => setForm(f => ({...f, doc_type: e.target.value}))}>
                {DOC_TYPES.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div className="ed-form-group" style={{flex:2}}>
              <label className="ed-form-label">ຊື່ເອກະສານ *</label>
              <input className="ed-form-input" value={form.doc_name}
                onChange={e => setForm(f => ({...f, doc_name: e.target.value}))}
                placeholder="ເຊັ່ນ: Passport No. AB123456" />
            </div>
            <div className="ed-form-group">
              <label className="ed-form-label">ວັນໝົດອາຍຸ</label>
              <input type="date" className="ed-form-input" value={form.expires_at}
                onChange={e => setForm(f => ({...f, expires_at: e.target.value}))} />
            </div>
          </div>
          <div className="ed-form-row">
            <div className="ed-form-group" style={{flex:2}}>
              <label className="ed-form-label">ໝາຍເຫດ</label>
              <input className="ed-form-input" value={form.notes}
                onChange={e => setForm(f => ({...f, notes: e.target.value}))}
                placeholder="ໝາຍເຫດເພີ້ມເຕີມ" />
            </div>
            <div className="ed-form-group">
              <label className="ed-form-label">ໄຟລ໌ (PDF/ຮູບ)</label>
              <input type="file" ref={fileRef} accept=".pdf,.jpg,.jpeg,.png"
                onChange={e => setFile(e.target.files[0])}
                style={{display:"none"}} />
              <button type="button" className="ed-file-btn"
                onClick={() => fileRef.current.click()}>
                {file ? file.name : "ເລືອກໄຟລ໌"}
              </button>
            </div>
          </div>
          <div style={{display:"flex", gap:8, justifyContent:"flex-end"}}>
            <button type="button" className="ed-cancel-btn" onClick={() => setShowForm(false)}>ຍົກເລີກ</button>
            <button type="submit" className="ed-save-btn" disabled={saving}>
              {saving ? "ກຳລັງບັນທຶກ..." : "ບັນທຶກ"}
            </button>
          </div>
        </form>
      )}

      {loading ? <div className="ed-empty-tab">Loading...</div> : docs.length === 0 ? (
        <div className="ed-empty-tab">ຍັງບໍ່ມີເອກະສານ</div>
      ) : (
        <table className="ed-info-table" style={{marginTop:16}}>
          <thead>
            <tr>
              <th className="ed-th">ປະເພດ</th>
              <th className="ed-th">ຊື່ / ລາຍລະອຽດ</th>
              <th className="ed-th">ວັນໝົດອາຍຸ</th>
              <th className="ed-th">ໝາຍເຫດ</th>
              <th className="ed-th">ໄຟລ໌</th>
              <th className="ed-th">ອັບໂຫລດໂດຍ</th>
              <th className="ed-th"></th>
            </tr>
          </thead>
          <tbody>
            {docs.map(d => (
              <tr key={d.doc_id}>
                <td className="ed-val"><span className="ed-type-chip">{d.doc_type}</span></td>
                <td className="ed-val ed-bold">{d.doc_name}</td>
                <td className="ed-val"><ExpiryBadge date={d.expires_at} /></td>
                <td className="ed-val" style={{fontSize:13,color:"#6b7280"}}>{d.notes || "–"}</td>
                <td className="ed-val">
                  {d.file_path
                    ? <a href={`${API_BASE}${d.file_path}`} target="_blank" rel="noreferrer" className="ed-link">ເບິ່ງ</a>
                    : "–"}
                </td>
                <td className="ed-val" style={{fontSize:12,color:"#9ca3af"}}>{d.uploaded_by_name || "–"}</td>
                <td className="ed-val">
                  <button className="ed-del-btn" onClick={() => del(d.doc_id)}>ລຶບ</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

/* ── Permits Tab ── */
function PermitsTab({ empId }) {
  const [permits, setPermits]   = useState([]);
  const [loading, setLoading]   = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing]   = useState(null);
  const [form, setForm]         = useState({
    permit_type: "Work Permit", permit_number: "", issued_date: "",
    expires_at: "", status: "Valid", notes: ""
  });
  const [photoFile, setPhotoFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [lightbox, setLightbox] = useState(null);
  const [saving, setSaving] = useState(false);

  const load = () => {
    setLoading(true);
    api.get(`/permits/${empId}`).then(r => setPermits(r.data)).catch(() => {}).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, [empId]);

  const resetFile = () => { setPhotoFile(null); setPreviewUrl(null); };

  const openNew = () => {
    setEditing(null);
    setForm({ permit_type: "Work Permit", permit_number: "", issued_date: "", expires_at: "", status: "Valid", notes: "" });
    resetFile();
    setShowForm(true);
  };
  const openEdit = (p) => {
    setEditing(p.permit_id);
    setForm({
      permit_type: p.permit_type, permit_number: p.permit_number || "",
      issued_date: p.issued_date ? p.issued_date.slice(0,10) : "",
      expires_at:  p.expires_at  ? p.expires_at.slice(0,10)  : "",
      status: p.status, notes: p.notes || ""
    });
    resetFile();
    setShowForm(true);
  };

  const handleFileChange = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    setPhotoFile(f);
    setPreviewUrl(URL.createObjectURL(f));
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!form.permit_type) { toast.error("ກະລຸນາໃສ່ປະເພດ"); return; }
    setSaving(true);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => fd.append(k, v));
      if (photoFile) fd.append("file", photoFile);
      if (editing) {
        await api.patch(`/permits/item/${editing}`, fd, { headers: { "Content-Type": "multipart/form-data" } });
        toast.success("ແກ້ໄຂສຳເລັດ");
      } else {
        await api.post(`/permits/${empId}`, fd, { headers: { "Content-Type": "multipart/form-data" } });
        toast.success("ເພີ້ມ Permit ສຳເລັດ");
      }
      setShowForm(false);
      resetFile();
      load();
    } catch { toast.error("ບໍ່ສາມາດບັນທຶກໄດ້"); }
    setSaving(false);
  };

  const del = async (id) => {
    if (!window.confirm("ລຶບ Permit ນີ້ແທ້ບໍ?")) return;
    try {
      await api.delete(`/permits/item/${id}`);
      toast.success("ລຶບສຳເລັດ");
      load();
    } catch { toast.error("ລຶບບໍ່ໄດ້"); }
  };

  const statusStyle = { Valid:{bg:"#dcfce7",c:"#065f46"}, Expired:{bg:"#fee2e2",c:"#991b1b"}, Pending:{bg:"#fef3c7",c:"#92400e"}, Revoked:{bg:"#f3f4f6",c:"#374151"} };

  return (
    <div>
      {/* Lightbox */}
      {lightbox && (
        <div onClick={() => setLightbox(null)} style={{position:"fixed",inset:0,background:"rgba(0,0,0,.75)",zIndex:9999,display:"flex",alignItems:"center",justifyContent:"center",cursor:"zoom-out"}}>
          <img src={lightbox} alt="permit" style={{maxWidth:"90vw",maxHeight:"90vh",borderRadius:8,boxShadow:"0 8px 40px rgba(0,0,0,.5)"}} onClick={e => e.stopPropagation()} />
        </div>
      )}
      <div className="ed-tab-topbar">
        <h2 className="ed-section-title" style={{margin:0}}>Permits / Visa</h2>
        <button className="ed-add-btn" onClick={openNew}>+ ເພີ້ມ Permit</button>
      </div>

      {showForm && (
        <form className="ed-doc-form" onSubmit={submit}>
          <div className="ed-form-row">
            <div className="ed-form-group">
              <label className="ed-form-label">ປະເພດ *</label>
              <select className="ed-form-input" value={form.permit_type}
                onChange={e => setForm(f => ({...f, permit_type: e.target.value}))}>
                {PERMIT_TYPES.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div className="ed-form-group" style={{flex:2}}>
              <label className="ed-form-label">ເລກ Permit</label>
              <input className="ed-form-input" value={form.permit_number}
                onChange={e => setForm(f => ({...f, permit_number: e.target.value}))}
                placeholder="ເຊັ່ນ: WP-2025-00123" />
            </div>
            <div className="ed-form-group">
              <label className="ed-form-label">ສະຖານະ</label>
              <select className="ed-form-input" value={form.status}
                onChange={e => setForm(f => ({...f, status: e.target.value}))}>
                {PERMIT_STATUS.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <div className="ed-form-row">
            <div className="ed-form-group">
              <label className="ed-form-label">ວັນທີອອກ</label>
              <input type="date" className="ed-form-input" value={form.issued_date}
                onChange={e => setForm(f => ({...f, issued_date: e.target.value}))} />
            </div>
            <div className="ed-form-group">
              <label className="ed-form-label">ວັນໝົດອາຍຸ</label>
              <input type="date" className="ed-form-input" value={form.expires_at}
                onChange={e => setForm(f => ({...f, expires_at: e.target.value}))} />
            </div>
            <div className="ed-form-group" style={{flex:2}}>
              <label className="ed-form-label">ໝາຍເຫດ</label>
              <input className="ed-form-input" value={form.notes}
                onChange={e => setForm(f => ({...f, notes: e.target.value}))}
                placeholder="ໝາຍເຫດ..." />
            </div>
          </div>
          <div className="ed-form-row">
            <div className="ed-form-group" style={{flex:1}}>
              <label className="ed-form-label">ຮູບເອກະສານ (Visa / Passport)</label>
              <input type="file" accept="image/*,application/pdf" className="ed-form-input"
                style={{padding:"6px 10px",cursor:"pointer"}}
                onChange={handleFileChange} />
            </div>
            {previewUrl && (
              <div style={{display:"flex",alignItems:"center",gap:8}}>
                <img src={previewUrl} alt="preview" style={{height:60,borderRadius:6,border:"1px solid #e5e7eb",objectFit:"cover",cursor:"pointer"}} onClick={() => setLightbox(previewUrl)} />
                <button type="button" style={{fontSize:11,color:"#ef4444",background:"none",border:"none",cursor:"pointer"}} onClick={resetFile}>✕ ລຶບ</button>
              </div>
            )}
          </div>
          <div style={{display:"flex", gap:8, justifyContent:"flex-end"}}>
            <button type="button" className="ed-cancel-btn" onClick={() => { setShowForm(false); resetFile(); }}>ຍົກເລີກ</button>
            <button type="submit" className="ed-save-btn" disabled={saving}>
              {saving ? "ກຳລັງບັນທຶກ..." : editing ? "ແກ້ໄຂ" : "ບັນທຶກ"}
            </button>
          </div>
        </form>
      )}

      {loading ? <div className="ed-empty-tab">Loading...</div> : permits.length === 0 ? (
        <div className="ed-empty-tab">ຍັງບໍ່ມີ Permit</div>
      ) : (
        <table className="ed-info-table" style={{marginTop:16}}>
          <thead>
            <tr>
              <th className="ed-th">ຮູບ</th>
              <th className="ed-th">ປະເພດ</th>
              <th className="ed-th">ເລກ Permit</th>
              <th className="ed-th">ວັນທີອອກ</th>
              <th className="ed-th">ວັນໝົດອາຍຸ</th>
              <th className="ed-th">ສະຖານະ</th>
              <th className="ed-th">ໝາຍເຫດ</th>
              <th className="ed-th"></th>
            </tr>
          </thead>
          <tbody>
            {permits.map(p => {
              const ss = statusStyle[p.status] || statusStyle.Revoked;
              const imgUrl = p.file_path ? getPhotoUrl(p.file_path) : null;
              return (
                <tr key={p.permit_id}>
                  <td className="ed-val" style={{width:64}}>
                    {imgUrl
                      ? <img src={imgUrl} alt="permit" onClick={() => setLightbox(imgUrl)}
                          style={{width:48,height:48,objectFit:"cover",borderRadius:6,border:"1px solid #e5e7eb",cursor:"zoom-in",display:"block"}} />
                      : <div style={{width:48,height:48,borderRadius:6,border:"1px dashed #d1d5db",background:"#f9fafb",display:"flex",alignItems:"center",justifyContent:"center"}}>
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>
                        </div>
                    }
                  </td>
                  <td className="ed-val"><span className="ed-type-chip">{p.permit_type}</span></td>
                  <td className="ed-val ed-bold">{p.permit_number || "–"}</td>
                  <td className="ed-val">{fmt(p.issued_date)}</td>
                  <td className="ed-val"><ExpiryBadge date={p.expires_at} /></td>
                  <td className="ed-val">
                    <span className="ed-status-chip" style={{background:ss.bg, color:ss.c}}>{p.status}</span>
                  </td>
                  <td className="ed-val" style={{fontSize:13,color:"#6b7280"}}>{p.notes || "–"}</td>
                  <td className="ed-val" style={{display:"flex",gap:6}}>
                    <button className="ed-edit-mini-btn" onClick={() => openEdit(p)}>ແກ້</button>
                    <button className="ed-del-btn" onClick={() => del(p.permit_id)}>ລຶບ</button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}

/* ── Timeline Tab ── */
const TL_ICONS = {
  "Status Change":   { icon: "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z", color: "#7c3aed", bg: "#ede9fe" },
  "Position Change": { icon: "M20 7H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2z M12 12v.01", color: "#0369a1", bg: "#e0f2fe" },
  "Note":            { icon: "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z M14 2v6h6 M16 13H8 M16 17H8 M10 9H8", color: "#059669", bg: "#d1fae5" },
};
const DEFAULT_TL = { icon: "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z", color: "#6b7280", bg: "#f3f4f6" };

function fmtDateTime(d) {
  if (!d) return "–";
  return new Date(d).toLocaleString("en-GB", { day:"2-digit", month:"short", year:"numeric", hour:"2-digit", minute:"2-digit" });
}

function TimelineTab({ empId }) {
  const [events,    setEvents]    = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [showForm,  setShowForm]  = useState(false);
  const [form,      setForm]      = useState({ event_type: "Note", old_value: "", new_value: "", note: "" });
  const [saving,    setSaving]    = useState(false);

  const EVENT_TYPES = ["Status Change", "Position Change", "Note", "Other"];

  const load = () => {
    setLoading(true);
    api.get(`/timeline/${empId}`).then(r => setEvents(r.data)).catch(() => {}).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, [empId]);

  const submit = async (e) => {
    e.preventDefault();
    if (!form.note.trim() && !form.new_value.trim()) { toast.error("ກະລຸນາໃສ່ລາຍລະອຽດ"); return; }
    setSaving(true);
    try {
      await api.post(`/timeline/${empId}`, form);
      toast.success("ບັນທຶກສຳເລັດ");
      setShowForm(false);
      setForm({ event_type: "Note", old_value: "", new_value: "", note: "" });
      load();
    } catch { toast.error("ບໍ່ສາມາດບັນທຶກໄດ້"); }
    setSaving(false);
  };

  return (
    <div>
      <div className="ed-tab-topbar">
        <h2 className="ed-section-title" style={{margin:0}}>ປະຫວັດການປ່ຽນແປງ</h2>
        <button className="ed-add-btn" onClick={() => setShowForm(v => !v)}>
          {showForm ? "ຍົກເລີກ" : "+ ບັນທຶກເຫດການ"}
        </button>
      </div>

      {showForm && (
        <form className="ed-doc-form" onSubmit={submit}>
          <div className="ed-form-row">
            <div className="ed-form-group">
              <label className="ed-form-label">ປະເພດເຫດການ</label>
              <select className="ed-form-input" value={form.event_type}
                onChange={e => setForm(f => ({...f, event_type: e.target.value}))}>
                {EVENT_TYPES.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div className="ed-form-group">
              <label className="ed-form-label">ຄ່າເກົ່າ</label>
              <input className="ed-form-input" value={form.old_value}
                onChange={e => setForm(f => ({...f, old_value: e.target.value}))}
                placeholder="ຄ່າກ່ອນປ່ຽນ..." />
            </div>
            <div className="ed-form-group">
              <label className="ed-form-label">ຄ່າໃໝ່</label>
              <input className="ed-form-input" value={form.new_value}
                onChange={e => setForm(f => ({...f, new_value: e.target.value}))}
                placeholder="ຄ່າຫລັງປ່ຽນ..." />
            </div>
          </div>
          <div className="ed-form-row">
            <div className="ed-form-group" style={{flex:3}}>
              <label className="ed-form-label">ໝາຍເຫດ</label>
              <input className="ed-form-input" value={form.note}
                onChange={e => setForm(f => ({...f, note: e.target.value}))}
                placeholder="ລາຍລະອຽດເພີ້ມເຕີມ..." />
            </div>
          </div>
          <div style={{display:"flex", gap:8, justifyContent:"flex-end"}}>
            <button type="button" className="ed-cancel-btn" onClick={() => setShowForm(false)}>ຍົກເລີກ</button>
            <button type="submit" className="ed-save-btn" disabled={saving}>
              {saving ? "ກຳລັງບັນທຶກ..." : "ບັນທຶກ"}
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="ed-empty-tab">Loading...</div>
      ) : events.length === 0 ? (
        <div className="ed-empty-tab">ຍັງບໍ່ມີປະຫວັດ</div>
      ) : (
        <div className="ed-timeline">
          {events.map((ev, i) => {
            const tl = TL_ICONS[ev.event_type] || DEFAULT_TL;
            return (
              <div key={ev.tl_id} className="ed-tl-item">
                <div className="ed-tl-line-wrap">
                  <div className="ed-tl-dot" style={{background: tl.bg, border: `2px solid ${tl.color}`}}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={tl.color} strokeWidth="2" strokeLinecap="round">
                      <path d={tl.icon}/>
                    </svg>
                  </div>
                  {i < events.length - 1 && <div className="ed-tl-connector"/>}
                </div>
                <div className="ed-tl-body">
                  <div className="ed-tl-header">
                    <span className="ed-tl-type" style={{color: tl.color}}>{ev.event_type}</span>
                    <span className="ed-tl-time">{fmtDateTime(ev.changed_at)}</span>
                    {ev.changed_by_name && <span className="ed-tl-by">ໂດຍ: {ev.changed_by_name}</span>}
                  </div>
                  {(ev.old_value || ev.new_value) && (
                    <div className="ed-tl-change">
                      {ev.old_value && <span className="ed-tl-old">{ev.old_value}</span>}
                      {ev.old_value && ev.new_value && <span className="ed-tl-arrow">→</span>}
                      {ev.new_value && <span className="ed-tl-new">{ev.new_value}</span>}
                    </div>
                  )}
                  {ev.note && <div className="ed-tl-note">{ev.note}</div>}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function EmployeeDetail() {
  const navigate = useNavigate();
  const { id }   = useParams();
  const [emp, setEmp] = useState(null);
  const [tab, setTab] = useState("Basic Info");

  useEffect(() => {
    api.get(`/employees/${id}`)
      .then(r => setEmp(r.data))
      .catch(() => navigate("/employees"));
  }, [id]);

  if (!emp) return <div style={{ padding: 40 }}>Loading...</div>;

  const fullName = `${emp.firstname} ${emp.lastname}`;
  const sc = STATUS_STYLE[emp.status] || STATUS_STYLE["Inactive"];

  return (
    <div className="ed-page">

      {/* Breadcrumb */}
      <div className="ed-breadcrumb">
        <span className="ed-bc-link" onClick={() => navigate("/employees")}>Employees</span>
        <span className="ed-bc-sep">›</span>
        <span className="ed-bc-link">Employee Detail</span>
        <span className="ed-bc-sep">›</span>
        <span className="ed-bc-cur">{fullName}</span>
      </div>

      {/* Header */}
      <div className="ed-header">
        <div>
          <h1 className="ed-title">
            Employee Detail <span className="ed-title-arrow">›</span>{" "}
            <span className="ed-title-name">{fullName}</span>
          </h1>
          <p className="ed-sub">Manage and organize all employees.</p>
        </div>
        <div className="ed-header-btns">
          <button className="ed-back-btn" onClick={() => navigate("/employees")}>‹ Back</button>
          <button className="ed-edit-btn" onClick={() => navigate(`/employees/edit/${id}`)}>
            <IconEdit /> Edit
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="ed-tabs">
        {TABS.map(t => (
          <button
            key={t}
            className={`ed-tab ${tab === t ? "ed-tab-active" : ""}`}
            onClick={() => t === "Employee Cards" ? navigate(`/employees/${id}/card`) : setTab(t)}
          >
            {t}
          </button>
        ))}
      </div>

      {/* ══════════ BASIC INFO ══════════ */}
      {tab === "Basic Info" && (
        <div className="ed-card">
          <h2 className="ed-section-title">Basic Information</h2>
          <table className="ed-info-table">
            <tbody>
              <tr>
                <td className="ed-lbl">Employee Code</td>
                <td className="ed-val ed-bold">{emp.employee_code || "–"}</td>
                <td className="ed-lbl">Status</td>
                <td className="ed-val">
                  <span className="ed-status-chip" style={{ background: sc.bg, color: sc.color }}>
                    {emp.status || "–"}
                  </span>
                </td>
              </tr>
              <tr>
                <td className="ed-lbl">First Name</td>
                <td className="ed-val ed-bold">{emp.firstname}</td>
                <td className="ed-lbl">Last Name</td>
                <td className="ed-val ed-bold">{emp.lastname}</td>
              </tr>
              <tr>
                <td className="ed-lbl">Gender</td>
                <td className="ed-val">{emp.gender || "–"}</td>
                <td className="ed-lbl">Date of Birth</td>
                <td className="ed-val">{fmt(emp.date_of_birth)}</td>
              </tr>
              <tr>
                <td className="ed-lbl">Nationality</td>
                <td className="ed-val">{emp.nationality || "–"}</td>
                <td className="ed-lbl">Employee Type</td>
                <td className="ed-val">
                  {emp.employee_type
                    ? <span className="ed-type-chip">{emp.employee_type}</span>
                    : "–"}
                </td>
              </tr>
              <tr>
                <td className="ed-lbl">Position</td>
                <td className="ed-val ed-bold">{emp.position || "–"}</td>
                <td className="ed-lbl">Company</td>
                <td className="ed-val ed-bold">{emp.companies_name || "–"}</td>
              </tr>
              <tr>
                <td className="ed-lbl">Email</td>
                <td className="ed-val">
                  {emp.email
                    ? <a href={`mailto:${emp.email}`} className="ed-link">{emp.email}</a>
                    : "–"}
                </td>
                <td className="ed-lbl">Phone</td>
                <td className="ed-val">{emp.contact_no || "–"}</td>
              </tr>
              <tr>
                <td className="ed-lbl">Hire Date</td>
                <td className="ed-val">{fmt(emp.hired_at)}</td>
                <td className="ed-lbl">Resigned Date</td>
                <td className="ed-val">{emp.resigned_at ? fmt(emp.resigned_at) : "–"}</td>
              </tr>
              {emp.resigned_reason && (
                <tr>
                  <td className="ed-lbl">Resigned Reason</td>
                  <td className="ed-val" colSpan="3">{emp.resigned_reason}</td>
                </tr>
              )}
              <tr>
                <td className="ed-lbl">Created At</td>
                <td className="ed-val">{fmt(emp.created_at)}</td>
                <td className="ed-lbl">Updated At</td>
                <td className="ed-val">{fmt(emp.updated_at)}</td>
              </tr>
              {emp.notes && (
                <tr>
                  <td className="ed-lbl">Notes</td>
                  <td className="ed-val ed-notes" colSpan="3">{emp.notes}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* ══════════ PROFILE ══════════ */}
      {tab === "Profile" && (
        <div className="ed-card">
          <div className="ed-profile-wrap">

            {/* Left — avatar card */}
            <div className="ed-profile-card">
              <div className="ed-profile-avatar">
                {emp.photo
                  ? <img src={getPhotoUrl(emp.photo)} alt="profile" />
                  : <svg viewBox="0 0 24 24" fill="none" stroke="#adb5bd" strokeWidth="1.2">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                      <circle cx="12" cy="7" r="4"/>
                    </svg>
                }
              </div>
              <div className="ed-profile-name">{emp.firstname} {emp.lastname}</div>
              <div className="ed-profile-pos">{emp.position || "–"}</div>
              <div className="ed-profile-meta">
                <span>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="2" y="5" width="20" height="14" rx="2"/><path d="M16 3v4M8 3v4M2 9h20"/>
                  </svg>
                  {emp.employee_code || "–"}
                </span>
                <span>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>
                  </svg>
                  {emp.companies_name || "–"}
                </span>
                <span>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2A19.79 19.79 0 0 1 11.82 18.1 19.45 19.45 0 0 1 6 12.28 19.79 19.79 0 0 1 3.12 3.18 2 2 0 0 1 5.11 1h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L9.91 8.09a16 16 0 0 0 6 6l.46-.46a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 23 16"/>
                  </svg>
                  {emp.contact_no || "–"}
                </span>
                {emp.email && (
                  <span>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                      <polyline points="22,6 12,13 2,6"/>
                    </svg>
                    {emp.email}
                  </span>
                )}
              </div>
              <span className="ed-badge ed-status-chip" style={{ background: sc.bg, color: sc.color }}>
                {emp.status}
              </span>
            </div>

            {/* Right — profile info table */}
            <div className="ed-profile-table-wrap">
              <table className="ed-info-table">
                <thead>
                  <tr>
                    <th className="ed-th">Field</th>
                    <th className="ed-th">Value</th>
                  </tr>
                </thead>
                <tbody>
                  {/* Address */}
                  <tr className="ed-section-row">
                    <td colSpan="2" className="ed-group-label">📍 ທີ່ຢູ່</td>
                  </tr>
                  {[
                    ["ແຂວງ (Province)", emp.province],
                    ["ເມືອງ (District)", emp.district],
                    ["ບ້ານ (Village)",   emp.village],
                  ].map(([label, value]) => (
                    <tr key={label}>
                      <td className="ed-lbl">{label}</td>
                      <td className="ed-val">{value || "–"}</td>
                    </tr>
                  ))}

                  {/* Employment */}
                  <tr className="ed-section-row">
                    <td colSpan="2" className="ed-group-label">💼 ການຈ້າງງານ</td>
                  </tr>
                  {[
                    ["ວັນທີເຂົ້າວຽກ",   fmt(emp.hired_at)],
                    ["ປະເພດພະນັກງານ",   emp.employee_type],
                    ["ຕຳແໜ່ງ",          emp.position],
                    ["ສະຖານະ",          emp.status],
                  ].map(([label, value]) => (
                    <tr key={label}>
                      <td className="ed-lbl">{label}</td>
                      <td className="ed-val">{value || "–"}</td>
                    </tr>
                  ))}

                  {/* Office Location */}
                  <tr className="ed-section-row">
                    <td colSpan="2" className="ed-group-label">🏢 ທີ່ຕັ້ງ Office (ບ່ອນເຮັດວຽກ)</td>
                  </tr>
                  <tr>
                    <td className="ed-lbl">ຕືກ Office</td>
                    <td className="ed-val">
                      {emp.office_building
                        ? <span className="ed-room-tag ed-tag-office">{emp.office_building}</span>
                        : "–"}
                    </td>
                  </tr>
                  <tr>
                    <td className="ed-lbl">ຊັ້ນ Office</td>
                    <td className="ed-val">
                      {emp.office_floor
                        ? <span className="ed-room-tag ed-tag-floor">{emp.office_floor}</span>
                        : "–"}
                    </td>
                  </tr>
                  <tr>
                    <td className="ed-lbl">ຫ້ອງ Office</td>
                    <td className="ed-val">
                      {emp.office_room_no
                        ? <span className="ed-room-tag ed-tag-room">ຫ້ອງ {emp.office_room_no}</span>
                        : "–"}
                    </td>
                  </tr>

                  {/* Dormitory */}
                  {(emp.linked_building || emp.dormitory) && (
                    <>
                      <tr className="ed-section-row">
                        <td colSpan="2" className="ed-group-label">🛏️ ທີ່ພັກ (Dormitory)</td>
                      </tr>
                      <tr>
                        <td className="ed-lbl">ຕືກທີ່ພັກ</td>
                        <td className="ed-val">
                          {emp.linked_building
                            ? <span className="ed-room-tag ed-tag-bld">{emp.linked_building}</span>
                            : emp.dormitory
                              ? <span className="ed-room-tag ed-tag-bld">{emp.dormitory}</span>
                              : "–"}
                        </td>
                      </tr>
                      <tr>
                        <td className="ed-lbl">ຊັ້ນ</td>
                        <td className="ed-val">
                          {emp.linked_floor
                            ? <span className="ed-room-tag ed-tag-floor">ຊັ້ນ {emp.linked_floor}</span>
                            : "–"}
                        </td>
                      </tr>
                      <tr>
                        <td className="ed-lbl">ຫ້ອງ</td>
                        <td className="ed-val">
                          {emp.linked_room_number
                            ? <span className="ed-room-tag ed-tag-room">ຫ້ອງ {emp.linked_room_number}</span>
                            : emp.room_no || "–"}
                        </td>
                      </tr>
                    </>
                  )}

                  {/* Notes */}
                  {emp.notes && (
                    <>
                      <tr className="ed-section-row">
                        <td colSpan="2" className="ed-group-label">📝 ໝາຍເຫດ</td>
                      </tr>
                      <tr>
                        <td colSpan="2" className="ed-val ed-notes">{emp.notes}</td>
                      </tr>
                    </>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ══════════ DOCUMENTS ══════════ */}
      {tab === "Documents" && (
        <div className="ed-card">
          <DocumentsTab empId={id} />
        </div>
      )}

      {/* ══════════ PERMITS ══════════ */}
      {tab === "Permits" && (
        <div className="ed-card">
          <PermitsTab empId={id} />
        </div>
      )}

      {/* ══════════ TIMELINE ══════════ */}
      {tab === "Timeline" && (
        <div className="ed-card">
          <TimelineTab empId={id} />
        </div>
      )}

    </div>
  );
}
