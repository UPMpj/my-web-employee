import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, photoUrl as getPhotoUrl } from "../../api";
import { useCurrentUser } from "../../hooks/useCurrentUser";
import toast from "react-hot-toast";
import { useLanguage } from "../../context/LanguageContext";
import ConfirmModal from "../../components/ConfirmModal";
import { getTemplate, printCards, formatOfficeLocation } from "../../utils/cardPrint";
import "../../components/ConfirmModal.css";
import SkeletonLoader from "../../components/SkeletonLoader";
import "./idcard.css";

const fmt   = (d) => d ? new Date(d).toLocaleDateString("en-GB", { day:"2-digit", month:"short", year:"numeric" }) : "–";
const fmtUp = (d) => fmt(d).toUpperCase();

/* Icons for topbar buttons + KPI tiles */
const IcoSelect  = () => <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><path d="M17.5 14.5v7M14 18h7"/></svg>;
const IcoExport  = () => <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 15V3"/><path d="M7 8l5-5 5 5"/><path d="M4 15v4a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-4"/></svg>;
const IcoKpiCard    = () => <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="#fff" strokeWidth="2"><rect x="2" y="5" width="20" height="14" rx="2.5"/><line x1="2" y1="10" x2="22" y2="10"/></svg>;
const IcoKpiCheck   = () => <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="#fff" strokeWidth="2"><circle cx="12" cy="12" r="9"/><polyline points="8 12.5 10.8 15.3 16 9.5"/></svg>;
const IcoKpiBan     = () => <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="#fff" strokeWidth="2"><circle cx="12" cy="12" r="9"/><line x1="6.5" y1="6.5" x2="17.5" y2="17.5"/></svg>;
const IcoKpiPrinter = () => <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="#fff" strokeWidth="2"><path d="M6 9V2h12v7"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>;

/* Icons for role filter chips */
const IcoRoleAll        = () => <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>;
const IcoRoleStaff      = () => <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="8" r="4"/><path d="M4 21v-1a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v1"/></svg>;
const IcoRoleSupervisor = () => <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="9" cy="8" r="3.2"/><path d="M3 21v-1a5 5 0 0 1 5-5h2a5 5 0 0 1 4.3 2.5"/><path d="M16 13.5l1.7 1.8L21 12"/></svg>;
const IcoRoleManager    = () => <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2"><rect x="4" y="9" width="16" height="11" rx="1.5"/><path d="M8 9V6a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v3"/><path d="M4 13h16"/></svg>;

/* Icons for grid/list view toggle */
const IcoViewGrid = () => <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="8" height="8" rx="1.5"/><rect x="13" y="3" width="8" height="8" rx="1.5"/><rect x="3" y="13" width="8" height="8" rx="1.5"/><rect x="13" y="13" width="8" height="8" rx="1.5"/></svg>;
const IcoViewList = () => <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2"><line x1="4" y1="6" x2="20" y2="6"/><line x1="4" y1="12" x2="20" y2="12"/><line x1="4" y1="18" x2="20" y2="18"/></svg>;

/* Two real data points (last month -> this month), mapped into the tile's
   sparkline viewBox — a straight line between two real values, not a
   fabricated trend. Returns null when there's nothing to compare. */
function twoPointSparkPoints(a, b) {
  if (a == null || b == null) return null;
  const max = Math.max(a, b, 1);
  const y = (v) => 24 - (Math.max(0, v) / max) * 20;
  return `0,${y(a).toFixed(1)} 64,${y(b).toFixed(1)}`;
}

function KpiTile({ icon, tint, value, label, capTop, pctLabel, pctColor, pctSuffix, sparkPoints }) {
  return (
    <div className="idc-kpi-tile" style={{ "--kpi-tint": tint }}>
      <div className="idc-kpi-main">
        <div className="idc-kpi-head">
          <span className="idc-kpi-icon">{icon}</span>
          <span className="idc-kpi-label">{label}</span>
        </div>
        <div className="idc-kpi-value">{value}</div>
        {capTop && <div className="idc-kpi-captop">{capTop}</div>}
        {pctLabel != null && (
          <div className="idc-kpi-pct">
            <span className="idc-kpi-pct-num" style={{ color: pctColor || tint }}>{pctLabel}</span>
            <span className="idc-kpi-pct-suffix">{pctSuffix}</span>
          </div>
        )}
      </div>
      {sparkPoints && (
        <svg className="idc-kpi-spark" viewBox="0 0 64 28" preserveAspectRatio="none">
          <polyline points={sparkPoints} fill="none" stroke={tint} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
    </div>
  );
}

/* ── Screen ID Card — template overlay approach ──
   The template art (see cardPrint.js TEMPLATES) has its field labels,
   icons and role pill baked into the image itself; this component only
   overlays the live photo + text values at the positions measured against
   that artwork (see idcard.css .idc2-panel-name / .idc2-fv-* / .idc2-ftv-*). */
export function IDCard({ emp, onPhotoUpdate }) {
  const photoUrl  = getPhotoUrl(emp.photo);
  const hasCard   = !!emp.card_id;
  const tpl       = getTemplate(emp);

  const fileRef   = useRef(null);
  const [uploading, setUploading] = useState(false);

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const form = new FormData();
      form.append("photo", file);
      const res = await api.patch(`/employees/${emp.employee_id}/photo`, form, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      onPhotoUpdate?.(emp.employee_id, res.data.photo);
      toast.success("ອັບໂຫລດຮູບສຳເລັດ");
    } catch {
      toast.error("ບໍ່ສາມາດອັບໂຫລດຮູບໄດ້");
    }
    setUploading(false);
    e.target.value = "";
  };

  return (
    <div className="idc2-card" style={{ "--idc2-bg": `url(${tpl.img})`, "--idc2-photo-border": tpl.photoBorder }}>

      {/* Clickable photo zone — click to upload employee photo */}
      <div
        className="idc2-photo-upload-area"
        onClick={() => !uploading && fileRef.current?.click()}
        title="ຄລິກເພື່ອອັບໂຫລດຮູບ"
      >
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          style={{ display: "none" }}
          onChange={handleUpload}
        />

        {/* Real photo when available */}
        {photoUrl && (
          <div className="idc2-photo-zone-inner">
            <img src={photoUrl} alt="" className="idc2-pz-img" />
          </div>
        )}

        {/* Camera icon overlay (hover or uploading) */}
        <div className={`idc2-photo-hint${uploading ? " idc2-photo-hint-on" : ""}`}>
          {uploading
            ? <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" width="18" height="18" style={{ animation:"spin 1s linear infinite" }}><circle cx="12" cy="12" r="10" opacity=".3"/><path d="M12 2a10 10 0 0 1 10 10"/></svg>
            : <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.8" width="20" height="20"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
          }
        </div>
      </div>

      {/* Data panel — the four field labels + icons are baked into the
          template art; only the live values are overlaid here. */}
      <div className="idc2-panel">
        <div className="idc2-panel-name">{emp.firstname} {emp.lastname}</div>
        <span className="idc2-fv idc2-fv-1">{emp.employee_code || "–"}</span>
        <span className="idc2-fv idc2-fv-2">{(emp.companies_name || "–").substring(0, 22)}</span>
        <span className="idc2-fv idc2-fv-3">{formatOfficeLocation(emp).substring(0, 20)}</span>
        <span className="idc2-fv idc2-fv-4">{emp.nationality || "–"}</span>
      </div>

      {/* Footer strip — STATUS / ISSUED DATE / VALID UNTIL labels + icons
          are baked into the template art; only the live values go here. */}
      <div className="idc2-tpl-footer">
        <span className="idc2-ftv idc2-ftv-1">{hasCard ? (emp.card_status || "ACTIVE").toUpperCase() : "NO CARD"}</span>
        <span className="idc2-ftv idc2-ftv-2">{hasCard ? fmtUp(emp.issued_at) : "–"}</span>
        <span className="idc2-ftv idc2-ftv-3">{hasCard ? fmtUp(emp.valid_until) : "–"}</span>
      </div>
    </div>
  );
}

/* ── Mini card preview for card type showcase ── */
const CARD_TYPES = [
  { name: "Staff",         color: "#1a3a6b", img: "/IT_STAFF.png?v=4"    },
  { name: "Retail",        color: "#0a6e5a", img: "/retail.png?v=1"      },
  { name: "Manager",       color: "#5b21b6", img: "/manager.png?v=5"     },
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
  const navigate = useNavigate();
  const [showRules, setShowRules] = useState(false);

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
        <button className="idcr-goto-btn" onClick={() => navigate("/idcard/request")}>
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
    </div>
  );
}

/* ══════════════════════════════════════════════════════ */
export default function IdCard() {
  const { t } = useLanguage();
  const navigate = useNavigate();
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
  const [stats,         setStats]         = useState({ total_cards:0, no_card:0, printed:0, printed_this_month:0, printed_last_month:0, resigned_with_card:0, card_returned:0, not_returned:0 });
  const [roleCounts,    setRoleCounts]    = useState({ all:0, staff:0, supervisor:0, manager:0 });
  const [cardFilter,    setCardFilter]    = useState("");
  const [roleFilter,    setRoleFilter]    = useState("");
  const [sort,          setSort]          = useState("newest");
  const [view,          setView]          = useState("grid");

  /* multi-select */
  const [selectMode,  setSelectMode]  = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());

  const LIMIT = 50;
  const { role: userRole, user_id: userId } = useCurrentUser();

  useEffect(() => {
    const ep = userRole === "Super Admin" ? "/company/all" : `/company/my/${userId}`;
    api.get(ep).then(r => setCompanies(r.data)).catch(() => {});
  }, []);

  const load = async (p = page, cid = company, cf = cardFilter, rf = roleFilter, sr = sort) => {
    setLoading(true);
    try {
      const r = await api.get("/idcard", { params: { page: p, limit: LIMIT, search, company_id: cid, card_filter: cf, role_filter: rf, sort: sr } });
      setEmployees(r.data.data);
      setTotal(r.data.total);
      setStats({
        total_cards:        r.data.total_cards,
        no_card:            r.data.no_card,
        printed:            r.data.printed,
        printed_this_month: r.data.printed_this_month,
        printed_last_month: r.data.printed_last_month,
        resigned_with_card: r.data.resigned_with_card,
        card_returned:      r.data.card_returned,
        not_returned:       r.data.not_returned,
      });
      if (r.data.role_counts) setRoleCounts(r.data.role_counts);
    } catch { toast.error("Failed to load ID Cards"); }
    setLoading(false);
  };

  useEffect(() => { load(page, company, cardFilter, roleFilter, sort); }, [page]);
  const doSearch = () => { setPage(1); load(1, company, cardFilter, roleFilter, sort); };

  const applyFilter = (f) => {
    const next = cardFilter === f ? "" : f;
    setCardFilter(next);
    setPage(1);
    load(1, company, next, roleFilter, sort);
  };

  const applyRoleFilter = (r) => {
    const next = roleFilter === r ? "" : r;
    setRoleFilter(next);
    setPage(1);
    load(1, company, cardFilter, next, sort);
  };

  const changeSort = (val) => {
    setSort(val);
    setPage(1);
    load(1, company, cardFilter, roleFilter, val);
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

  const exportCSV = () => {
    if (employees.length === 0) { toast.error(t("idc_no_data")); return; }
    const headers = ["Employee Code", "Name", "Company", "Position", "Card No", "Card Status", "Issued Date", "Valid Until"];
    const rows = employees.map(e => [
      e.employee_code || "",
      `${e.firstname || ""} ${e.lastname || ""}`.trim(),
      e.companies_name || "",
      e.position || "",
      e.card_id ? (e.card_no || "") : "",
      e.card_id ? (e.card_status || "Active") : "No Card",
      e.card_id ? fmt(e.issued_at) : "",
      e.card_id ? fmt(e.valid_until) : "",
    ]);
    const esc = (v) => `"${String(v).replace(/"/g, '""')}"`;
    const csv = [headers.map(esc).join(","), ...rows.map(r => r.map(esc).join(","))].join("\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `access-cards-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
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

  const renderActions = (emp) => (
    <>
      <button
        className="idc-btn idc-btn-view"
        onClick={() => navigate(`/employees/edit/${emp.employee_id}`)}
      >
        {t("idc_view_card")}
      </button>
      {emp.print_count > 0 && (
        <div className="idc-print-count-badge">
          <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 9V2h12v7"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
          ພິມແລ້ວ {emp.print_count} ຄັ້ງ
        </div>
      )}
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
    </>
  );

  const cardStatusLabel = (emp) => {
    if (!emp.card_id) return { text: t("idc_no_card"), tone: "off" };
    if (emp.status === "Resigned") return emp.returned_at ? { text: t("idc_returned"), tone: "ok" } : { text: t("idc_not_returned"), tone: "warn" };
    return { text: emp.card_status || "Active", tone: "ok" };
  };

  const totalPages = Math.ceil(total / LIMIT);
  const selectedWithCard = [...selectedIds].filter(id => employees.find(e => e.employee_id === id && e.card_id)).length;

  if (userRole === "Company Admin") return <CompanyAdminView />;

  return (
    <div className="idc-page">

      <div className="idc-topbar">
        <div>
          <h1 className="idc-title">{t("nav_idcard")}</h1>
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
            <>
              <button className="idc-btn-outline idc-btn-icon" onClick={() => setSelectMode(true)}>
                <IcoSelect /> {t("idc_select_multi")}
              </button>
              <button className="idc-btn-outline idc-btn-icon" onClick={exportCSV}>
                <IcoExport /> {t("idc_export")}
              </button>
            </>
          )}
        </div>
      </div>

      {/* ── KPI tiles ── */}
      <div className="idc-kpi-row">
        <KpiTile icon={<IcoKpiCard />}    tint="#3b82f6"
          value={total} label={t("idc_total")}
          capTop={t("idc_all_time_issued")}
          pctLabel="100%" pctSuffix={t("idc_pct_of_total")} />
        <KpiTile icon={<IcoKpiCheck />}   tint="#10b981"
          value={stats.total_cards} label={t("idc_has_card")}
          pctLabel={`${total > 0 ? Math.round((stats.total_cards / total) * 100) : 0}%`}
          pctSuffix={t("idc_pct_of_total")} />
        <KpiTile icon={<IcoKpiBan />}     tint="#f59e0b"
          value={stats.no_card} label={t("idc_no_card")}
          pctLabel={`${total > 0 ? Math.round((stats.no_card / total) * 100) : 0}%`}
          pctSuffix={t("idc_pct_of_total")} />
        <KpiTile icon={<IcoKpiPrinter />} tint="#8b5cf6"
          value={stats.printed_this_month} label={t("idc_printed_month")}
          sparkPoints={twoPointSparkPoints(stats.printed_last_month, stats.printed_this_month)}
          pctLabel={`${stats.printed_this_month - stats.printed_last_month >= 0 ? "+" : ""}${stats.printed_this_month - stats.printed_last_month}`}
          pctColor={stats.printed_this_month - stats.printed_last_month >= 0 ? "#10b981" : "#ef4444"}
          pctSuffix={t("idc_from_last_month")} />
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

      {/* ── Role filter chips ── */}
      <div className="idc-role-filters">
        {[
          { key: "",           label: "All",         Icon: IcoRoleAll,        count: roleCounts.all },
          { key: "staff",      label: "Staff",       Icon: IcoRoleStaff,      count: roleCounts.staff },
          { key: "supervisor", label: "Retail",       Icon: IcoRoleSupervisor, count: roleCounts.supervisor },
          { key: "manager",    label: "Manager",     Icon: IcoRoleManager,    count: roleCounts.manager },
        ].map(r => {
          const isActive = roleFilter === r.key;
          return (
            <button
              key={r.key || "all"}
              className={`idc-role-chip${isActive ? " idc-role-chip-active" : ""}`}
              onClick={() => applyRoleFilter(r.key)}
            >
              <r.Icon />
              {r.label}
              <span className="idc-role-chip-count">{r.count}</span>
            </button>
          );
        })}
      </div>

      {/* ── Card status tabs + view/sort controls ── */}
      <div className="idc-status-bar">
        <div className="idc-status-tabs">
          {[
            { key: "",             label: t("idc_tab_all") },
            { key: "has_card",     label: t("idc_has_card") },
            { key: "no_card",      label: t("idc_no_card") },
            { key: "printed",      label: t("idc_printed") },
            { key: "returned",     label: t("idc_returned") },
            { key: "not_returned", label: t("idc_not_returned") },
          ].map(tab => (
            <button
              key={tab.key || "all"}
              className={`idc-status-tab${cardFilter === tab.key ? " idc-status-tab-active" : ""}`}
              onClick={() => applyFilter(tab.key)}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <div className="idc-status-controls">
          <div className="idc-view-toggle">
            <button
              className={`idc-view-btn${view === "grid" ? " idc-view-btn-active" : ""}`}
              title="Grid view" onClick={() => setView("grid")}
            ><IcoViewGrid /></button>
            <button
              className={`idc-view-btn${view === "list" ? " idc-view-btn-active" : ""}`}
              title="List view" onClick={() => setView("list")}
            ><IcoViewList /></button>
          </div>
          <select className="idc-sort-select" value={sort} onChange={e => changeSort(e.target.value)}>
            <option value="newest">Sort by Newest</option>
            <option value="oldest">Sort by Oldest</option>
            <option value="name">Sort by Name</option>
          </select>
        </div>
      </div>

      {selectMode && (
        <div className="idc-select-banner">
          {t("idc_selected_n").replace("{n}", selectedIds.size)}
          {selectedWithCard > 0 && ` · ${selectedWithCard} ${t("idc_printable")}`}
        </div>
      )}

      {loading ? (
        <SkeletonLoader variant="idcard" count={12} />
      ) : employees.length === 0 ? (
        <div className="idc-empty">{t("idc_no_data")}</div>
      ) : view === "list" ? (
        <div className="idc-list">
          {employees.map(emp => {
            const isSel   = selectedIds.has(emp.employee_id);
            const status  = cardStatusLabel(emp);
            const photoSrc = getPhotoUrl(emp.photo);
            return (
              <div
                key={emp.employee_id}
                className={`idc-list-row${isSel ? " idc-item-selected" : ""}${selectMode ? " idc-item-selectable" : ""}`}
                onClick={selectMode ? () => toggleSelect(emp.employee_id) : undefined}
              >
                {selectMode && (
                  <div className={`idc-checkbox${isSel ? " idc-checkbox-checked" : ""}`}>
                    {isSel && <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>}
                  </div>
                )}
                <div className="idc-list-photo">
                  {photoSrc
                    ? <img src={photoSrc} alt="" />
                    : <span>{(emp.firstname?.[0] || "?").toUpperCase()}</span>}
                </div>
                <div className="idc-list-name">
                  <div className="idc-list-fullname">{emp.firstname} {emp.lastname}</div>
                  <div className="idc-list-meta">{emp.employee_code || "–"} · {emp.position || "–"}</div>
                </div>
                <div className="idc-list-col idc-list-company">{emp.companies_name || "–"}</div>
                <div className="idc-list-col idc-list-cardno">{emp.card_no || "–"}</div>
                <div className="idc-list-col">
                  <span className={`idc-list-badge idc-list-badge-${status.tone}`}>{status.text}</span>
                </div>
                {!selectMode && (
                  <div className="idc-list-actions" onClick={e => e.stopPropagation()}>
                    {renderActions(emp)}
                  </div>
                )}
              </div>
            );
          })}
        </div>
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
                <IDCard
                  emp={emp}
                  onPhotoUpdate={(empId, newPhoto) =>
                    setEmployees(prev => prev.map(e =>
                      e.employee_id === empId ? { ...e, photo: newPhoto } : e
                    ))
                  }
                />
                {!selectMode && (
                  <div className="idc-actions">
                    {renderActions(emp)}
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
