import { useEffect, useState, useRef } from "react";
import { api } from "../api";
import { useCompany } from "../context/CompanyContext";
import "./mainlayout.css";

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
  if (diff < 60)   return "ເດ໋ຍວນີ້";
  if (diff < 3600) return `${Math.floor(diff / 60)} ນາທີກ່ອນ`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} ຊົ່ວໂມງກ່ອນ`;
  return new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
}

export default function Topbar() {
  const [companies, setCompanies]     = useState([]);
  const { company, selectCompany }    = useCompany();
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const isSuperAdmin = user.role === "Super Admin";

  const [notifs,      setNotifs]      = useState([]);
  const [unread,      setUnread]      = useState(0);
  const [showNotifs,  setShowNotifs]  = useState(false);
  const bellRef = useRef(null);

  /* ---- load companies ---- */
  useEffect(() => {
    if (!user.user_id) return;
    api.get(`/company/my/${user.user_id}`)
      .then(res => {
        setCompanies(res.data);
        if (res.data.length > 0 && !company) selectCompany(res.data[0]);
      })
      .catch(() => {});
  }, []);

  /* ---- load notifications (Super Admin only) ---- */
  useEffect(() => {
    if (!isSuperAdmin) return;
    const fetchNotifs = () => {
      api.get("/notifications").then(r => {
        setNotifs(r.data);
        setUnread(r.data.filter(n => !n.is_read).length);
      }).catch(() => {});
    };
    fetchNotifs();
    const interval = setInterval(fetchNotifs, 30000);
    return () => clearInterval(interval);
  }, []);

  /* ---- close dropdown on outside click ---- */
  useEffect(() => {
    const handler = (e) => {
      if (bellRef.current && !bellRef.current.contains(e.target)) {
        setShowNotifs(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const openNotifs = () => {
    setShowNotifs(v => !v);
  };

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

  return (
    <div className="topbar">
      <div className="logo">UDM CMS</div>
      {company && <span className="company-name">{company.companies_name}</span>}

      {/* ===== NOTIFICATION BELL (Super Admin only) ===== */}
      {isSuperAdmin && (
        <div className="notif-wrap" ref={bellRef}>
          <button className="notif-bell" onClick={openNotifs}>
            <IconBell />
            {unread > 0 && (
              <span className="notif-badge">{unread > 99 ? "99+" : unread}</span>
            )}
          </button>

          {showNotifs && (
            <div className="notif-dropdown">
              <div className="notif-header">
                <span className="notif-title">ການແຈ້ງເຕືອນ</span>
                {unread > 0 && (
                  <button className="notif-read-all" onClick={markAllRead}>
                    ອ່ານທັງໝົດ
                  </button>
                )}
              </div>

              <div className="notif-list">
                {notifs.length === 0 ? (
                  <div className="notif-empty">ບໍ່ມີການແຈ້ງເຕືອນ</div>
                ) : notifs.map(n => (
                  <div
                    key={n.id}
                    className={`notif-item ${!n.is_read ? "notif-unread" : ""}`}
                    onClick={() => !n.is_read && markOneRead(n.id)}
                  >
                    <div className="notif-dot-wrap">
                      {!n.is_read && <span className="notif-dot" />}
                    </div>
                    <div className="notif-body">
                      <p className="notif-msg">{n.message}</p>
                      <span className="notif-time">{fmtTime(n.created_at)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
