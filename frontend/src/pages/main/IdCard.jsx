import { useEffect, useState } from "react";
import { api, API_BASE, photoUrl as getPhotoUrl } from "../../api";
import { useCurrentUser } from "../../hooks/useCurrentUser";
import { QRCodeSVG } from "qrcode.react";
import toast from "react-hot-toast";
import { useLanguage } from "../../context/LanguageContext";
import ConfirmModal from "../../components/ConfirmModal";
import "../../components/ConfirmModal.css";
import "./idcard.css";

const fmt   = (d) => d ? new Date(d).toLocaleDateString("en-GB", { day:"2-digit", month:"short", year:"numeric" }) : "–";
const fmtUp = (d) => fmt(d).toUpperCase();
const initials = (f, l) => `${f?.[0] || ""}${l?.[0] || ""}`.toUpperCase();

const MANAGER_RE = /\b(manager|director|head|chief|president|ceo|supervisor|lead|vp|vice|executive|officer)\b/i;
const getCardColor = (emp) => {
  const isManager = MANAGER_RE.test(emp.position || "");
  return isManager
    ? (emp.manager_card_color || "#7f1d1d")
    : (emp.company_staff_color || emp.card_color || "#1a3a6b");
};

const BuildingLogo = ({ color = "#1a3a6b", size = 28 }) => (
  <svg width={size} height={size} viewBox="0 0 40 44" fill="none">
    <rect x="4"  y="8"  width="32" height="34" rx="3" fill={color}/>
    <rect x="4"  y="4"  width="32" height="8"  rx="2" fill={color} opacity=".7"/>
    <rect x="10" y="14" width="6"  height="6"  rx="1" fill="white" opacity=".85"/>
    <rect x="24" y="14" width="6"  height="6"  rx="1" fill="white" opacity=".85"/>
    <rect x="10" y="24" width="6"  height="6"  rx="1" fill="white" opacity=".85"/>
    <rect x="24" y="24" width="6"  height="6"  rx="1" fill="white" opacity=".85"/>
    <rect x="17" y="32" width="6"  height="10" rx="1" fill="white" opacity=".85"/>
  </svg>
);

/* ── Screen ID Card (50:85 aspect ratio) ── */
function IDCard({ emp }) {
  const photoUrl  = getPhotoUrl(emp.photo);
  const hasCard   = !!emp.card_id;
  const color     = getCardColor(emp);
  const qrData    = emp.card_no || emp.employee_code || "NO-CARD";

  return (
    <div className="idc2-card" style={{ "--cc": color }}>

      {/* Header strip */}
      <div className="idc2-header-strip" style={{ background: color }}>
        <BuildingLogo color="#fff" size={18} />
        <span className="idc2-header-name">{(emp.companies_name || "COMPANY").toUpperCase()}</span>
        <span className="idc2-header-nfc">))</span>
      </div>

      {/* White photo area */}
      <div className="idc2-photo-area">
        <div className="idc2-watermark"><BuildingLogo color={color} size={70} /></div>

        <div className={`idc2-status ${hasCard
          ? (emp.card_status === "Active" ? "st-active" : "st-inactive")
          : "st-none"}`}>
          {hasCard ? emp.card_status : "No Card"}
        </div>

        <div className="idc2-photo-wrap">
          {photoUrl
            ? <img src={photoUrl} alt="" className="idc2-photo" />
            : <div className="idc2-avatar" style={{ background: color }}>
                {initials(emp.firstname, emp.lastname)}
              </div>
          }
        </div>
      </div>

      {/* Diagonal divider */}
      <svg className="idc2-divider" viewBox="0 0 100 12" preserveAspectRatio="none">
        <polygon points="0,12 100,0 100,12" fill={color}/>
      </svg>

      {/* Color bottom */}
      <div className="idc2-bottom" style={{ background: color }}>
        <div className="idc2-emp-name">{emp.firstname} {emp.lastname}</div>
        <div className="idc2-dept-badge">{(emp.position || "EMPLOYEE").toUpperCase()}</div>

        <div className="idc2-body-row">
          <div className="idc2-info-list">
            {[
              { label: "ID", value: emp.employee_code || "–" },
              { label: "COMPANY", value: emp.companies_name || "–" },
              { label: "NATIONALITY", value: emp.nationality || "–" },
            ].map(r => (
              <div key={r.label} className="idc2-info-row">
                <div className="idc2-info-label">{r.label}</div>
                <div className="idc2-info-value">{r.value}</div>
              </div>
            ))}
          </div>

          {hasCard && (
            <div className="idc2-qr-section" id={`qr-${emp.employee_id}`}>
              <div className="idc2-qr-box">
                <QRCodeSVG value={qrData} size={52} bgColor="#fff" fgColor={color} level="M"/>
              </div>
              <div className="idc2-cardno-val">{emp.card_no}</div>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="idc2-footer" style={{ background: color }}>
        <span className="idc2-ft-item">
          <span className="idc2-ft-label">STATUS</span>
          <span className="idc2-ft-val">{hasCard ? (emp.card_status || "ACTIVE").toUpperCase() : "NO CARD"}</span>
        </span>
        <span className="idc2-ft-item">
          <span className="idc2-ft-label">ISSUED</span>
          <span className="idc2-ft-val">{hasCard ? fmtUp(emp.issued_at) : "–"}</span>
        </span>
      </div>
    </div>
  );
}

/* ── Multi-card print at 50×85mm ── */
function buildCardHtml(emp) {
  const photoUrl = getPhotoUrl(emp.photo);
  const color    = getCardColor(emp);
  const initStr  = initials(emp.firstname, emp.lastname);
  const qrEl     = document.getElementById(`qr-${emp.employee_id}`);
  const qrSvg    = qrEl ? new XMLSerializer().serializeToString(qrEl.querySelector("svg")) : "";

  return `
<div class="cut-zone">
<div class="card">
  <!-- header strip -->
  <div class="hdr" style="background:${color}">
    <svg width="10" height="11" viewBox="0 0 40 44" fill="none">
      <rect x="4" y="8" width="32" height="34" rx="3" fill="white"/>
      <rect x="4" y="4" width="32" height="8" rx="2" fill="white" opacity=".7"/>
      <rect x="10" y="14" width="6" height="6" rx="1" fill="${color}" opacity=".85"/>
      <rect x="24" y="14" width="6" height="6" rx="1" fill="${color}" opacity=".85"/>
      <rect x="10" y="24" width="6" height="6" rx="1" fill="${color}" opacity=".85"/>
      <rect x="24" y="24" width="6" height="6" rx="1" fill="${color}" opacity=".85"/>
      <rect x="17" y="32" width="6" height="10" rx="1" fill="${color}" opacity=".85"/>
    </svg>
    <span class="hdr-name">${(emp.companies_name || "COMPANY").toUpperCase()}</span>
    <span class="nfc">))</span>
  </div>

  <!-- photo area -->
  <div class="photo-area">
    <div class="watermark">
      <svg width="28mm" height="31mm" viewBox="0 0 40 44" fill="none" style="opacity:.06;transform:rotate(-15deg)">
        <rect x="4" y="8" width="32" height="34" rx="3" fill="${color}"/>
        <rect x="4" y="4" width="32" height="8" rx="2" fill="${color}" opacity=".7"/>
        <rect x="10" y="14" width="6" height="6" rx="1" fill="white" opacity=".85"/>
        <rect x="24" y="14" width="6" height="6" rx="1" fill="white" opacity=".85"/>
        <rect x="10" y="24" width="6" height="6" rx="1" fill="white" opacity=".85"/>
        <rect x="24" y="24" width="6" height="6" rx="1" fill="white" opacity=".85"/>
        <rect x="17" y="32" width="6" height="10" rx="1" fill="white" opacity=".85"/>
      </svg>
    </div>
    ${emp.card_status ? `<div class="status-badge ${emp.card_status==="Active"?"st-act":"st-inact"}">${emp.card_status}</div>` : ""}
    <div class="photo-wrap">
      ${photoUrl
        ? `<img src="${photoUrl}" class="photo" crossorigin="anonymous"/>`
        : `<div class="avatar" style="background:${color}">${initStr}</div>`}
    </div>
  </div>

  <!-- divider -->
  <svg class="divider" viewBox="0 0 100 10" preserveAspectRatio="none">
    <polygon points="0,10 100,0 100,10" fill="${color}"/>
  </svg>

  <!-- bottom -->
  <div class="bottom" style="background:${color}">
    <div class="emp-name">${emp.firstname} ${emp.lastname}</div>
    <div class="dept-badge">${(emp.position || "EMPLOYEE").toUpperCase()}</div>
    <div class="body-row">
      <div class="info-list">
        <div class="info-row"><span class="lbl">ID</span><span class="val">${emp.employee_code || "–"}</span></div>
        <div class="info-row"><span class="lbl">COMPANY</span><span class="val">${(emp.companies_name || "–").substring(0,16)}</span></div>
        <div class="info-row"><span class="lbl">NAT.</span><span class="val">${emp.nationality || "–"}</span></div>
      </div>
      ${emp.card_no ? `
      <div class="qr-col">
        <div class="qr-box">${qrSvg || ""}</div>
        <div class="card-no">${emp.card_no}</div>
      </div>` : ""}
    </div>
  </div>

  <!-- footer -->
  <div class="footer" style="background:${color};filter:brightness(.72)">
    <div><div class="ft-lbl">STATUS</div><div class="ft-val">${(emp.card_status||"ACTIVE").toUpperCase()}</div></div>
    <div><div class="ft-lbl">ISSUED</div><div class="ft-val">${fmtUp(emp.issued_at)}</div></div>
  </div>
</div>
</div>`;
}

function printCards(empList) {
  const cardsHtml = empList.map(buildCardHtml).join("\n");

  const html = `<!DOCTYPE html><html><head>
<meta charset="UTF-8"/>
<title>ID Cards</title>
<style>
* { box-sizing:border-box; margin:0; padding:0; }
body { font-family:'Segoe UI',Arial,sans-serif; background:#e5e7eb; }

@media screen {
  body { display:flex; flex-wrap:wrap; gap:0; padding:8mm; justify-content:center; background:#ccc; }
}
@media print {
  @page { size: A4 portrait; margin: 6mm; }
  body { background:#fff; display:flex; flex-wrap:wrap; }
  .cut-zone { box-shadow:none; }
}

/* Cut zone — adds spacing + dashed cut guide */
.cut-zone {
  padding: 3mm;
  border: 0.3mm dashed #ccc;
  break-inside: avoid;
  page-break-inside: avoid;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.card {
  width: 50mm;
  height: 85mm;
  border-radius: 4mm;
  overflow: hidden;
  box-shadow: 0 2mm 6mm rgba(0,0,0,.2);
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
}

/* Header strip */
.hdr {
  display: flex; align-items: center; gap: 1.5mm;
  padding: 1.5mm 2mm;
  flex-shrink: 0;
}
.hdr-name { font-size: 5pt; font-weight: 800; color: #fff; letter-spacing: .5px; flex:1; }
.nfc { font-size: 7pt; color: rgba(255,255,255,.6); letter-spacing:-1px; }

/* Photo area */
.photo-area {
  background: #fff;
  flex: 0 0 27mm;
  position: relative;
  display: flex; align-items: center; justify-content: center;
  overflow: hidden;
}
.watermark { position:absolute; left:-3mm; top:0; pointer-events:none; }
.status-badge {
  position: absolute; top: 1.5mm; left: 50%; transform: translateX(-50%);
  font-size: 5pt; font-weight: 700; padding: 0.5mm 2mm; border-radius: 10mm;
  white-space: nowrap;
}
.st-act  { background:#dcfce7; color:#065f46; }
.st-inact{ background:#fee2e2; color:#991b1b; }
.photo-wrap { margin-top: 3mm; }
.photo, .avatar {
  width: 18mm; height: 23mm;
  border-radius: 2mm; object-fit: cover;
  border: 0.5mm solid rgba(0,0,0,.08);
  box-shadow: 0 1mm 4mm rgba(0,0,0,.18);
}
.avatar {
  display:flex; align-items:center; justify-content:center;
  color:#fff; font-size: 12pt; font-weight: 700;
}

/* Divider */
.divider { display:block; width:100%; height:3mm; flex-shrink:0; margin-top:-0.2mm; }

/* Bottom */
.bottom { flex:1; padding: 1.5mm 2.5mm 1mm; display:flex; flex-direction:column; }
.emp-name {
  color:#fff; font-size: 8.5pt; font-weight: 800;
  text-align:center; letter-spacing:.2px; margin-bottom:1mm;
  white-space:nowrap; overflow:hidden; text-overflow:ellipsis;
}
.dept-badge {
  background:rgba(255,255,255,.18); color:rgba(255,255,255,.9);
  font-size:4.5pt; font-weight:700; letter-spacing:1px;
  padding:0.5mm 2mm; border-radius:10mm;
  text-align:center; margin: 0 auto 2mm; display:inline-block;
  max-width:100%;
}
.body-row { display:flex; gap:1.5mm; align-items:flex-start; flex:1; }
.info-list { flex:1; display:flex; flex-direction:column; gap:1.2mm; }
.info-row { display:flex; flex-direction:column; }
.lbl { font-size:4pt; color:rgba(255,255,255,.5); letter-spacing:.5px; }
.val { font-size:6pt; font-weight:700; color:#fff; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:26mm; }
.qr-col { display:flex; flex-direction:column; align-items:center; gap:1mm; flex-shrink:0; }
.qr-box { background:#fff; border-radius:1.5mm; padding:1mm; }
.qr-box svg { width:13mm!important; height:13mm!important; display:block; }
.card-no { font-size:4pt; color:rgba(255,255,255,.7); text-align:center; }

/* Footer */
.footer {
  display:flex; justify-content:space-between; align-items:center;
  padding:1.5mm 2.5mm; border-top:0.2mm solid rgba(255,255,255,.15);
  flex-shrink:0;
}
.ft-lbl { font-size:3.5pt; color:rgba(255,255,255,.55); letter-spacing:.5px; }
.ft-val { font-size:5pt; font-weight:700; color:#fff; }
</style>
</head>
<body>
${cardsHtml}
<script>window.onload=()=>{ window.print(); window.onafterprint=()=>window.close(); }</script>
</body></html>`;

  const w = window.open("", "_blank", "width=900,height=700");
  if (w) { w.document.write(html); w.document.close(); }
}

/* ── Mini card preview for card type showcase ── */
const CARD_TYPES = [
  { name: "Staff",         color: "#1a3a6b", img: "/IT_STAFF.png"   },
  { name: "Supervisor",    color: "#0a6e5a", img: "/Supervisor.png" },
  { name: "Manager",       color: "#5b21b6", img: "/manager.png"    },
  { name: "Contractor",    color: "#b45309", img: "/constractor.png" },
  { name: "Shop / Vender", color: "#6b3a1f", img: "/vender.png"     },
  { name: "Visitor",       color: "#374151", img: "/visitor.png"    },
];

function MiniCard({ type }) {
  return (
    <img
      src={type.img}
      alt={type.name}
      style={{ width: "100%", borderRadius: 10, display: "block", objectFit: "contain" }}
    />
  );
}

function CompanyAdminView() {
  const [showRules, setShowRules] = useState(false);
  const [showForm,  setShowForm]  = useState(false);
  const [reqEmps,   setReqEmps]   = useState([]);
  const [reqSearch, setReqSearch] = useState("");
  const [reqLoading,setReqLoading]= useState(false);
  const [reqSelIds, setReqSelIds] = useState(new Set());
  const [reqCardType,setReqCardType]=useState("Staff");
  const [submitting,setSubmitting]= useState(false);

  const { user_id: userId } = useCurrentUser();

  const loadEmps = async (q = "") => {
    setReqLoading(true);
    try {
      const r = await api.get("/employees", { params: { page:1, limit:20, search: q, status:"Active" } });
      setReqEmps(r.data.data || []);
    } catch {}
    setReqLoading(false);
  };

  useEffect(() => { if (showForm) loadEmps(); }, [showForm]);

  const toggleEmp = (id) => setReqSelIds(prev => {
    const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n;
  });

  const handleSubmitRequest = async () => {
    if (reqSelIds.size === 0) { toast.error("ກະລຸນາເລືອກພະນັກງານ"); return; }
    setSubmitting(true);
    try {
      await api.post("/approvals", {
        action_type: "issue_id_card",
        target_type: "employee",
        target_ids:  [...reqSelIds],
        details:     { card_type: reqCardType },
        description: `ຂໍອອກ ID Card ປະເພດ "${reqCardType}" ໃຫ້ ${reqSelIds.size} ຄົນ`,
      });
      toast.success("ສົ່ງຄຳຂໍສຳເລັດ — ລໍຖ້າ Super Admin ອະນຸມັດ");
      setShowForm(false);
      setReqSelIds(new Set());
    } catch (err) {
      toast.error(err?.response?.data?.message || "ບໍ່ສາມາດສົ່ງຄຳຂໍໄດ້");
    }
    setSubmitting(false);
  };

  return (
    <div className="idc-page">
      <div style={{ marginBottom: 24 }}>
        <h1 className="idc-title">ID Cards Requests</h1>
        <p className="idc-sub">Request and Manage ID Card for Employee and Extional Staff</p>
      </div>

      {/* ── Section 1: Card Type ── */}
      <div className="idcr-section">
        <div className="idcr-section-title">1. Card Type</div>
        <p className="idcr-section-sub">Standardized access credentials issued for project entry and facility access.</p>
        <div className="idcr-card-types">
          {CARD_TYPES.map(ct => (
            <div key={ct.name} className="idcr-card-type-item">
              <MiniCard type={ct} />
              <div className="idcr-card-type-name" style={{ color: ct.color }}>{ct.name}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Section 2: Regulation ── */}
      <div className="idcr-section">
        <div className="idcr-section-title">2. Regulation / rule</div>
        <p className="idcr-section-sub">Please read the rule and regulations before requesting ID cards.</p>
        <button className="idcr-reg-row" onClick={() => setShowRules(true)}>
          <div className="idcr-reg-icon">
            <svg viewBox="0 0 24 24" fill="none" width="22" height="22">
              <rect x="4" y="2" width="16" height="20" rx="2" fill="#2f4aad" opacity=".15"/>
              <rect x="4" y="2" width="16" height="20" rx="2" stroke="#2f4aad" strokeWidth="1.5" fill="none"/>
              <line x1="8" y1="8" x2="16" y2="8" stroke="#2f4aad" strokeWidth="1.5"/>
              <line x1="8" y1="12" x2="16" y2="12" stroke="#2f4aad" strokeWidth="1.5"/>
              <line x1="8" y1="16" x2="13" y2="16" stroke="#2f4aad" strokeWidth="1.5"/>
            </svg>
          </div>
          <div className="idcr-reg-text">
            <div className="idcr-reg-title">View Regulations &amp; Rules</div>
            <div className="idcr-reg-sub">Click to view all rules and regulation for ID Card.</div>
          </div>
          <svg viewBox="0 0 24 24" fill="none" width="18" height="18" style={{ flexShrink:0, color:"#9ca3af" }}>
            <path d="M9 18l6-6-6-6" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        </button>
      </div>

      {/* ── Section 3: Request Form ── */}
      <div className="idcr-section idcr-form-section">
        <div className="idcr-form-icon-wrap">
          <div className="idcr-form-icon">
            <svg viewBox="0 0 24 24" fill="none" width="26" height="26">
              <rect x="3" y="3" width="18" height="18" rx="3" stroke="#2f4aad" strokeWidth="1.8" fill="none"/>
              <line x1="7" y1="8" x2="17" y2="8" stroke="#2f4aad" strokeWidth="1.5"/>
              <line x1="7" y1="12" x2="17" y2="12" stroke="#2f4aad" strokeWidth="1.5"/>
              <line x1="7" y1="16" x2="13" y2="16" stroke="#2f4aad" strokeWidth="1.5"/>
            </svg>
          </div>
          <span className="idcr-form-badge">3</span>
        </div>
        <div className="idcr-form-title">3. ID Card Request Form</div>
        <p className="idcr-form-sub">Fill in the details to request ID Cards for one or more employees.</p>
        <button className="idcr-goto-btn" onClick={() => setShowForm(true)}>
          <svg viewBox="0 0 24 24" fill="none" width="18" height="18" style={{ marginRight:8 }}>
            <rect x="3" y="3" width="18" height="18" rx="3" stroke="#fff" strokeWidth="1.8" fill="none"/>
            <line x1="7" y1="8" x2="17" y2="8" stroke="#fff" strokeWidth="1.5"/>
            <line x1="7" y1="12" x2="17" y2="12" stroke="#fff" strokeWidth="1.5"/>
            <line x1="7" y1="16" x2="13" y2="16" stroke="#fff" strokeWidth="1.5"/>
          </svg>
          Go to Request Form
        </button>
      </div>

      <div className="idcr-note">
        <svg viewBox="0 0 24 24" fill="none" width="16" height="16" style={{ flexShrink:0 }}>
          <circle cx="12" cy="12" r="10" fill="#2f4aad" opacity=".12"/>
          <circle cx="12" cy="12" r="10" stroke="#2f4aad" strokeWidth="1.5" fill="none"/>
          <line x1="12" y1="10" x2="12" y2="16" stroke="#2f4aad" strokeWidth="2" strokeLinecap="round"/>
          <circle cx="12" cy="7.5" r="1" fill="#2f4aad"/>
        </svg>
        You Can Request ID Cards for multiple employees in one request
      </div>

      {/* ── Rules Modal ── */}
      {showRules && (
        <div className="idcr-modal-overlay" onClick={() => setShowRules(false)}>
          <div className="idcr-modal" onClick={e => e.stopPropagation()}>
            <div className="idcr-modal-hdr">
              <h3>Regulations &amp; Rules for ID Cards</h3>
              <button className="idcr-modal-close" onClick={() => setShowRules(false)}>✕</button>
            </div>
            <div className="idcr-modal-body">
              <ol className="idcr-rules-list">
                <li>ID Cards are issued only to active employees and registered external staff.</li>
                <li>Each person is entitled to one ID Card per company.</li>
                <li>Lost or damaged cards must be reported immediately to the administrator.</li>
                <li>ID Cards must be worn visibly at all times within project premises.</li>
                <li>Cards must be returned upon resignation, contract end, or termination.</li>
                <li>Sharing or lending your ID Card to another person is strictly prohibited.</li>
                <li>Any misuse of the ID Card may result in disciplinary action.</li>
                <li>Requests for new or replacement cards require manager or admin approval.</li>
              </ol>
            </div>
          </div>
        </div>
      )}

      {/* ── Request Form Modal ── */}
      {showForm && (
        <div className="idcr-modal-overlay" onClick={() => setShowForm(false)}>
          <div className="idcr-modal idcr-modal-lg" onClick={e => e.stopPropagation()}>
            <div className="idcr-modal-hdr">
              <h3>ID Card Request Form</h3>
              <button className="idcr-modal-close" onClick={() => setShowForm(false)}>✕</button>
            </div>
            <div className="idcr-modal-body">
              <div className="idcr-field-group">
                <label className="idcr-field-label">Card Type</label>
                <div className="idcr-card-type-btns">
                  {CARD_TYPES.map(ct => (
                    <button
                      key={ct.name}
                      className={`idcr-type-btn${reqCardType === ct.name ? " idcr-type-btn-sel" : ""}`}
                      style={reqCardType === ct.name ? { background: ct.color, color:"#fff", borderColor: ct.color } : {}}
                      onClick={() => setReqCardType(ct.name)}
                    >{ct.name}</button>
                  ))}
                </div>
              </div>
              <div className="idcr-field-group">
                <label className="idcr-field-label">Select Employees ({reqSelIds.size} selected)</label>
                <div className="idcr-emp-search-row">
                  <input
                    className="idcr-emp-search"
                    placeholder="Search employee..."
                    value={reqSearch}
                    onChange={e => setReqSearch(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && loadEmps(reqSearch)}
                  />
                  <button className="idcr-emp-search-btn" onClick={() => loadEmps(reqSearch)}>Search</button>
                </div>
                {reqLoading ? (
                  <div style={{ padding:"20px 0", textAlign:"center", color:"#9ca3af" }}>Loading...</div>
                ) : (
                  <div className="idcr-emp-list">
                    {reqEmps.map(emp => {
                      const isSel = reqSelIds.has(emp.employee_id);
                      return (
                        <div key={emp.employee_id} className={`idcr-emp-row${isSel?" idcr-emp-sel":""}`} onClick={() => toggleEmp(emp.employee_id)}>
                          <div className={`idcr-emp-chk${isSel?" idcr-emp-chk-on":""}`}>
                            {isSel && <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" width="12" height="12"><polyline points="20 6 9 17 4 12"/></svg>}
                          </div>
                          <div>
                            <div className="idcr-emp-name">{emp.firstname} {emp.lastname}</div>
                            <div className="idcr-emp-sub">{emp.position || "–"} · {emp.employee_code || "–"}</div>
                          </div>
                        </div>
                      );
                    })}
                    {reqEmps.length === 0 && <div style={{ padding:"20px 0", textAlign:"center", color:"#9ca3af" }}>No employees found</div>}
                  </div>
                )}
              </div>
              <button
                className="idcr-submit-btn"
                disabled={submitting || reqSelIds.size === 0}
                onClick={handleSubmitRequest}
              >
                {submitting ? "ກຳລັງສົ່ງ..." : `Submit Request (${reqSelIds.size} employees)`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════ */
export default function IdCard() {
  const { t } = useLanguage();
  const [employees,   setEmployees]   = useState([]);
  const [companies,   setCompanies]   = useState([]);
  const [loading,     setLoading]     = useState(false);
  const [search,      setSearch]      = useState("");
  const [company,     setCompany]     = useState("all");
  const [page,        setPage]        = useState(1);
  const [total,       setTotal]       = useState(0);
  const [issuing,       setIssuing]       = useState(null);
  const [confirmDel,    setConfirmDel]    = useState(null);
  const [confirmReturn, setConfirmReturn] = useState(null); // { id, name }
  const [returning,     setReturning]     = useState(null);
  const [stats,         setStats]         = useState({ total_cards:0, no_card:0, printed:0, resigned_with_card:0, card_returned:0, not_returned:0 });
  const [cardFilter,    setCardFilter]    = useState("");

  /* multi-select */
  const [selectMode,  setSelectMode]  = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());

  const LIMIT = 12;
  const { role: userRole, user_id: userId } = useCurrentUser();

  useEffect(() => {
    const ep = userRole === "Super Admin" ? "/company/all" : `/company/my/${userId}`;
    api.get(ep).then(r => setCompanies(r.data)).catch(() => {});
  }, []);

  const load = async (p = page, cid = company, cf = cardFilter) => {
    setLoading(true);
    try {
      const r = await api.get("/idcard", { params: { page: p, limit: LIMIT, search, company_id: cid, card_filter: cf } });
      setEmployees(r.data.data);
      setTotal(r.data.total);
      setStats({
        total_cards:        r.data.total_cards,
        no_card:            r.data.no_card,
        printed:            r.data.printed,
        resigned_with_card: r.data.resigned_with_card,
        card_returned:      r.data.card_returned,
        not_returned:       r.data.not_returned,
      });
    } catch { toast.error("Failed to load ID Cards"); }
    setLoading(false);
  };

  useEffect(() => { load(page, company, cardFilter); }, [page]);
  const doSearch = () => { setPage(1); load(1, company, cardFilter); };

  const applyFilter = (f) => {
    const next = cardFilter === f ? "" : f;
    setCardFilter(next);
    setPage(1);
    load(1, company, next);
  };

  const handleIssue = async (empId) => {
    setIssuing(empId);
    try { await api.post(`/idcard/${empId}/issue`); toast.success("Card issued successfully"); load(page); }
    catch (err) { toast.error(err?.response?.data?.message || "Failed to issue card"); }
    setIssuing(null);
  };

  const deleteCard = async (empId) => {
    try { await api.delete(`/idcard/${empId}/card`); toast.success("Card deleted successfully"); load(page); }
    catch (err) { toast.error(err?.response?.data?.message || "Failed to delete card"); }
    setConfirmDel(null);
  };

  const handleReturn = async () => {
    if (!confirmReturn) return;
    const { id } = confirmReturn;
    setConfirmReturn(null);
    setReturning(id);
    try {
      await api.patch(`/idcard/${id}/return`);
      toast.success("Card return recorded successfully");
      load(page);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to record card return");
    }
    setReturning(null);
  };

  const handlePrintOne = async (emp) => {
    printCards([emp]);
    try { await api.patch(`/idcard/${emp.employee_id}/printed`); } catch {}
    load(page);
  };

  const handlePrintSelected = async () => {
    const list = employees.filter(e => selectedIds.has(e.employee_id) && e.card_id);
    if (list.length === 0) { toast.error("Please select employees with cards first"); return; }
    printCards(list);
    await Promise.all(list.map(e => api.patch(`/idcard/${e.employee_id}/printed`).catch(() => {})));
    load(page);
  };

  const toggleSelect = (id) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    const hasCardIds = employees.filter(e => e.card_id).map(e => e.employee_id);
    setSelectedIds(new Set(hasCardIds));
  };

  const exitSelectMode = () => { setSelectMode(false); setSelectedIds(new Set()); };

  const totalPages = Math.ceil(total / LIMIT);
  const selectedWithCard = [...selectedIds].filter(id => employees.find(e => e.employee_id === id && e.card_id)).length;

  if (userRole === "Company Admin") return <CompanyAdminView />;

  return (
    <div className="idc-page">

      <div className="idc-topbar">
        <div>
          <h1 className="idc-title">ID Cards</h1>
          <p className="idc-sub">{t("idc_sub")}</p>
        </div>
        <div className="idc-topbar-right">
          {selectMode ? (
            <>
              <button className="idc-btn-outline" onClick={selectAll}>{t("idc_select_all")} ({employees.filter(e=>e.card_id).length})</button>
              <button
                className="idc-btn-print-sel"
                disabled={selectedWithCard === 0}
                onClick={handlePrintSelected}
              >
                {selectedWithCard > 0 ? t("idc_print_n").replace("{n}", selectedWithCard) : t("idc_print")}
              </button>
              <button className="idc-btn-outline" onClick={exitSelectMode}>{t("cancel")}</button>
            </>
          ) : (
            <button className="idc-btn-select" onClick={() => setSelectMode(true)}>
              {t("idc_select_multi")}
            </button>
          )}
        </div>
      </div>

      <div className="idc-filters">
        <input className="idc-search" placeholder={t("idc_search_ph")}
          value={search} onChange={e => setSearch(e.target.value)}
          onKeyDown={e => e.key === "Enter" && doSearch()} />
        <select className="idc-select" value={company}
          onChange={e => { const v = e.target.value; setCompany(v); setPage(1); load(1, v, cardFilter); }}>
          <option value="all">All Companies</option>
          {companies.map(c => <option key={c.company_id} value={c.company_id}>{c.companies_name}</option>)}
        </select>
        <button className="idc-search-btn" onClick={doSearch}>{t("search")}</button>
      </div>

      {/* ── Card stats ── */}
      <div className="idc-stats">
        {[
          { label: t("idc_total"),    value: total,            color:"#2f4aad", filter:"" },
          { label: t("idc_has_card"), value: stats.total_cards, color:"#059669", filter:"has_card" },
          { label: t("idc_no_card"),  value: stats.no_card,    color:"#dc2626", filter:"no_card" },
          { label: t("idc_printed"),  value: stats.printed,    color:"#7c3aed", filter:"printed" },
        ].map(s => {
          const isActive = cardFilter === s.filter;
          return (
            <div
              key={s.label}
              className={`idc-stat-box idc-stat-btn${isActive ? " idc-stat-active" : ""}`}
              style={isActive ? { borderColor: s.color, boxShadow: `0 0 0 2px ${s.color}22` } : {}}
              onClick={() => applyFilter(s.filter)}
            >
              <div className="idc-stat-val" style={{ color: s.color }}>{s.value}</div>
              <div className="idc-stat-lbl">{s.label}</div>
              {isActive && <div className="idc-stat-active-dot" style={{ background: s.color }} />}
            </div>
          );
        })}
      </div>

      {/* ── Return stats (resigned employees) ── */}
      <div className="idc-return-section">
        <div className="idc-return-label">
          <span className="idc-return-icon">⚠</span>
          {t("idc_return_label")}
        </div>
        <div className="idc-return-stats">
          {[
            { label: t("idc_has_card_resigned"), value: stats.resigned_with_card, color:"#f59e0b", filter:"" },
            { label: t("idc_returned"),           value: stats.card_returned,      color:"#059669", filter:"returned" },
            { label: t("idc_not_returned"),       value: stats.not_returned,       color:"#dc2626", filter:"not_returned" },
          ].map(s => {
            const isActive = cardFilter === s.filter && s.filter !== "";
            return (
              <div
                key={s.label}
                className={`idc-return-box${s.filter ? " idc-stat-btn" : ""}${isActive ? " idc-stat-active" : ""}`}
                style={isActive ? { borderColor: s.color, boxShadow: `0 0 0 2px ${s.color}22` } : {}}
                onClick={s.filter ? () => applyFilter(s.filter) : undefined}
              >
                <div className="idc-return-val" style={{ color: s.color }}>{s.value}</div>
                <div className="idc-return-lbl">{s.label}</div>
                {isActive && <div className="idc-stat-active-dot" style={{ background: s.color }} />}
              </div>
            );
          })}
        </div>
      </div>

      {selectMode && (
        <div className="idc-select-banner">
          {t("idc_selected_n").replace("{n}", selectedIds.size)}
          {selectedWithCard > 0 && ` · ${selectedWithCard} ${t("idc_printable")}`}
        </div>
      )}

      {loading ? (
        <div className="idc-loading">Loading...</div>
      ) : employees.length === 0 ? (
        <div className="idc-empty">{t("idc_no_data")}</div>
      ) : (
        <div className="idc-grid">
          {employees.map(emp => {
            const isSel = selectedIds.has(emp.employee_id);
            return (
              <div
                key={emp.employee_id}
                className={`idc-item${isSel ? " idc-item-selected" : ""}${selectMode ? " idc-item-selectable" : ""}`}
                onClick={selectMode ? () => toggleSelect(emp.employee_id) : undefined}
              >
                {selectMode && (
                  <div className="idc-checkbox-wrap">
                    <div className={`idc-checkbox${isSel ? " idc-checkbox-checked" : ""}`}>
                      {isSel && <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>}
                    </div>
                  </div>
                )}
                <IDCard emp={emp} />
                {!selectMode && (
                  <div className="idc-actions">
                    {!emp.card_id ? (
                      <button className="idc-btn idc-btn-issue"
                        disabled={issuing === emp.employee_id}
                        onClick={() => handleIssue(emp.employee_id)}>
                        {issuing === emp.employee_id ? t("idc_creating") : t("idc_issue")}
                      </button>
                    ) : emp.status === "Resigned" ? (
                      /* ── Resigned employee — show return status ── */
                      emp.returned_at ? (
                        <div className="idc-returned-badge">
                          <span className="idc-returned-check">✓</span>
                          {t("idc_card_returned_badge")}
                          <div className="idc-returned-date">
                            {new Date(emp.returned_at).toLocaleDateString("en-GB",{day:"2-digit",month:"short",year:"numeric"})}
                          </div>
                        </div>
                      ) : (
                        <button
                          className="idc-btn idc-btn-return"
                          disabled={returning === emp.employee_id}
                          onClick={() => setConfirmReturn({ id: emp.employee_id, name: `${emp.firstname} ${emp.lastname}` })}
                        >
                          {returning === emp.employee_id ? t("idc_saving") : t("idc_receive")}
                        </button>
                      )
                    ) : (
                      <div className="idc-action-row">
                        <button className="idc-btn idc-btn-print" onClick={() => handlePrintOne(emp)}>
                          {t("idc_print_card")}
                        </button>
                        <button className="idc-btn idc-btn-delete"
                          onClick={() => setConfirmDel(emp.employee_id)} title={t("idc_delete_card")}>🗑</button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {confirmDel && (
        <ConfirmModal
          message={t("idc_confirm_del")}
          subMessage={t("idc_confirm_del_sub")}
          confirmLabel={t("idc_delete_card")} danger
          onConfirm={() => deleteCard(confirmDel)}
          onCancel={() => setConfirmDel(null)}
        />
      )}

      {confirmReturn && (
        <ConfirmModal
          message={`${t("idc_receive")} — ${confirmReturn.name}?`}
          subMessage={t("idc_confirm_return_sub")}
          confirmLabel={t("idc_confirm_return_btn")}
          danger={false}
          onConfirm={handleReturn}
          onCancel={() => setConfirmReturn(null)}
        />
      )}

      {totalPages > 1 && (
        <div className="idc-pagination">
          <button className="idc-pg-btn" disabled={page <= 1} onClick={() => setPage(p => p-1)}>{t("idc_prev")}</button>
          <span className="idc-pg-info">{t("idc_page_info").replace("{p}", page).replace("{total}", totalPages).replace("{n}", total)}</span>
          <button className="idc-pg-btn" disabled={page >= totalPages} onClick={() => setPage(p => p+1)}>{t("idc_next")}</button>
        </div>
      )}
    </div>
  );
}
