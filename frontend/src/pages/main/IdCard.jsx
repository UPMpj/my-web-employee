import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, photoUrl as getPhotoUrl } from "../../api";
import { useCurrentUser } from "../../hooks/useCurrentUser";
import toast from "react-hot-toast";
import { useLanguage } from "../../context/LanguageContext";
import ConfirmModal from "../../components/ConfirmModal";
import { getTemplate, printCards } from "../../utils/cardPrint";
import "../../components/ConfirmModal.css";
import "./idcard.css";

const fmt   = (d) => d ? new Date(d).toLocaleDateString("en-GB", { day:"2-digit", month:"short", year:"numeric" }) : "–";
const fmtUp = (d) => fmt(d).toUpperCase();

/* Tiny SVG icons for info rows */
const IcoId   = () => <svg viewBox="0 0 20 20" fill="currentColor" width="10" height="10"><path d="M10 2a4 4 0 1 0 0 8A4 4 0 0 0 10 2zm0 10c-5 0-8 2-8 3v1h16v-1c0-1-3-3-8-3z"/></svg>;
const IcoBldg = () => <svg viewBox="0 0 20 20" fill="currentColor" width="10" height="10"><path d="M2 19V4h7v15H2zm9-11h7v11h-7V8zM5 6h3v2H5V6zm0 4h3v2H5v-2zm0 4h3v2H5v-2zm7 2h2v2h-2v-2zm0-4h2v2h-2v-2z"/></svg>;
const IcoFlag = () => <svg viewBox="0 0 20 20" fill="currentColor" width="10" height="10"><path d="M3 2v16H1V0h2v2zm0 0h12l-2 5 2 5H3V2z"/></svg>;
const IcoCard = () => <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" width="10" height="10"><rect x="1" y="4" width="18" height="12" rx="2"/><line x1="1" y1="8" x2="19" y2="8"/></svg>;
const IcoPin  = () => <svg viewBox="0 0 20 20" fill="currentColor" width="10" height="10"><path d="M10 2a5 5 0 0 1 5 5c0 3.5-5 11-5 11S5 10.5 5 7a5 5 0 0 1 5-5zm0 3a2 2 0 1 0 0 4 2 2 0 0 0 0-4z"/></svg>;

/* Tiny SVG icons for footer */
const IcoShield = () => <svg viewBox="0 0 20 20" fill="currentColor" width="8" height="8"><path d="M10 1l7 3v6c0 5-7 9-7 9s-7-4-7-9V4l7-3z"/></svg>;
const IcoCal     = () => <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" width="8" height="8"><rect x="2" y="4" width="16" height="14" rx="2"/><line x1="2" y1="8" x2="18" y2="8"/><line x1="6" y1="2" x2="6" y2="6"/><line x1="14" y1="2" x2="14" y2="6"/></svg>;

/* ── Screen ID Card — template overlay approach ── */
function IDCard({ emp, onPhotoUpdate }) {
  const photoUrl  = getPhotoUrl(emp.photo);
  const hasCard   = !!emp.card_id;
  const tpl       = getTemplate(emp);
  const isVisitor = tpl.key === "Visitor";

  const fileRef   = useRef(null);
  const rowsRef   = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [linePath, setLinePath]   = useState("");
  const lineGradId = `idc2-line-grad-${emp.employee_id}`;

  useLayoutEffect(() => {
    const wrap = rowsRef.current;
    if (!wrap) return;

    const computeLine = () => {
      const wrapRect = wrap.getBoundingClientRect();
      const pts = [...wrap.querySelectorAll(".idc2-prow")].map(row => {
        const icon = row.querySelector(".idc2-prow-icon");
        const val  = row.querySelector(".idc2-prow-val");
        if (!icon || !val) return null;
        const iconRect = icon.getBoundingClientRect();
        const valRect  = val.getBoundingClientRect();
        return {
          y:      valRect.bottom - wrapRect.top + 2,
          xStart: iconRect.right - wrapRect.left,
          xEnd:   valRect.right  - wrapRect.left,
        };
      }).filter(Boolean);

      if (pts.length === 0) { setLinePath(""); return; }

      const xEndMax = Math.max(...pts.map(p => p.xEnd));
      const t = 1.2; // half-thickness at the lens's widest point
      const d = pts.map(p => {
        const midX = (p.xStart + xEndMax) / 2;
        return `M ${p.xStart} ${p.y} Q ${midX} ${p.y - t} ${xEndMax} ${p.y} Q ${midX} ${p.y + t} ${p.xStart} ${p.y} Z`;
      }).join(" ");
      setLinePath(d);
    };

    computeLine();
    const ro = new ResizeObserver(computeLine);
    ro.observe(wrap);
    return () => ro.disconnect();
  }, [emp.employee_code, emp.companies_name, emp.nationality, emp.card_no, emp.office_building, hasCard]);

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
    <div className="idc2-card" style={{ backgroundImage: `url(${tpl.img})` }}>

      {/* Clickable photo zone — click to upload employee photo */}
      <div
        className={`idc2-photo-upload-area${isVisitor ? " idc2-pua-v" : ""}`}
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

      {/* Data panel — overlays template's dummy name + info rows */}
      <div className="idc2-panel">
        {isVisitor
          ? <div className="idc2-panel-vname">{emp.firstname} {emp.lastname}</div>
          : <div className="idc2-panel-name">{emp.firstname} {emp.lastname}</div>
        }

        <div className="idc2-panel-rows" ref={rowsRef}>
          <svg className="idc2-prow-line">
            <defs>
              <linearGradient id={lineGradId} x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%"  stopColor="#fff" stopOpacity="0" />
                <stop offset="50%" stopColor="#fff" stopOpacity=".9" />
                <stop offset="100%" stopColor="#fff" stopOpacity="0" />
              </linearGradient>
            </defs>
            <path d={linePath} fill={`url(#${lineGradId})`} />
          </svg>
          {[
            { Icon: IcoId,   lbl:"EMPLOYEE ID",  val: emp.employee_code || "–" },
            { Icon: IcoBldg, lbl:"COMPANY",       val: (emp.companies_name || "–").substring(0,20) },
            { Icon: IcoFlag, lbl:"NATIONALITY",   val: emp.nationality || "–" },
            { Icon: IcoCard, lbl:"DOCUMENT ID.",  val: hasCard ? emp.card_no : "Not Issued" },
            { Icon: IcoPin,  lbl:"LOCATION",      val: (emp.office_building || "–").substring(0,18) },
          ].map(({ Icon, lbl, val }) => (
            <div key={lbl} className="idc2-prow">
              <span className="idc2-prow-icon"><Icon /></span>
              <div className="idc2-prow-txt">
                <span className="idc2-prow-lbl">{lbl}</span>
                <span className="idc2-prow-val">{val}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Footer strip */}
      <div className="idc2-tpl-footer">
        <div className="idc2-tpl-ft-item">
          <span className="idc2-tpl-ft-icon"><IcoShield/></span>
          <div className="idc2-tpl-ft-txt">
            <span className="idc2-tpl-ft-lbl">STATUS</span>
            <span className="idc2-tpl-ft-val">{hasCard ? (emp.card_status||"ACTIVE").toUpperCase() : "NO CARD"}</span>
          </div>
        </div>
        <div className="idc2-tpl-ft-dot" />
        <div className="idc2-tpl-ft-item">
          <span className="idc2-tpl-ft-icon"><IcoCal/></span>
          <div className="idc2-tpl-ft-txt">
            <span className="idc2-tpl-ft-lbl">ISSUED DATE</span>
            <span className="idc2-tpl-ft-val">{hasCard ? fmtUp(emp.issued_at) : "–"}</span>
          </div>
        </div>
        <div className="idc2-tpl-ft-dot" />
        <div className="idc2-tpl-ft-item">
          <span className="idc2-tpl-ft-icon"><IcoCal/></span>
          <div className="idc2-tpl-ft-txt">
            <span className="idc2-tpl-ft-lbl">VALID UNTIL</span>
            <span className="idc2-tpl-ft-val">{hasCard ? fmtUp(emp.valid_until) : "–"}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Mini card preview for card type showcase ── */
const CARD_TYPES = [
  { name: "Staff",         color: "#1a3a6b", img: "/IT_STAFF.png?v=2"    },
  { name: "Supervisor",    color: "#0a6e5a", img: "/Supervisor.png?v=2"  },
  { name: "Manager",       color: "#5b21b6", img: "/manager.png?v=2"     },
  { name: "Contractor",    color: "#b45309", img: "/constractor.png?v=2" },
  { name: "Shop / Vender", color: "#6b3a1f", img: "/vender.png?v=2"      },
  { name: "Visitor",       color: "#374151", img: "/visitor.png?v=2"     },
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
