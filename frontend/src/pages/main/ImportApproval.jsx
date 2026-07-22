import { useEffect, useState } from "react";
import { api } from "../../api";
import toast from "react-hot-toast";
import { useLanguage } from "../../context/LanguageContext";
import SkeletonLoader from "../../components/SkeletonLoader";
import "./import.css";

const STATUS_COLORS = {
  pending:  { bg: "#fef3c7", color: "#92400e" },
  approved: { bg: "#dcfce7", color: "#065f46" },
  rejected: { bg: "#fee2e2", color: "#991b1b" },
};

function fmt(d) {
  if (!d) return "–";
  return new Date(d).toLocaleString("en-GB", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

export default function ImportApproval() {
  const { t } = useLanguage();
  const STATUS_STYLE = {
    pending:  { ...STATUS_COLORS.pending,  label: t("ia_status_pending") },
    approved: { ...STATUS_COLORS.approved, label: t("ia_status_approved") },
    rejected: { ...STATUS_COLORS.rejected, label: t("ia_status_rejected") },
  };
  const [batches,    setBatches]    = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [selected,   setSelected]   = useState(null);
  const [detail,     setDetail]     = useState(null);
  const [detailLoad, setDetailLoad] = useState(false);
  const [rejectBox,  setRejectBox]  = useState(false);
  const [reason,     setReason]     = useState("");
  const [acting,     setActing]     = useState(false);
  const [filter,     setFilter]     = useState("pending");

  const load = () => {
    setLoading(true);
    api.get("/import/batches").then(r => setBatches(r.data)).catch(() => {}).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const openDetail = async (b) => {
    setSelected(b);
    setDetail(null);
    setRejectBox(false);
    setReason("");
    setDetailLoad(true);
    try {
      const r = await api.get(`/import/batches/${b.batch_id}`);
      setDetail(r.data);
    } catch { toast.error(t("ia_load_fail")); }
    setDetailLoad(false);
  };

  const approve = async () => {
    if (!window.confirm(t("ia_approve_confirm").replace("{n}", detail?.valid_rows))) return;
    setActing(true);
    try {
      const r = await api.post(`/import/batches/${selected.batch_id}/approve`);
      toast.success(t("ia_approve_ok").replace("{n}", r.data.inserted));
      setSelected(null);
      load();
    } catch (err) {
      toast.error(err?.response?.data?.message || t("ia_approve_fail"));
    }
    setActing(false);
  };

  const reject = async () => {
    setActing(true);
    try {
      await api.post(`/import/batches/${selected.batch_id}/reject`, { reason });
      toast.success(t("ia_reject_ok"));
      setSelected(null);
      setRejectBox(false);
      load();
    } catch (err) {
      toast.error(err?.response?.data?.message || t("ia_reject_fail"));
    }
    setActing(false);
  };

  const displayed = filter === "all" ? batches : batches.filter(b => b.status === filter);

  return (
    <div className="imp-page">
      <div className="imp-header">
        <h1 className="imp-title">{t("ia_title")}</h1>
        <p className="imp-sub">{t("ia_sub")}</p>
      </div>

      <div className="imp-split">
        {/* Left — batch list */}
        <div className="imp-split-list">
          {/* Filter tabs */}
          <div className="imp-ia-filter-bar">
            {[["pending", t("ia_status_pending")],["approved", t("ia_status_approved")],["rejected", t("ia_status_rejected")],["all", t("ia_all")]].map(([v, lbl]) => (
              <button key={v} onClick={() => setFilter(v)}
                className={filter === v ? "imp-ia-filter-btn imp-ia-filter-btn-active" : "imp-ia-filter-btn"}>
                {lbl}
                {v === "pending" && batches.filter(b => b.status === "pending").length > 0 &&
                  <span className="imp-ia-badge">{batches.filter(b => b.status === "pending").length}</span>}
              </button>
            ))}
          </div>

          {loading ? (
            <SkeletonLoader variant="rows" rows={6} />
          ) : displayed.length === 0 ? (
            <div className="imp-ia-empty">{t("ia_no_batch")}</div>
          ) : (
            <div className="imp-ia-list">
              {displayed.map(b => {
                const ss = STATUS_STYLE[b.status] || STATUS_STYLE.pending;
                const active = selected?.batch_id === b.batch_id;
                return (
                  <div key={b.batch_id} onClick={() => openDetail(b)}
                    className={active ? "imp-ia-batch imp-ia-batch-active" : "imp-ia-batch"}>
                    <div className="imp-ia-batch-hd">
                      <div className="imp-ia-batch-title">#{b.batch_id} — {b.companies_name || "–"}</div>
                      <span style={{ background: ss.bg, color: ss.color, borderRadius: 20, padding: "2px 10px", fontSize: 11, fontWeight: 700 }}>{ss.label}</span>
                    </div>
                    <div className="imp-ia-batch-meta">{t("ia_submitted_by")}: {b.submitted_by_name || "–"}</div>
                    <div className="imp-ia-batch-meta">{fmt(b.submitted_at)}</div>
                    <div className="imp-ia-batch-foot">
                      <span style={{ fontSize: 12, fontWeight: 600, color: "#059669" }}>✓ {b.valid_rows}</span>
                      <span style={{ fontSize: 12, color: "#9ca3af" }}>/ {b.total_rows}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right — detail panel */}
        {selected ? (
          <div className="imp-split-detail imp-ia-panel">
            {detailLoad ? (
              <SkeletonLoader variant="detail" />
            ) : detail ? (
              <>
                <div className="imp-ia-detail-hd">
                  <div>
                    <div className="imp-ia-detail-title">
                      Batch #{detail.batch_id} — {detail.companies_name}
                    </div>
                    <div className="imp-ia-detail-meta">
                      {t("ia_submitted_by")} <strong>{detail.submitted_by_name}</strong> · {fmt(detail.submitted_at)}
                    </div>
                  </div>
                  <span style={{ background: STATUS_STYLE[detail.status]?.bg, color: STATUS_STYLE[detail.status]?.color,
                    borderRadius: 20, padding: "4px 14px", fontSize: 13, fontWeight: 700 }}>
                    {STATUS_STYLE[detail.status]?.label}
                  </span>
                </div>

                {/* Stats */}
                <div className="imp-ia-stats">
                  <div className="imp-ia-stat imp-ia-stat-ok">
                    <div className="imp-ia-stat-val-ok">{detail.valid_rows}</div>
                    <div className="imp-ia-stat-lbl">{t("ia_valid")}</div>
                  </div>
                  <div className="imp-ia-stat imp-ia-stat-err">
                    <div className="imp-ia-stat-val-err">{detail.total_rows - detail.valid_rows}</div>
                    <div className="imp-ia-stat-lbl">{t("ia_invalid_skip")}</div>
                  </div>
                  <div className="imp-ia-stat imp-ia-stat-blue">
                    <div className="imp-ia-stat-val-blue">{detail.total_rows}</div>
                    <div className="imp-ia-stat-lbl">{t("ia_total")}</div>
                  </div>
                </div>

                {detail.status === "rejected" && detail.reject_reason && (
                  <div className="imp-ia-reject-banner">
                    <strong>{t("ia_reject_reason_lbl")}:</strong> {detail.reject_reason}
                  </div>
                )}

                {/* Preview table */}
                <div className="imp-ia-preview-lbl">{t("ia_preview_rows")}</div>
                <div className="imp-ia-tbl-wrap">
                  <table className="imp-ia-tbl">
                    <thead>
                      <tr className="imp-ia-thead-tr">
                        {["#", t("status"), t("first_name"), t("last_name"), t("position"), t("pf_emp_type"), t("hire_date"), t("status")].map(h => (
                          <th key={h} className="imp-ia-th">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {(detail.rows_json || []).slice(0, 10).map((r, i) => (
                        <tr key={i} className={r.error ? "imp-ia-row-err" : i % 2 === 0 ? "imp-ia-row-ok" : "imp-ia-row-alt"}>
                          <td className="imp-ia-td-num">{r.row}</td>
                          <td className="imp-ia-td">
                            {r.error
                              ? <span style={{ color: "#dc2626", fontWeight: 600 }}>✗ {r.error}</span>
                              : <span style={{ color: "#059669", fontWeight: 600 }}>✓ OK</span>}
                          </td>
                          <td className="imp-ia-td">{r.firstname || "–"}</td>
                          <td className="imp-ia-td">{r.lastname || "–"}</td>
                          <td className="imp-ia-td">{r.position || "–"}</td>
                          <td className="imp-ia-td">{r.employee_type || "–"}</td>
                          <td className="imp-ia-td" style={{ whiteSpace: "nowrap" }}>{r.hired_at || "–"}</td>
                          <td className="imp-ia-td">{r.status || "–"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {detail.rows_json?.length > 10 && (
                    <div className="imp-ia-tbl-more">
                      {t("ia_and_more").replace("{n}", detail.rows_json.length - 10)}
                    </div>
                  )}
                </div>

                {/* Actions */}
                {detail.status === "pending" && (
                  rejectBox ? (
                    <div className="imp-ia-reject-box">
                      <div className="imp-ia-reject-lbl">{t("ia_reject_reason_lbl")}</div>
                      <textarea value={reason} onChange={e => setReason(e.target.value)}
                        placeholder={t("ia_reason_ph")}
                        style={{ width: "100%", boxSizing: "border-box", padding: "8px 12px", borderRadius: 6,
                          border: "1px solid #fca5a5", fontSize: 13, resize: "vertical", minHeight: 80 }} />
                      <div className="imp-ia-reject-btns">
                        <button onClick={() => setRejectBox(false)} disabled={acting} className="imp-ia-cancel-btn">
                          {t("cancel")}
                        </button>
                        <button onClick={reject} disabled={acting}
                          style={{ flex: 1, padding: "8px 0", border: "none", borderRadius: 6, background: "#dc2626",
                            color: "#fff", cursor: "pointer", fontWeight: 600, fontSize: 13 }}>
                          {acting ? t("ia_processing") : t("ia_confirm_reject")}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="imp-ia-actions">
                      <button onClick={() => setRejectBox(true)} disabled={acting} className="imp-ia-reject-outline">
                        {t("ia_reject_btn")}
                      </button>
                      <button onClick={approve} disabled={acting}
                        style={{ flex: 2, padding: "10px 0", border: "none", borderRadius: 8, background: "var(--primary)",
                          color: "#fff", fontWeight: 700, cursor: "pointer", fontSize: 14 }}>
                        {acting ? t("ia_processing") : t("approve_import").replace("{n}", detail.valid_rows)}
                      </button>
                    </div>
                  )
                )}
              </>
            ) : null}
          </div>
        ) : (
          <div className="imp-split-detail imp-ia-no-sel">
            <div className="imp-ia-no-sel-inner">
              <div className="imp-ia-no-sel-icon">📋</div>
              <div className="imp-ia-no-sel-txt">{t("ia_select_batch")}</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
