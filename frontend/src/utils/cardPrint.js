import { photoUrl as getPhotoUrl } from "../api";

const fmt   = (d) => d ? new Date(d).toLocaleDateString("en-GB", { day:"2-digit", month:"short", year:"numeric" }) : "–";
const fmtUp = (d) => fmt(d).toUpperCase();

/* ── Template definitions — maps role → card image + overlay colours ── */
const TEMPLATES = {
  Staff:      { key:"Staff",      img:"/id-card/IT_STAFF1.png?v=12",    panelBg:"#0c1a30", footBg:"#07101e", photoBorder:"#80bbf5" },
  Supervisor: { key:"Supervisor", img:"/id-card/supervisor1.png?v=12",  panelBg:"#091e19", footBg:"#05120d", photoBorder:"#55c8be" },
  Manager:    { key:"Manager",    img:"/id-card/manager1.png?v=12",     panelBg:"#110826", footBg:"#090518", photoBorder:"#b775fb" },
};

const TEMPLATE_RULES = [
  { re:/\b(manager|director|head|chief|president|ceo|vp|vice|executive|officer)\b/i,  key:"Manager"    },
  { re:/\b(supervisor|lead|senior)\b/i,                                                key:"Supervisor" },
];

export function getTemplate(emp) {
  const txt = `${emp.position || ""} ${emp.card_type || ""}`;
  for (const { re, key } of TEMPLATE_RULES) if (re.test(txt)) return TEMPLATES[key];
  return TEMPLATES.Staff;
}

/* Composes "Building 1 - Floor 3 - Room 201" from the employee's office
   building/floor/room, dropping whichever parts aren't set instead of
   leaving gaps like "Building 1 -  - Room 201". Falls back to "–" when
   none of the three are known. */
export function formatOfficeLocation(emp) {
  const parts = [
    emp.office_building && emp.office_building.trim(),
    emp.office_floor    && `Floor ${emp.office_floor}`,
    emp.office_room_no  && `Room ${emp.office_room_no}`,
  ].filter(Boolean);
  return parts.length ? parts.join(" - ") : "–";
}

/* ── Multi-card print at 54×85.7mm (ISO ID-1 card, portrait) ──
   Template overlay approach — matches the on-screen IDCard component in
   IdCard.jsx: the template art (cardPrint.js TEMPLATES) already bakes in
   the field labels, icons and role pill, so this only overlays the live
   photo + text VALUES at the same measured positions as idcard.css's
   .idc2-panel-name / .idc2-fv-* / .idc2-ftv-* (kept in px here on purpose —
   the print .card is 54×85.7mm, the exact same aspect ratio as the
   on-screen .idc2-card, so those pixel values line up identically). Do NOT
   redraw label/icon rows here — the old free-form layout duplicated what's
   already printed on the template image and overlapped it. */
function buildCardHtml(emp, baseUrl) {
  const photoUrl = getPhotoUrl(emp.photo);
  const hasCard  = !!emp.card_id;
  const tpl      = getTemplate(emp);
  const tplUrl   = `${baseUrl}${tpl.img}`;

  return `
<div class="page">
<div class="cut-zone">
<div class="card">
  <div class="card-bg" style="background-image:url('${tplUrl}')"></div>

  <!-- Real photo overlay — only rendered when employee has a photo -->
  ${photoUrl ? `
  <div class="photo-zone" style="outline:0.3mm solid ${tpl.photoBorder};outline-offset:-0.3mm;">
    <img src="${photoUrl}" crossorigin="anonymous" style="width:100%;height:100%;object-fit:cover;object-position:center top;display:block;"/>
  </div>` : ""}

  <div class="panel-name">${emp.firstname} ${emp.lastname}</div>
  <span class="fv fv-1">${emp.employee_code || "–"}</span>
  <span class="fv fv-2">${(emp.companies_name || "–").substring(0, 22)}</span>
  <span class="fv fv-3">${formatOfficeLocation(emp).substring(0, 20)}</span>
  <span class="fv fv-4">${emp.nationality || "–"}</span>

  <span class="ftv ftv-1">${hasCard ? (emp.card_status || "ACTIVE").toUpperCase() : "NO CARD"}</span>
  <span class="ftv ftv-2">${hasCard ? fmtUp(emp.issued_at) : "–"}</span>
  <span class="ftv ftv-3">${hasCard ? fmtUp(emp.valid_until) : "–"}</span>
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
  top: 18.8%;
  left: 50%;
  transform: translateX(-50%);
  width: 46.6%;
  height: 36.6%;
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
.fv-2 { top: 76.6%; } /* Company */
.fv-3 { top: 81.7%; } /* Office Location */
.fv-4 { top: 87.2%; } /* Nationality */

.ftv {
  position: absolute;
  top: 96%;
  transform: translateY(-50%);
  font-size: 6.5px; font-weight: 800; line-height: 1; color: #0c1a30;
  text-align: left; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.ftv-1 { left: 18.5%; width: 13%;   } /* Status */
.ftv-2 { left: 49%;   width: 12.5%; } /* Issued Date */
.ftv-3 { left: 83%;   width: 15.5%; } /* Valid Until */
</style>
</head>
<body>
${cardsHtml}
<script>window.onload=()=>{ window.print(); window.onafterprint=()=>window.close(); }</script>
</body></html>`;

  const w = window.open("", "_blank", "width=900,height=700");
  if (w) { w.document.write(html); w.document.close(); }
}
