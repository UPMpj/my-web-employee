import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../../api";
import { useLanguage } from "../../context/LanguageContext";
import toast from "react-hot-toast";
import { printCards } from "../../utils/cardPrint";
import {
  companyAvatarColor, companyInitials, requestNo, fmtDate, STATUS_META, displayStatus,
} from "../../utils/cardRequestHelpers";
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

function fmt(n) {
  return Number(n).toLocaleString("lo-LA");
}

function BillingReportModal({ requests, onClose }) {
  const printRef = useRef();
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

  const totalCards = filtered.reduce((s, r) => s + (r.total_count || 0), 0);
  const grandTotal = totalCards * pricePerCard;

  const handlePrint = () => {
    const el = printRef.current;
    if (!el) return;
    const w = window.open("", "_blank", "width=900,height=700");
    w.document.write(`
      <html><head><title>ລາຍງານເກັບຄ່າທຳນຽມ - Card Requests</title>
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Noto Sans Lao', sans-serif; }
        body { padding: 32px; color: #1f2937; font-size: 13px; }
        .rpt-head { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; }
        .rpt-logo { font-size: 20px; font-weight: 800; color: #2f4aad; }
        .rpt-meta { text-align: right; font-size: 12px; color: #6b7280; }
        h2 { font-size: 17px; margin-bottom: 4px; }
        .rpt-period { font-size: 12px; color: #6b7280; margin-bottom: 20px; }
        .rpt-filters { font-size: 12px; color: #6b7280; margin-bottom: 16px; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
        th { background: #2f4aad; color: #fff; text-align: left; padding: 9px 12px; font-size: 12px; }
        td { padding: 8px 12px; border-bottom: 1px solid #e5e7eb; font-size: 12px; }
        tr:nth-child(even) td { background: #f8faff; }
        .num { text-align: right; font-weight: 600; }
        .rpt-summary { margin-top: 12px; display: flex; justify-content: flex-end; }
        .rpt-summary-box { border: 2px solid #2f4aad; border-radius: 10px; padding: 14px 24px; min-width: 280px; }
        .rpt-row { display: flex; justify-content: space-between; margin-bottom: 6px; font-size: 13px; }
        .rpt-total { font-size: 16px; font-weight: 800; color: #2f4aad; border-top: 1px solid #e5e7eb; padding-top: 8px; margin-top: 4px; }
        .rpt-footer { margin-top: 32px; display: flex; justify-content: space-between; font-size: 12px; color: #9ca3af; }
        .rpt-sign { text-align: center; }
        .rpt-sign-line { border-top: 1px solid #6b7280; margin-top: 40px; padding-top: 4px; min-width: 160px; }
        @media print { button { display: none; } }
      </style></head><body>${el.innerHTML}</body></html>
    `);
    w.document.close();
    w.focus();
    setTimeout(() => { w.print(); }, 400);
  };

  const STATUS_LABELS = { all: "ທັງໝົດ", pending: "ລໍຖ້າ", approved: "ອະນຸມັດ", printed: "ພິມແລ້ວ" };

  return (
    <div className="crq-modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="crq-modal">
        {/* Modal header */}
        <div className="crq-modal-header">
          <div>
            <h2 className="crq-modal-title">ລາຍງານເກັບຄ່າທຳນຽມບັດ</h2>
            <div className="crq-modal-sub">ສ້າງໃບແຈ້ງໜີ້ໃຫ້ລູກຄ້າ</div>
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

        {/* Printable content */}
        <div ref={printRef}>
          <div className="rpt-head" style={{ display: "flex", justifyContent: "space-between", marginBottom: 20 }}>
            <div>
              <div className="rpt-logo" style={{ fontSize: 18, fontWeight: 800, color: "#2f4aad", marginBottom: 4 }}>CCMS</div>
              <h2 style={{ fontSize: 16, fontWeight: 700 }}>ລາຍງານຄ່າທຳນຽມການເຮັດບັດ</h2>
              <div className="rpt-period" style={{ fontSize: 12, color: "#6b7280" }}>
                ວັນທີ: {dateFrom || "–"} ຫາ {dateTo || "–"} &nbsp;|&nbsp; ສ້າງວັນທີ: {fmtDate(new Date().toISOString())}
              </div>
            </div>
          </div>

          {filtered.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px 0", color: "#9ca3af" }}>ບໍ່ມີຂໍ້ມູນໃນຊ່ວງທີ່ເລືອກ</div>
          ) : (
            <>
              <div className="crq-report-table-wrap">
                <table className="crq-report-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>ເລກ Request</th>
                      <th>ບໍລິສັດ</th>
                      <th>ຜູ້ສົ່ງ</th>
                      <th>ສະຖານະ</th>
                      <th>ວັນທີ</th>
                      <th style={{ textAlign: "right" }}>ຈຳນວນບັດ</th>
                      <th style={{ textAlign: "right" }}>ລາຄາ/ໃບ</th>
                      <th style={{ textAlign: "right" }}>ຍອດລວມ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((r, i) => {
                      const ds = displayStatus(r);
                      const sm = STATUS_META[ds] || STATUS_META.pending;
                      const subtotal = (r.total_count || 0) * pricePerCard;
                      return (
                        <tr key={r.batch_id}>
                          <td style={{ color: "#9ca3af" }}>{i + 1}</td>
                          <td style={{ fontWeight: 700, color: "#2f4aad" }}>{requestNo(r)}</td>
                          <td>
                            <div className="crq-company-cell">
                              <div className="crq-avatar" style={{ background: companyAvatarColor(r.company_id), width: 24, height: 24, fontSize: 10 }}>
                                {companyInitials(r.companies_name)}
                              </div>
                              {r.companies_name || "–"}
                            </div>
                          </td>
                          <td>{r.requested_by_name || "–"}</td>
                          <td>
                            <span className="crq-status-badge" style={{ background: sm.bg, color: sm.color, fontSize: 11, padding: "2px 10px" }}>
                              {ds === "pending" ? "ລໍຖ້າ" : ds === "approved" ? "ອະນຸມັດ" : ds === "printed" ? "ພິມແລ້ວ" : ds}
                            </span>
                          </td>
                          <td>{fmtDate(r.created_at)}</td>
                          <td style={{ textAlign: "right", fontWeight: 700 }}>{r.total_count || 0}</td>
                          <td style={{ textAlign: "right" }}>{fmt(pricePerCard)}</td>
                          <td style={{ textAlign: "right", fontWeight: 700, color: "#2f4aad" }}>{fmt(subtotal)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Summary box */}
              <div className="crq-report-summary">
                <div className="crq-report-summary-box">
                  <div className="crq-summary-row">
                    <span>ຈຳນວນ Request</span>
                    <span>{filtered.length} ລາຍການ</span>
                  </div>
                  <div className="crq-summary-row">
                    <span>ລວມຈຳນວນບັດ</span>
                    <span>{fmt(totalCards)} ໃບ</span>
                  </div>
                  <div className="crq-summary-row">
                    <span>ລາຄາ/ໃບ</span>
                    <span>{fmt(pricePerCard)} LAK</span>
                  </div>
                  <div className="crq-summary-row crq-summary-total">
                    <span>ຍອດລວມທັງໝົດ</span>
                    <span>{fmt(grandTotal)} LAK</span>
                  </div>
                </div>
              </div>

              {/* Signature area */}
              <div className="crq-report-signs">
                <div className="crq-sign-block">
                  <div className="crq-sign-line" />
                  <div>ຜູ້ສ້າງລາຍງານ</div>
                </div>
                <div className="crq-sign-block">
                  <div className="crq-sign-line" />
                  <div>ຜູ້ກວດສອບ</div>
                </div>
                <div className="crq-sign-block">
                  <div className="crq-sign-line" />
                  <div>ຜູ້ຮັບເງີນ / ລູກຄ້າ</div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Modal footer */}
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
    printed:  requests.filter(r => displayStatus(r) === "printed").length,
    rejected: requests.filter(r => displayStatus(r) === "rejected").length,
  }), [requests]);

  const displayed = useMemo(() => {
    const q = search.trim().toLowerCase();
    return requests.filter(r => {
      if (statusFilter !== "all") {
        const ds = displayStatus(r);
        if (statusFilter === "approved" ? !["approved","issued"].includes(ds) : ds !== statusFilter) return false;
      }
      if (!q) return true;
      return requestNo(r).toLowerCase().includes(q)
        || (r.companies_name || "").toLowerCase().includes(q)
        || (r.requested_by_name || "").toLowerCase().includes(q);
    });
  }, [requests, search, statusFilter]);

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
              <tr><td colSpan={7} className="crq-td-empty">{t("loading")}</td></tr>
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
