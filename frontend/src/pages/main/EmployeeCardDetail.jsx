import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "../../api";
import html2canvas from "html2canvas";
import toast from "react-hot-toast";
import { useLanguage } from "../../context/LanguageContext";
import { IDCard } from "./IdCard";
import "./idcard.css";
import "./employee-card-detail.css";

const fmtDT = (d) => {
  if (!d) return "–";
  return new Date(d).toLocaleString("en-GB", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  }).replace(",", "");
};

export default function EmployeeCardDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const cardRef = useRef(null);

  const load = async () => {
    try {
      const r = await api.get(`/idcard/${id}`);
      setData(r.data);
    } catch {
      toast.error(t("toast_load_fail"));
      navigate(`/employees/${id}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [id]);

  const captureCard = async () => {
    if (!cardRef.current) return null;
    const canvas = await html2canvas(cardRef.current, {
      scale: 3,
      useCORS: true,
      allowTaint: true,
      backgroundColor: null,
    });
    return canvas;
  };

  const handlePrint = async () => {
    if (!data) return;
    try {
      await api.patch(`/idcard/${id}/printed`);
      toast.success(t("toast_print_ok"));
      load();
    } catch {}
    const canvas = await captureCard();
    if (!canvas) return;
    const imgData = canvas.toDataURL("image/png");
    const w = window.open("", "_blank", "width=420,height=760");
    if (!w) return;
    w.document.write(`<!DOCTYPE html><html><head><title>ID Card</title>
    <style>*{margin:0;padding:0;}body{display:flex;align-items:center;justify-content:center;min-height:100vh;background:#dde1ea;}
    img{width:250px;box-shadow:0 8px 32px rgba(0,0,0,.3);}@media print{body{background:#fff;}img{box-shadow:none;width:50mm;}}</style>
    </head><body><img src="${imgData}"/><script>window.onload=()=>{window.print();window.onafterprint=()=>window.close();}</script></body></html>`);
    w.document.close();
  };

  const handleDownload = async () => {
    if (!data) return;
    const canvas = await captureCard();
    if (!canvas) return;
    const a = Object.assign(document.createElement("a"), {
      href: canvas.toDataURL("image/png"),
      download: `card-${data.card_no || id}.png`,
    });
    a.click();
  };

  if (loading) return <div style={{ padding: 40 }}>Loading...</div>;
  if (!data) return null;

  const fullName = `${data.firstname} ${data.lastname}`;
  const hasCard  = !!data.card_id;

  /* derive card history from timestamps */
  const history = [];
  if (data.issued_at)  history.push({ dt: data.issued_at,  action: "Issued",  by: data.issued_by_name  || "–", remark: "Card issued" });
  if (data.printed_at) history.push({ dt: data.printed_at, action: "Printed", by: data.printed_by_name || "System", remark: "Card printed" });
  if (data.returned_at) history.push({ dt: data.returned_at, action: "Returned", by: data.returned_by_name || "–", remark: "Card returned" });
  if (data.revoked_at)  history.push({ dt: data.revoked_at,  action: "Revoked",  by: "–", remark: data.revoked_reason || "Card revoked" });
  history.sort((a, b) => new Date(b.dt) - new Date(a.dt));

  const actionColor = { Issued: "#10b981", Printed: "#3b82f6", Returned: "#f59e0b", Revoked: "#ef4444" };

  return (
    <div className="ecd-page">

      {/* Breadcrumb */}
      <div className="ecd-breadcrumb">
        <span className="ecd-bc-link" onClick={() => navigate("/employees")}>{t("nav_employees")}</span>
        <span className="ecd-bc-sep">›</span>
        <span className="ecd-bc-link" onClick={() => navigate(`/employees/${id}`)}>{t("tab_basic_info")}</span>
        <span className="ecd-bc-sep">›</span>
        <span className="ecd-bc-link" onClick={() => navigate(`/employees/${id}`)}>{fullName}</span>
        <span className="ecd-bc-sep">›</span>
        <span className="ecd-bc-cur">{t("ecd_title")}</span>
      </div>

      {/* Header */}
      <div className="ecd-header">
        <div>
          <h1 className="ecd-title">{t("ecd_title")}</h1>
          <p className="ecd-sub">{t("ecd_sub")}</p>
        </div>
        <button className="ecd-back-btn" onClick={() => navigate(`/employees/${id}`)}>
          ‹ {t("back")}
        </button>
      </div>

      {/* Body */}
      <div className="ecd-body">

        {/* LEFT — ID Card Preview */}
        <div className="ecd-left">
          <div className="ecd-preview-header">
            <div className="ecd-preview-title">{t("ecd_preview_title")}</div>
            <div className="ecd-preview-sub">{t("ecd_preview_sub")}</div>
          </div>

          <div className="ecd-card-wrap">
            <div className="ecd-idcard-wrap" ref={cardRef}>
              <IDCard emp={data} onPhotoUpdate={(_empId, newPhoto) => setData(d => ({ ...d, photo: newPhoto }))} />
            </div>
          </div>

          {/* Action buttons */}
          {hasCard && (
            <div className="ecd-action-btns">
              <button className="ecd-btn-download" onClick={handleDownload}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                  <polyline points="7 10 12 15 17 10"/>
                  <line x1="12" y1="15" x2="12" y2="3"/>
                </svg>
                {t("ecd_download")}
              </button>
              <button className="ecd-btn-print" onClick={handlePrint}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="6 9 6 2 18 2 18 9"/>
                  <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/>
                  <rect x="6" y="14" width="12" height="8"/>
                </svg>
                {t("ecd_print")}
              </button>
            </div>
          )}
        </div>

        {/* RIGHT — Info + History */}
        <div className="ecd-right">

          {/* Card Information */}
          <div className="ecd-info-card">
            <h2 className="ecd-info-title">{t("ecd_card_info")}</h2>
            <table className="ecd-info-table">
              <tbody>
                {[
                  [t("ecd_card_no"),      data.card_no       || "–"],
                  [t("employee_code"),    data.employee_code || "–"],
                  [t("ecd_emp_name"),     fullName],
                  [t("position"),         data.position      || "–"],
                  [t("company"),          data.companies_name|| "–"],
                ].map(([label, value]) => (
                  <tr key={label} className="ecd-info-row">
                    <td className="ecd-info-lbl">{label}</td>
                    <td className="ecd-info-val">{value}</td>
                  </tr>
                ))}

                {/* Status */}
                <tr className="ecd-info-row">
                  <td className="ecd-info-lbl">{t("status")}</td>
                  <td className="ecd-info-val">
                    {hasCard ? (
                      <span className={`ecd-status-badge ${data.card_status === "Active" ? "badge-active" : "badge-inactive"}`}>
                        {data.card_status}
                      </span>
                    ) : (
                      <span className="ecd-status-badge badge-none">{t("ecd_no_card")}</span>
                    )}
                  </td>
                </tr>

                {[
                  [t("ecd_issued_by"),      data.issued_by_name   || "–"],
                  [t("ecd_issued_at"),      fmtDT(data.issued_at)],
                  [t("ecd_printed_at"),     fmtDT(data.printed_at)],
                  [t("ecd_returned_at"),    fmtDT(data.returned_at)],
                  [t("ecd_returned_by"),    data.returned_by_name || "–"],
                  [t("ecd_revoked_at"),     fmtDT(data.revoked_at)],
                  [t("ecd_revoked_reason"), data.revoked_reason   || "–"],
                ].map(([label, value]) => (
                  <tr key={label} className="ecd-info-row">
                    <td className="ecd-info-lbl">{label}</td>
                    <td className="ecd-info-val">{value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Card History */}
          <div className="ecd-history-card">
            <h2 className="ecd-info-title">{t("ecd_card_history")}</h2>
            {history.length === 0 ? (
              <p style={{ color: "#9ca3af", fontSize: 13, padding: "12px 0" }}>{t("ecd_no_history")}</p>
            ) : (
              <>
                <table className="ecd-history-table">
                  <thead>
                    <tr>
                      <th>{t("ecd_hist_dt")}</th>
                      <th>Action</th>
                      <th>{t("ecd_hist_by")}</th>
                      <th>{t("ecd_hist_remark")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.map((h, i) => (
                      <tr key={i}>
                        <td>{fmtDT(h.dt)}</td>
                        <td>
                          <span className="ecd-action-pill"
                            style={{ background: `${actionColor[h.action]}22`, color: actionColor[h.action] }}>
                            {h.action}
                          </span>
                        </td>
                        <td>{h.by}</td>
                        <td>{h.remark}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="ecd-history-footer">
                  Showing 1 to {history.length} of {history.length} items
                </div>
              </>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}

