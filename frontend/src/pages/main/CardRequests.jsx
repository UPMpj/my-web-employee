import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../../api";
import { useLanguage } from "../../context/LanguageContext";
import toast from "react-hot-toast";
import { printCards } from "../../utils/cardPrint";
import {
  companyAvatarColor, companyInitials, requestNo, fmtDate, STATUS_META, displayStatus,
} from "../../utils/cardRequestHelpers";
import SkeletonLoader from "../../components/SkeletonLoader";
import "./idcard.css";
import "./card-requests.css";

const IconEye = () => (
  <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);
const IconDownload = () => (
  <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 3v12m0 0l-4-4m4 4l4-4" />
    <path d="M5 19h14" />
  </svg>
);
const IconReport = () => (
  <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="5" y="2" width="14" height="20" rx="2" />
    <line x1="9" y1="7" x2="15" y2="7" />
    <line x1="9" y1="11" x2="15" y2="11" />
    <line x1="9" y1="15" x2="12" y2="15" />
  </svg>
);
const IconPrint = () => (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 9V2h12v7" />
    <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
    <rect x="6" y="14" width="12" height="8" />
  </svg>
);
const IconClose = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);
const IconTrash = () => (
  <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
    <path d="M10 11v6M14 11v6" />
    <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
  </svg>
);

function fmt(n) {
  return Number(n).toLocaleString("lo-LA");
}

const STATUS_LO = { pending: "ລໍຖ້າ", approved: "ອະນຸມັດ", printed: "ພິມແລ້ວ", issued: "ອອກແລ້ວ", completed: "ສຳເລັດ" };

const CARD_TYPE_COLORS = {
  "Manager Card":    { color: "#5b21b6", bg: "#ede9fe" },
  "Supervisor Card": { color: "#0a6e5a", bg: "#d1fae5" },
  "Staff Card":      { color: "#1a3a6b", bg: "#dbeafe" },
  "Contractor Card": { color: "#b45309", bg: "#fef3c7" },
  "Temporary Card":  { color: "#6b7280", bg: "#f3f4f6" },
  "Shop Card":       { color: "#9f1239", bg: "#ffe4e6" },
  "Visitor Card":    { color: "#374151", bg: "#f3f4f6" },
};

function buildPrintHtml({ grouped, pricePerCard, dateFrom, dateTo, grandTotal, totalCards }) {
  const today = fmtDate(new Date().toISOString());

  const groupSections = grouped.map(({ companyName, companyId, batches }) => {
    const companyCards = batches.reduce((s, b) => s + (b.total_count || 0), 0);
    const companyTotal = companyCards * pricePerCard;
    const avatarBg = companyAvatarColor(companyId);
    const initials = companyInitials(companyName);

    const batchRows = batches.map((b, bi) => {
      const ds = displayStatus(b);
      const statusLo = STATUS_LO[ds] || ds;
      const subtotal = (b.total_count || 0) * pricePerCard;
      const employees = b.employees_json || [];

      const empRows = employees.map((e, ei) => {
        const ct = e.cardType || "Staff Card";
        const ctm = CARD_TYPE_COLORS[ct] || CARD_TYPE_COLORS["Staff Card"];
        return `<tr style="background:${ei % 2 === 0 ? "#fafbff" : "#fff"}">
          <td style="padding:5px 10px;color:#9ca3af;">${bi + 1}.${ei + 1}</td>
          <td style="padding:5px 10px;">${e.employee_code || "–"}</td>
          <td style="padding:5px 10px;font-weight:600;">${e.firstname || ""} ${e.lastname || ""}</td>
          <td style="padding:5px 10px;color:#6b7280;">${e.position || "–"}</td>
          <td style="padding:5px 10px;">
            <span style="background:${ctm.bg};color:${ctm.color};padding:2px 8px;border-radius:10px;font-size:11px;font-weight:600;">${ct}</span>
          </td>
        </tr>`;
      }).join("");

      return `
        <div style="margin-bottom:16px;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;">
          <div style="display:flex;justify-content:space-between;align-items:center;padding:10px 14px;background:#f8faff;border-bottom:1px solid #e5e7eb;">
            <div style="display:flex;align-items:center;gap:10px;">
              <span style="font-weight:700;color:#2f4aad;">${requestNo(b)}</span>
              <span style="color:#6b7280;font-size:12px;">${fmtDate(b.created_at)}</span>
              <span style="background:${STATUS_META[ds]?.bg || "#e5e7eb"};color:${STATUS_META[ds]?.color || "#6b7280"};padding:2px 10px;border-radius:10px;font-size:11px;font-weight:600;">${statusLo}</span>
            </div>
            <div style="text-align:right;">
              <span style="font-size:12px;color:#6b7280;">${b.total_count} ໃບ × ${fmt(pricePerCard)} = </span>
              <span style="font-weight:700;color:#2f4aad;">${fmt(subtotal)} LAK</span>
            </div>
          </div>
          <table style="width:100%;border-collapse:collapse;font-size:12px;">
            <thead>
              <tr style="background:#f0f4ff;">
                <th style="padding:6px 10px;text-align:left;color:#6b7280;font-weight:600;">#</th>
                <th style="padding:6px 10px;text-align:left;color:#6b7280;font-weight:600;">ລະຫັດ</th>
                <th style="padding:6px 10px;text-align:left;color:#6b7280;font-weight:600;">ຊື່-ນາມສະກຸນ</th>
                <th style="padding:6px 10px;text-align:left;color:#6b7280;font-weight:600;">ຕຳແໜ່ງ</th>
                <th style="padding:6px 10px;text-align:left;color:#6b7280;font-weight:600;">ປະເພດບັດ</th>
              </tr>
            </thead>
            <tbody>${empRows}</tbody>
          </table>
        </div>`;
    }).join("");

    return `
      <div style="margin-bottom:32px;page-break-inside:avoid;">
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:14px;padding-bottom:10px;border-bottom:2px solid #2f4aad;">
          <div style="width:36px;height:36px;border-radius:50%;background:${avatarBg};display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700;font-size:14px;flex-shrink:0;">${initials}</div>
          <div>
            <div style="font-size:16px;font-weight:800;color:#1f2937;">${companyName}</div>
            <div style="font-size:12px;color:#6b7280;">${batches.length} Request · ${companyCards} ໃບ</div>
          </div>
          <div style="margin-left:auto;text-align:right;">
            <div style="font-size:12px;color:#6b7280;">ຍອດລວມ</div>
            <div style="font-size:18px;font-weight:800;color:#2f4aad;">${fmt(companyTotal)} LAK</div>
          </div>
        </div>
        ${batchRows}
        <div style="display:flex;justify-content:flex-end;margin-top:8px;">
          <div style="border:1.5px solid #2f4aad;border-radius:8px;padding:10px 20px;min-width:240px;background:#f8faff;">
            <div style="display:flex;justify-content:space-between;margin-bottom:4px;font-size:12px;color:#6b7280;">
              <span>ລວມຈຳນວນບັດ</span><span>${fmt(companyCards)} ໃບ</span>
            </div>
            <div style="display:flex;justify-content:space-between;margin-bottom:4px;font-size:12px;color:#6b7280;">
              <span>ລາຄາ/ໃບ</span><span>${fmt(pricePerCard)} LAK</span>
            </div>
            <div style="display:flex;justify-content:space-between;font-size:15px;font-weight:800;color:#2f4aad;border-top:1px solid #dbeafe;padding-top:8px;margin-top:6px;">
              <span>ຍອດລວມ</span><span>${fmt(companyTotal)} LAK</span>
            </div>
          </div>
        </div>
        <div style="display:flex;justify-content:space-around;margin-top:28px;gap:16px;">
          <div style="text-align:center;flex:1;font-size:12px;color:#6b7280;">
            <div style="border-top:1px solid #9ca3af;margin-top:40px;padding-top:5px;">ຜູ້ສ້າງລາຍງານ</div>
          </div>
          <div style="text-align:center;flex:1;font-size:12px;color:#6b7280;">
            <div style="border-top:1px solid #9ca3af;margin-top:40px;padding-top:5px;">ຜູ້ກວດສອບ</div>
          </div>
          <div style="text-align:center;flex:1;font-size:12px;color:#6b7280;">
            <div style="border-top:1px solid #9ca3af;margin-top:40px;padding-top:5px;">ຜູ້ຮັບເງີນ / ລູກຄ້າ (${companyName})</div>
          </div>
        </div>
      </div>
      <div style="page-break-after:always;"></div>`;
  }).join("");

  return `
    <html><head><title>ລາຍງານເກັບຄ່າທຳນຽມ</title>
    <style>
      * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Noto Sans Lao', 'Phetsarath OT', sans-serif; }
      body { padding: 32px; color: #1f2937; font-size: 13px; }
      @media print { .no-print { display: none; } body { padding: 20px; } }
    </style></head>
    <body>
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:28px;padding-bottom:16px;border-bottom:2px solid #e5e7eb;">
        <div>
          <div style="font-size:22px;font-weight:800;color:#2f4aad;margin-bottom:4px;">CCMS</div>
          <div style="font-size:17px;font-weight:700;">ລາຍງານຄ່າທຳນຽມການເຮັດບັດ</div>
          <div style="font-size:12px;color:#6b7280;margin-top:3px;">ວັນທີ: ${dateFrom} ຫາ ${dateTo} &nbsp;|&nbsp; ສ້າງວັນທີ: ${today}</div>
        </div>
        <div style="text-align:right;">
          <div style="font-size:12px;color:#6b7280;margin-bottom:4px;">ຍອດລວມທັງໝົດ</div>
          <div style="font-size:24px;font-weight:800;color:#2f4aad;">${fmt(grandTotal)} LAK</div>
          <div style="font-size:12px;color:#6b7280;">${fmt(totalCards)} ໃບ × ${fmt(pricePerCard)} LAK/ໃບ</div>
        </div>
      </div>
      ${groupSections}
    </body></html>`;
}

function BillingReportModal({ requests, onClose }) {
  const today = new Date().toISOString().slice(0, 10);
  const firstDay = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10);

  const [dateFrom, setDateFrom] = useState(firstDay);
  const [dateTo,   setDateTo]   = useState(today);
  const [pricePerCard, setPricePerCard] = useState(50000);
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterCompany, setFilterCompany] = useState("all");

  const companies = useMemo(() => {
    const map = {};
    requests.forEach(r => { if (r.company_id) map[r.company_id] = r.companies_name || "–"; });
    return Object.entries(map).map(([id, name]) => ({ id, name }));
  }, [requests]);

  const filtered = useMemo(() => {
    return requests.filter(r => {
      const ds = displayStatus(r);
      if (ds === "rejected") return false;
      if (filterStatus !== "all" && ds !== filterStatus) return false;
      if (filterCompany !== "all" && String(r.company_id) !== filterCompany) return false;
      const d = r.created_at ? r.created_at.slice(0, 10) : "";
      if (dateFrom && d < dateFrom) return false;
      if (dateTo && d > dateTo) return false;
      return true;
    });
  }, [requests, filterStatus, filterCompany, dateFrom, dateTo]);

  /* group by company */
  const grouped = useMemo(() => {
    const map = {};
    filtered.forEach(r => {
      const key = r.company_id || "unknown";
      if (!map[key]) map[key] = { companyId: r.company_id, companyName: r.companies_name || "ບໍ່ລະບຸ", batches: [] };
      map[key].batches.push(r);
    });
    return Object.values(map);
  }, [filtered]);

  const totalCards = filtered.reduce((s, r) => s + (r.total_count || 0), 0);
  const grandTotal = totalCards * pricePerCard;

  const handlePrint = () => {
    const html = buildPrintHtml({ grouped, pricePerCard, dateFrom, dateTo, grandTotal, totalCards });
    const w = window.open("", "_blank", "width=960,height=750");
    w.document.write(html);
    w.document.close();
    w.focus();
    setTimeout(() => { w.print(); }, 500);
  };

  const STATUS_LABELS = { all: "ທັງໝົດ", pending: "ລໍຖ້າ", approved: "ອະນຸມັດ", printed: "ສຳເລັດ" };

  return (
    <div className="crq-modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="crq-modal crq-modal-wide">
        {/* Header */}
        <div className="crq-modal-header">
          <div>
            <h2 className="crq-modal-title">ລາຍງານເກັບຄ່າທຳນຽມບັດ</h2>
            <div className="crq-modal-sub">ຈັດກຸ່ມຕາມບໍລິສັດ · ສາມາດສົ່ງໃຫ້ລູກຄ້າໄດ້</div>
          </div>
          <button className="crq-modal-close" onClick={onClose}><IconClose /></button>
        </div>

        {/* Filters */}
        <div className="crq-modal-filters">
          <div className="crq-filter-group">
            <label>ວັນທີເລີ່ມ</label>
            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="crq-filter-input" />
          </div>
          <div className="crq-filter-group">
            <label>ວັນທີສິ້ນສຸດ</label>
            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="crq-filter-input" />
          </div>
          <div className="crq-filter-group">
            <label>ບໍລິສັດ</label>
            <select value={filterCompany} onChange={e => setFilterCompany(e.target.value)} className="crq-filter-input">
              <option value="all">ທັງໝົດ</option>
              {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="crq-filter-group">
            <label>ສະຖານະ</label>
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="crq-filter-input">
              {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <div className="crq-filter-group">
            <label>ລາຄາ/ໃບ (LAK)</label>
            <input
              type="number" min="0" step="1000"
              value={pricePerCard}
              onChange={e => setPricePerCard(Number(e.target.value))}
              className="crq-filter-input"
              style={{ width: 130 }}
            />
          </div>
        </div>

        {/* Preview body */}
        <div className="crq-modal-body">
          {/* Grand total banner */}
          {filtered.length > 0 && (
            <div className="crq-rpt-grand-banner">
              <div className="crq-rpt-grand-left">
                <div className="crq-rpt-grand-label">ຍອດລວມທັງໝົດ</div>
                <div className="crq-rpt-grand-val">{fmt(grandTotal)} LAK</div>
              </div>
              <div className="crq-rpt-grand-meta">
                <span>{grouped.length} ບໍລິສັດ</span>
                <span>·</span>
                <span>{filtered.length} Request</span>
                <span>·</span>
                <span>{fmt(totalCards)} ໃບ</span>
              </div>
            </div>
          )}

          {filtered.length === 0 ? (
            <div className="crq-rpt-empty">ບໍ່ມີຂໍ້ມູນໃນຊ່ວງທີ່ເລືອກ</div>
          ) : (
            grouped.map(({ companyId, companyName, batches }) => {
              const companyCards = batches.reduce((s, b) => s + (b.total_count || 0), 0);
              const companyTotal = companyCards * pricePerCard;
              return (
                <div key={companyId} className="crq-rpt-company-block">
                  {/* Company header */}
                  <div className="crq-rpt-company-hdr">
                    <div className="crq-rpt-company-left">
                      <div className="crq-avatar" style={{ background: companyAvatarColor(companyId), width: 36, height: 36, fontSize: 13 }}>
                        {companyInitials(companyName)}
                      </div>
                      <div>
                        <div className="crq-rpt-company-name">{companyName}</div>
                        <div className="crq-rpt-company-meta">{batches.length} Request · {companyCards} ໃບ</div>
                      </div>
                    </div>
                    <div className="crq-rpt-company-total">
                      <div className="crq-rpt-company-total-label">ຍອດລວມ</div>
                      <div className="crq-rpt-company-total-val">{fmt(companyTotal)} LAK</div>
                    </div>
                  </div>

                  {/* Each batch */}
                  {batches.map((b, bi) => {
                    const ds = displayStatus(b);
                    const sm = STATUS_META[ds] || STATUS_META.pending;
                    const employees = b.employees_json || [];
                    const subtotal = (b.total_count || 0) * pricePerCard;
                    return (
                      <div key={b.batch_id} className="crq-rpt-batch">
                        {/* Batch header row */}
                        <div className="crq-rpt-batch-hdr">
                          <div className="crq-rpt-batch-left">
                            <span className="crq-rpt-batch-no">{requestNo(b)}</span>
                            <span className="crq-rpt-batch-date">{fmtDate(b.created_at)}</span>
                            <span className="crq-status-badge" style={{ background: sm.bg, color: sm.color, fontSize: 11, padding: "2px 10px" }}>
                              {STATUS_LO[ds] || ds}
                            </span>
                          </div>
                          <div className="crq-rpt-batch-right">
                            <span className="crq-rpt-batch-calc">{b.total_count} ໃບ × {fmt(pricePerCard)}</span>
                            <span className="crq-rpt-batch-subtotal">{fmt(subtotal)} LAK</span>
                          </div>
                        </div>

                        {/* Employee list */}
                        {employees.length > 0 && (
                          <table className="crq-rpt-emp-table">
                            <thead>
                              <tr>
                                <th>#</th>
                                <th>ລະຫັດ</th>
                                <th>ຊື່-ນາມສະກຸນ</th>
                                <th>ຕຳແໜ່ງ</th>
                                <th>ປະເພດບັດ</th>
                              </tr>
                            </thead>
                            <tbody>
                              {employees.map((e, ei) => {
                                const ct = e.cardType || "Staff Card";
                                const ctm = CARD_TYPE_COLORS[ct] || CARD_TYPE_COLORS["Staff Card"];
                                return (
                                  <tr key={e.employee_id}>
                                    <td style={{ color: "#9ca3af" }}>{bi + 1}.{ei + 1}</td>
                                    <td>{e.employee_code || "–"}</td>
                                    <td style={{ fontWeight: 600 }}>{e.firstname} {e.lastname}</td>
                                    <td style={{ color: "#6b7280" }}>{e.position || "–"}</td>
                                    <td>
                                      <span style={{ background: ctm.bg, color: ctm.color, padding: "2px 8px", borderRadius: 10, fontSize: 11, fontWeight: 600 }}>{ct}</span>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        )}
                      </div>
                    );
                  })}

                  {/* Company subtotal */}
                  <div className="crq-rpt-company-subtotal">
                    <div className="crq-rpt-subtotal-row"><span>ລວມຈຳນວນ</span><span>{fmt(companyCards)} ໃບ</span></div>
                    <div className="crq-rpt-subtotal-row"><span>ລາຄາ/ໃບ</span><span>{fmt(pricePerCard)} LAK</span></div>
                    <div className="crq-rpt-subtotal-row crq-rpt-subtotal-total"><span>ຍອດລວມ</span><span>{fmt(companyTotal)} LAK</span></div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="crq-modal-footer">
          <button className="crq-modal-cancel" onClick={onClose}>ປິດ</button>
          <button className="crq-print-btn" onClick={handlePrint} disabled={filtered.length === 0}>
            <IconPrint /> ພິມລາຍງານ
          </button>
        </div>
      </div>
    </div>
  );
}

export default function CardRequests() {
  const { t } = useLanguage();
  const navigate = useNavigate();

  const [requests, setRequests] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [search,   setSearch]   = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [downloadingId, setDownloadingId] = useState(null);
  const [deletingId,   setDeletingId]   = useState(null);
  const [showReport, setShowReport] = useState(false);

  const load = () => {
    setLoading(true);
    api.get("/card-requests")
      .then(r => setRequests(r.data))
      .catch(() => toast.error("ໂຫລດຂໍ້ມູນບໍ່ສຳເລັດ"))
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const counts = useMemo(() => ({
    all:      requests.length,
    pending:  requests.filter(r => displayStatus(r) === "pending").length,
    approved: requests.filter(r => ["approved","issued"].includes(displayStatus(r))).length,
    printed:  requests.filter(r => ["printed","completed"].includes(displayStatus(r))).length,
    rejected: requests.filter(r => displayStatus(r) === "rejected").length,
  }), [requests]);

  const displayed = useMemo(() => {
    const q = search.trim().toLowerCase();
    return requests.filter(r => {
      if (statusFilter !== "all") {
        const ds = displayStatus(r);
        if (statusFilter === "approved" ? !["approved","issued"].includes(ds)
          : statusFilter === "printed" ? !["printed","completed"].includes(ds)
          : ds !== statusFilter) return false;
      }
      if (!q) return true;
      return requestNo(r).toLowerCase().includes(q)
        || (r.companies_name || "").toLowerCase().includes(q)
        || (r.requested_by_name || "").toLowerCase().includes(q);
    });
  }, [requests, search, statusFilter]);

  const handleDelete = async (b) => {
    const ds = displayStatus(b);
    const isActive = ["approved", "issued", "printed", "completed"].includes(ds);
    const msg = isActive
      ? `ລົບ Request ${requestNo(b)}? ບັດທີ່ສ້າງແລ້ວຈະຍັງຢູ່, ແຕ່ Request ນີ້ຈະຖືກລົບອອກ.`
      : `ລົບ Request ${requestNo(b)}?`;
    if (!window.confirm(msg)) return;
    setDeletingId(b.batch_id);
    try {
      await api.delete(`/card-requests/${b.batch_id}`);
      toast.success(`ລົບ ${requestNo(b)} ສຳເລັດ`);
      setRequests(prev => prev.filter(r => r.batch_id !== b.batch_id));
    } catch (err) {
      toast.error(err?.response?.data?.message || "ລົບບໍ່ສຳເລັດ");
    }
    setDeletingId(null);
  };

  const handleDownload = async (b) => {
    if (b.status !== "approved" || downloadingId) return;
    setDownloadingId(b.batch_id);
    try {
      const detailRes = await api.get(`/card-requests/${b.batch_id}`);
      const employees = detailRes.data.employees_json || [];
      const results = await Promise.all(
        employees.map(e => api.get(`/idcard/${e.employee_id}`).then(r => r.data).catch(() => null))
      );
      const valid = results.filter(Boolean);
      if (valid.length === 0) toast.error("ບໍ່ພົບຂໍ້ມູນບັດ");
      else printCards(valid);
    } catch {
      toast.error("ດາວໂຫລດບໍ່ສຳເລັດ");
    }
    setDownloadingId(null);
  };

  return (
    <div className="idc-page">
      <div className="crq-header">
        <div>
          <h1 className="idc-title">{t("crq_title")}</h1>
          <div className="crq-breadcrumb">{t("nav_idcard")} <span>/</span> {t("nav_card_requests")}</div>
        </div>
      </div>

      <div className="idc-filters">
        <input
          className="idc-search"
          placeholder={t("crq_search_ph")}
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <select className="idc-select" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
          <option value="all">{t("all_status")}</option>
          <option value="pending">{t("crq_pending")}</option>
          <option value="approved">{t("crq_approved")}</option>
          <option value="printed">{t("crq_printed")}</option>
          <option value="rejected">{t("crq_rejected")}</option>
        </select>
        <button className="crq-report-btn" onClick={() => setShowReport(true)}>
          <IconReport /> ລາຍງານ
        </button>
        <button className="crq-new-btn" onClick={() => navigate("/idcard/request")}>
          {t("crq_new_request")}
        </button>
      </div>

      <div className="idc-stats">
        {[
          { key: "all",      label: t("total"),        value: counts.all,      color: "#2f4aad" },
          { key: "pending",  label: t("crq_pending"),  value: counts.pending,  color: "#d97706" },
          { key: "approved", label: t("crq_approved"), value: counts.approved, color: "#059669" },
          { key: "printed",  label: t("crq_printed"),  value: counts.printed,  color: "#0e7490" },
          { key: "rejected", label: t("crq_rejected"), value: counts.rejected, color: "#dc2626" },
        ].map(s => {
          const active = statusFilter === s.key;
          return (
            <div
              key={s.key}
              className={`idc-stat-box idc-stat-btn${active ? " idc-stat-active" : ""}`}
              style={active ? { borderColor: s.color, boxShadow: `0 0 0 2px ${s.color}22` } : {}}
              onClick={() => setStatusFilter(s.key)}
            >
              <div className="idc-stat-val" style={{ color: s.color }}>{s.value}</div>
              <div className="idc-stat-lbl">{s.label}</div>
              {active && <div className="idc-stat-active-dot" style={{ background: s.color }} />}
            </div>
          );
        })}
      </div>

      <div className="crq-tabs">
        {[
          ["all", t("all"), counts.all],
          ["pending", t("crq_pending"), counts.pending],
          ["approved", t("crq_approved"), counts.approved],
          ["printed", t("crq_printed"), counts.printed],
          ["rejected", t("crq_rejected"), counts.rejected],
        ].map(([k, lbl, n]) => (
          <button
            key={k}
            className={`crq-tab${statusFilter === k ? " crq-tab-active" : ""}`}
            onClick={() => setStatusFilter(k)}
          >
            {lbl} <span className="crq-tab-count">{n}</span>
          </button>
        ))}
      </div>

      <div className="crq-table-wrap">
        <table className="crq-table">
          <thead>
            <tr>
              <th>{t("crq_th_no")}</th>
              <th>{t("company")}</th>
              <th>{t("crq_th_sender")}</th>
              <th>{t("crq_th_qty")}</th>
              <th>{t("status")}</th>
              <th>{t("crq_th_date")}</th>
              <th>{t("manage")}</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} className="crq-td-empty"><SkeletonLoader variant="table" rows={6} cols={5} /></td></tr>
            ) : displayed.length === 0 ? (
              <tr><td colSpan={7} className="crq-td-empty">{t(requests.length === 0 ? "no_data" : "crq_no_match")}</td></tr>
            ) : (
              displayed.map(b => {
                const ds = displayStatus(b);
                const sm = STATUS_META[ds] || STATUS_META.pending;
                const isApproved = b.status === "approved";
                return (
                  <tr key={b.batch_id}>
                    <td className="crq-td-no">{requestNo(b)}</td>
                    <td>
                      <div className="crq-company-cell">
                        <div className="crq-avatar" style={{ background: companyAvatarColor(b.company_id) }}>
                          {companyInitials(b.companies_name)}
                        </div>
                        <span>{b.companies_name || "–"}</span>
                      </div>
                    </td>
                    <td>{b.requested_by_name || "–"}</td>
                    <td className="crq-td-qty">{b.total_count}</td>
                    <td>
                      <span className="crq-status-badge" style={{ background: sm.bg, color: sm.color }}>
                        {t(`crq_${ds}`) || ds}
                      </span>
                    </td>
                    <td>{fmtDate(b.created_at)}</td>
                    <td>
                      <div className="crq-actions">
                        <button className="crq-action-btn" title={t("crq_view")} onClick={() => navigate(`/idcard/requests/${b.batch_id}`)}>
                          <IconEye />
                        </button>
                        <button
                          className="crq-action-btn"
                          title={isApproved ? t("crq_download") : t("crq_download_disabled_tip")}
                          disabled={!isApproved || downloadingId === b.batch_id}
                          onClick={() => handleDownload(b)}
                        >
                          <IconDownload />
                        </button>
                        <button
                          className="crq-action-btn crq-action-btn-danger"
                          title="ລົບ Request"
                          disabled={deletingId === b.batch_id}
                          onClick={() => handleDelete(b)}
                        >
                          <IconTrash />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {showReport && (
        <BillingReportModal requests={requests} onClose={() => setShowReport(false)} />
      )}
    </div>
  );
}
