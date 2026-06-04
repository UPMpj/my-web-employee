import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { api, photoUrl as getPhotoUrl } from "../../../api";
import { PERMIT_TYPES, PERMIT_STATUS, ExpiryBadge, fmt } from "./employeeDetailUtils";

const STATUS_STYLE = { Valid:{bg:"#dcfce7",c:"#065f46"}, Expired:{bg:"#fee2e2",c:"#991b1b"}, Pending:{bg:"#fef3c7",c:"#92400e"}, Revoked:{bg:"#f3f4f6",c:"#374151"} };

export default function PermitsTab({ empId }) {
  const [permits, setPermits]   = useState([]);
  const [loading, setLoading]   = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing]   = useState(null);
  const [form, setForm]         = useState({ permit_type:"Work Permit", permit_number:"", issued_date:"", expires_at:"", status:"Valid", notes:"" });
  const [photoFile, setPhotoFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [lightbox, setLightbox] = useState(null);
  const [saving, setSaving]     = useState(false);

  const load = () => {
    setLoading(true);
    api.get(`/permits/${empId}`).then(r => setPermits(r.data)).catch(() => {}).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, [empId]);

  const resetFile = () => { setPhotoFile(null); setPreviewUrl(null); };

  const openNew = () => {
    setEditing(null);
    setForm({ permit_type:"Work Permit", permit_number:"", issued_date:"", expires_at:"", status:"Valid", notes:"" });
    resetFile(); setShowForm(true);
  };
  const openEdit = (p) => {
    setEditing(p.permit_id);
    setForm({ permit_type:p.permit_type, permit_number:p.permit_number||"",
      issued_date: p.issued_date ? p.issued_date.slice(0,10) : "",
      expires_at:  p.expires_at  ? p.expires_at.slice(0,10)  : "",
      status:p.status, notes:p.notes||"" });
    resetFile(); setShowForm(true);
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
      setShowForm(false); resetFile(); load();
    } catch { toast.error("ບໍ່ສາມາດບັນທຶກໄດ້"); }
    setSaving(false);
  };

  const del = async (id) => {
    if (!window.confirm("ລຶບ Permit ນີ້ແທ້ບໍ?")) return;
    try { await api.delete(`/permits/item/${id}`); toast.success("ລຶບສຳເລັດ"); load(); }
    catch { toast.error("ລຶບບໍ່ໄດ້"); }
  };

  return (
    <div>
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
              <select className="ed-form-input" value={form.permit_type} onChange={e => setForm(f => ({...f, permit_type:e.target.value}))}>
                {PERMIT_TYPES.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div className="ed-form-group" style={{flex:2}}>
              <label className="ed-form-label">ເລກ Permit</label>
              <input className="ed-form-input" value={form.permit_number} onChange={e => setForm(f => ({...f, permit_number:e.target.value}))} placeholder="ເຊັ່ນ: WP-2025-00123" />
            </div>
            <div className="ed-form-group">
              <label className="ed-form-label">ສະຖານະ</label>
              <select className="ed-form-input" value={form.status} onChange={e => setForm(f => ({...f, status:e.target.value}))}>
                {PERMIT_STATUS.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <div className="ed-form-row">
            <div className="ed-form-group">
              <label className="ed-form-label">ວັນທີອອກ</label>
              <input type="date" className="ed-form-input" value={form.issued_date} onChange={e => setForm(f => ({...f, issued_date:e.target.value}))} />
            </div>
            <div className="ed-form-group">
              <label className="ed-form-label">ວັນໝົດອາຍຸ</label>
              <input type="date" className="ed-form-input" value={form.expires_at} onChange={e => setForm(f => ({...f, expires_at:e.target.value}))} />
            </div>
            <div className="ed-form-group" style={{flex:2}}>
              <label className="ed-form-label">ໝາຍເຫດ</label>
              <input className="ed-form-input" value={form.notes} onChange={e => setForm(f => ({...f, notes:e.target.value}))} placeholder="ໝາຍເຫດ..." />
            </div>
          </div>
          <div className="ed-form-row">
            <div className="ed-form-group" style={{flex:1}}>
              <label className="ed-form-label">ຮູບເອກະສານ (Visa / Passport)</label>
              <input type="file" accept="image/*,application/pdf" className="ed-form-input" style={{padding:"6px 10px",cursor:"pointer"}} onChange={e => { const f=e.target.files[0]; if(f){setPhotoFile(f);setPreviewUrl(URL.createObjectURL(f));} }} />
            </div>
            {previewUrl && (
              <div style={{display:"flex",alignItems:"center",gap:8}}>
                <img src={previewUrl} alt="preview" style={{height:60,borderRadius:6,border:"1px solid #e5e7eb",objectFit:"cover",cursor:"pointer"}} onClick={() => setLightbox(previewUrl)} />
                <button type="button" style={{fontSize:11,color:"#ef4444",background:"none",border:"none",cursor:"pointer"}} onClick={resetFile}>✕ ລຶບ</button>
              </div>
            )}
          </div>
          <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
            <button type="button" className="ed-cancel-btn" onClick={() => { setShowForm(false); resetFile(); }}>ຍົກເລີກ</button>
            <button type="submit" className="ed-save-btn" disabled={saving}>{saving ? "ກຳລັງບັນທຶກ..." : editing ? "ແກ້ໄຂ" : "ບັນທຶກ"}</button>
          </div>
        </form>
      )}

      {loading ? <div className="ed-empty-tab">Loading...</div> : permits.length === 0 ? (
        <div className="ed-empty-tab">ຍັງບໍ່ມີ Permit</div>
      ) : (
        <table className="ed-info-table" style={{marginTop:16}}>
          <thead>
            <tr>
              <th className="ed-th">ຮູບ</th><th className="ed-th">ປະເພດ</th><th className="ed-th">ເລກ Permit</th>
              <th className="ed-th">ວັນທີອອກ</th><th className="ed-th">ວັນໝົດອາຍຸ</th>
              <th className="ed-th">ສະຖານະ</th><th className="ed-th">ໝາຍເຫດ</th><th className="ed-th"></th>
            </tr>
          </thead>
          <tbody>
            {permits.map(p => {
              const ss = STATUS_STYLE[p.status] || STATUS_STYLE.Revoked;
              const imgUrl = p.file_path ? getPhotoUrl(p.file_path) : null;
              return (
                <tr key={p.permit_id}>
                  <td className="ed-val" style={{width:64}}>
                    {imgUrl
                      ? <img src={imgUrl} alt="permit" onClick={() => setLightbox(imgUrl)} style={{width:48,height:48,objectFit:"cover",borderRadius:6,border:"1px solid #e5e7eb",cursor:"zoom-in",display:"block"}} />
                      : <div style={{width:48,height:48,borderRadius:6,border:"1px dashed #d1d5db",background:"#f9fafb",display:"flex",alignItems:"center",justifyContent:"center"}}>
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>
                        </div>
                    }
                  </td>
                  <td className="ed-val"><span className="ed-type-chip">{p.permit_type}</span></td>
                  <td className="ed-val ed-bold">{p.permit_number || "–"}</td>
                  <td className="ed-val">{fmt(p.issued_date)}</td>
                  <td className="ed-val"><ExpiryBadge date={p.expires_at} /></td>
                  <td className="ed-val"><span className="ed-status-chip" style={{background:ss.bg,color:ss.c}}>{p.status}</span></td>
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
