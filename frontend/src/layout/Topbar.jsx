import { useEffect, useState, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { api } from "../api";
import { useCompany } from "../context/CompanyContext";
import { usePageMeta } from "../context/PageMetaContext";
import { useLanguage } from "../context/LanguageContext";
import { useCurrentUser } from "../hooks/useCurrentUser";
import { useDarkMode } from "../hooks/useDarkMode";
import toast from "react-hot-toast";
import ImportResultPopup from "../components/ImportResultPopup";
import ImportBatchReviewModal from "../components/ImportBatchReviewModal";
import { ROUTE_LABELS } from "../components/PageHeader";
import PendingRequestBanner from "../components/PendingRequestBanner";
import { MENU } from "./Sidebar";
import "./mainlayout.css";

/* Flatten Sidebar's MENU (incl. children, which inherit their parent's section)
   into a flat list of { to, section } for breadcrumb section lookup. */
const FLAT_MENU = MENU.flatMap(m => [
  { to: m.to, section: m.section },
  ...(m.children ? m.children.map(c => ({ to: c.to, section: m.section })) : []),
]);

/* Title-Case breadcrumb labels, distinct from Sidebar's ALL-CAPS section headers.
   "home" is intentionally omitted — the breadcrumb's home icon already covers it. */
const BREADCRUMB_SECTION_LABELS = {
  management:     "bc_section_management",
  operations:     "bc_section_operations",
  analytics:      "bc_section_analytics",
  administration: "bc_section_administration",
};

function getBreadcrumbSection(pathname) {
  const matches = FLAT_MENU.filter(m => pathname === m.to || pathname.startsWith(m.to + "/"));
  if (matches.length === 0) return null;
  const best = matches.reduce((a, b) => (b.to.length > a.to.length ? b : a));
  return BREADCRUMB_SECTION_LABELS[best.section] || null;
}

function IconSearch() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
      <circle cx="11" cy="11" r="7"/>
      <line x1="21" y1="21" x2="16.65" y2="16.65"/>
    </svg>
  );
}

function IconHome() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9.5L12 3l9 6.5V20a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9.5z"/>
      <path d="M9 21V12h6v9"/>
    </svg>
  );
}

function IconArrowLeft() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M15 18l-6-6 6-6"/>
    </svg>
  );
}

function IconChevronRight() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 18 15 12 9 6"/>
    </svg>
  );
}

function currentPageLabel(pathname, lang, notFoundLabel) {
  const segments = pathname.split("/").filter(Boolean);
  if (segments.length === 0) return lang === "lo" ? "ໜ້າຫຼັກ" : "Home";
  if (notFoundLabel) return notFoundLabel;
  const lastSeg = segments[segments.length - 1];
  const isId = /^\d+$/.test(lastSeg);
  const info = ROUTE_LABELS[lastSeg];
  return isId ? `#${lastSeg}` : info ? (lang === "lo" ? info.lo : info.en) : lastSeg;
}

function IconBell() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
      <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
    </svg>
  );
}

function fmtTime(d) {
  if (!d) return "";
  const diff = (Date.now() - new Date(d)) / 1000;
  if (diff < 60)    return "ເດ໋ຍວນີ້";
  if (diff < 3600)  return `${Math.floor(diff / 60)} ນາທີກ່ອນ`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} ຊົ່ວໂມງກ່ອນ`;
  if (diff < 7 * 86400) return `${Math.floor(diff / 86400)} ມື້ກ່ອນ`;
  const dt = new Date(d);
  const sameYear = dt.getFullYear() === new Date().getFullYear();
  return dt.toLocaleDateString("en-GB", sameYear
    ? { day: "numeric", month: "short" }
    : { day: "numeric", month: "short", year: "numeric" });
}

const AVATAR_PALETTE = [
  ["#dbeafe", "#1d4ed8"], ["#fce7f3", "#be185d"], ["#dcfce7", "#15803d"],
  ["#fef3c7", "#b45309"], ["#ede9fe", "#6d28d9"], ["#cffafe", "#0e7490"],
  ["#fee2e2", "#b91c1c"], ["#e0e7ff", "#3730a3"],
];
function initials(name) {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2);
  return (parts[0][0] || "") + (parts[1][0] || "");
}
function Avatar({ name, size = 34 }) {
  const idx = (name || "").split("").reduce((a, c) => a + c.charCodeAt(0), 0) % AVATAR_PALETTE.length;
  const [bg, color] = AVATAR_PALETTE[idx];
  return (
    <div className="entity-avatar" style={{ width: size, height: size, background: bg, color, fontSize: size * 0.38 }}>
      {initials(name)}
    </div>
  );
}

function StatusIcon({ status }) {
  if (status === "pending") return <span className="req-status-dot req-pending" title="ລໍຖ້າ" />;
  if (status === "approved") return <span className="req-status-dot req-approved" title="ອະນຸມັດ" />;
  return <span className="req-status-dot req-rejected" title="ປະຕິເສດ" />;
}

/* Parse APPROVED|company|inserted|skipped  or  REJECTED|reason|count  or plain text */
function parseNotifMsg(raw) {
  if (!raw) return { type: "info", title: "ແຈ້ງເຕືອນ", body: raw, company: "", count: 0 };
  if (raw.startsWith("APPROVED|")) {
    const p = raw.split("|");
    return { type: "approved", title: "ອະນຸມັດ Import ແລ້ວ", company: p[1] || "", count: parseInt(p[2]) || 0, skipped: parseInt(p[3]) || 0, body: "" };
  }
  if (raw.startsWith("REJECTED|")) {
    const p = raw.split("|");
    return { type: "rejected", title: "ປະຕິເສດ Import", company: "", reason: p[1] || "–", body: "" };
  }
  const isOk  = raw.includes("✅") || raw.toLowerCase().includes("ອະນຸມັດ");
  const isErr = raw.includes("❌") || raw.toLowerCase().includes("ປະຕິເສດ");
  return {
    type: isOk ? "approved" : isErr ? "rejected" : "info",
    title: isOk ? "ອະນຸມັດແລ້ວ" : isErr ? "ຖືກປະຕິເສດ" : "ແຈ້ງເຕືອນ",
    body: raw.replace(/^(?:✅|❌|🔔|🪪)\s*/u, ""),
    company: "", count: 0,
  };
}

/* ── Company Admin: one row in "ຄຳຂໍຂອງຂ້ອຍ" ── */
const MRQ_KIND = {
  edit:   { label: "ຂໍແກ້ໄຂ",   cls: "mrq-k-edit",
            icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg> },
  delete: { label: "ຂໍລຶບ",     cls: "mrq-k-delete",
            icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M19 6l-1 14H6L5 6"/></svg> },
  card:   { label: "ຂໍເຮັດບັດ",  cls: "mrq-k-card",
            icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="5" width="20" height="14" rx="2"/><circle cx="8" cy="12" r="2"/><path d="M13 10h5M13 14h3"/></svg> },
};
const MRQ_STATUS = {
  pending:  { label: "ລໍຖ້າ",    cls: "mrq-s-pending" },
  approved: { label: "ອະນຸມັດ",  cls: "mrq-s-approved" },
  rejected: { label: "ປະຕິເສດ",  cls: "mrq-s-rejected" },
};

function MyRequestItem({ item, right, onClick, children }) {
  const k = MRQ_KIND[item.kind] || MRQ_KIND.edit;
  const st = MRQ_STATUS[item.status] || MRQ_STATUS.pending;
  return (
    <div
      className={`mrq-item${item.status === "pending" ? " mrq-item-pending" : ""}${onClick ? " mrq-clickable" : ""}`}
      onClick={onClick}
    >
    <div className="mrq-row">
      <div className={`mrq-icon ${k.cls}`}>{k.icon}</div>
      <div className="mrq-body">
        <div className="mrq-title" title={item.title}>{item.title}</div>
        <div className="mrq-sub">
          <span className={`mrq-kind ${k.cls}`}>{item.kindLabel || k.label}</span>
          <span className="mrq-sep">·</span>
          <span>{fmtTime(item.created_at)}</span>
          {item.extra && <><span className="mrq-sep">·</span><span>{item.extra}</span></>}
        </div>
        {item.names?.length > 0 && (
          <div className="mrq-chips">
            {item.names.slice(0, 3).map((nm, i) => <span key={i} className="mrq-chip">{nm}</span>)}
            {item.names.length > 3 && <span className="mrq-chip mrq-chip-more">+{item.names.length - 3}</span>}
          </div>
        )}
        {item.status === "rejected" && item.reason && (
          <div className="mrq-reason">ເຫດຜົນ: {item.reason}</div>
        )}
      </div>
      {right !== undefined ? right : <span className={`mrq-status ${st.cls}`}>{st.label}</span>}
    </div>
    {children && <div className="mrq-extra">{children}</div>}
    </div>
  );
}

function NotifCard({ n, onRead, onOpen }) {
  const p = parseNotifMsg(n.message);
  if (n.entity_type === "card_request" && p.type === "info") p.title = "ຄຳຂໍເຮັດບັດໃໝ່";
  const accent = p.type === "approved" ? "#16a34a" : p.type === "rejected" ? "#dc2626" : "#6366f1";
  const bg     = p.type === "approved" ? "#f0fdf4" : p.type === "rejected" ? "#fff5f5" : "#f5f3ff";
  const iconBg = p.type === "approved" ? "#dcfce7" : p.type === "rejected" ? "#fee2e2" : "#ede9fe";
  return (
    <div
      className={`ncard${!n.is_read ? " ncard-unread" : ""}`}
      onClick={() => { if (!n.is_read) onRead(n.id); if (onOpen) onOpen(n); }}
      style={{ borderLeftColor: accent, background: !n.is_read ? bg : undefined, cursor: onOpen ? "pointer" : undefined }}
    >
      <div className="ncard-icon" style={{ background: iconBg, color: accent }}>
        {p.type === "approved"
          ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
          : p.type === "rejected"
          ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
        }
      </div>
      <div className="ncard-body">
        <div className="ncard-title" style={{ color: accent }}>{p.title}</div>
        {p.type === "approved" && (
          <div className="ncard-content">
            {p.company && <span className="ncard-company">{p.company}</span>}
            <span className="ncard-stat ncard-stat-green">+{p.count} ຄົນ</span>
            {p.skipped > 0 && <span className="ncard-stat ncard-stat-gray">{p.skipped} ຂ້າມ</span>}
          </div>
        )}
        {p.type === "rejected" && (
          <div className="ncard-content">
            {p.reason && <span className="ncard-reason">{p.reason}</span>}
          </div>
        )}
        {p.body && <div className="ncard-text">{p.body}</div>}
        <div className="ncard-time">{fmtTime(n.created_at)}</div>
      </div>
      {!n.is_read && <span className="ncard-dot" />}
    </div>
  );
}

function IconSun() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <circle cx="12" cy="12" r="5"/>
      <line x1="12" y1="1" x2="12" y2="3"/>
      <line x1="12" y1="21" x2="12" y2="23"/>
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
      <line x1="1" y1="12" x2="3" y2="12"/>
      <line x1="21" y1="12" x2="23" y2="12"/>
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
      <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
    </svg>
  );
}
function IconMoon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
    </svg>
  );
}

export default function Topbar({ onMenuToggle }) {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { notFound: isNotFoundRoute } = usePageMeta();
  const { company, selectCompany } = useCompany();
  const { lang, t } = useLanguage();
  const user = useCurrentUser();
  const [dark, setDark] = useDarkMode();
  const isSuperAdmin   = user.role === "Super Admin";
  const isCompanyAdmin = user.role === "Company Admin";

  /* ── Super Admin state ── */
  const [notifs,        setNotifs]        = useState([]);
  const [unread,        setUnread]        = useState(0);
  const [approvals,     setApprovals]     = useState([]);
  const [pendingCnt,    setPendingCnt]    = useState(0);
  const [importBatches, setImportBatches] = useState([]);
  const [cardRequests,  setCardRequests]  = useState([]);
  const [tab,           setTab]           = useState("approvals");
  const [rejectId,        setRejectId]        = useState(null);
  const [rejectText,      setRejectText]      = useState("");
  const [expandedBulk,    setExpandedBulk]    = useState(null);
  const [bulkRejectMode,  setBulkRejectMode]  = useState(false);
  const [bulkRejectText,  setBulkRejectText]  = useState("");
  const [impRejectId,     setImpRejectId]     = useState(null);
  const [impRejectText,   setImpRejectText]   = useState("");
  const [reviewBatchId,   setReviewBatchId]   = useState(null);

  /* ── Super Admin: centered popup for newly-arrived pending requests ── */
  const [pendingQueue,    setPendingQueue]    = useState([]);
  const [pendingPopup,    setPendingPopup]    = useState(null);
  const seenPendingIds    = useRef(new Set());
  const seenPendingLoaded = useRef(false);

  /* ── Company Admin state ── */
  const [myNotifs,      setMyNotifs]      = useState([]);
  const [myUnread,      setMyUnread]      = useState(0);
  const [myRequests,    setMyRequests]    = useState([]);
  const [myCardReqs,    setMyCardReqs]    = useState([]);
  const [myTab,         setMyTab]         = useState("requests");
  const [approvalPopup, setApprovalPopup] = useState(null);
  const shownNotifIds = useRef(new Set());

  /* persist shown IDs per user so logout→login doesn't re-show old toasts */
  const loadShownIds = (uid) => {
    try {
      const raw = localStorage.getItem(`notif_shown_${uid}`);
      return raw ? new Set(JSON.parse(raw)) : new Set();
    } catch { return new Set(); }
  };
  const saveShownIds = (uid, set) => {
    try {
      const arr = [...set].slice(-200); // keep latest 200 to avoid unbounded growth
      localStorage.setItem(`notif_shown_${uid}`, JSON.stringify(arr));
    } catch {}
  };

  const [showPanel,  setShowPanel]  = useState(false);
  const bellRef = useRef(null);

  /* ── Global search ── */
  const [searchQuery,   setSearchQuery]   = useState("");
  const [searchResults, setSearchResults] = useState({ employees: [], companies: [] });
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchOpen,    setSearchOpen]    = useState(false);
  const searchRef   = useRef(null);
  const searchTimer = useRef(null);

  useEffect(() => {
    clearTimeout(searchTimer.current);
    const q = searchQuery.trim();
    if (q.length < 2) {
      setSearchResults({ employees: [], companies: [] });
      setSearchLoading(false);
      return;
    }
    setSearchLoading(true);
    searchTimer.current = setTimeout(async () => {
      try {
        const [empRes, comRes] = await Promise.all([
          api.get("/employees", { params: { search: q, limit: 5 } }),
          api.get("/company",   { params: { search: q, limit: 5 } }),
        ]);
        setSearchResults({
          employees: empRes.data?.data ?? [],
          companies: comRes.data?.data ?? [],
        });
      } catch {
        setSearchResults({ employees: [], companies: [] });
      } finally {
        setSearchLoading(false);
      }
    }, 300);
    return () => clearTimeout(searchTimer.current);
  }, [searchQuery]);

  useEffect(() => {
    const handler = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setSearchOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const goToEmployee = (id) => {
    setSearchOpen(false); setSearchQuery("");
    navigate(`/employees/${id}`);
  };
  const goToCompany = (id) => {
    setSearchOpen(false); setSearchQuery("");
    navigate(`/companies/${id}`);
  };
  const searchHasResults = searchResults.employees.length > 0 || searchResults.companies.length > 0;

  /* ── load companies ── */
  useEffect(() => {
    if (!user.user_id) return;
    api.get(`/company/my/${user.user_id}`)
      .then(res => {
        if (res.data.length > 0 && !company) selectCompany(res.data[0]);
      })
      .catch(() => {});
  }, []);

  /* ── Super Admin: track which pending requests we've already popped up,
     so a page reload / login doesn't replay a modal for items still
     sitting in the queue from before ── */
  const loadSeenPending = (uid) => {
    try {
      const raw = localStorage.getItem(`pending_seen_${uid}`);
      return raw ? new Set(JSON.parse(raw)) : new Set();
    } catch { return new Set(); }
  };
  const saveSeenPending = (uid, set) => {
    try {
      localStorage.setItem(`pending_seen_${uid}`, JSON.stringify([...set].slice(-300)));
    } catch {}
  };

  /* isFirst=true just records the current pending items as "seen" without
     popping anything up — the badge/panel already surfaces those. Any item
     that shows up on a later poll and wasn't seen before is genuinely new. */
  const registerPending = (items, isFirst) => {
    if (!user.user_id) return;
    if (!seenPendingLoaded.current) {
      seenPendingIds.current = loadSeenPending(user.user_id);
      seenPendingLoaded.current = true;
    }
    const fresh = items.filter(it => !seenPendingIds.current.has(it.id));
    items.forEach(it => seenPendingIds.current.add(it.id));
    saveSeenPending(user.user_id, seenPendingIds.current);
    if (isFirst || fresh.length === 0) return;
    setPendingQueue(q => [...q, ...fresh]);
  };

  /* ── Super Admin: fetch notifs + approvals + import batches ── */
  const fetchSuperAdmin = (isFirst = false) => {
    api.get("/notifications").then(r => {
      const list = r.data?.data ?? r.data;
      setNotifs(list);
      setUnread(list.filter(n => !n.is_read).length);
    }).catch(() => {});

    api.get("/approvals").then(r => {
      setApprovals(r.data);
      const pending = r.data.filter(a => a.status === "pending");
      setPendingCnt(pending.length);
      registerPending(pending.map(a => ({ id: `apv-${a.id}`, kind: "approval", data: a })), isFirst);
    }).catch(() => {});

    api.get("/card-requests").then(r => {
      setCardRequests(Array.isArray(r.data) ? r.data : []);
    }).catch(() => {});

    api.get("/import/batches").then(r => {
      setImportBatches(r.data);
      const pendingImp = r.data.filter(b => b.status === "pending");
      registerPending(pendingImp.map(b => ({ id: `imp-${b.batch_id}`, kind: "import", data: b })), isFirst);
    }).catch(() => {});
  };

  /* ── Company Admin: ດຶງ notifs ທັງໝົດ + process popups ── */
  const fetchMyNotifs = () => {
    api.get("/notifications/my").then(r => {
      const list = r.data?.data ?? r.data;
      setMyNotifs(list);
      setMyUnread(list.filter(n => !n.is_read).length);

      /* restore persisted shown IDs so we don't re-toast after logout/login */
      if (user.user_id && shownNotifIds.current.size === 0) {
        shownNotifIds.current = loadShownIds(user.user_id);
      }

      const newNotifs = r.data.filter(n => !n.is_read && !shownNotifIds.current.has(n.id));
      if (newNotifs.length === 0) return;

      /* mark all as shown and persist */
      newNotifs.forEach(n => shownNotifIds.current.add(n.id));
      saveShownIds(user.user_id, shownNotifIds.current);

      /* show popup for APPROVED|/REJECTED| type (only first one) */
      const importNotif = newNotifs.find(n => {
        const m = n.message || "";
        return m.startsWith("APPROVED|") || m.startsWith("REJECTED|");
      });
      if (importNotif) setApprovalPopup(importNotif);

      /* show exactly ONE toast — summary if multiple, detail if single */
      const toastNotifs = newNotifs.filter(n => {
        const m = n.message || "";
        return !m.startsWith("APPROVED|") && !m.startsWith("REJECTED|");
      });
      if (toastNotifs.length === 0) return;

      let accent, icon, title, body;
      if (toastNotifs.length === 1) {
        const msg = toastNotifs[0].message || "";
        const isOk  = msg.includes("✅") || msg.toLowerCase().includes("ອະນຸມັດ");
        const isErr = msg.includes("❌") || msg.toLowerCase().includes("ປະຕິເສດ");
        accent = isOk ? "#22c55e" : isErr ? "#ef4444" : "#6366f1";
        icon   = isOk ? "✅" : isErr ? "❌" : "🔔";
        title  = isOk ? "ອະນຸມັດແລ້ວ" : isErr ? "ຖືກປະຕິເສດ" : "ການແຈ້ງເຕືອນ";
        body   = msg.replace(/^[✅❌🔔]\s*/u, "");
      } else {
        accent = "#6366f1";
        icon   = "🔔";
        title  = "ການແຈ້ງເຕືອນ";
        body   = `ມີ ${toastNotifs.length} ການແຈ້ງເຕືອນໃໝ່`;
      }

      toast.custom(t => (
        <div
          onClick={() => toast.dismiss(t.id)}
          style={{
            display: "flex", alignItems: "flex-start", gap: 12,
            background: "#fff", borderRadius: 14,
            boxShadow: "0 8px 32px rgba(0,0,0,0.13)",
            border: `1px solid #f3f4f6`,
            borderLeft: `4px solid ${accent}`,
            padding: "14px 16px", maxWidth: 380,
            fontFamily: "inherit", cursor: "pointer",
            opacity: t.visible ? 1 : 0,
            transform: t.visible ? "translateX(0)" : "translateX(40px)",
            transition: "all 0.25s ease",
          }}
        >
          <span style={{ fontSize: 22, lineHeight: 1.2, flexShrink: 0 }}>{icon}</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: accent, marginBottom: 3, textTransform: "uppercase", letterSpacing: "0.5px" }}>
              {title}
            </div>
            <div style={{ fontSize: 14, color: "#111827", lineHeight: 1.5 }}>{body}</div>
          </div>
          <button onClick={e => { e.stopPropagation(); toast.dismiss(t.id); }}
            style={{ background: "none", border: "none", cursor: "pointer", color: "#9ca3af", fontSize: 16, padding: 0, lineHeight: 1, flexShrink: 0 }}>
            ✕
          </button>
        </div>
      ), { duration: 6000 });
    }).catch(() => {});
  };

  /* ── Company Admin: poll lightweight count + requests ── */
  const fetchCompanyAdmin = () => {
    /* lightweight badge count — ບໍ່ load notification ທັງໝົດ */
    api.get("/notifications/my/unread-count").then(r => {
      setMyUnread(r.data.count);
    }).catch(() => {});

    api.get("/approvals/my").then(r => {
      setMyRequests(r.data);
    }).catch(() => {});
    api.get("/card-requests/my").then(r => {
      setMyCardReqs(Array.isArray(r.data) ? r.data : []);
    }).catch(() => {});
  };

  useEffect(() => {
    if (isSuperAdmin) {
      fetchSuperAdmin(true);
      const t = setInterval(() => fetchSuperAdmin(false), 30000);
      return () => clearInterval(t);
    }
    if (isCompanyAdmin) {
      /* initial load: fetch full notifs for popup detection */
      fetchMyNotifs();
      api.get("/approvals/my").then(r => setMyRequests(r.data)).catch(() => {});
      api.get("/card-requests/my").then(r => setMyCardReqs(Array.isArray(r.data) ? r.data : [])).catch(() => {});
      /* poll: lightweight count + requests only */
      const t = setInterval(fetchCompanyAdmin, 30000);
      return () => clearInterval(t);
    }
  }, []);

  /* ── show one popup at a time from the pending queue ── */
  useEffect(() => {
    if (!pendingPopup && pendingQueue.length > 0) {
      setPendingPopup(pendingQueue[0]);
      setPendingQueue(q => q.slice(1));
    }
  }, [pendingQueue, pendingPopup]);

  /* ── close on outside click ── */
  useEffect(() => {
    const handler = (e) => {
      if (bellRef.current && !bellRef.current.contains(e.target)) {
        setShowPanel(false);
        setRejectId(null);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  /* ── Super Admin actions ── */
  const markAllRead = async () => {
    await api.patch("/notifications/read-all").catch(() => {});
    setNotifs(n => n.map(x => ({ ...x, is_read: true })));
    setUnread(0);
  };
  const markOneRead = async (id) => {
    await api.patch(`/notifications/${id}/read`).catch(() => {});
    setNotifs(n => n.map(x => x.id === id ? { ...x, is_read: true } : x));
    setUnread(c => Math.max(0, c - 1));
  };
  const handleApprove = async (id) => {
    try {
      await api.patch(`/approvals/${id}/approve`);
      toast.success("ອະນຸມັດສຳເລັດ!");
      fetchSuperAdmin();
    } catch { toast.error("ເກີດຂໍ້ຜິດພາດ"); }
  };
  const handleReject = async (id) => {
    try {
      await api.patch(`/approvals/${id}/reject`, { reason: rejectText });
      toast.success("ປະຕິເສດແລ້ວ");
      setRejectId(null); setRejectText("");
      fetchSuperAdmin();
    } catch { toast.error("ເກີດຂໍ້ຜິດພາດ"); }
  };
  const handleApproveAll = async () => {
    const ids = approvals.filter(a => a.status === "pending").map(a => a.id);
    if (!ids.length) return;
    try {
      const r = await api.post("/approvals/bulk-approve", { ids });
      toast.success(`ອະນຸມັດ ${r.data.approved} ລາຍການສຳເລັດ!`);
      fetchSuperAdmin();
    } catch { toast.error("ເກີດຂໍ້ຜິດພາດ"); }
  };
  const handleRejectAll = async () => {
    const ids = approvals.filter(a => a.status === "pending").map(a => a.id);
    if (!ids.length) return;
    try {
      const r = await api.post("/approvals/bulk-reject", { ids, reason: bulkRejectText });
      toast.success(`ປະຕິເສດ ${r.data.rejected} ລາຍການແລ້ວ`);
      setBulkRejectMode(false); setBulkRejectText("");
      fetchSuperAdmin();
    } catch { toast.error("ເກີດຂໍ້ຜິດພາດ"); }
  };

  /* ── Company Admin actions ── */
  const markMyAllRead = async () => {
    await api.patch("/notifications/my/read-all").catch(() => {});
    setMyNotifs(n => n.map(x => ({ ...x, is_read: true })));
    setMyUnread(0);
  };
  const markMyOneRead = async (id) => {
    await api.patch(`/notifications/my/${id}/read`).catch(() => {});
    setMyNotifs(n => n.map(x => x.id === id ? { ...x, is_read: true } : x));
    setMyUnread(c => Math.max(0, c - 1));
  };
  /* fetch full notifs when Company Admin opens panel (ໃຫ້ list ໃໝ່ສະເໝີ) */
  const handleCompanyBellOpen = () => {
    setShowPanel(v => {
      if (!v) fetchMyNotifs();
      return !v;
    });
  };

  const pendingImportCnt = importBatches.filter(b => b.status === "pending").length;
  const pendingCards     = cardRequests.filter(b => b.status === "pending");
  const pendingCardCnt   = pendingCards.length;

  const handleImportApprove = async (batchId) => {
    try {
      const r = await api.post(`/import/batches/${batchId}/approve`);
      toast.success(`ອະນຸມັດ Import ສຳເລັດ — ນຳເຂົ້າ ${r.data.inserted} ຄົນ`);
      fetchSuperAdmin();
    } catch (err) {
      toast.error(err?.response?.data?.message || "ອະນຸມັດບໍ່ສຳເລັດ");
    }
  };
  const handleImportReject = async (batchId) => {
    try {
      await api.post(`/import/batches/${batchId}/reject`, { reason: impRejectText });
      toast.success("ປະຕິເສດ Import ແລ້ວ");
      setImpRejectId(null); setImpRejectText("");
      fetchSuperAdmin();
    } catch { toast.error("ເກີດຂໍ້ຜິດພາດ"); }
  };

  const breadcrumbSection = getBreadcrumbSection(pathname);

  /* badges */
  const superBadge  = unread + pendingCnt + pendingImportCnt + pendingCardCnt;
  const crNo = b => `CR-${new Date(b.created_at).getFullYear()}-${String(b.batch_id).padStart(5, "0")}`;
  const pendingApvs = approvals.filter(a => a.status === "pending");
  const superHistory = [
    ...approvals.filter(a => a.status !== "pending").map(ar => {
      const isBulk = ar.request_type === "bulk_delete";
      return {
        key: `apv-${ar.id}`,
        kind: ar.request_type === "delete" || isBulk ? "delete" : "edit",
        kindLabel: isBulk ? `ຂໍລຶບ ${ar.old_data?.ids?.length || ar.old_data?.employees?.length || "?"} ຄົນ` : undefined,
        title: ar.entity_name,
        extra: ar.requester_name || ar.requested_by_name,
        status: ar.status, reason: ar.reject_reason, created_at: ar.created_at,
      };
    }),
    ...cardRequests.filter(b => b.status !== "pending").map(b => ({
      key: `cr-${b.batch_id}`, kind: "card",
      kindLabel: `ຂໍເຮັດບັດ ${b.total_count} ຄົນ`,
      title: b.companies_name || crNo(b),
      extra: crNo(b),
      status: b.status === "rejected" ? "rejected" : "approved",
      reason: b.reject_reason, created_at: b.created_at, batchId: b.batch_id,
    })),
  ].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 6);
  const openCardRequest = id => { setShowPanel(false); navigate(`/idcard/requests/${id}`); };
  const myItems = [
    ...myRequests.map(r => {
      const isBulk = r.request_type === "bulk_delete";
      const emps = isBulk ? (r.old_data?.employees || []) : [];
      const bulkCount = isBulk ? (r.old_data?.ids?.length || emps.length || 0) : 0;
      return {
        key: `apv-${r.id}`,
        kind: r.request_type === "delete" || isBulk ? "delete" : "edit",
        kindLabel: isBulk ? `ຂໍລຶບ ${bulkCount} ຄົນ` : undefined,
        title: isBulk ? `ລຶບພະນັກງານ ${bulkCount} ຄົນ` : r.entity_name,
        names: emps.map(e => `${e.firstname || ""} ${e.lastname || ""}`.trim()),
        status: r.status, reason: r.reject_reason, created_at: r.created_at,
      };
    }),
    ...myCardReqs.map(b => ({
      key: `cr-${b.batch_id}`,
      kind: "card",
      kindLabel: `ຂໍເຮັດບັດ ${b.total_count} ຄົນ`,
      title: b.companies_name || "ຄຳຂໍເຮັດບັດ",
      extra: `CR-${new Date(b.created_at).getFullYear()}-${String(b.batch_id).padStart(5, "0")}`,
      status: b.status, reason: b.reject_reason, created_at: b.created_at,
    })),
  ].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  const myPendingItems = myItems.filter(i => i.status === "pending");
  const myDoneItems    = myItems.filter(i => i.status !== "pending");
  const myPendingCnt = myPendingItems.length;
  const companyBadge = myUnread + myPendingCnt;

  return (
    <>
    <div className="topbar">
      <button className="topbar-hamburger" onClick={onMenuToggle} aria-label="Toggle menu">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <line x1="3" y1="6" x2="21" y2="6"/>
          <line x1="3" y1="12" x2="21" y2="12"/>
          <line x1="3" y1="18" x2="21" y2="18"/>
        </svg>
      </button>

      <div className="topbar-breadcrumb">
        <button className="topbar-crumb-back" onClick={() => navigate(-1)} aria-label={lang === "lo" ? "ກັບຄືນ" : "Back"}>
          <IconArrowLeft />
        </button>
        <button className="topbar-crumb-home" onClick={() => navigate("/")} aria-label="Home">
          <IconHome />
        </button>
        {breadcrumbSection && (
          <>
            <IconChevronRight className="topbar-crumb-chev" />
            <span className="topbar-crumb-section">{t(breadcrumbSection)}</span>
          </>
        )}
        <IconChevronRight className="topbar-crumb-chev" />
        <span className="topbar-crumb-current">
          {currentPageLabel(pathname, lang, isNotFoundRoute ? t("notfound_crumb") : null)}
        </span>
      </div>

      {/* ════════════════ GLOBAL SEARCH ════════════════ */}
      <div className="gsearch-wrap" ref={searchRef}>
        <IconSearch />
        <input
          className="gsearch-input"
          type="text"
          placeholder={t("gsearch_placeholder")}
          value={searchQuery}
          onChange={e => { setSearchQuery(e.target.value); setSearchOpen(true); }}
          onFocus={() => setSearchOpen(true)}
          onKeyDown={e => { if (e.key === "Escape") { setSearchOpen(false); e.target.blur(); } }}
          aria-label={t("gsearch_placeholder")}
        />
        {searchQuery && (
          <button
            className="gsearch-clear"
            onClick={() => { setSearchQuery(""); setSearchResults({ employees: [], companies: [] }); }}
            aria-label="Clear search"
          >
            ✕
          </button>
        )}

        {searchOpen && searchQuery.trim().length > 0 && (
          <div className="gsearch-dropdown">
            {searchQuery.trim().length < 2 ? (
              <div className="gsearch-hint">{t("gsearch_min_chars")}</div>
            ) : searchLoading ? (
              <div className="gsearch-hint">{t("gsearch_searching")}</div>
            ) : !searchHasResults ? (
              <div className="gsearch-hint">{t("gsearch_no_results")}</div>
            ) : (
              <>
                {searchResults.employees.length > 0 && (
                  <div className="gsearch-section">
                    <div className="gsearch-section-label">{t("gsearch_employees")}</div>
                    {searchResults.employees.map(e => (
                      <button key={e.employee_id} className="gsearch-item" onClick={() => goToEmployee(e.employee_id)}>
                        <Avatar name={`${e.firstname} ${e.lastname}`} size={30} />
                        <div className="gsearch-item-info">
                          <span className="gsearch-item-name">{e.firstname} {e.lastname}</span>
                          <span className="gsearch-item-sub">{e.position || "–"} · {e.companies_name || "–"}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
                {searchResults.companies.length > 0 && (
                  <div className="gsearch-section">
                    <div className="gsearch-section-label">{t("gsearch_companies")}</div>
                    {searchResults.companies.map(c => (
                      <button key={c.company_id} className="gsearch-item" onClick={() => goToCompany(c.company_id)}>
                        <Avatar name={c.companies_name} size={30} />
                        <div className="gsearch-item-info">
                          <span className="gsearch-item-name">{c.companies_name}</span>
                          <span className="gsearch-item-sub">{c.status || "–"}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* ════════════════ DARK MODE TOGGLE ════════════════ */}
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <button
          className="dark-toggle"
          onClick={() => setDark(d => !d)}
          title={dark ? "Switch to light mode" : "Switch to dark mode"}
        >
          {dark ? <IconSun /> : <IconMoon />}
        </button>
      </div>

      {/* ════════════════ SUPER ADMIN BELL ════════════════ */}
      {isSuperAdmin && (
        <div className="notif-wrap" ref={bellRef}>
          <button className="notif-bell" onClick={() => setShowPanel(v => !v)}>
            <IconBell />
            {superBadge > 0 && (
              <span className="notif-badge">{superBadge > 99 ? "99+" : superBadge}</span>
            )}
          </button>

          {showPanel && (
            <div className="notif-dropdown">
              <div className="notif-dropdown-header">
                <span className="notif-dropdown-title"><IconBell /> ການແຈ້ງເຕືອນ</span>
              </div>
              {/* Tabs */}
              <div className="notif-tabs">
                <button className={`notif-tab${tab === "approvals" ? " notif-tab-active" : ""}`} onClick={() => setTab("approvals")}>
                  ອະນຸຍາດ {(pendingCnt + pendingCardCnt) > 0 && <span className="ntab-badge">{pendingCnt + pendingCardCnt}</span>}
                </button>
                <button className={`notif-tab${tab === "import" ? " notif-tab-active" : ""}`} onClick={() => setTab("import")}>
                  Import {pendingImportCnt > 0 && <span className="ntab-badge">{pendingImportCnt}</span>}
                </button>
                <button className={`notif-tab${tab === "notif" ? " notif-tab-active" : ""}`} onClick={() => setTab("notif")}>
                  ແຈ້ງເຕືອນ {unread > 0 && <span className="ntab-badge">{unread}</span>}
                </button>
              </div>

              {/* Approvals tab */}
              {tab === "approvals" && (
                <div className="notif-list mrq-list">
                  {pendingApvs.length === 0 && pendingCardCnt === 0 && (
                    <div className="notif-empty">ບໍ່ມີ request ລໍຖ້າ</div>
                  )}

                  {/* ── ຄຳຂໍເຮັດບັດ ── */}
                  {pendingCardCnt > 0 && (
                    <div className="mrq-section">
                      <div className="mrq-section-label">
                        ຄຳຂໍເຮັດບັດ <span className="mrq-count mrq-count-card">{pendingCardCnt}</span>
                        <span className="mrq-label-actions">
                          <button className="mrq-link" onClick={() => { setShowPanel(false); navigate("/idcard/requests"); }}>
                            ເບິ່ງທັງໝົດ →
                          </button>
                        </span>
                      </div>
                      {pendingCards.map(b => (
                        <MyRequestItem
                          key={`cr-${b.batch_id}`}
                          item={{
                            kind: "card", status: "pending", created_at: b.created_at,
                            kindLabel: `ຂໍເຮັດບັດ ${b.total_count} ຄົນ`,
                            title: b.companies_name || crNo(b),
                            extra: [b.requested_by_name, crNo(b)].filter(Boolean).join(" · "),
                          }}
                          onClick={() => openCardRequest(b.batch_id)}
                          right={<span className="mrq-chevron" aria-hidden>›</span>}
                        />
                      ))}
                    </div>
                  )}

                  {/* ── ຂໍແກ້ໄຂ / ລຶບ ── */}
                  {pendingApvs.length > 0 && (
                    <div className="mrq-section">
                      <div className="mrq-section-label">
                        ຂໍແກ້ໄຂ / ລຶບ <span className="mrq-count">{pendingApvs.length}</span>
                        {!bulkRejectMode && pendingApvs.length > 1 && (
                          <span className="mrq-label-actions">
                            <button className="mrq-link mrq-link-ok" onClick={handleApproveAll}>✓ ອະນຸມັດທັງໝົດ</button>
                            <button className="mrq-link mrq-link-no" onClick={() => setBulkRejectMode(true)}>✕ ປະຕິເສດທັງໝົດ</button>
                          </span>
                        )}
                      </div>
                      {bulkRejectMode && (
                        <div className="mrq-reject-box mrq-reject-bulk">
                          <input
                            className="mrq-reject-input"
                            placeholder="ເຫດຜົນປະຕິເສດທັງໝົດ (ບໍ່ບັງຄັບ)"
                            value={bulkRejectText}
                            onChange={e => setBulkRejectText(e.target.value)}
                            autoFocus
                          />
                          <div className="mrq-reject-btns">
                            <button className="mrq-btn mrq-btn-no" onClick={handleRejectAll}>ຢືນຢັນປະຕິເສດ {pendingApvs.length} ລາຍການ</button>
                            <button className="mrq-btn mrq-btn-ghost" onClick={() => { setBulkRejectMode(false); setBulkRejectText(""); }}>ຍົກເລີກ</button>
                          </div>
                        </div>
                      )}
                      {pendingApvs.map(ar => {
                        const isBulk = ar.request_type === "bulk_delete";
                        const bulkEmps = isBulk ? (ar.old_data?.employees || []) : [];
                        const isExpanded = expandedBulk === ar.id;
                        const isRejecting = rejectId === ar.id;
                        return (
                          <MyRequestItem
                            key={ar.id}
                            item={{
                              kind: ar.request_type === "delete" || isBulk ? "delete" : "edit",
                              kindLabel: isBulk ? `ຂໍລຶບ ${bulkEmps.length} ຄົນ` : undefined,
                              title: ar.entity_name,
                              extra: ar.requester_name || ar.requested_by_name,
                              status: "pending", created_at: ar.created_at,
                            }}
                            right={isRejecting ? null : (
                              <div className="mrq-actions">
                                <button className="mrq-act mrq-act-ok" title="ອະນຸມັດ" onClick={() => handleApprove(ar.id)}>
                                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                                </button>
                                <button className="mrq-act mrq-act-no" title="ປະຕິເສດ" onClick={() => { setRejectId(ar.id); setRejectText(""); }}>
                                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                                </button>
                              </div>
                            )}
                          >
                            {(isBulk || isRejecting) ? (
                              <>
                                {isBulk && (
                                  <button className="mrq-link" onClick={() => setExpandedBulk(isExpanded ? null : ar.id)}>
                                    {isExpanded ? "▲ ຫຍໍ້ລາຍຊື່" : `▼ ເບິ່ງລາຍຊື່ ${bulkEmps.length} ຄົນ`}
                                  </button>
                                )}
                                {isBulk && isExpanded && (
                                  <div className="apv-bulk-list">
                            <div className="apv-bulk-header">
                              <span>#</span>
                              <span>ຊື່ພະນັກງານ</span>
                              <span>Code</span>
                              <span>ຕຳແໜ່ງ</span>
                              <span>ສະຖານະ</span>
                              <span>ບໍລິສັດ</span>
                            </div>
                            {bulkEmps.map((e, i) => {
                              const statusColor = {
                                Active:   { bg:"#dcfce7", color:"#15803d" },
                                "On Leave":{ bg:"#dbeafe", color:"#1d4ed8" },
                                Inactive: { bg:"#f3f4f6", color:"#6b7280" },
                                Resigned: { bg:"#fee2e2", color:"#dc2626" },
                              }[e.status] || { bg:"#f3f4f6", color:"#6b7280" };
                              return (
                                <div key={e.employee_id || i} className="apv-bulk-emp">
                                  <span className="apv-bulk-num">{i + 1}</span>
                                  <div className="apv-bulk-info">
                                    <span className="apv-bulk-name">{e.firstname} {e.lastname}</span>
                                    {e.email && <span className="apv-bulk-email">{e.email}</span>}
                                  </div>
                                  <span className="apv-bulk-code">{e.employee_code || "–"}</span>
                                  <span className="apv-bulk-pos">{e.position || "–"}</span>
                                  <span className="apv-bulk-status" style={{ background: statusColor.bg, color: statusColor.color }}>
                                    {e.status || "–"}
                                  </span>
                                  <span className="apv-bulk-company">{e.companies_name || "–"}</span>
                                </div>
                              );
                            })}
                                  </div>
                                )}
                                {isRejecting && (
                                  <div className="mrq-reject-box">
                                    <input
                                      className="mrq-reject-input"
                                      placeholder="ເຫດຜົນປະຕິເສດ (ບໍ່ບັງຄັບ)"
                                      value={rejectText}
                                      onChange={e => setRejectText(e.target.value)}
                                      onKeyDown={e => { if (e.key === "Enter") handleReject(ar.id); }}
                                      autoFocus
                                    />
                                    <div className="mrq-reject-btns">
                                      <button className="mrq-btn mrq-btn-no" onClick={() => handleReject(ar.id)}>ຢືນຢັນປະຕິເສດ</button>
                                      <button className="mrq-btn mrq-btn-ghost" onClick={() => { setRejectId(null); setRejectText(""); }}>ຍົກເລີກ</button>
                                    </div>
                                  </div>
                                )}
                              </>
                            ) : null}
                          </MyRequestItem>
                        );
                      })}
                    </div>
                  )}

                  {/* ── History ── */}
                  {superHistory.length > 0 && (
                    <div className="mrq-section">
                      <div className="mrq-section-label">ດຳເນີນການແລ້ວລ່າສຸດ</div>
                      {superHistory.map(it => (
                        <MyRequestItem
                          key={it.key}
                          item={it}
                          onClick={it.batchId ? () => openCardRequest(it.batchId) : undefined}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Import Batches tab */}
              {tab === "import" && (
                <div className="notif-list" style={{padding:"4px 0 8px"}}>
                  {importBatches.filter(b => b.status === "pending").length === 0 ? (
                    <div className="notif-empty">ບໍ່ມີ Import ລໍຖ້າ</div>
                  ) : importBatches.filter(b => b.status === "pending").map(b => (
                    <div key={b.batch_id} className="imp-card">
                      {/* Card Header */}
                      <div className="imp-card-header">
                        <div className="imp-avatar">
                          {(b.companies_name || "?")[0].toUpperCase()}
                        </div>
                        <div className="imp-info">
                          <div className="imp-company">{b.companies_name || "–"}</div>
                          <div className="imp-submitter">
                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                              <circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
                            </svg>
                            {b.submitted_by_name}
                          </div>
                        </div>
                        <span className="imp-time-chip">{fmtTime(b.submitted_at)}</span>
                      </div>

                      {/* Stats */}
                      <div className="imp-stats">
                        <div className="imp-stat-pill">
                          <span className="imp-stat-num">{b.valid_rows}</span>
                          <span className="imp-stat-label">ຄົນ ພ້ອມນຳເຂົ້າ</span>
                        </div>
                        {b.total_rows !== b.valid_rows && (
                          <div style={{fontSize:11,color:"#9ca3af"}}>
                            ທັງໝົດ {b.total_rows} ແຖວ
                          </div>
                        )}
                      </div>

                      {/* Actions */}
                      {impRejectId === b.batch_id ? (
                        <div className="imp-reject-box">
                          <input className="imp-reject-input" placeholder="ເຫດຜົນປະຕິເສດ (ຖ້ານ)"
                            value={impRejectText} onChange={e => setImpRejectText(e.target.value)} autoFocus />
                          <div className="imp-reject-btns">
                            <button className="imp-btn-confirm-reject" onClick={() => handleImportReject(b.batch_id)}>ຢືນຢັນ</button>
                            <button className="imp-btn-cancel" onClick={() => { setImpRejectId(null); setImpRejectText(""); }}>ຍົກເລີກ</button>
                          </div>
                        </div>
                      ) : (
                        <div className="imp-actions" style={{flexDirection:"column", gap:8}}>
                          <button
                            className="imp-btn-view"
                            onClick={() => { setReviewBatchId(b.batch_id); setShowPanel(false); }}
                            style={{width:"100%", background:"#eff6ff", color:"#1d4ed8", border:"1.5px solid #bfdbfe", borderRadius:8, padding:"7px 12px", fontSize:12, fontWeight:600, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:6}}
                          >
                            🔍 ເບິ່ງ ແລະ ກວດສອບຂໍ້ມູນກ່ອນ
                          </button>
                          <div style={{display:"flex", gap:8}}>
                            <button className="imp-btn-approve" onClick={() => handleImportApprove(b.batch_id)}>
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>
                              ອະນຸມັດ
                            </button>
                            <button className="imp-btn-reject" onClick={() => setImpRejectId(b.batch_id)}>
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                              ປະຕິເສດ
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}

                  {/* History */}
                  {importBatches.filter(b => b.status !== "pending").length > 0 && (
                    <div className="apv-history-section" style={{margin:"8px 12px 0"}}>
                      <div className="apv-history-label">ດຳເນີນການແລ້ວ</div>
                      {importBatches.filter(b => b.status !== "pending").slice(0,5).map(b => (
                        <div key={b.batch_id} className="apv-history-item">
                          <Avatar name={b.companies_name} size={28} />
                          <div className="apv-history-info">
                            <span className="apv-entity">{b.companies_name}</span>
                            <span className="imp-type-badge">Import</span>
                          </div>
                          <span className={`apv-status-chip ${b.status === "approved" ? "apv-approved" : "apv-rejected"}`}>
                            {b.status === "approved" ? "✓ ອະນຸມັດ" : "✕ ປະຕິເສດ"}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Notifs tab */}
              {tab === "notif" && (
                <>
                  <div className="notif-header">
                    <span className="notif-title">ການແຈ້ງເຕືອນ</span>
                    {unread > 0 && <button className="notif-read-all" onClick={markAllRead}>ອ່ານທັງໝົດ</button>}
                  </div>
                  <div className="notif-list ncard-list">
                    {notifs.length === 0 ? (
                      <div className="notif-empty">ບໍ່ມີການແຈ້ງເຕືອນ</div>
                    ) : notifs.map(n => (
                      <NotifCard key={n.id} n={n} onRead={markOneRead}
                        onOpen={n.entity_type === "card_request" && n.entity_id
                          ? (x) => { setShowPanel(false); navigate(`/idcard/requests/${x.entity_id}`); }
                          : undefined} />
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      )}

      {/* ════════════════ COMPANY ADMIN BELL ════════════════ */}
      {isCompanyAdmin && (
        <div className="notif-wrap" ref={bellRef}>
          <button className="notif-bell" onClick={handleCompanyBellOpen}>
            <IconBell />
            {companyBadge > 0 && (
              <span className="notif-badge">{companyBadge > 99 ? "99+" : companyBadge}</span>
            )}
          </button>

          {showPanel && (
            <div className="notif-dropdown">
              <div className="notif-dropdown-header">
                <span className="notif-dropdown-title"><IconBell /> ການແຈ້ງເຕືອນ</span>
              </div>
              {/* Tabs */}
              <div className="notif-tabs">
                <button className={`notif-tab${myTab === "requests" ? " notif-tab-active" : ""}`} onClick={() => setMyTab("requests")}>
                  ຄຳຂໍຂອງຂ້ອຍ
                  {myPendingCnt > 0 && <span className="ntab-badge">{myPendingCnt}</span>}
                </button>
                <button className={`notif-tab${myTab === "notif" ? " notif-tab-active" : ""}`} onClick={() => setMyTab("notif")}>
                  ຜົນການອະນຸຍາດ
                  {myUnread > 0 && <span className="ntab-badge">{myUnread}</span>}
                </button>
              </div>

              {/* My Requests tab */}
              {myTab === "requests" && (
                <div className="notif-list mrq-list">
                  {myItems.length === 0 ? (
                    <div className="notif-empty">ບໍ່ມີຄຳຂໍ</div>
                  ) : (
                    <>
                      {myPendingItems.length > 0 && (
                        <div className="mrq-section">
                          <div className="mrq-section-label">ກຳລັງລໍຖ້າ <span className="mrq-count">{myPendingItems.length}</span></div>
                          {myPendingItems.map(it => <MyRequestItem key={it.key} item={it} />)}
                        </div>
                      )}
                      {myDoneItems.length > 0 && (
                        <div className="mrq-section">
                          <div className="mrq-section-label">ດຳເນີນການແລ້ວ</div>
                          {myDoneItems.slice(0, 20).map(it => <MyRequestItem key={it.key} item={it} />)}
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}

              {/* Result Notifications tab */}
              {myTab === "notif" && (
                <>
                  <div className="notif-header">
                    <span className="notif-title">ຜົນການອະນຸຍາດ</span>
                    {myUnread > 0 && <button className="notif-read-all" onClick={markMyAllRead}>ອ່ານທັງໝົດ</button>}
                  </div>
                  <div className="notif-list ncard-list">
                    {myNotifs.length === 0 ? (
                      <div className="notif-empty">ຍັງບໍ່ມີຜົນ</div>
                    ) : myNotifs.map(n => (
                      <NotifCard key={n.id} n={n} onRead={markMyOneRead} />
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      )}
    </div>

    {/* ════ New Request Banner — docked below the topbar, stays until dismissed or reviewed (Super Admin) ════ */}
    {isSuperAdmin && (
      <PendingRequestBanner
        item={pendingPopup}
        queueCount={pendingQueue.length}
        onClose={() => setPendingPopup(null)}
        onReview={() => {
          setShowPanel(true);
          setTab(pendingPopup?.kind === "import" ? "import" : "approvals");
          setPendingPopup(null);
        }}
      />
    )}

    {/* ════ Import Result Popup (Company Admin) ════ */}
    <ImportResultPopup
      notif={approvalPopup}
      onClose={() => {
        if (approvalPopup) markMyOneRead(approvalPopup.id);
        setApprovalPopup(null);
      }}
    />

    {/* ════ Import Batch Review Modal (Super Admin) ════ */}
    {reviewBatchId && (
      <ImportBatchReviewModal
        batchId={reviewBatchId}
        onClose={() => setReviewBatchId(null)}
        onApproved={() => { setReviewBatchId(null); fetchSuperAdmin(); }}
        onRejected={() => { setReviewBatchId(null); fetchSuperAdmin(); }}
      />
    )}
    </>
  );
}
