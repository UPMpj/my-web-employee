import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api, photoUrl as getPhotoUrl } from "../../api";
import html2canvas from "html2canvas";
import toast from "react-hot-toast";
import { QRCodeSVG } from "qrcode.react";
import "./employee-card-detail.css";

const TEMPLATES = {
  Staff:      { key:"Staff",      img:"/IT_STAFF.png?v=2",    panelBg:"#0c1a30", footBg:"#07101e" },
  Supervisor: { key:"Supervisor", img:"/Supervisor.png?v=2",  panelBg:"#091e19", footBg:"#05120d" },
  Manager:    { key:"Manager",    img:"/manager.png?v=2",     panelBg:"#110826", footBg:"#090518" },
  Contractor: { key:"Contractor", img:"/constractor.png?v=2", panelBg:"#1f1003", footBg:"#130800" },
  Vendor:     { key:"Vendor",     img:"/vender.png?v=2",      panelBg:"#181008", footBg:"#0e0900" },
  Visitor:    { key:"Visitor",    img:"/visitor.png?v=2",     panelBg:"#1c1c1c", footBg:"#111111" },
};

const TEMPLATE_RULES = [
  { re:/\b(visitor|guest|temp(?:orary)?)\b/i,                                         key:"Visitor"    },
  { re:/\b(vendor|vender|supplier|retail|shop)\b/i,                                   key:"Vendor"     },
  { re:/\bcontract(or)?\b/i,                                                          key:"Contractor" },
  { re:/\b(manager|director|head|chief|president|ceo|vp|vice|executive|officer)\b/i, key:"Manager"    },
  { re:/\b(supervisor|lead|senior)\b/i,                                               key:"Supervisor" },
];

function getTemplate(emp) {
  const txt = `${emp.position || ""} ${emp.card_type || ""}`;
  for (const { re, key } of TEMPLATE_RULES) if (re.test(txt)) return TEMPLATES[key];
  return TEMPLATES.Staff;
}

const IcoId   = () => <svg viewBox="0 0 20 20" fill="currentColor" width="11" height="11"><path d="M10 2a4 4 0 1 0 0 8A4 4 0 0 0 10 2zm0 10c-5 0-8 2-8 3v1h16v-1c0-1-3-3-8-3z"/></svg>;
const IcoBldg = () => <svg viewBox="0 0 20 20" fill="currentColor" width="11" height="11"><path d="M2 19V4h7v15H2zm9-11h7v11h-7V8zM5 6h3v2H5V6zm0 4h3v2H5v-2zm0 4h3v2H5v-2zm7 2h2v2h-2v-2zm0-4h2v2h-2v-2z"/></svg>;
const IcoFlag = () => <svg viewBox="0 0 20 20" fill="currentColor" width="11" height="11"><path d="M3 2v16H1V0h2v2zm0 0h12l-2 5 2 5H3V2z"/></svg>;
const IcoCard = () => <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" width="11" height="11"><rect x="1" y="4" width="18" height="12" rx="2"/><line x1="1" y1="8" x2="19" y2="8"/></svg>;

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
  const cardRef = useRef(null);

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
      toast.success("ພິມ Card ສຳເລັດ");
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
  const photoUrl = getPhotoUrl(data.photo);
  const hasCard  = !!data.card_id;
  const tpl      = getTemplate(data);
  const isVisitor = tpl.key === "Visitor";
  const qrData   = data.card_no || data.employee_code || "NO-CARD";

  const fmtCardDate = (d) => {
    if (!d) return "–";
    return new Date(d).toLocaleDateString("en-GB", { day:"2-digit", month:"short", year:"numeric" }).toUpperCase();
  };

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

          <div className="ecd-card-wrap">
            <div className="ecd-tpl-card" ref={cardRef} style={{ backgroundImage: `url(${tpl.img})` }}>

              {/* Photo overlay */}
              <div className={`ecd-photo-overlay${isVisitor ? " ecd-photo-v" : ""}`}>
                {photoUrl
                  ? <img src={photoUrl} alt="photo" className="ecd-tpl-photo-img" crossOrigin="anonymous" />
                  : <div className="ecd-tpl-avatar">{(data.firstname?.[0] || "").toUpperCase()}</div>
                }
              </div>

              {/* Data panel */}
              <div className="ecd-data-panel" style={{ background: tpl.panelBg }}>
                {isVisitor
                  ? <div className="ecd-panel-vname">{fullName}</div>
                  : <>
                      <div className="ecd-panel-name">{fullName}</div>
                      <div className="ecd-panel-badge">{(data.position || "EMPLOYEE").toUpperCase()}</div>
                    </>
                }
                <div className="ecd-panel-rows">
                  {[
                    { Icon: IcoId,   lbl: "EMPLOYEE ID", val: data.employee_code || "–" },
                    { Icon: IcoBldg, lbl: "COMPANY",      val: (data.companies_name || "–").substring(0, 20) },
                    { Icon: IcoFlag, lbl: "NATIONALITY",  val: data.nationality || "–" },
                    { Icon: IcoCard, lbl: "CARD NO.",     val: hasCard ? data.card_no : "Not Issued" },
                  ].map(({ Icon, lbl, val }) => (
                    <div key={lbl} className="ecd-prow">
                      <span className="ecd-prow-icon"><Icon /></span>
                      <div className="ecd-prow-txt">
                        <span className="ecd-prow-lbl">{lbl}</span>
                        <span className="ecd-prow-val">{val}</span>
                      </div>
                    </div>
                  ))}
                </div>

                {hasCard && (
                  <div className="ecd-panel-qr">
                    <QRCodeSVG value={qrData} size={45} bgColor="#fff" fgColor={tpl.panelBg} level="M" />
                    <span className="ecd-panel-qr-no">{data.card_no}</span>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="ecd-tpl-footer" style={{ background: tpl.footBg }}>
                <div className="ecd-ft-item">
                  <span className="ecd-ft-lbl">STATUS</span>
                  <span className="ecd-ft-val">{hasCard ? (data.card_status || "ACTIVE").toUpperCase() : "NO CARD"}</span>
                </div>
                <div className="ecd-ft-dot" />
                <div className="ecd-ft-item" style={{ alignItems: "flex-end" }}>
                  <span className="ecd-ft-lbl">ISSUED DATE</span>
                  <span className="ecd-ft-val">{hasCard ? fmtCardDate(data.issued_at) : "–"}</span>
                </div>
              </div>

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

