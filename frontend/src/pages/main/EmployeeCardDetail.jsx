import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { QRCodeSVG } from "qrcode.react";
import { api, API_BASE, photoUrl as getPhotoUrl } from "../../api";
import toast from "react-hot-toast";
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
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      const r = await api.get(`/idcard/${id}`);
      setData(r.data);
    } catch {
      toast.error("ໂຫຼດຂໍ້ມູນ Card ບໍ່ໄດ້");
      navigate(`/employees/${id}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [id]);

  const handlePrint = async () => {
    if (!data) return;
    try {
      await api.patch(`/idcard/${id}/printed`);
      toast.success("ພິມ Card ສຳເລັດ");
      load();
    } catch {}
    printWindow(data);
  };

  const handleDownload = () => {
    if (!data) return;
    const svg = document.querySelector(".ecd-card-svg-wrap svg");
    if (!svg) return;
    const blob = new Blob([svg.outerHTML], { type: "image/svg+xml" });
    const a = Object.assign(document.createElement("a"), {
      href: URL.createObjectURL(blob),
      download: `card-${data.card_no || id}.svg`,
    });
    a.click();
    URL.revokeObjectURL(a.href);
  };

  if (loading) return <div style={{ padding: 40 }}>Loading...</div>;
  if (!data) return null;

  const fullName = `${data.firstname} ${data.lastname}`;
  const photoUrl = getPhotoUrl(data.photo);
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
        <span className="ecd-bc-link" onClick={() => navigate("/employees")}>Employees</span>
        <span className="ecd-bc-sep">›</span>
        <span className="ecd-bc-link" onClick={() => navigate(`/employees/${id}`)}>Employee Detail</span>
        <span className="ecd-bc-sep">›</span>
        <span className="ecd-bc-link" onClick={() => navigate(`/employees/${id}`)}>{fullName}</span>
        <span className="ecd-bc-sep">›</span>
        <span className="ecd-bc-cur">Employee Card</span>
      </div>

      {/* Header */}
      <div className="ecd-header">
        <div>
          <h1 className="ecd-title">Employee Card</h1>
          <p className="ecd-sub">View employee ID card details and status.</p>
        </div>
        <button className="ecd-back-btn" onClick={() => navigate(`/employees/${id}`)}>
          ‹ Back
        </button>
      </div>

      {/* Body */}
      <div className="ecd-body">

        {/* LEFT — ID Card Preview */}
        <div className="ecd-left">
          <div className="ecd-preview-header">
            <div className="ecd-preview-title">ID Card Preview</div>
            <div className="ecd-preview-sub">This is how the ID card will look.</div>
          </div>

          {hasCard ? (
            <div className="ecd-card-wrap ecd-card-svg-wrap">
              {/* Card visual */}
              <div className="ecd-card">

                {/* ── White top section ── */}
                <div className="ecd-card-top">
                  <div className="ecd-logo-area">
                    <svg className="ecd-logo-swoosh" viewBox="0 0 160 22" fill="none">
                      <path d="M6,19 Q80,-6 154,19" stroke="#c01c2c" strokeWidth="2.8" strokeLinecap="round"/>
                    </svg>
                    <div className="ecd-logo-text">
                      <span className="ecd-logo-ds">DS</span>
                      <span className="ecd-logo-cms"> CMS</span>
                    </div>
                    <div className="ecd-logo-sub">Customer Management System</div>
                  </div>
                  <div className="ecd-card-photo-wrap">
                    {photoUrl
                      ? <img src={photoUrl} alt="photo" className="ecd-card-photo" />
                      : <div className="ecd-card-avatar">{(data.firstname?.[0] || "").toUpperCase()}</div>
                    }
                  </div>
                </div>

                {/* ── Diagonal transition ── */}
                <svg className="ecd-card-divider" viewBox="0 0 280 56" preserveAspectRatio="none">
                  <polygon points="0,0 280,0 0,56" fill="#ffffff"/>
                  <polygon points="0,56 280,0 280,56" fill="#1e3a8a"/>
                  <polygon points="198,0 280,0 280,44" fill="#9b1c2c"/>
                </svg>

                {/* ── Blue bottom section ── */}
                <div className="ecd-card-bottom">
                  <div className="ecd-card-name">{fullName}</div>
                  <div className="ecd-card-field">
                    <span className="ecd-card-lbl">EMPLOYEE CODE</span>
                    <span className="ecd-card-val">{data.employee_code || "–"}</span>
                  </div>
                  <div className="ecd-card-field">
                    <span className="ecd-card-lbl">POSITION</span>
                    <span className="ecd-card-val">{data.position || "–"}</span>
                  </div>
                  <div className="ecd-card-field">
                    <span className="ecd-card-lbl">COMPANY</span>
                    <span className="ecd-card-val">{data.companies_name || "–"}</span>
                  </div>
                  <div className="ecd-qr-wrap">
                    <div className="ecd-qr-bg">
                      <QRCodeSVG
                        value={`${data.card_no || data.employee_code || id}`}
                        size={128}
                        bgColor="#ffffff"
                        fgColor="#000000"
                        level="M"
                      />
                    </div>
                  </div>
                </div>

                {/* ── Card No bar ── */}
                <div className="ecd-card-no-bar">
                  <div className="ecd-card-no-lbl">CARD NO.</div>
                  <div className="ecd-card-no-val">{data.card_no || "–"}</div>
                </div>

              </div>
            </div>
          ) : (
            <div className="ecd-no-card">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" strokeWidth="1.5">
                <rect x="2" y="5" width="20" height="14" rx="2"/>
                <path d="M2 10h20"/>
              </svg>
              <p>ຍັງບໍ່ທັນ Issue Card</p>
            </div>
          )}

          {/* Action buttons */}
          {hasCard && (
            <div className="ecd-action-btns">
              <button className="ecd-btn-download" onClick={handleDownload}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                  <polyline points="7 10 12 15 17 10"/>
                  <line x1="12" y1="15" x2="12" y2="3"/>
                </svg>
                Download
              </button>
              <button className="ecd-btn-print" onClick={handlePrint}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="6 9 6 2 18 2 18 9"/>
                  <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/>
                  <rect x="6" y="14" width="12" height="8"/>
                </svg>
                Print Card
              </button>
            </div>
          )}
        </div>

        {/* RIGHT — Info + History */}
        <div className="ecd-right">

          {/* Card Information */}
          <div className="ecd-info-card">
            <h2 className="ecd-info-title">Card Information</h2>
            <table className="ecd-info-table">
              <tbody>
                {[
                  ["Card No.",        data.card_no       || "–"],
                  ["Employee Code",   data.employee_code || "–"],
                  ["Employee Name",   fullName],
                  ["Position",        data.position      || "–"],
                  ["Company",         data.companies_name|| "–"],
                ].map(([label, value]) => (
                  <tr key={label} className="ecd-info-row">
                    <td className="ecd-info-lbl">{label}</td>
                    <td className="ecd-info-val">{value}</td>
                  </tr>
                ))}

                {/* Status */}
                <tr className="ecd-info-row">
                  <td className="ecd-info-lbl">Status</td>
                  <td className="ecd-info-val">
                    {hasCard ? (
                      <span className={`ecd-status-badge ${data.card_status === "Active" ? "badge-active" : "badge-inactive"}`}>
                        {data.card_status}
                      </span>
                    ) : (
                      <span className="ecd-status-badge badge-none">No Card</span>
                    )}
                  </td>
                </tr>

                {[
                  ["Issued By",      data.issued_by_name   || "–"],
                  ["Issued At",      fmtDT(data.issued_at)],
                  ["Printed At",     fmtDT(data.printed_at)],
                  ["Returned At",    fmtDT(data.returned_at)],
                  ["Returned By",    data.returned_by_name || "–"],
                  ["Revoked At",     fmtDT(data.revoked_at)],
                  ["Revoked Reason", data.revoked_reason   || "–"],
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
            <h2 className="ecd-info-title">Card History</h2>
            {history.length === 0 ? (
              <p style={{ color: "#9ca3af", fontSize: 13, padding: "12px 0" }}>ບໍ່ມີ History</p>
            ) : (
              <>
                <table className="ecd-history-table">
                  <thead>
                    <tr>
                      <th>Date / Time</th>
                      <th>Action</th>
                      <th>By</th>
                      <th>Remark</th>
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

/* ── print window helper ── */
function printWindow(data) {
  const photoUrl = getPhotoUrl(data.photo);
  const fullName = `${data.firstname} ${data.lastname}`;
  const w = window.open("", "_blank", "width=420,height=760");
  if (!w) return;
  w.document.write(`<!DOCTYPE html><html><head><title>ID Card – ${fullName}</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0;}
  body{display:flex;align-items:center;justify-content:center;min-height:100vh;background:#dde1ea;font-family:'Segoe UI',sans-serif;}
  .card{width:280px;border-radius:16px;overflow:hidden;box-shadow:0 10px 36px rgba(0,0,0,.28);background:#fff;}
  /* top white */
  .top{background:#fff;padding:18px 20px 14px;display:flex;flex-direction:column;align-items:center;}
  .logo-swoosh{display:block;width:160px;height:22px;margin:0 auto;}
  .logo-text{display:flex;align-items:baseline;justify-content:center;gap:1px;margin-top:-2px;line-height:1;}
  .logo-ds{color:#c01c2c;font-weight:900;font-size:28px;font-style:italic;letter-spacing:-0.5px;}
  .logo-cms{color:#1e3a8a;font-weight:900;font-size:28px;letter-spacing:1.5px;}
  .logo-sub{font-size:9px;color:#6b7280;margin-top:4px;letter-spacing:0.4px;text-align:center;}
  .photo{width:140px;height:160px;object-fit:cover;object-position:top;display:block;margin-top:14px;border:1px solid #e5e7eb;}
  .avatar{width:140px;height:140px;background:#e5e7eb;display:flex;align-items:center;justify-content:center;color:#6b7280;font-size:52px;font-weight:700;margin-top:14px;}
  /* diagonal */
  .divider{display:block;width:100%;height:56px;margin-top:-1px;}
  /* blue bottom */
  .btm{background:#1e3a8a;padding:4px 20px 12px;color:#fff;text-align:center;margin-top:-1px;}
  .name{font-size:18px;font-weight:700;margin-bottom:10px;}
  .row{margin:6px 0;}
  .lbl{font-size:8px;opacity:.6;text-transform:uppercase;letter-spacing:1px;}
  .val{font-size:13px;font-weight:700;}
  .qr-wrap{display:flex;justify-content:center;margin:14px 0 8px;}
  .qr-bg{background:#fff;border-radius:6px;padding:8px;display:inline-flex;}
  /* bar */
  .bar{background:#7e1528;padding:9px 0;text-align:center;color:#fff;}
  .bar-lbl{font-size:8px;opacity:.75;letter-spacing:1.5px;text-transform:uppercase;}
  .bar-val{font-size:17px;font-weight:700;letter-spacing:2px;margin-top:1px;}
  @media print{body{background:#fff;}.card{box-shadow:none;}}
</style></head><body>
<div class="card">
  <div class="top">
    <svg class="logo-swoosh" viewBox="0 0 160 22" fill="none">
      <path d="M6,19 Q80,-6 154,19" stroke="#c01c2c" stroke-width="2.8" stroke-linecap="round"/>
    </svg>
    <div class="logo-text">
      <span class="logo-ds">DS</span><span class="logo-cms"> CMS</span>
    </div>
    <div class="logo-sub">Customer Management System</div>
    ${photoUrl
      ? `<img src="${photoUrl}" class="photo"/>`
      : `<div class="avatar">${(data.firstname?.[0]||"").toUpperCase()}</div>`}
  </div>
  <svg class="divider" viewBox="0 0 280 56" preserveAspectRatio="none">
    <polygon points="0,0 280,0 0,56" fill="#ffffff"/>
    <polygon points="0,56 280,0 280,56" fill="#1e3a8a"/>
    <polygon points="198,0 280,0 280,44" fill="#9b1c2c"/>
  </svg>
  <div class="btm">
    <div class="name">${fullName}</div>
    <div class="row"><div class="lbl">EMPLOYEE CODE</div><div class="val">${data.employee_code || "–"}</div></div>
    <div class="row"><div class="lbl">POSITION</div><div class="val">${data.position || "–"}</div></div>
    <div class="row"><div class="lbl">COMPANY</div><div class="val">${data.companies_name || "–"}</div></div>
    <div class="qr-wrap">
      <div class="qr-bg">
        <svg width="128" height="128" viewBox="0 0 128 128" xmlns="http://www.w3.org/2000/svg">
          <rect width="128" height="128" fill="#fff"/>
          <!-- finder top-left -->
          <rect x="4" y="4" width="40" height="40" fill="none" stroke="#000" stroke-width="6"/>
          <rect x="16" y="16" width="16" height="16" fill="#000"/>
          <!-- finder top-right -->
          <rect x="84" y="4" width="40" height="40" fill="none" stroke="#000" stroke-width="6"/>
          <rect x="96" y="16" width="16" height="16" fill="#000"/>
          <!-- finder bottom-left -->
          <rect x="4" y="84" width="40" height="40" fill="none" stroke="#000" stroke-width="6"/>
          <rect x="16" y="96" width="16" height="16" fill="#000"/>
          <!-- data dots -->
          <rect x="52" y="4" width="8" height="8" fill="#000"/>
          <rect x="64" y="4" width="8" height="8" fill="#000"/>
          <rect x="4" y="52" width="8" height="8" fill="#000"/>
          <rect x="4" y="64" width="8" height="8" fill="#000"/>
          <rect x="52" y="52" width="8" height="8" fill="#000"/>
          <rect x="64" y="52" width="8" height="8" fill="#000"/>
          <rect x="52" y="64" width="8" height="8" fill="#000"/>
          <rect x="84" y="52" width="8" height="8" fill="#000"/>
          <rect x="96" y="52" width="8" height="8" fill="#000"/>
          <rect x="108" y="52" width="8" height="8" fill="#000"/>
          <rect x="84" y="64" width="8" height="8" fill="#000"/>
          <rect x="108" y="64" width="8" height="8" fill="#000"/>
          <rect x="84" y="76" width="8" height="8" fill="#000"/>
          <rect x="96" y="84" width="8" height="8" fill="#000"/>
          <rect x="108" y="84" width="8" height="8" fill="#000"/>
          <rect x="84" y="96" width="8" height="8" fill="#000"/>
          <rect x="96" y="108" width="8" height="8" fill="#000"/>
          <rect x="52" y="76" width="8" height="8" fill="#000"/>
          <rect x="64" y="84" width="8" height="8" fill="#000"/>
          <rect x="52" y="96" width="8" height="8" fill="#000"/>
          <rect x="64" y="108" width="8" height="8" fill="#000"/>
          <rect x="52" y="116" width="8" height="8" fill="#000"/>
          <rect x="76" y="4" width="4" height="4" fill="#000"/>
          <rect x="116" y="76" width="8" height="8" fill="#000"/>
          <rect x="116" y="96" width="8" height="8" fill="#000"/>
          <rect x="116" y="116" width="8" height="8" fill="#000"/>
        </svg>
      </div>
    </div>
  </div>
  <div class="bar">
    <div class="bar-lbl">CARD NO.</div>
    <div class="bar-val">${data.card_no || "–"}</div>
  </div>
</div>
<script>window.onload=()=>{window.print();window.onafterprint=()=>window.close();}</script>
</body></html>`);
  w.document.close();
}
