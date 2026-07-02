import { photoUrl as getPhotoUrl } from "../api";

const fmt   = (d) => d ? new Date(d).toLocaleDateString("en-GB", { day:"2-digit", month:"short", year:"numeric" }) : "–";
const fmtUp = (d) => fmt(d).toUpperCase();
const initials = (f, l) => `${f?.[0] || ""}${l?.[0] || ""}`.toUpperCase();

/* ── Template definitions — maps role → card image + overlay colours ── */
const TEMPLATES = {
  Staff:      { key:"Staff",      img:"/id-card/IT_STAFF1.png?v=3",    panelBg:"#0c1a30", footBg:"#07101e" },
  Supervisor: { key:"Supervisor", img:"/id-card/supervisor1.png?v=3",  panelBg:"#091e19", footBg:"#05120d" },
  Manager:    { key:"Manager",    img:"/id-card/manager1.png?v=3",     panelBg:"#110826", footBg:"#090518" },
  Contractor: { key:"Contractor", img:"/id-card/constractor1.png?v=3", panelBg:"#1f1003", footBg:"#130800" },
  Vendor:     { key:"Vendor",     img:"/id-card/vender1.png?v=3",      panelBg:"#181008", footBg:"#0e0900" },
  Visitor:    { key:"Visitor",    img:"/id-card/visitor1.png?v=3",     panelBg:"#1c1c1c", footBg:"#111111" },
};

const TEMPLATE_RULES = [
  { re:/\b(visitor|guest|temp(?:orary)?)\b/i,                                          key:"Visitor"    },
  { re:/\b(vendor|vender|supplier|retail|shop)\b/i,                                    key:"Vendor"     },
  { re:/\bcontract(or)?\b/i,                                                           key:"Contractor" },
  { re:/\b(manager|director|head|chief|president|ceo|vp|vice|executive|officer)\b/i,  key:"Manager"    },
  { re:/\b(supervisor|lead|senior)\b/i,                                                key:"Supervisor" },
];

export function getTemplate(emp) {
  const txt = `${emp.position || ""} ${emp.card_type || ""}`;
  for (const { re, key } of TEMPLATE_RULES) if (re.test(txt)) return TEMPLATES[key];
  return TEMPLATES.Staff;
}

/* ── Multi-card print at 50×85mm ── */
function buildCardHtml(emp, baseUrl) {
  const photoUrl  = getPhotoUrl(emp.photo);
  const initStr   = initials(emp.firstname, emp.lastname);
  const hasCard   = !!emp.card_id;
  const tpl       = getTemplate(emp);
  const tplUrl    = `${baseUrl}${tpl.img}`;
  const isVisitor = tpl.key === "Visitor";

  const nameHtml = isVisitor
    ? `<div class="panel-vname">${emp.firstname} ${emp.lastname}</div>`
    : `<div class="panel-name">${emp.firstname} ${emp.lastname}</div>`;

  const pRow = (icon, lbl, val) => `
    <div class="prow">
      <div class="prow-icon">${icon}</div>
      <div class="prow-txt">
        <span class="prow-lbl">${lbl}</span>
        <span class="prow-val">${val}</span>
      </div>
    </div>`;

  const svgId   = `<svg viewBox="0 0 20 20" fill="currentColor" width="8" height="8"><path d="M10 2a4 4 0 1 0 0 8A4 4 0 0 0 10 2zm0 10c-5 0-8 2-8 3v1h16v-1c0-1-3-3-8-3z"/></svg>`;
  const svgBldg = `<svg viewBox="0 0 20 20" fill="currentColor" width="8" height="8"><path d="M2 19V4h7v15H2zm9-11h7v11h-7V8zM5 6h3v2H5V6zm0 4h3v2H5v-2zm0 4h3v2H5v-2zm7 2h2v2h-2v-2zm0-4h2v2h-2v-2z"/></svg>`;
  const svgFlag = `<svg viewBox="0 0 20 20" fill="currentColor" width="8" height="8"><path d="M3 2v16H1V0h2v2zm0 0h12l-2 5 2 5H3V2z"/></svg>`;
  const svgCard = `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" width="8" height="8"><rect x="1" y="4" width="18" height="12" rx="2"/><line x1="1" y1="8" x2="19" y2="8"/></svg>`;
  const svgPin  = `<svg viewBox="0 0 20 20" fill="currentColor" width="8" height="8"><path d="M10 2a5 5 0 0 1 5 5c0 3.5-5 11-5 11S5 10.5 5 7a5 5 0 0 1 5-5zm0 3a2 2 0 1 0 0 4 2 2 0 0 0 0-4z"/></svg>`;
  const svgShield = `<svg viewBox="0 0 20 20" fill="currentColor" width="6" height="6"><path d="M10 1l7 3v6c0 5-7 9-7 9s-7-4-7-9V4l7-3z"/></svg>`;
  const svgCal    = `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" width="6" height="6"><rect x="2" y="4" width="16" height="14" rx="2"/><line x1="2" y1="8" x2="18" y2="8"/><line x1="6" y1="2" x2="6" y2="6"/><line x1="14" y1="2" x2="14" y2="6"/></svg>`;

  return `
<div class="cut-zone">
<div class="card" style="background-image:url('${tplUrl}')">

  <!-- Real photo overlay — only rendered when employee has a photo -->
  ${photoUrl ? `
  <div class="photo-zone${isVisitor?" photo-zone-v":""}">
    <img src="${photoUrl}" crossorigin="anonymous" style="width:100%;height:100%;object-fit:cover;object-position:center top;display:block;"/>
  </div>` : ""}

  <!-- Data panel -->
  <div class="data-panel">
    ${nameHtml}
    <div class="info-rows">
      ${pRow(svgId,   "EMPLOYEE ID",  emp.employee_code || "–")}
      ${pRow(svgBldg, "COMPANY",      (emp.companies_name || "–").substring(0,18))}
      ${pRow(svgFlag, "NATIONALITY",  emp.nationality || "–")}
      ${pRow(svgCard, "DOCUMENT ID.", hasCard ? emp.card_no : "Not Issued")}
      ${pRow(svgPin,  "LOCATION",     (emp.office_building || "–").substring(0,18))}
    </div>
  </div>

  <!-- Footer -->
  <div class="card-footer">
    <div class="ft-item">
      <div class="ft-icon">${svgShield}</div>
      <div class="ft-txt">
        <div class="ft-lbl">STATUS</div>
        <div class="ft-val">${hasCard?(emp.card_status||"ACTIVE").toUpperCase():"NO CARD"}</div>
      </div>
    </div>
    <div class="ft-dot"></div>
    <div class="ft-item">
      <div class="ft-icon">${svgCal}</div>
      <div class="ft-txt">
        <div class="ft-lbl">ISSUED DATE</div>
        <div class="ft-val">${hasCard?fmtUp(emp.issued_at):"–"}</div>
      </div>
    </div>
    <div class="ft-dot"></div>
    <div class="ft-item">
      <div class="ft-icon">${svgCal}</div>
      <div class="ft-txt">
        <div class="ft-lbl">VALID UNTIL</div>
        <div class="ft-val">${hasCard?fmtUp(emp.valid_until):"–"}</div>
      </div>
    </div>
  </div>

</div>
</div>`;
}

export function printCards(empList) {
  const baseUrl   = window.location.origin;
  const cardsHtml = empList.map(e => buildCardHtml(e, baseUrl)).join("\n");

  const html = `<!DOCTYPE html><html><head>
<meta charset="UTF-8"/>
<title>ID Cards</title>
<style>
* { box-sizing:border-box; margin:0; padding:0; -webkit-print-color-adjust:exact; print-color-adjust:exact; }
body { font-family:'Times New Roman','Saysettha OT',serif; }

@media screen {
  body { display:flex; flex-wrap:wrap; gap:0; padding:8mm; justify-content:center; background:#ccc; }
}
@media print {
  @page { size: A4 portrait; margin: 6mm; }
  body { background:#fff; display:flex; flex-wrap:wrap; }
  .cut-zone { border:none !important; }
  .card { box-shadow:none !important; }
}

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

/* Card uses template as background */
.card {
  width: 50mm;
  height: 85mm;
  position: relative;
  border-radius: 4mm;
  overflow: hidden;
  box-shadow: 0 2mm 6mm rgba(0,0,0,.25);
  flex-shrink: 0;
  background-size: cover;
  background-position: top center;
  background-repeat: no-repeat;
  -webkit-print-color-adjust: exact;
  print-color-adjust: exact;
}

/* Photo overlay */
.photo-zone {
  position: absolute;
  top: 16.5%;
  left: 50%;
  transform: translateX(-50%);
  width: 41%;
  height: 32.5%;
  border-radius: 2mm;
  overflow: hidden;
}
.photo-zone-v {
  top: 21.5%;
  width: 41%;
  height: 24%;
  border-radius: 3mm;
}
.p-avatar {
  width:100%; height:100%;
  display:flex; align-items:center; justify-content:center;
  background:rgba(255,255,255,0.15); color:#fff;
  font-size:13pt; font-weight:800;
}

/* Data panel */
.data-panel {
  position: absolute;
  top: 55%; left: 0; right: 0; bottom: 8%;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 1mm 2mm 1mm;
}
.data-panel::before {
  content: "";
  position: absolute;
  top: -4mm; left: 0; right: 0;
  height: 4mm;
  background: inherit;
  mask-image: linear-gradient(to bottom, transparent, black);
  -webkit-mask-image: linear-gradient(to bottom, transparent, black);
  pointer-events: none;
}
.panel-name {
  color:#fff; font-size:8.5pt; font-weight:800;
  text-align:center; white-space:nowrap; overflow:hidden;
  text-overflow:ellipsis; width:100%; margin-bottom:0.5mm;
}
.panel-vname {
  color:#fff; font-size:7pt; font-weight:700;
  text-align:center; opacity:.85; margin-bottom:1mm;
}
.info-rows {
  width:100%; display:flex; flex-direction:column; gap:0.5mm; flex:1; margin-left:1mm;
  position:relative;
}
.info-rows::before {
  content:"";
  position:absolute;
  top:1.6mm; bottom:1.6mm;
  left:3.7mm;
  width:0.15mm;
  background:rgba(255,255,255,.55);
}
.prow { display:flex; align-items:center; gap:1.2mm; padding:0 0.5mm; position:relative; }
.prow::after {
  content:"";
  position:absolute;
  top:50%;
  left:3.7mm;
  width:1.2mm;
  height:0.15mm;
  background:rgba(255,255,255,.55);
  transform:translateY(-50%);
}
.prow-icon {
  width:3.2mm; height:3.2mm; border-radius:50%;
  background:rgba(255,255,255,.1); border:0.3mm solid rgba(255,255,255,.15);
  display:flex; align-items:center; justify-content:center;
  flex-shrink:0; color:rgba(255,255,255,.7);
}
.prow-txt { display:flex; flex-direction:column; min-width:0; }
.prow-lbl { font-size:3pt; color:rgba(255,255,255,.45); letter-spacing:.3px; font-weight:600; }
.prow-val { font-size:6pt; font-weight:700; color:rgba(255,255,255,.95); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }

/* Footer */
.card-footer {
  position:absolute; bottom:0; left:0; right:0; height:8%;
  display:flex; align-items:center; justify-content:space-between; padding:0 2mm;
}
.ft-item { display:flex; align-items:center; gap:.8mm; position:relative; top:.7mm; }
.ft-icon {
  width:3mm; height:3mm; border-radius:50%;
  background:rgba(0,0,0,.08); border:.15mm solid rgba(0,0,0,.18);
  display:flex; align-items:center; justify-content:center;
  flex-shrink:0; color:#000;
}
.ft-txt  { display:flex; flex-direction:column; }
.ft-dot  { width:.8mm; height:.8mm; border-radius:50%; background:rgba(255,255,255,.3); }
.ft-lbl  { font-size:3pt; color:rgba(0,0,0,.6); letter-spacing:.3px; }
.ft-val  { font-size:5pt; font-weight:700; color:#000; }
</style>
</head>
<body>
${cardsHtml}
<script>window.onload=()=>{ window.print(); window.onafterprint=()=>window.close(); }</script>
</body></html>`;

  const w = window.open("", "_blank", "width=900,height=700");
  if (w) { w.document.write(html); w.document.close(); }
}
