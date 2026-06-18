import { useEffect, useState } from "react";
import { api } from "../../api";
import toast from "react-hot-toast";
import { useLanguage } from "../../context/LanguageContext";
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

      <div style={{ display: "flex", gap: 24, alignItems: "flex-start" }}>
        {/* Left — batch list */}
        <div style={{ width: 380, flexShrink: 0 }}>
          {/* Filter tabs */}
          <div style={{ display: "flex", gap: 0, marginBottom: 12, background: "#f3f4f6", borderRadius: 8, padding: 4 }}>
            {[["pending", t("ia_status_pending")],["approved", t("ia_status_approved")],["rejected", t("ia_status_rejected")],["all", t("ia_all")]].map(([v, lbl]) => (
              <button key={v} onClick={() => setFilter(v)}
                style={{ flex:1, padding:"6px 0", border:"none", borderRadius:6, cursor:"pointer", fontSize:12, fontWeight:600,
                  background: filter===v ? "#fff" : "transparent",
                  color: filter===v ? "#2f4aad" : "#6b7280",
                  boxShadow: filter===v ? "0 1px 3px rgba(0,0,0,.1)" : "none" }}>
                {lbl}
                {v === "pending" && batches.filter(b=>b.status==="pending").length > 0 &&
                  <span style={{ marginLeft:4, background:"#ef4444", color:"#fff", borderRadius:10, padding:"1px 6px", fontSize:10 }}>
                    {batches.filter(b=>b.status==="pending").length}
                  </span>}
              </button>
            ))}
          </div>

          {loading ? (
            <div style={{ padding:40, textAlign:"center", color:"#9ca3af" }}>{t("loading")}</div>
          ) : displayed.length === 0 ? (
            <div style={{ padding:40, textAlign:"center", color:"#9ca3af", background:"#fff", borderRadius:12, border:"1px solid #e5e7eb" }}>
              {t("ia_no_batch")}
            </div>
          ) : (
            <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
              {displayed.map(b => {
                const ss = STATUS_STYLE[b.status] || STATUS_STYLE.pending;
                const active = selected?.batch_id === b.batch_id;
                return (
                  <div key={b.batch_id} onClick={() => openDetail(b)}
                    style={{ background:"#fff", borderRadius:12, padding:"14px 16px", cursor:"pointer",
                      border: active ? "2px solid #2f4aad" : "1px solid #e5e7eb",
                      boxShadow: active ? "0 0 0 3px rgba(47,74,173,.1)" : "0 1px 3px rgba(0,0,0,.05)" }}>
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:6 }}>
                      <div style={{ fontWeight:700, fontSize:14, color:"#1e293b" }}>#{b.batch_id} — {b.companies_name || "–"}</div>
                      <span style={{ background:ss.bg, color:ss.color, borderRadius:20, padding:"2px 10px", fontSize:11, fontWeight:700 }}>{ss.label}</span>
                    </div>
                    <div style={{ fontSize:12, color:"#6b7280" }}>{t("ia_submitted_by")}: {b.submitted_by_name || "–"}</div>
                    <div style={{ fontSize:12, color:"#6b7280" }}>{fmt(b.submitted_at)}</div>
                    <div style={{ marginTop:8, display:"flex", gap:12 }}>
                      <span style={{ fontSize:12, fontWeight:600, color:"#059669" }}>✓ {b.valid_rows}</span>
                      <span style={{ fontSize:12, color:"#9ca3af" }}>/ {b.total_rows}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right — detail panel */}
        {selected ? (
          <div style={{ flex:1, background:"#fff", borderRadius:12, border:"1px solid #e5e7eb", padding:24 }}>
            {detailLoad ? (
              <div style={{ padding:60, textAlign:"center", color:"#9ca3af" }}>{t("loading")}</div>
            ) : detail ? (
              <>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:20 }}>
                  <div>
                    <div style={{ fontWeight:700, fontSize:18, color:"#1e293b" }}>
                      Batch #{detail.batch_id} — {detail.companies_name}
                    </div>
                    <div style={{ fontSize:13, color:"#6b7280", marginTop:4 }}>
                      {t("ia_submitted_by")} <strong>{detail.submitted_by_name}</strong> · {fmt(detail.submitted_at)}
                    </div>
                  </div>
                  <span style={{ background: STATUS_STYLE[detail.status]?.bg, color: STATUS_STYLE[detail.status]?.color,
                    borderRadius:20, padding:"4px 14px", fontSize:13, fontWeight:700 }}>
                    {STATUS_STYLE[detail.status]?.label}
                  </span>
                </div>

                {/* Stats */}
                <div style={{ display:"flex", gap:12, marginBottom:20 }}>
                  <div style={{ background:"#f0fdf4", borderRadius:8, padding:"10px 20px", textAlign:"center" }}>
                    <div style={{ fontSize:22, fontWeight:800, color:"#059669" }}>{detail.valid_rows}</div>
                    <div style={{ fontSize:12, color:"#6b7280" }}>{t("ia_valid")}</div>
                  </div>
                  <div style={{ background:"#fef2f2", borderRadius:8, padding:"10px 20px", textAlign:"center" }}>
                    <div style={{ fontSize:22, fontWeight:800, color:"#dc2626" }}>{detail.total_rows - detail.valid_rows}</div>
                    <div style={{ fontSize:12, color:"#6b7280" }}>{t("ia_invalid_skip")}</div>
                  </div>
                  <div style={{ background:"#eff6ff", borderRadius:8, padding:"10px 20px", textAlign:"center" }}>
                    <div style={{ fontSize:22, fontWeight:800, color:"#2f4aad" }}>{detail.total_rows}</div>
                    <div style={{ fontSize:12, color:"#6b7280" }}>{t("ia_total")}</div>
                  </div>
                </div>

                {detail.status === "rejected" && detail.reject_reason && (
                  <div style={{ background:"#fee2e2", borderRadius:8, padding:"10px 14px", marginBottom:16, fontSize:13, color:"#991b1b" }}>
                    <strong>{t("ia_reject_reason_lbl")}:</strong> {detail.reject_reason}
                  </div>
                )}

                {/* Preview table */}
                <div style={{ fontSize:13, fontWeight:600, color:"#374151", marginBottom:8 }}>{t("ia_preview_rows")}</div>
                <div style={{ overflowX:"auto", borderRadius:8, border:"1px solid #e5e7eb", marginBottom:20 }}>
                  <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12 }}>
                    <thead>
                      <tr style={{ background:"#f3f4f6" }}>
                        {["#", t("status"), t("first_name"), t("last_name"), t("position"), t("pf_emp_type"), t("hire_date"), t("status")].map(h => (
                          <th key={h} style={{ padding:"8px 10px", textAlign:"left", color:"#374151", fontWeight:600, whiteSpace:"nowrap" }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {(detail.rows_json || []).slice(0, 10).map((r, i) => (
                        <tr key={i} style={{ background: r.error ? "#fff5f5" : i%2===0?"#fff":"#f9fafb", borderTop:"1px solid #f0f0f0" }}>
                          <td style={{ padding:"7px 10px", color:"#9ca3af" }}>{r.row}</td>
                          <td style={{ padding:"7px 10px" }}>
                            {r.error
                              ? <span style={{ color:"#dc2626", fontWeight:600 }}>✗ {r.error}</span>
                              : <span style={{ color:"#059669", fontWeight:600 }}>✓ OK</span>}
                          </td>
                          <td style={{ padding:"7px 10px" }}>{r.firstname || "–"}</td>
                          <td style={{ padding:"7px 10px" }}>{r.lastname || "–"}</td>
                          <td style={{ padding:"7px 10px" }}>{r.position || "–"}</td>
                          <td style={{ padding:"7px 10px" }}>{r.employee_type || "–"}</td>
                          <td style={{ padding:"7px 10px", whiteSpace:"nowrap" }}>{r.hired_at || "–"}</td>
                          <td style={{ padding:"7px 10px" }}>{r.status || "–"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {detail.rows_json?.length > 10 && (
                    <div style={{ padding:"8px 12px", fontSize:12, color:"#9ca3af", background:"#f9fafb", borderTop:"1px solid #e5e7eb" }}>
                      {t("ia_and_more").replace("{n}", detail.rows_json.length - 10)}
                    </div>
                  )}
                </div>

                {/* Actions */}
                {detail.status === "pending" && (
                  rejectBox ? (
                    <div style={{ background:"#fff5f5", borderRadius:8, border:"1px solid #fecaca", padding:16 }}>
                      <div style={{ fontWeight:600, marginBottom:8, color:"#991b1b" }}>{t("ia_reject_reason_lbl")}</div>
                      <textarea value={reason} onChange={e => setReason(e.target.value)}
                        placeholder={t("ia_reason_ph")}
                        style={{ width:"100%", boxSizing:"border-box", padding:"8px 12px", borderRadius:6, border:"1px solid #fca5a5",
                          fontSize:13, resize:"vertical", minHeight:80 }} />
                      <div style={{ display:"flex", gap:8, marginTop:10 }}>
                        <button onClick={() => setRejectBox(false)} disabled={acting}
                          style={{ flex:1, padding:"8px 0", border:"1px solid #d1d5db", borderRadius:6, background:"#fff", cursor:"pointer", fontSize:13 }}>
                          {t("cancel")}
                        </button>
                        <button onClick={reject} disabled={acting}
                          style={{ flex:1, padding:"8px 0", border:"none", borderRadius:6, background:"#dc2626", color:"#fff",
                            cursor:"pointer", fontWeight:600, fontSize:13 }}>
                          {acting ? t("ia_processing") : t("ia_confirm_reject")}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div style={{ display:"flex", gap:10 }}>
                      <button onClick={() => setRejectBox(true)} disabled={acting}
                        style={{ flex:1, padding:"10px 0", border:"1px solid #fca5a5", borderRadius:8, background:"#fff",
                          color:"#dc2626", fontWeight:600, cursor:"pointer", fontSize:14 }}>
                        {t("ia_reject_btn")}
                      </button>
                      <button onClick={approve} disabled={acting}
                        style={{ flex:2, padding:"10px 0", border:"none", borderRadius:8, background:"#2f4aad",
                          color:"#fff", fontWeight:700, cursor:"pointer", fontSize:14 }}>
                        {acting ? t("ia_processing") : t("approve_import").replace("{n}", detail.valid_rows)}
                      </button>
                    </div>
                  )
                )}
              </>
            ) : null}
          </div>
        ) : (
          <div style={{ flex:1, background:"#fff", borderRadius:12, border:"1px dashed #d1d5db",
            display:"flex", alignItems:"center", justifyContent:"center", minHeight:300 }}>
            <div style={{ textAlign:"center", color:"#9ca3af" }}>
              <div style={{ fontSize:40, marginBottom:8 }}>📋</div>
              <div style={{ fontSize:14 }}>{t("ia_select_batch")}</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
