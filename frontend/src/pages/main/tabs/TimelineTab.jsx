import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { api } from "../../../api";
import { fmtDateTime } from "./employeeDetailUtils";
import { useLanguage } from "../../../context/LanguageContext";

const EVENT_TYPES = ["Status Change", "Position Change", "Note", "Other"];
const TL_ICONS = {
  "Status Change":   { icon: "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z", color: "#7c3aed", bg: "#ede9fe" },
  "Position Change": { icon: "M20 7H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0-2-2z M12 12v.01", color: "#0369a1", bg: "#e0f2fe" },
  "Note":            { icon: "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z M14 2v6h6 M16 13H8 M16 17H8 M10 9H8", color: "#059669", bg: "#d1fae5" },
};
const DEFAULT_TL = { icon: "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z", color: "#6b7280", bg: "#f3f4f6" };

export default function TimelineTab({ empId }) {
  const { t } = useLanguage();
  const [events, setEvents]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm]       = useState({ event_type:"Note", old_value:"", new_value:"", note:"" });
  const [saving, setSaving]   = useState(false);

  const load = () => {
    setLoading(true);
    api.get(`/timeline/${empId}`).then(r => setEvents(r.data)).catch(() => {}).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, [empId]);

  const submit = async (e) => {
    e.preventDefault();
    if (!form.note.trim() && !form.new_value.trim()) { toast.error(t("err_tl_details")); return; }
    setSaving(true);
    try {
      await api.post(`/timeline/${empId}`, form);
      toast.success(t("tl_saved"));
      setShowForm(false);
      setForm({ event_type:"Note", old_value:"", new_value:"", note:"" });
      load();
    } catch { toast.error(t("tl_save_fail")); }
    setSaving(false);
  };

  return (
    <div>
      <div className="ed-tab-topbar">
        <h2 className="ed-section-title" style={{margin:0}}>{t("tl_title")}</h2>
        <button className="ed-add-btn" onClick={() => setShowForm(v => !v)}>
          {showForm ? t("cancel") : t("tl_add_btn")}
        </button>
      </div>

      {showForm && (
        <form className="ed-doc-form" onSubmit={submit}>
          <div className="ed-form-row">
            <div className="ed-form-group">
              <label className="ed-form-label">{t("tl_event_type")}</label>
              <select className="ed-form-input" value={form.event_type} onChange={e => setForm(f => ({...f, event_type:e.target.value}))}>
                {EVENT_TYPES.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div className="ed-form-group">
              <label className="ed-form-label">{t("tl_old_value")}</label>
              <input className="ed-form-input" value={form.old_value} onChange={e => setForm(f => ({...f, old_value:e.target.value}))} placeholder={t("tl_old_ph")} />
            </div>
            <div className="ed-form-group">
              <label className="ed-form-label">{t("tl_new_value")}</label>
              <input className="ed-form-input" value={form.new_value} onChange={e => setForm(f => ({...f, new_value:e.target.value}))} placeholder={t("tl_new_ph")} />
            </div>
          </div>
          <div className="ed-form-row">
            <div className="ed-form-group" style={{flex:3}}>
              <label className="ed-form-label">{t("notes")}</label>
              <input className="ed-form-input" value={form.note} onChange={e => setForm(f => ({...f, note:e.target.value}))} placeholder={t("tl_notes_ph")} />
            </div>
          </div>
          <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
            <button type="button" className="ed-cancel-btn" onClick={() => setShowForm(false)}>{t("cancel")}</button>
            <button type="submit" className="ed-save-btn" disabled={saving}>{saving ? t("saving") : t("save")}</button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="ed-empty-tab">{t("loading")}</div>
      ) : events.length === 0 ? (
        <div className="ed-empty-tab">{t("tl_no_data")}</div>
      ) : (
        <div className="ed-timeline">
          {events.map((ev, i) => {
            const tl = TL_ICONS[ev.event_type] || DEFAULT_TL;
            return (
              <div key={ev.tl_id} className="ed-tl-item">
                <div className="ed-tl-line-wrap">
                  <div className="ed-tl-dot" style={{background:tl.bg, border:`2px solid ${tl.color}`}}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={tl.color} strokeWidth="2" strokeLinecap="round">
                      <path d={tl.icon}/>
                    </svg>
                  </div>
                  {i < events.length - 1 && <div className="ed-tl-connector"/>}
                </div>
                <div className="ed-tl-body">
                  <div className="ed-tl-header">
                    <span className="ed-tl-type" style={{color:tl.color}}>{ev.event_type}</span>
                    <span className="ed-tl-time">{fmtDateTime(ev.changed_at)}</span>
                    {ev.changed_by_name && <span className="ed-tl-by">{t("tl_by")} {ev.changed_by_name}</span>}
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
