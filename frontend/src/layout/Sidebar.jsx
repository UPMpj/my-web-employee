import { useRef, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
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
const IconUserRoles = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
    <circle cx="12" cy="7" r="4"/>
    <circle cx="19" cy="8" r="2" fill="currentColor" stroke="none"/>
    <path d="M19 6v4M17 8h4"/>
  </svg>
);
const IconAudit = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
    <polyline points="9 12 11 14 15 10"/>
  </svg>
);
const IconSetting = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="3"/>
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
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
const IconLogout = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
    <polyline points="16 17 21 12 16 7"/>
    <line x1="21" y1="12" x2="9" y2="12"/>
  </svg>
);

/* ===== MENU CONFIG ===== */
const MENU = [
  { to: "/dashboard",  label: "Dashboard",    Icon: IconDashboard  },
  { to: "/companies",  label: "Companies",    Icon: IconCompanies  },
  { to: "/employees",  label: "Employees",    Icon: IconEmployees  },
  { to: "/idcard",     label: "ID Card",      Icon: IconIdCard     },
  { to: "/building",  label: "Building",     Icon: IconBuilding   },
  { to: "/reports",    label: "Reports",      Icon: IconReports    },
  { to: "/users",      label: "User & Roles", Icon: IconUserRoles, role: "Super Admin" },
  { to: "/audit",      label: "Audit Log",    Icon: IconAudit,     role: "Super Admin" },
  { to: "/settings",   label: "Setting",      Icon: IconSetting    },
];

export default function Sidebar() {
  const navigate  = useNavigate();
  const user      = JSON.parse(localStorage.getItem("user") || "{}");
  const fileRef   = useRef(null);
  const [logoSrc, setLogoSrc] = useState(localStorage.getItem("sidebar_logo") || null);

  const logout = () => {
    localStorage.clear();
    navigate("/login");
  };

  const handleLogoChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const base64 = ev.target.result;
      localStorage.setItem("sidebar_logo", base64);
      setLogoSrc(base64);
    };
    reader.readAsDataURL(file);
  };

  const removeLogo = (e) => {
    e.stopPropagation();
    localStorage.removeItem("sidebar_logo");
    setLogoSrc(null);
  };

  return (
    <div className="sidebar">
      <div className="sidebar-logo">
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          hidden
          onChange={handleLogoChange}
        />
        <div className="logo-wrap" onClick={() => fileRef.current.click()} title="ກົດເພື່ອປ່ຽນ Logo">
          {logoSrc ? (
            <img src={logoSrc} alt="logo" className="logo-img" />
          ) : (
            <img src="/logo.png" alt="logo" className="logo-img" />
          )}
          <div className="logo-overlay">
            <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" width="16" height="16">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="17 8 12 3 7 8"/>
              <line x1="12" y1="3" x2="12" y2="15"/>
            </svg>
          </div>
          {logoSrc && (
            <button className="logo-remove" onClick={removeLogo} title="ລຶບ Logo">✕</button>
          )}
        </div>
        <span className="logo-text">CMS Web</span>
      </div>

      <nav className="sidebar-nav">
        {MENU.map(({ to, label, Icon, role }) => {
          if (role && user?.role !== role) return null;
          return (
            <NavLink key={to} to={to} className={({ isActive }) => "menu-item" + (isActive ? " menu-active" : "")}>
              <span className="menu-icon"><Icon /></span>
              <span className="menu-label">{label}</span>
            </NavLink>
          );
        })}
      </nav>

      <div className="sidebar-footer">
        <button className="logout-btn" onClick={logout}>
          <span className="menu-icon"><IconLogout /></span>
          Log out
        </button>
      </div>
    </div>
  );
}
