import { useRef, useState, useEffect } from "react";
import { NavLink, useNavigate, useLocation } from "react-router-dom";
import { useLanguage } from "../context/LanguageContext";
import { useCurrentUser } from "../hooks/useCurrentUser";
import { useLogoUpload } from "../hooks/useLogoUpload";
import { api } from "../api";
import "./sidebar.css";

/* ===== SVG ICONS ===== */
const IconDashboard = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M3 9.5L12 3l9 6.5V20a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9.5z"/>
    <path d="M9 21V12h6v9"/>
  </svg>
);
const IconCompanies = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="2" y="7" width="20" height="14" rx="2"/>
    <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/>
    <line x1="12" y1="12" x2="12" y2="12.01"/>
    <path d="M2 12h20"/>
  </svg>
);
const IconEmployees = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
    <circle cx="9" cy="7" r="4"/>
    <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
    <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
  </svg>
);
const IconIdCard = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="2" y="5" width="20" height="14" rx="2"/>
    <circle cx="8" cy="12" r="2.5"/>
    <path d="M13 10h5M13 14h3"/>
  </svg>
);
const IconReports = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
    <polyline points="14 2 14 8 20 8"/>
    <line x1="8" y1="13" x2="16" y2="13"/>
    <line x1="8" y1="17" x2="16" y2="17"/>
  </svg>
);
const IconSetting = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="3"/>
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
  </svg>
);
const IconPhoto = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="3" width="18" height="18" rx="2"/>
    <circle cx="8.5" cy="8.5" r="1.5"/>
    <polyline points="21 15 16 10 5 21"/>
  </svg>
);
const IconBuilding = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="3" width="18" height="18" rx="2"/>
    <path d="M3 9h18"/>
    <path d="M9 21V9"/>
    <path d="M7 6h.01M12 6h.01M17 6h.01"/>
    <path d="M12 13h.01M17 13h.01M12 17h.01M17 17h.01"/>
  </svg>
);
const IconChevron = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
    <polyline points="6 9 12 15 18 9"/>
  </svg>
);
const IconAbout = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10"/>
    <path d="M12 16v-4"/>
    <path d="M12 8h.01"/>
  </svg>
);
const IconTapInOut = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="9"/>
    <path d="M12 7v5l3 3"/>
  </svg>
);
const IconUsers = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="9" cy="7" r="4"/>
    <path d="M2 21v-2a4 4 0 0 1 4-4h6a4 4 0 0 1 4 4v2"/>
    <path d="M19 8v6M16 11h6"/>
  </svg>
);
const IconLogout = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
    <polyline points="16 17 21 12 16 7"/>
    <line x1="21" y1="12" x2="9" y2="12"/>
  </svg>
);

/* ===== MENU CONFIG ===== */
const MENU = [
  /* ── Home ── */
  { to: "/dashboard", labelKey: "nav_dashboard", Icon: IconDashboard, section: "home" },

  /* ── Management ── */
  { to: "/companies", labelKey: "nav_companies", Icon: IconCompanies, section: "management" },
  {
    to: "/employees", labelKey: "nav_employees", Icon: IconEmployees, section: "management",
    children: [
      { to: "/employees",       labelKey: "nav_employees", end: true },
      { to: "/import-approval", labelKey: "nav_import",    role: "Super Admin" },
    ],
  },
  {
    to: "/idcard", labelKey: "nav_idcard", Icon: IconIdCard, section: "management",
    children: [
      { to: "/idcard",          labelKey: "nav_idcard",        end: true },
      { to: "/idcard/requests", labelKey: "nav_card_requests", role: "Super Admin" },
    ],
  },

  /* ── Operations ── */
  { to: "/building",             labelKey: "nav_building", Icon: IconBuilding,  role: "Super Admin", section: "operations" },
  { to: "/employees/tap-in-out", labelKey: "nav_tapinout", Icon: IconTapInOut,  section: "operations" },

  /* ── Analytics ── */
  { to: "/reports", labelKey: "nav_reports", Icon: IconReports, section: "analytics" },

  /* ── Administration ── */
  { to: "/users",    labelKey: "nav_users",    Icon: IconUsers,   role: "Super Admin", section: "administration" },
  { to: "/settings", labelKey: "nav_settings", Icon: IconSetting, section: "administration" },
  { to: "/about",    labelKey: "nav_about",    Icon: IconAbout,   section: "administration" },
];

const SECTIONS = [
  { key: "home",           labelKey: "nav_section_home" },
  { key: "management",     labelKey: "nav_section_management" },
  { key: "operations",     labelKey: "nav_section_operations" },
  { key: "analytics",      labelKey: "nav_section_analytics" },
  { key: "administration", labelKey: "nav_section_administration" },
];

export default function Sidebar({ isOpen, onClose }) {
  const navigate  = useNavigate();
  const location  = useLocation();
  const { t }     = useLanguage();
  const user      = useCurrentUser();
  const fileRef   = useRef(null);
  const { logoSrc, uploadLogo, removeLogo: removeLogoFile } = useLogoUpload();
  const [sysName,  setSysName]  = useState(localStorage.getItem("sys_name") || "UPM CCMS");
  const [openGroups, setOpenGroups] = useState(() => {
    const init = {};
    MENU.forEach(m => {
      if (m.children) {
        init[m.to] = location.pathname.startsWith(m.to)
          || m.children.some(c => location.pathname.startsWith(c.to));
      }
    });
    return init;
  });

  /* Load sys_name + logo from DB on mount — keeps all users in sync */
  useEffect(() => {
    api.get("/settings").then(r => {
      const name = r.data.sys_name || "UPM CCMS";
      setSysName(name);
      localStorage.setItem("sys_name", name);
      if (r.data.logo_url) {
        localStorage.setItem("sidebar_logo", r.data.logo_url);
        window.dispatchEvent(new CustomEvent("sidebar_logo_changed"));
      }
    }).catch(() => {});
  }, []);

  useEffect(() => {
    const onCrossTab  = () => setSysName(localStorage.getItem("sys_name") || "CCMS");
    const onSameTab   = (e) => setSysName(e.detail);
    window.addEventListener("storage",          onCrossTab);
    window.addEventListener("sys_name_changed", onSameTab);
    return () => {
      window.removeEventListener("storage",          onCrossTab);
      window.removeEventListener("sys_name_changed", onSameTab);
    };
  }, []);

  const logout = async () => {
    const logo = localStorage.getItem("sidebar_logo");
    await import("../api").then(m => m.logout());
    /* logout() clears localStorage and redirects — restore logo after */
    if (logo) localStorage.setItem("sidebar_logo", logo);
  };

  const handleLogoChange = (e) => {
    const file = e.target.files[0];
    if (file) uploadLogo(file);
  };

  const removeLogo = (e) => {
    e.stopPropagation();
    removeLogoFile();
  };

  const renderMenuEntry = ({ to, labelKey, Icon, role, children }) => {
    if (role && user?.role !== role) return null;

    if (children) {
      const visibleChildren = children.filter(c => !c.role || user?.role === c.role);
      if (visibleChildren.length > 1) {
        return (
          <div key={to}>
            <button
              type="button"
              className="menu-group-btn"
              onClick={() => setOpenGroups(o => ({ ...o, [to]: !o[to] }))}
            >
              <span className="menu-icon"><Icon /></span>
              <span className="menu-label">{t(labelKey)}</span>
              <span className={`menu-chevron${openGroups[to] ? " menu-chevron-open" : ""}`}>
                <IconChevron />
              </span>
            </button>
            {openGroups[to] && (
              <div className="menu-sub">
                {visibleChildren.map(c => (
                  <NavLink
                    key={c.to}
                    to={c.to}
                    end={c.end}
                    onClick={onClose}
                    className={({ isActive }) => "menu-sub-item" + (isActive ? " menu-sub-active" : "")}
                  >
                    {t(c.labelKey)}
                  </NavLink>
                ))}
              </div>
            )}
          </div>
        );
      }
    }

    return (
      <NavLink
        key={to}
        to={to}
        onClick={onClose}
        className={({ isActive }) => "menu-item" + (isActive ? " menu-active" : "")}
      >
        <span className="menu-icon"><Icon /></span>
        <span className="menu-label">{t(labelKey)}</span>
      </NavLink>
    );
  };

  return (
    <div className={`sidebar${isOpen ? " sidebar-open" : ""}`}>
      <div className="sidebar-logo" onClick={() => navigate("/dashboard")} title="ໄປໜ້າຫຼັກ" style={{cursor:"pointer"}}>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          hidden
          onChange={handleLogoChange}
        />
        <div className="logo-wrap" onClick={e => { e.stopPropagation(); fileRef.current.click(); }} title="ກົດເພື່ອປ່ຽນ Logo">
          {logoSrc ? (
            <img src={logoSrc} alt="logo" className="logo-img" />
          ) : (
            <img src="/IMG_2041.png" alt="logo" className="logo-img" />
          )}
          <div className="logo-overlay">
            <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" width="16" height="16">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="17 8 12 3 7 8"/>
              <line x1="12" y1="3" x2="12" y2="15"/>
            </svg>
          </div>
          {logoSrc && (
            <button className="logo-remove" onClick={e => { e.stopPropagation(); removeLogo(e); }} title="ລຶບ Logo">✕</button>
          )}
        </div>
        <span className="logo-text">{sysName}</span>
      </div>

      <nav className="sidebar-nav">
        {SECTIONS.map(({ key, labelKey }) => {
          const items = MENU.filter(m => m.section === key);
          const visible = items.filter(m => !m.role || user?.role === m.role);
          if (visible.length === 0) return null;
          return (
            <div key={key}>
              <div className="menu-section-label">{t(labelKey)}</div>
              {items.map(renderMenuEntry)}
            </div>
          );
        })}
      </nav>

      <div className="sidebar-footer">
        <div className="sidebar-user">
          <div className="sidebar-user-avatar">{(user.fullname?.[0] || "U").toUpperCase()}</div>
          <div className="sidebar-user-info">
            <span className="sidebar-user-name">{user.fullname || "–"}</span>
            <span className="sidebar-user-role">{user.role || "–"}</span>
          </div>
        </div>
        <button className="logout-btn" onClick={logout}>
          <span className="menu-icon"><IconLogout /></span>
          {t("nav_logout")}
        </button>
      </div>
    </div>
  );
}
