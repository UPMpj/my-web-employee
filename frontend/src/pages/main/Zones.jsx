import { useEffect, useState, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { useLanguage } from "../../context/LanguageContext";
import { api } from "../../api";
import toast from "react-hot-toast";
import ConfirmModal from "../../components/ConfirmModal";
import "../../components/ConfirmModal.css";
import SkeletonLoader from "../../components/SkeletonLoader";
import EmptyState from "../../components/EmptyState";
import "./companies.css";
import "./zones.css";

const EMPTY_FORM = { zone_name: "", description: "", color: "#2563eb" };

const ZONE_COLORS = [
  { label: "Blue",   value: "#2563eb" },
  { label: "Green",  value: "#16a34a" },
  { label: "Purple", value: "#7c3aed" },
  { label: "Orange", value: "#ea580c" },
  { label: "Teal",   value: "#0891b2" },
  { label: "Pink",   value: "#db2777" },
];

function IconEdit() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
    </svg>
  );
}
function IconTrash() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="3 6 5 6 21 6"/>
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
      <path d="M10 11v6M14 11v6"/>
      <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
    </svg>
  );
}

export default function Zones() {
  const { t } = useLanguage();
  const [searchParams] = useSearchParams();
  const highlightId = searchParams.get("highlight");

  const [zones, setZones] = useState([]);
  const [loading, setLoading] = useState(true);

  const [showModal, setShowModal] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saveError, setSaveError] = useState("");

  const [confirmId, setConfirmId] = useState(null);
  const [highlightedRow, setHighlightedRow] = useState(null);
  const rowRefs = useRef({});

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get("/zones");
      setZones(res.data);
    } catch {
      setZones([]);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (!highlightId || zones.length === 0) return;
    const el = rowRefs.current[highlightId];
    if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
    setHighlightedRow(highlightId);
    const timer = setTimeout(() => setHighlightedRow(null), 2000);
    return () => clearTimeout(timer);
  }, [highlightId, zones]);

  const openAdd = () => {
    setEditTarget(null);
    setForm(EMPTY_FORM);
    setSaveError("");
    setShowModal(true);
  };

  const openEdit = (z) => {
    setEditTarget(z);
    setForm({ zone_name: z.zone_name, description: z.description || "", color: z.color || "#2563eb" });
    setSaveError("");
    setShowModal(true);
  };

  const save = async () => {
    setSaveError("");
    if (!form.zone_name.trim()) {
      setSaveError(t("zn_name_required"));
      return;
    }
    try {
      if (editTarget) {
        await api.put(`/zones/${editTarget.zone_id}`, form);
        toast.success(t("zn_updated"));
      } else {
        await api.post("/zones", form);
        toast.success(t("zn_created"));
      }
      setShowModal(false);
      load();
    } catch (err) {
      setSaveError(err?.response?.data?.message || t("save_failed"));
    }
  };

  const remove = async (id) => {
    try {
      await api.delete(`/zones/${id}`);
      toast.success(t("zn_deleted"));
      load();
    } catch (err) {
      toast.error(err?.response?.data?.message || t("save_failed"));
    } finally {
      setConfirmId(null);
    }
  };

  return (
    <div className="com-page">

      <div className="com-header">
        <div>
          <h1>{t("zn_title")}</h1>
          <p className="com-subtitle">{t("zn_subtitle")}</p>
        </div>
      </div>

      <div className="com-actions">
        <div style={{ flex: 1 }} />
        <div className="com-action-right">
          <button className="btn-add" onClick={openAdd}>+ {t("zn_add_zone")}</button>
        </div>
      </div>

      {loading ? (
        <SkeletonLoader variant="table" rows={5} cols={4} />
      ) : (
        <div className="com-table-wrap">
          <table className="com-table">
            <thead>
              <tr>
                <th>{t("zn_zone_name")}</th>
                <th>{t("bld_description")}</th>
                <th>{t("zn_buildings_count")}</th>
                <th>{t("actions")}</th>
              </tr>
            </thead>
            <tbody>
              {zones.length === 0 ? (
                <tr><td colSpan="4" style={{ padding: 0, border: "none" }}><EmptyState type="data" title={t("zn_no_results")} message={t("zn_no_results")} /></td></tr>
              ) : zones.map(z => (
                <tr
                  key={z.zone_id}
                  ref={el => { rowRefs.current[z.zone_id] = el; }}
                  className={String(highlightedRow) === String(z.zone_id) ? "zn-row-highlight" : ""}
                >
                  <td className="company-name-cell">
                    <span className="zn-color-dot" style={{ background: z.color || "#2563eb" }} />
                    {z.zone_name}
                  </td>
                  <td className="contact-cell">{z.description || "-"}</td>
                  <td>{z.building_count || 0}</td>
                  <td>
                    <div className="action-btns">
                      <button className="btn-icon btn-edit" title={t("edit")} onClick={() => openEdit(z)}><IconEdit /></button>
                      <button className="btn-icon btn-delete" title={t("delete")} onClick={() => setConfirmId(z.zone_id)}><IconTrash /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="com-modal" onClick={e => e.stopPropagation()}>
            <div className="cm-header">
              <h2 className="cm-title">{editTarget ? t("edit") : t("zn_add_zone")}</h2>
              <button className="cm-close" onClick={() => setShowModal(false)}>&#x2715;</button>
            </div>
            <p className="cm-subtitle">{t("zn_modal_subtitle")}</p>

            <div className="cm-body">
              <div className="cm-field">
                <label className="cm-label">{t("zn_zone_name")} <span className="cm-req">*</span></label>
                <input
                  className="cm-input"
                  value={form.zone_name}
                  onChange={e => setForm({ ...form, zone_name: e.target.value })}
                />
              </div>

              <div className="cm-field">
                <label className="cm-label">{t("bld_description")}</label>
                <textarea
                  className="cm-input"
                  rows={3}
                  value={form.description}
                  onChange={e => setForm({ ...form, description: e.target.value })}
                />
              </div>

              <div className="cm-field">
                <label className="cm-label">{t("zn_color")}</label>
                <div className="cm-color-wrap">
                  {ZONE_COLORS.map(c => (
                    <button
                      key={c.value}
                      type="button"
                      title={c.label}
                      className={`cm-color-swatch ${form.color === c.value ? "cm-color-sel" : ""}`}
                      style={{ background: c.value }}
                      onClick={() => setForm({ ...form, color: c.value })}
                    >
                      {form.color === c.value && (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3">
                          <polyline points="20 6 9 17 4 12"/>
                        </svg>
                      )}
                    </button>
                  ))}
                  <input
                    type="color"
                    className="cm-color-picker"
                    value={form.color}
                    onChange={e => setForm({ ...form, color: e.target.value })}
                  />
                </div>
                <div className="cm-color-preview">
                  <div className="cm-color-dot" style={{ background: form.color }} />
                  <span className="cm-color-hex">{form.color}</span>
                </div>
              </div>
            </div>

            <div className="cm-footer">
              {saveError && <span className="save-error">{saveError}</span>}
              <button className="cm-btn-cancel" onClick={() => setShowModal(false)}>{t("cancel")}</button>
              <button className="cm-btn-create" onClick={save}>{editTarget ? t("save") : t("zn_add_zone")}</button>
            </div>
          </div>
        </div>
      )}

      {confirmId && (
        <ConfirmModal
          message={t("zn_delete_confirm")}
          confirmLabel={t("delete")}
          onConfirm={() => remove(confirmId)}
          onCancel={() => setConfirmId(null)}
        />
      )}
    </div>
  );
}
