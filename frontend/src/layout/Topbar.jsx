import { useEffect, useState, useRef } from "react";
import { api } from "../api";
import { useCompany } from "../context/CompanyContext";
import toast from "react-hot-toast";
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
  if (diff < 60)    return "ເດ໋ຍວນີ້";
  if (diff < 3600)  return `${Math.floor(diff / 60)} ນາທີກ່ອນ`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} ຊົ່ວໂມງກ່ອນ`;
  return new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
}

function StatusIcon({ status }) {
  if (status === "pending") return <span className="req-status-dot req-pending" title="ລໍຖ້າ" />;
  if (status === "approved") return <span className="req-status-dot req-approved" title="ອະນຸມັດ" />;
  return <span className="req-status-dot req-rejected" title="ປະຕິເສດ" />;
}

export default function Topbar({ onMenuToggle }) {
  const { company, selectCompany } = useCompany();
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const isSuperAdmin   = user.role === "Super Admin";
  const isCompanyAdmin = user.role === "Company Admin";

  /* ── Super Admin state ── */
  const [notifs,     setNotifs]     = useState([]);
  const [unread,     setUnread]     = useState(0);
  const [approvals,  setApprovals]  = useState([]);
  const [pendingCnt, setPendingCnt] = useState(0);
  const [tab,        setTab]        = useState("approvals");
  const [rejectId,   setRejectId]   = useState(null);
  const [rejectText, setRejectText] = useState("");

  /* ── Company Admin state ── */
  const [myNotifs,   setMyNotifs]   = useState([]);
  const [myUnread,   setMyUnread]   = useState(0);
  const [myRequests, setMyRequests] = useState([]);
  const [myTab,      setMyTab]      = useState("requests");

  const [showPanel,  setShowPanel]  = useState(false);
  const bellRef = useRef(null);

  /* ── load companies ── */
  useEffect(() => {
    if (!user.user_id) return;
    api.get(`/company/my/${user.user_id}`)
      .then(res => {
        if (res.data.length > 0 && !company) selectCompany(res.data[0]);
      })
      .catch(() => {});
  }, []);

  /* ── Super Admin: fetch notifs + approvals ── */
  const fetchSuperAdmin = () => {
    api.get("/notifications").then(r => {
      setNotifs(r.data);
      setUnread(r.data.filter(n => !n.is_read).length);
    }).catch(() => {});

    api.get("/approvals").then(r => {
      setApprovals(r.data);
      setPendingCnt(r.data.filter(a => a.status === "pending").length);
    }).catch(() => {});
  };

  /* ── Company Admin: fetch own notifs + own requests ── */
  const fetchCompanyAdmin = () => {
    api.get("/notifications/my").then(r => {
      setMyNotifs(r.data);
      setMyUnread(r.data.filter(n => !n.is_read).length);
    }).catch(() => {});

    api.get("/approvals/my").then(r => {
      setMyRequests(r.data);
    }).catch(() => {});
  };

  useEffect(() => {
    if (isSuperAdmin)   { fetchSuperAdmin();   const t = setInterval(fetchSuperAdmin,   30000); return () => clearInterval(t); }
    if (isCompanyAdmin) { fetchCompanyAdmin(); const t = setInterval(fetchCompanyAdmin, 30000); return () => clearInterval(t); }
  }, []);

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

  /* badges */
  const superBadge  = unread + pendingCnt;
  const myPendingCnt = myRequests.filter(r => r.status === "pending").length;
  const companyBadge = myUnread + myPendingCnt;

  return (
    <div className="topbar">
      <button className="topbar-hamburger" onClick={onMenuToggle} aria-label="Toggle menu">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <line x1="3" y1="6" x2="21" y2="6"/>
          <line x1="3" y1="12" x2="21" y2="12"/>
          <line x1="3" y1="18" x2="21" y2="18"/>
        </svg>
      </button>

      <div className="logo">UDM CMS</div>
      {company && <span className="company-name">{company.companies_name}</span>}

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
              {/* Tabs */}
              <div className="notif-tabs">
                <button className={`notif-tab${tab === "approvals" ? " notif-tab-active" : ""}`} onClick={() => setTab("approvals")}>
                  ອະນຸຍາດ {pendingCnt > 0 && <span className="ntab-badge">{pendingCnt}</span>}
                </button>
                <button className={`notif-tab${tab === "notif" ? " notif-tab-active" : ""}`} onClick={() => setTab("notif")}>
                  ແຈ້ງເຕືອນ {unread > 0 && <span className="ntab-badge">{unread}</span>}
                </button>
              </div>

              {/* Approvals tab */}
              {tab === "approvals" && (
                <div className="notif-list">
                  {approvals.filter(a => a.status === "pending").length === 0 ? (
                    <div className="notif-empty">ບໍ່ມີ request ລໍຖ້າ</div>
                  ) : approvals.filter(a => a.status === "pending").map(ar => (
                    <div key={ar.id} className="apv-item">
                      <div className="apv-top">
                        <span className={`apv-type-badge ${ar.request_type === "delete" ? "apv-del" : "apv-edit"}`}>
                          {ar.request_type === "delete" ? "ລຶບ" : "ແກ້ໄຂ"}
                        </span>
                        <span className="apv-entity">{ar.entity_name}</span>
                      </div>
                      <div className="apv-meta">
                        <span className="apv-by">ໂດຍ: {ar.requester_name || ar.requested_by_name}</span>
                        <span className="apv-time">{fmtTime(ar.created_at)}</span>
                      </div>

                      {rejectId === ar.id ? (
                        <div className="apv-reject-box">
                          <input
                            className="apv-reject-input"
                            placeholder="ເຫດຜົນ (ໄດ້ຖ້ານ)"
                            value={rejectText}
                            onChange={e => setRejectText(e.target.value)}
                            autoFocus
                          />
                          <div className="apv-reject-btns">
                            <button className="apv-btn-confirm-reject" onClick={() => handleReject(ar.id)}>ຢືນຢັນ</button>
                            <button className="apv-btn-cancel" onClick={() => { setRejectId(null); setRejectText(""); }}>ຍົກເລີກ</button>
                          </div>
                        </div>
                      ) : (
                        <div className="apv-actions">
                          <button className="apv-btn-approve" onClick={() => handleApprove(ar.id)}>✓ ອະນຸມັດ</button>
                          <button className="apv-btn-reject"  onClick={() => setRejectId(ar.id)}>✕ ປະຕິເສດ</button>
                        </div>
                      )}
                    </div>
                  ))}

                  {/* History */}
                  {approvals.filter(a => a.status !== "pending").length > 0 && (
                    <div className="apv-history-section">
                      <div className="apv-history-label">ດຳເນີນການແລ້ວ</div>
                      {approvals.filter(a => a.status !== "pending").slice(0, 5).map(ar => (
                        <div key={ar.id} className="apv-history-item">
                          <span className={`apv-type-badge ${ar.request_type === "delete" ? "apv-del" : "apv-edit"}`} style={{fontSize:"10px"}}>
                            {ar.request_type === "delete" ? "ລຶບ" : "ແກ້ໄຂ"}
                          </span>
                          <span className="apv-entity" style={{flex:1}}>{ar.entity_name}</span>
                          <span className={`apv-status-chip ${ar.status === "approved" ? "apv-approved" : "apv-rejected"}`}>
                            {ar.status === "approved" ? "ອະນຸມັດ" : "ປະຕິເສດ"}
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
                  <div className="notif-list">
                    {notifs.length === 0 ? (
                      <div className="notif-empty">ບໍ່ມີການແຈ້ງເຕືອນ</div>
                    ) : notifs.map(n => (
                      <div key={n.id} className={`notif-item ${!n.is_read ? "notif-unread" : ""}`}
                        onClick={() => !n.is_read && markOneRead(n.id)}>
                        <div className="notif-dot-wrap">{!n.is_read && <span className="notif-dot"/>}</div>
                        <div className="notif-body">
                          <p className="notif-msg">{n.message}</p>
                          <span className="notif-time">{fmtTime(n.created_at)}</span>
                        </div>
                      </div>
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
          <button className="notif-bell" onClick={() => setShowPanel(v => !v)}>
            <IconBell />
            {companyBadge > 0 && (
              <span className="notif-badge">{companyBadge > 99 ? "99+" : companyBadge}</span>
            )}
          </button>

          {showPanel && (
            <div className="notif-dropdown">
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
                <div className="notif-list">
                  {myRequests.length === 0 ? (
                    <div className="notif-empty">ບໍ່ມີຄຳຂໍ</div>
                  ) : myRequests.map(r => (
                    <div key={r.id} className="my-req-item">
                      <div className="my-req-top">
                        <span className={`apv-type-badge ${r.request_type === "delete" ? "apv-del" : "apv-edit"}`}>
                          {r.request_type === "delete" ? "ລຶບ" : "ແກ້ໄຂ"}
                        </span>
                        <span className="apv-entity">{r.entity_name}</span>
                        <StatusIcon status={r.status} />
                      </div>
                      <div className="my-req-meta">
                        <span className="apv-time">{fmtTime(r.created_at)}</span>
                        {r.status === "pending" && (
                          <span className="my-req-waiting">⏳ ລໍຖ້າ Super Admin</span>
                        )}
                        {r.status === "approved" && (
                          <span className="my-req-approved">✅ ອະນຸມັດໂດຍ {r.reviewer_name || "Super Admin"}</span>
                        )}
                        {r.status === "rejected" && (
                          <span className="my-req-rejected">
                            ❌ ປະຕິເສດ{r.reject_reason ? `: ${r.reject_reason}` : ""}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Result Notifications tab */}
              {myTab === "notif" && (
                <>
                  <div className="notif-header">
                    <span className="notif-title">ຜົນການອະນຸຍາດ</span>
                    {myUnread > 0 && <button className="notif-read-all" onClick={markMyAllRead}>ອ່ານທັງໝົດ</button>}
                  </div>
                  <div className="notif-list">
                    {myNotifs.length === 0 ? (
                      <div className="notif-empty">ຍັງບໍ່ມີຜົນ</div>
                    ) : myNotifs.map(n => (
                      <div key={n.id}
                        className={`notif-item ${!n.is_read ? "notif-unread" : ""}`}
                        onClick={() => !n.is_read && markMyOneRead(n.id)}
                      >
                        <div className="notif-dot-wrap">{!n.is_read && <span className="notif-dot"/>}</div>
                        <div className="notif-body">
                          <p className="notif-msg">{n.message}</p>
                          <span className="notif-time">{fmtTime(n.created_at)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
