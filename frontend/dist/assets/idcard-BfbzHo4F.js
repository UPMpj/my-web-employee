import{p as d}from"./index-CDvB6le1.js";const l=e=>e?new Date(e).toLocaleDateString("en-GB",{day:"2-digit",month:"short",year:"numeric"}):"–",n=e=>l(e).toUpperCase(),s={Staff:{key:"Staff",img:"/id-card/IT_STAFF1.png?v=9",panelBg:"#0c1a30",footBg:"#07101e",photoBorder:"#80bbf5"},Supervisor:{key:"Supervisor",img:"/id-card/supervisor1.png?v=9",panelBg:"#091e19",footBg:"#05120d",photoBorder:"#55c8be"},Manager:{key:"Manager",img:"/id-card/manager1.png?v=9",panelBg:"#110826",footBg:"#090518",photoBorder:"#b775fb"}},c=[{re:/\b(manager|director|head|chief|president|ceo|vp|vice|executive|officer)\b/i,key:"Manager"},{re:/\b(supervisor|lead|senior)\b/i,key:"Supervisor"}];function p(e){const t=`${e.position||""} ${e.card_type||""}`;for(const{re:i,key:o}of c)if(i.test(t))return s[o];return s.Staff}function h(e){const t=[e.office_building&&e.office_building.trim(),e.office_floor&&`Floor ${e.office_floor}`,e.office_room_no&&`Room ${e.office_room_no}`].filter(Boolean);return t.length?t.join(" - "):"–"}function f(e,t){const i=d(e.photo),o=!!e.card_id,a=p(e);return`
<div class="page">
<div class="cut-zone">
<div class="card">
  <div class="card-bg" style="background-image:url('${`${t}${a.img}`}')"></div>

  <!-- Real photo overlay — only rendered when employee has a photo -->
  ${i?`
  <div class="photo-zone" style="outline:0.3mm solid ${a.photoBorder};outline-offset:-0.3mm;">
    <img src="${i}" crossorigin="anonymous" style="width:100%;height:100%;object-fit:cover;object-position:center top;display:block;"/>
  </div>`:""}

  <div class="panel-name">${e.firstname} ${e.lastname}</div>
  <span class="fv fv-1">${e.employee_code||"–"}</span>
  <span class="fv fv-2">${(e.companies_name||"–").substring(0,22)}</span>
  <span class="fv fv-3">${h(e).substring(0,20)}</span>
  <span class="fv fv-4">${e.nationality||"–"}</span>

  <span class="ftv ftv-1">${o?(e.card_status||"ACTIVE").toUpperCase():"NO CARD"}</span>
  <span class="ftv ftv-2">${o?n(e.issued_at):"–"}</span>
  <span class="ftv ftv-3">${o?n(e.valid_until):"–"}</span>
</div>
</div>
</div>`}function g(e){const t=window.location.origin,o=`<!DOCTYPE html><html><head>
<meta charset="UTF-8"/>
<title>ID Cards</title>
<style>
* { box-sizing:border-box; margin:0; padding:0; -webkit-print-color-adjust:exact; print-color-adjust:exact; }
body { font-family:'Times New Roman','Saysettha OT',serif; }

@media screen {
  body { display:flex; flex-wrap:wrap; gap:0; padding:8mm; justify-content:center; background:#ccc; }
}
/* Sized to the physical card blank (85.7 x 54mm ID-1), not a paper sheet —
   this is what makes card printers (e.g. Goodcard XR260D) pick up the right
   page size instead of defaulting to A4 with the card shrunk into a corner.
   Each card gets its own page/feed: one physical card per print. */
@page { size: 54mm 85.7mm; margin: 0; }
@media print {
  body { background:#fff; display:block; }
  /* ~4% bleed, scaled uniformly (not +Xmm per side) so the 54:85.7 aspect
     ratio — and every hand-measured overlay position on top of it — stays
     exactly what it was. Some driver/printer combos apply a small internal
     margin even with @page{margin:0}, which showed up as an unprinted
     white strip along two edges of the physical card. Rendering the card
     slightly larger than the nominal trim size and letting it overflow
     past the page box (clipped there, not by .card itself) means any such
     margin eats into the bleed instead of leaving blank card. A
     correctly-calibrated printer just clips the same excess it would
     anyway, so this can't make a good printer look worse. */
  /* Pinned to the exact @page size with overflow:hidden — this is what
     clips the bleed (below) to a single physical page. Without it, the
     card's bleed overflow had nothing to stop it, so the spill past the
     bottom/right edges pushed onto a second printed page per card. */
  .page {
    width: 54mm; height: 85.7mm;
    overflow: hidden;
    position: relative;
    break-after: page; page-break-after: always;
  }
  .page:last-child { break-after: auto; page-break-after: auto; }
  .cut-zone {
    border:none !important; padding: 0 !important;
    width: 56.16mm; height: 89.13mm;
    margin: -1.71mm 0 0 -1.08mm;
  }
  .card {
    width: 56.16mm !important; height: 89.13mm !important;
    border-radius: 0 !important; box-shadow: none !important;
    /* the physical card blank already has die-cut rounded corners —
       rounding them again in software just risks a corner mismatch */
  }
}

.cut-zone {
  padding: 1.5mm;
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

/* Photo overlay — position/size matched to idcard.css's .idc2-photo-upload-area
   so the printed card lines up with the on-screen preview. */
.photo-zone {
  position: absolute;
  top: 19.86%;
  left: 50%;
  transform: translateX(-50%);
  width: 46.6%;
  height: 36.07%;
  border-radius: 2mm;
  overflow: hidden;
}

/* ── Value overlay — the template art bakes in every label/icon/pill, so
   only the live values are positioned here. Percentages copied straight
   from idcard.css's .idc2-panel-name / .idc2-fv-* / .idc2-ftv-* — the print
   .card is the same 54:85.7 aspect ratio as the on-screen .idc2-card, and
   px is a fixed physical unit (1px = 1/96in) so these line up identically
   whether the box is sized in mm (print) or auto (screen). ── */
.panel-name {
  position: absolute;
  top: 57%; left: 4%; right: 4%;
  color: #fff; font-size: 10.5px; font-weight: 800; line-height: 1.4;
  text-align: center; white-space: nowrap;
  /* Lao names can stack a tone mark on top of a vowel that's already above
     the consonant (e.g. ີ + ້) — overflow-x stays hidden so the ellipsis
     truncation on long names still works, but overflow-y must stay visible
     or that tall stacked mark gets sliced off. Matches idc2-panel-name in
     idcard.css so print output matches the on-screen preview. */
  overflow-x: hidden; overflow-y: visible; text-overflow: ellipsis;
}
.fv {
  position: absolute;
  left: 20.5%; width: 35%;
  transform: translateY(-50%);
  font-size: 6.5px; font-weight: 700; line-height: 1; color: #fff;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.fv-1 { top: 71.6%; } /* Employee ID */
.fv-2 { top: 78.3%; } /* Company */
.fv-3 { top: 85.0%; } /* Office Location */
.fv-4 { top: 91.4%; } /* Nationality */

.ftv {
  position: absolute;
  top: 97%;
  transform: translateY(-50%);
  font-size: 5px; font-weight: 700; line-height: 1; color: #0c1a30;
  text-align: left; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.ftv-1 { left: 13.5%;  width: 16%; } /* Status */
.ftv-2 { left: 43.6%;  width: 17%; } /* Issued Date */
.ftv-3 { left: 79.3%;  width: 19%; } /* Valid Until */
</style>
</head>
<body>
${e.map(r=>f(r,t)).join(`
`)}
<script>window.onload=()=>{ window.print(); window.onafterprint=()=>window.close(); }<\/script>
</body></html>`,a=window.open("","_blank","width=900,height=700");a&&(a.document.write(o),a.document.close())}export{h as f,p as g,g as p};
