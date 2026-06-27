import jsPDF from "jspdf";
import html2canvas from "html2canvas";

/* ── Company letterhead — fixed for this org, drop the logo file in
   frontend/public/company-logo.png (used for both the header mark and
   the faint background watermark) ── */
export const COMPANY = {
  nameLo: "ບໍລິສັດ ສາມັກຄິ ບໍລິຫານຈັດການ ອະສັງຫາລິມະຊັບ ຈຳກັດ",
  nameEn: "UNITED PROPERTIES MANAGEMENT CO., LTD",
  locationLo: "ນະຄອນຫຼວງວຽງຈັນ",
  locationEn: "Vientiane Capital",
  logo: "/company-logo.png",
};

const LAO_MONTHS = [
  "ມັງກອນ", "ກຸມພາ", "ມີນາ", "ເມສາ", "ພຶດສະພາ", "ມິຖຸນາ",
  "ກໍລະກົດ", "ສິງຫາ", "ກັນຍາ", "ຕຸລາ", "ພະຈິກ", "ທັນວາ",
];

const formatDateLo = (d) => `ວັນທີ ${d.getDate()} ${LAO_MONTHS[d.getMonth()]} ${d.getFullYear()}`;
const formatDateEn = (d) => d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });

export const escapeHtml = (v) => String(v ?? "").replace(/[&<>"']/g, (ch) => (
  { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]
));

/* ── A4 page geometry, in px @96dpi — shared by the print window and the
   off-screen jsPDF render so both paths render identical markup ── */
const PAGE_H = 1123; // px @96dpi equivalent of 297mm, used only for the row-capacity estimate below
const PAD = 56;
const CONTENT_H = PAGE_H - PAD * 2;
const ROW_H = 32;
const THEAD_H = 36;
const FOOTER_RESERVE = 36;
const HEADER_FULL_H = 195; // grew with the larger title/brand font sizes
const HEADER_COND_H = 56;
const SUMMARY_H = 200;
const SAFETY_MARGIN = 80; // absorbs estimation error in the heights above so a logical page never spills onto a second physical page

/* Rows with long names/positions wrap onto a 2nd line, so a flat row-height
   constant under/over-estimates how many rows actually fit per page. Render
   the real table off-screen and measure each <tr> instead. Falls back to the
   flat estimate when no layout engine is available (e.g. unit tests under
   jsdom/happy-dom, which report 0 for every getBoundingClientRect height). */
function measureRowHeights(columns, rows) {
  if (rows.length === 0) return [];
  const container = document.createElement("div");
  container.style.position = "fixed";
  container.style.top = "0";
  container.style.left = "-99999px";
  container.style.width = "210mm";
  document.body.appendChild(container);
  container.innerHTML = `<style>${REPORT_STYLES}</style>${renderTable(columns, rows, 0)}`;
  const trs = container.querySelectorAll("table.rpt-table tbody tr");
  let heights = Array.from(trs).map(tr => tr.getBoundingClientRect().height);
  document.body.removeChild(container);
  if (heights.every(h => h === 0)) heights = rows.map(() => ROW_H);
  return heights;
}

function paginateRows(columns, rows) {
  const heights = measureRowHeights(columns, rows);
  const pages = [];
  let idx = 0;
  let isFirst = true;
  while (idx < rows.length || pages.length === 0) {
    const headerH = isFirst ? HEADER_FULL_H : HEADER_COND_H;
    const budgetNoSummary = CONTENT_H - SAFETY_MARGIN - headerH - FOOTER_RESERVE - THEAD_H;
    const budgetWithSummary = budgetNoSummary - SUMMARY_H;

    let restSum = 0;
    for (let i = idx; i < heights.length; i++) restSum += heights[i];

    if (restSum <= budgetWithSummary) {
      pages.push({ rows: rows.slice(idx), isFirst, isLast: true });
      idx = rows.length;
    } else {
      let used = 0, count = 0;
      while (idx + count < heights.length && used + heights[idx + count] <= budgetNoSummary) {
        used += heights[idx + count];
        count++;
      }
      if (count === 0) count = 1; // always make forward progress, even if one row alone overflows the estimate
      pages.push({ rows: rows.slice(idx, idx + count), isFirst, isLast: false });
      idx += count;
    }
    isFirst = false;
  }
  return pages;
}

function renderHeader(isFirst, title) {
  if (isFirst) {
    return `
      <div class="rpt-header">
        <div class="rpt-brand">
          <img class="rpt-logo" src="${COMPANY.logo}" onerror="this.style.display='none'" />
          <div class="rpt-brand-text">
            <div class="lo">${escapeHtml(COMPANY.nameLo)}</div>
            <div class="en">${escapeHtml(COMPANY.nameEn)}</div>
          </div>
        </div>
        <div class="rpt-date">
          <div>${escapeHtml(COMPANY.locationLo)}, ${escapeHtml(formatDateLo(new Date()))}</div>
          <div>${escapeHtml(COMPANY.locationEn)}, ${escapeHtml(formatDateEn(new Date()))}</div>
        </div>
      </div>
      <div class="rpt-rule"></div>
      <div class="rpt-title">
        <div class="lo">${escapeHtml(title.lo)}</div>
        <div class="en">${escapeHtml(title.en)}</div>
        <div class="rpt-title-rule"></div>
      </div>`;
  }
  return `
    <div class="rpt-cont-header">
      <span>${escapeHtml(COMPANY.nameEn)}</span>
      <span>${escapeHtml(title.en)} (cont.)</span>
    </div>`;
}

function renderTable(columns, rows, startIndex) {
  const head = `<tr><th class="rpt-num">#</th>${columns.map(c =>
    `<th>${escapeHtml(c.headerLo)} / ${escapeHtml(c.headerEn)}</th>`
  ).join("")}</tr>`;
  const body = rows.length === 0
    ? `<tr><td class="rpt-empty" colspan="${columns.length + 1}">ບໍ່ມີຂໍ້ມູນ</td></tr>`
    : rows.map((r, i) => `<tr><td class="rpt-num">${startIndex + i + 1}</td>${
        columns.map(c => `<td>${escapeHtml(c.render(r))}</td>`).join("")
      }</tr>`).join("");
  return `<table class="rpt-table"><thead>${head}</thead><tbody>${body}</tbody></table>`;
}

function renderSummary(summaryLines) {
  return `
    <div class="rpt-summary">
      ${summaryLines.map(line => `<div>${line}</div>`).join("")}
    </div>
    <div class="rpt-sign">
      <div class="rpt-sign-title">ຜູ້ອຳນວຍການບໍລິສັດ</div>
      <div class="rpt-sign-line">ລາຍເຊັນ: ..........................................</div>
      <div class="rpt-sign-line">ຊື່ເຕັມ: ..........................................</div>
      <div class="rpt-sign-line">ວັນທີ: ..........................................</div>
    </div>`;
}

function renderPage({ isFirst, isLast, title, columns, rows, startIndex, pageNum, totalPages, summaryLines }) {
  return `
    <div class="report-page">
      <img class="rpt-watermark" src="${COMPANY.logo}" onerror="this.style.display='none'" />
      <div class="rpt-content">
        ${renderHeader(isFirst, title)}
        ${renderTable(columns, rows, startIndex)}
        ${isLast ? renderSummary(summaryLines) : ""}
      </div>
      <div class="rpt-footer-page">ໜ້າ ${pageNum}/${totalPages}</div>
    </div>`;
}

export const REPORT_STYLES = `
@import url('https://fonts.googleapis.com/css2?family=Noto+Serif+Lao:wght@400;600;700&family=Noto+Sans+Lao:wght@400;500;600;700&display=swap');
* { box-sizing: border-box; }
body { margin: 0; font-family: 'Noto Serif Lao','Noto Sans Lao','Times New Roman',serif; }
.report-page {
  width: 210mm; min-height: 297mm; padding: ${PAD}px;
  position: relative; background: #fff; overflow: hidden;
  page-break-after: always;
}
.report-page:last-child { page-break-after: auto; }
.rpt-watermark {
  position: absolute; top: 78%; left: 50%; width: 260px; height: 260px;
  transform: translate(-50%, -50%); opacity: .07; z-index: 0;
  pointer-events: none; object-fit: contain;
}
.rpt-content { position: relative; z-index: 1; }
.rpt-header { display: flex; justify-content: space-between; align-items: flex-start; }
.rpt-brand { display: flex; gap: 10px; align-items: center; }
.rpt-logo { width: 66px; height: auto; flex-shrink: 0; }
.rpt-brand-text .lo { font-size: 17px; font-weight: 700; color: #2f4aad; line-height: 1.35; }
.rpt-brand-text .en { font-size: 12px; font-weight: 700; color: #2f4aad; letter-spacing: .2px; }
.rpt-date { text-align: right; font-size: 10.5px; color: #555; line-height: 1.6; }
.rpt-rule { height: 2px; background: #2f4aad; margin: 8px 0 14px; }
.rpt-title { text-align: center; margin-bottom: 14px; }
.rpt-title .lo { font-size: 27px; font-weight: 700; color: #2f4aad; }
.rpt-title .en { font-size: 17px; font-weight: 600; color: #2f4aad; margin-top: 2px; }
.rpt-title-rule { width: 120px; height: 2px; background: #2f4aad; margin: 6px auto 0; }
.rpt-cont-header {
  display: flex; justify-content: space-between; font-size: 10px; color: #2f4aad;
  font-weight: 700; border-bottom: 1px solid #2f4aad; padding-bottom: 6px; margin-bottom: 12px;
}
table.rpt-table { width: 100%; border-collapse: collapse; font-size: 10.5px; }
table.rpt-table th { background: #2f4aad; color: #fff; font-weight: 700; padding: 7px 8px; text-align: left; border: 1px solid #2f4aad; }
table.rpt-table td { padding: 6px 8px; border: 1px solid #d8dee8; color: #1f2937; background: #fff; }
table.rpt-table tr:nth-child(even) td { background: #f4f6fb; }
.rpt-num { text-align: center; color: #6b7280; width: 28px; }
.rpt-empty { text-align: center; color: #9ca3af; padding: 16px; }
.rpt-footer-page { position: absolute; bottom: 18px; left: 0; right: 0; text-align: center; font-size: 9.5px; color: #6b7280; }
.rpt-summary { margin-top: 16px; font-size: 11px; color: #1f2937; line-height: 1.8; }
.rpt-sign { margin-top: 40px; text-align: right; font-size: 11px; }
.rpt-sign-title { font-weight: 700; margin-bottom: 30px; }
.rpt-sign-line { margin: 8px 0; }
@page { size: A4; margin: 0; }
@media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
`;

export function buildReportPages({ columns, rows, summaryLines, title }) {
  const chunks = paginateRows(columns, rows);
  const totalPages = chunks.length;
  let startIndex = 0;
  const pagesHtml = chunks.map((chunk, idx) => {
    const html = renderPage({
      isFirst: chunk.isFirst,
      isLast: chunk.isLast,
      title,
      columns,
      rows: chunk.rows,
      startIndex,
      pageNum: idx + 1,
      totalPages,
      summaryLines,
    });
    startIndex += chunk.rows.length;
    return html;
  });
  return { styles: REPORT_STYLES, pagesHtml };
}

export function preloadImage(src) {
  return new Promise((resolve) => {
    if (!src) { resolve(); return; }
    const img = new Image();
    img.onload = () => resolve();
    img.onerror = () => resolve();
    img.src = src;
  });
}

/* The Noto Serif/Sans Lao webfonts load from Google Fonts via @import — if we
   capture/print before they finish downloading, the browser silently falls
   back to the next font in the stack. Force-load them and wait. */
async function ensureFontsLoaded(doc) {
  if (!doc.fonts) return;
  try {
    await Promise.all([
      doc.fonts.load("400 16px 'Noto Serif Lao'"),
      doc.fonts.load("700 16px 'Noto Serif Lao'"),
      doc.fonts.load("400 16px 'Noto Sans Lao'"),
      doc.fonts.load("700 16px 'Noto Sans Lao'"),
    ]);
    await doc.fonts.ready;
  } catch {
    // best-effort — if the webfont fails to load (e.g. offline), the CSS
    // fallback (Times New Roman/serif) still renders something readable
  }
}

/* jsPDF's own .html() renders text with its built-in Latin-only fonts, which
   turns Lao characters into mojibake. Rasterizing each page with html2canvas
   first and embedding the result as a full-page image sidesteps that — the
   browser (not jsPDF) is what draws the Lao glyphs. */
export async function renderPagesToPdf({ styles, pagesHtml }) {
  const container = document.createElement("div");
  container.innerHTML = `<style>${styles}</style>`;
  container.style.position = "fixed";
  container.style.top = "0";
  container.style.left = "-10000px";
  document.body.appendChild(container);
  try {
    await preloadImage(COMPANY.logo);
    await ensureFontsLoaded(document);
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    for (let i = 0; i < pagesHtml.length; i++) {
      const wrap = document.createElement("div");
      wrap.innerHTML = pagesHtml[i];
      container.appendChild(wrap);
      const pageEl = wrap.firstElementChild;
      const canvas = await html2canvas(pageEl, { scale: 2, useCORS: true, backgroundColor: "#ffffff" });
      const imgData = canvas.toDataURL("image/jpeg", 0.92);
      if (i > 0) doc.addPage();
      doc.addImage(imgData, "JPEG", 0, 0, 210, 297);
      container.removeChild(wrap);
    }
    return doc;
  } finally {
    document.body.removeChild(container);
  }
}

/* window.open() + document.write() on the returned popup is blocked or silently
   no-ops in several real-world hosts (popup blockers, embedded/sandboxed
   webviews like VS Code's Simple Browser) — the popup opens but stays blank.
   A hidden same-page <iframe> sidesteps all of that: no popup permission is
   needed, and contentWindow.print() only prints the iframe's own document. */
export function printPages({ title, styles, pagesHtml }) {
  const iframe = document.createElement("iframe");
  iframe.style.position = "fixed";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "0";
  iframe.setAttribute("aria-hidden", "true");
  document.body.appendChild(iframe);

  let cleaned = false;
  const cleanup = () => {
    if (cleaned) return;
    cleaned = true;
    if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
  };

  iframe.onload = async () => {
    const win = iframe.contentWindow;
    await ensureFontsLoaded(win.document);
    win.addEventListener("afterprint", cleanup);
    win.focus();
    win.print();
  };
  setTimeout(cleanup, 60000); // safety net if afterprint never fires

  const doc = iframe.contentDocument;
  doc.open();
  doc.write(`<!DOCTYPE html><html><head><title>${escapeHtml(title)}</title><style>${styles}</style></head><body>${pagesHtml.join("")}</body></html>`);
  doc.close();
}
