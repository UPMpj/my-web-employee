import { useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import { api } from "../../../api";
import { photoUrl as getPhotoUrl } from "../../../api";
import { DOC_TYPES, ExpiryBadge, isImage } from "./employeeDetailUtils";
import { useLanguage } from "../../../context/LanguageContext";

export default function DocumentsTab({ empId }) {
  const { t } = useLanguage();
  const [docs, setDocs]         = useState([]);
  const [loading, setLoading]   = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm]         = useState({ doc_type: "Passport", doc_name: "", expires_at: "", notes: "" });
  const [file, setFile]         = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [lightbox, setLightbox] = useState(null);
  const [saving, setSaving]     = useState(false);
  const fileRef = useRef();

  const load = () => {
    setLoading(true);
    api.get(`/documents/${empId}`).then(r => setDocs(r.data)).catch(() => {}).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, [empId]);

  const resetFile = () => { setFile(null); setPreviewUrl(null); if (fileRef.current) fileRef.current.value = ""; };

  const handleFileChange = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    setFile(f);
    if (f.type.startsWith("image/")) setPreviewUrl(URL.createObjectURL(f));
    else setPreviewUrl(null);
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!form.doc_name.trim()) { toast.error(t("err_doc_name")); return; }
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append("doc_type", form.doc_type); fd.append("doc_name", form.doc_name);
      fd.append("expires_at", form.expires_at); fd.append("notes", form.notes);
      if (file) fd.append("file", file);
      await api.post(`/documents/${empId}`, fd, { headers: { "Content-Type": "multipart/form-data" } });
      toast.success(t("doc_saved"));
      setShowForm(false);
      setForm({ doc_type: "Passport", doc_name: "", expires_at: "", notes: "" });
      resetFile(); load();
    } catch { toast.error(t("doc_save_fail")); }
    setSaving(false);
  };

  const del = async (docId) => {
    if (!window.confirm(t("doc_del_confirm"))) return;
    try { await api.delete(`/documents/doc/${docId}`); toast.success(t("doc_deleted")); load(); }
    catch { toast.error(t("doc_del_fail")); }
  };

  return (
    <div>
      {lightbox && (
        <div onClick={() => setLightbox(null)} style={{position:"fixed",inset:0,background:"rgba(0,0,0,.75)",zIndex:9999,display:"flex",alignItems:"center",justifyContent:"center",cursor:"zoom-out"}}>
          <img src={lightbox} alt="doc" style={{maxWidth:"90vw",maxHeight:"90vh",borderRadius:8,boxShadow:"0 8px 40px rgba(0,0,0,.5)"}} onClick={e => e.stopPropagation()} />
        </div>
      )}

      <div className="ed-tab-topbar">
        <h2 className="ed-section-title" style={{margin:0}}>{t("doc_title")}</h2>
        <button className="ed-add-btn" onClick={() => { setShowForm(v => !v); resetFile(); }}>
          {showForm ? t("cancel") : t("doc_add_btn")}
        </button>
      </div>

      {showForm && (
        <form className="ed-doc-form" onSubmit={submit}>
          <div className="ed-form-row">
            <div className="ed-form-group">
              <label className="ed-form-label">{t("doc_type_lbl")}</label>
              <select className="ed-form-input" value={form.doc_type} onChange={e => setForm(f => ({...f, doc_type: e.target.value}))}>
                {DOC_TYPES.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div className="ed-form-group" style={{flex:2}}>
              <label className="ed-form-label">{t("doc_name_lbl")}</label>
              <input className="ed-form-input" value={form.doc_name} onChange={e => setForm(f => ({...f, doc_name: e.target.value}))} placeholder={t("doc_ph_name")} />
            </div>
            <div className="ed-form-group">
              <label className="ed-form-label">{t("doc_expiry_lbl")}</label>
              <input type="date" className="ed-form-input" value={form.expires_at} onChange={e => setForm(f => ({...f, expires_at: e.target.value}))} />
            </div>
          </div>
          <div className="ed-form-row">
            <div className="ed-form-group" style={{flex:2}}>
              <label className="ed-form-label">{t("notes")}</label>
              <input className="ed-form-input" value={form.notes} onChange={e => setForm(f => ({...f, notes: e.target.value}))} placeholder={t("doc_ph_notes")} />
            </div>
            <div className="ed-form-group">
              <label className="ed-form-label">{t("doc_file_lbl")}</label>
              <input type="file" ref={fileRef} accept="image/*,application/pdf" onChange={handleFileChange} style={{display:"none"}} />
              <button type="button" className="ed-file-btn" onClick={() => fileRef.current.click()}>{file ? file.name : t("doc_file_btn")}</button>
            </div>
            {previewUrl && (
              <div style={{display:"flex",alignItems:"center",gap:8}}>
                <img src={previewUrl} alt="preview" style={{height:60,borderRadius:6,border:"1px solid #e5e7eb",objectFit:"cover",cursor:"zoom-in"}} onClick={() => setLightbox(previewUrl)} />
                <button type="button" style={{fontSize:11,color:"#ef4444",background:"none",border:"none",cursor:"pointer"}} onClick={resetFile}>{t("doc_del_preview")}</button>
              </div>
            )}
          </div>
          <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
            <button type="button" className="ed-cancel-btn" onClick={() => { setShowForm(false); resetFile(); }}>{t("cancel")}</button>
            <button type="submit" className="ed-save-btn" disabled={saving}>{saving ? t("saving") : t("save")}</button>
          </div>
        </form>
      )}

      {loading ? <div className="ed-empty-tab">{t("loading")}</div> : docs.length === 0 ? (
        <div className="ed-empty-tab">{t("doc_no_data")}</div>
      ) : (
        <table className="ed-info-table" style={{marginTop:16}}>
          <thead>
            <tr>
              <th className="ed-th">{t("doc_photo_col")}</th><th className="ed-th">{t("doc_type_lbl")}</th><th className="ed-th">{t("doc_detail_col")}</th>
              <th className="ed-th">{t("doc_expiry_lbl")}</th><th className="ed-th">{t("notes")}</th><th className="ed-th">{t("doc_uploaded_by")}</th><th className="ed-th"></th>
            </tr>
          </thead>
          <tbody>
            {docs.map(d => {
              const imgUrl  = d.file_path && isImage(d.file_path) ? getPhotoUrl(d.file_path) : null;
              const fileUrl = d.file_path ? getPhotoUrl(d.file_path) : null;
              return (
                <tr key={d.doc_id}>
                  <td className="ed-val" style={{width:64}}>
                    {imgUrl
                      ? <img src={imgUrl} alt="doc" onClick={() => setLightbox(imgUrl)} style={{width:48,height:48,objectFit:"cover",borderRadius:6,border:"1px solid #e5e7eb",cursor:"zoom-in",display:"block"}} />
                      : fileUrl
                        ? <a href={fileUrl} target="_blank" rel="noreferrer" style={{display:"flex",alignItems:"center",justifyContent:"center",width:48,height:48,borderRadius:6,border:"1px solid #e5e7eb",background:"#f9fafb",textDecoration:"none",fontSize:11,color:"#6366f1",fontWeight:600}}>PDF</a>
                        : <div style={{width:48,height:48,borderRadius:6,border:"1px dashed #d1d5db",background:"#f9fafb",display:"flex",alignItems:"center",justifyContent:"center"}}>
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>
                          </div>
                    }
                  </td>
                  <td className="ed-val"><span className="ed-type-chip">{d.doc_type}</span></td>
                  <td className="ed-val ed-bold">{d.doc_name}</td>
                  <td className="ed-val"><ExpiryBadge date={d.expires_at} /></td>
                  <td className="ed-val" style={{fontSize:13,color:"#6b7280"}}>{d.notes || "–"}</td>
                  <td className="ed-val" style={{fontSize:12,color:"#9ca3af"}}>{d.uploaded_by_name || "–"}</td>
                  <td className="ed-val"><button className="ed-del-btn" onClick={() => del(d.doc_id)}>{t("doc_del_btn")}</button></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}
