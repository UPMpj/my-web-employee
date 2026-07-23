import{p as y}from"./index-DGM30qC5.js";const k=t=>t?new Date(t).toLocaleDateString("en-GB",{day:"2-digit",month:"short",year:"numeric"}):"–",d=t=>k(t).toUpperCase(),z=(t,e)=>`${(t==null?void 0:t[0])||""}${(e==null?void 0:e[0])||""}`.toUpperCase(),c={Staff:{key:"Staff",img:"/id-card/IT_STAFF1.png?v=3",panelBg:"#0c1a30",footBg:"#07101e"},Supervisor:{key:"Supervisor",img:"/id-card/supervisor1.png?v=3",panelBg:"#091e19",footBg:"#05120d"},Manager:{key:"Manager",img:"/id-card/manager1.png?v=3",panelBg:"#110826",footBg:"#090518"},Contractor:{key:"Contractor",img:"/id-card/constractor1.png?v=3",panelBg:"#1f1003",footBg:"#130800"},Vendor:{key:"Vendor",img:"/id-card/vender1.png?v=3",panelBg:"#181008",footBg:"#0e0900"},Visitor:{key:"Visitor",img:"/id-card/visitor1.png?v=3",panelBg:"#1c1c1c",footBg:"#111111"}},$=[{re:/\b(visitor|guest|temp(?:orary)?)\b/i,key:"Visitor"},{re:/\b(vendor|vender|supplier|retail|shop)\b/i,key:"Vendor"},{re:/\bcontract(or)?\b/i,key:"Contractor"},{re:/\b(manager|director|head|chief|president|ceo|vp|vice|executive|officer)\b/i,key:"Manager"},{re:/\b(supervisor|lead|senior)\b/i,key:"Supervisor"}];function C(t){const e=`${t.position||""} ${t.card_type||""}`;for(const{re:r,key:i}of $)if(r.test(e))return c[i];return c.Staff}function B(t,e){const r=y(t.photo);z(t.firstname,t.lastname);const i=!!t.card_id,o=C(t),n=`${e}${o.img}`,s=o.key==="Visitor",m=s?`<div class="panel-vname">${t.firstname} ${t.lastname}</div>`:`<div class="panel-name">${t.firstname} ${t.lastname}</div>`,a=(b,u,x)=>`
    <div class="prow">
      <div class="prow-icon">${b}</div>
      <div class="prow-txt">
        <span class="prow-lbl">${u}</span>
        <span class="prow-val">${x}</span>
      </div>
    </div>`,p='<svg viewBox="0 0 20 20" fill="currentColor" width="10" height="10"><path d="M10 2a4 4 0 1 0 0 8A4 4 0 0 0 10 2zm0 10c-5 0-8 2-8 3v1h16v-1c0-1-3-3-8-3z"/></svg>',h='<svg viewBox="0 0 20 20" fill="currentColor" width="10" height="10"><path d="M2 19V4h7v15H2zm9-11h7v11h-7V8zM5 6h3v2H5V6zm0 4h3v2H5v-2zm0 4h3v2H5v-2zm7 2h2v2h-2v-2zm0-4h2v2h-2v-2z"/></svg>',g='<svg viewBox="0 0 20 20" fill="currentColor" width="10" height="10"><path d="M3 2v16H1V0h2v2zm0 0h12l-2 5 2 5H3V2z"/></svg>',v='<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" width="10" height="10"><rect x="1" y="4" width="18" height="12" rx="2"/><line x1="1" y1="8" x2="19" y2="8"/></svg>',f='<svg viewBox="0 0 20 20" fill="currentColor" width="10" height="10"><path d="M10 2a5 5 0 0 1 5 5c0 3.5-5 11-5 11S5 10.5 5 7a5 5 0 0 1 5-5zm0 3a2 2 0 1 0 0 4 2 2 0 0 0 0-4z"/></svg>',w='<svg viewBox="0 0 20 20" fill="currentColor" width="6.5" height="6.5"><path d="M10 1l7 3v6c0 5-7 9-7 9s-7-4-7-9V4l7-3z"/></svg>',l='<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" width="6.5" height="6.5"><rect x="2" y="4" width="16" height="14" rx="2"/><line x1="2" y1="8" x2="18" y2="8"/><line x1="6" y1="2" x2="6" y2="6"/><line x1="14" y1="2" x2="14" y2="6"/></svg>';return`
<div class="cut-zone">
<div class="card">
  <div class="card-bg" style="background-image:url('${n}')"></div>

  <!-- Real photo overlay — only rendered when employee has a photo -->
  ${r?`
  <div class="photo-zone${s?" photo-zone-v":""}">
    <img src="${r}" crossorigin="anonymous" style="width:100%;height:100%;object-fit:cover;object-position:center top;display:block;"/>
  </div>`:""}

  <!-- Data panel -->
  <div class="data-panel">
    ${m}
    <div class="info-rows">
      ${a(p,"EMPLOYEE ID",t.employee_code||"–")}
      ${a(h,"COMPANY",(t.companies_name||"–").substring(0,18))}
      ${a(g,"NATIONALITY",t.nationality||"–")}
      ${a(v,"DOCUMENT ID.",i?t.card_no:"Not Issued")}
      ${a(f,"LOCATION",(t.office_building||"–").substring(0,18))}
    </div>
  </div>

  <!-- Footer -->
  <div class="card-footer">
    <div class="ft-item">
      <div class="ft-icon">${w}</div>
      <div class="ft-txt">
        <div class="ft-lbl">STATUS</div>
        <div class="ft-val">${i?(t.card_status||"ACTIVE").toUpperCase():"NO CARD"}</div>
      </div>
    </div>
    <div class="ft-dot"></div>
    <div class="ft-item">
      <div class="ft-icon">${l}</div>
      <div class="ft-txt">
        <div class="ft-lbl">ISSUED DATE</div>
        <div class="ft-val">${i?d(t.issued_at):"–"}</div>
      </div>
    </div>
    <div class="ft-dot"></div>
    <div class="ft-item">
      <div class="ft-icon">${l}</div>
      <div class="ft-txt">
        <div class="ft-lbl">VALID UNTIL</div>
        <div class="ft-val">${i?d(t.valid_until):"–"}</div>
      </div>
    </div>
  </div>

</div>
</div>`}function S(t){const e=window.location.origin,i=`<!DOCTYPE html><html><head>
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

/* Card uses template as background — sized to the real ID-1 blank (85.7 x 54mm) */
.card {
  width: 54mm;
  height: 85.7mm;
  position: relative;
  border-radius: 3.2mm;
  overflow: hidden;
  box-shadow: 0 2mm 6mm rgba(0,0,0,.25);
  flex-shrink: 0;
  -webkit-print-color-adjust: exact;
  print-color-adjust: exact;
}

/* Background layer — stretched to fill the corrected card ratio exactly (no cropping),
   brightened separately from the text/photo layers so labels stay readable when printed. */
.card-bg {
  position: absolute;
  inset: 0;
  background-size: 100% 100%;
  background-position: top center;
  background-repeat: no-repeat;
  filter: brightness(1.22) saturate(1.05);
  -webkit-print-color-adjust: exact;
  print-color-adjust: exact;
}

/* Photo overlay — matched to the placeholder frame drawn into the template art
   (precisely measured at top:18% bottom:41% left:30% right:70%), with a small
   overshoot so the real photo fully covers the frame with no artwork peeking
   out from behind it. */
.photo-zone {
  position: absolute;
  top: 17.7%;
  left: 50%;
  transform: translateX(-50%);
  width: 40.6%;
  height: 23.6%;
  border-radius: 2mm;
  overflow: hidden;
}
.photo-zone-v {
  top: 23%;
  width: 38%;
  height: 21%;
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
  top: 55%; left: 0; right: 0; bottom: 9%;
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
  color:#fff; font-size:10.5pt; font-weight:800; line-height:1.15;
  text-align:center; white-space:nowrap; overflow:hidden;
  text-overflow:ellipsis; width:100%; margin-bottom:0.7mm;
  flex-shrink: 0;
}
.panel-vname {
  color:#fff; font-size:8.5pt; font-weight:700; line-height:1.15;
  text-align:center; opacity:.85; margin-bottom:1.2mm;
  flex-shrink: 0;
}
.info-rows {
  width:100%; display:flex; flex-direction:column; gap:0.8mm; flex:1; margin-left:1mm;
  position:relative;
}
.info-rows::before {
  content:"";
  position:absolute;
  top:1.8mm; bottom:1.8mm;
  left:4.1mm;
  width:0.15mm;
  background:rgba(255,255,255,.55);
}
.prow { display:flex; align-items:center; gap:1.4mm; padding:0 0.5mm; position:relative; }
.prow::after {
  content:"";
  position:absolute;
  top:50%;
  left:4.1mm;
  width:1.4mm;
  height:0.15mm;
  background:rgba(255,255,255,.55);
  transform:translateY(-50%);
}
.prow-icon {
  width:3.6mm; height:3.6mm; border-radius:50%;
  background:rgba(255,255,255,.1); border:0.3mm solid rgba(255,255,255,.15);
  display:flex; align-items:center; justify-content:center;
  flex-shrink:0; color:rgba(255,255,255,.7);
}
.prow-txt { display:flex; flex-direction:column; min-width:0; }
.prow-lbl { font-size:4pt; color:rgba(255,255,255,.5); letter-spacing:.3px; font-weight:600; }
.prow-val { font-size:7.5pt; font-weight:700; color:rgba(255,255,255,.95); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }

/* Footer — 3 items must share one narrow 54mm-wide row, so sizing here is
   tighter than the vertical info rows above (less horizontal room). */
.card-footer {
  position:absolute; bottom:0; left:0; right:0; height:9%;
  display:flex; align-items:center; justify-content:space-between; padding:0 1.5mm;
}
.ft-item { display:flex; align-items:center; gap:.7mm; position:relative; top:.7mm; min-width:0; flex-shrink:1; }
.ft-icon {
  width:3mm; height:3mm; border-radius:50%;
  background:rgba(0,0,0,.08); border:.15mm solid rgba(0,0,0,.18);
  display:flex; align-items:center; justify-content:center;
  flex-shrink:0; color:#000;
}
.ft-txt  { display:flex; flex-direction:column; min-width:0; }
.ft-dot  { width:.8mm; height:.8mm; border-radius:50%; background:rgba(255,255,255,.3); }
.ft-lbl  { font-size:3.2pt; color:rgba(0,0,0,.6); letter-spacing:.3px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.ft-val  { font-size:5.5pt; font-weight:700; color:#000; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
</style>
</head>
<body>
${t.map(n=>B(n,e)).join(`
`)}
<script>window.onload=()=>{ window.print(); window.onafterprint=()=>window.close(); }<\/script>
</body></html>`,o=window.open("","_blank","width=900,height=700");o&&(o.document.write(i),o.document.close())}export{C as g,S as p};
