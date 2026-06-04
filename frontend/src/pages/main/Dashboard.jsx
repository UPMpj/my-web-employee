import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "../../context/LanguageContext";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  AreaChart, Area,
} from "recharts";
import { api } from "../../api";
import "./dashboard.css";

function StatCard({ icon, value, label, sub, iconBg, onClick }) {
  return (
    <div className={`db-stat-card${onClick ? " db-stat-card-link" : ""}`} onClick={onClick}>
      <div className="db-stat-icon" style={{ background: iconBg }}>
        {icon}
      </div>
      <div className="db-stat-body">
        <div className="db-stat-value">{Number(value || 0).toLocaleString()}</div>
        <div className="db-stat-label">{label}</div>
        {sub && <div className="db-stat-sub">{sub}</div>}
      </div>
      {onClick && (
        <div className="db-stat-arrow">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2">
            <polyline points="9 18 15 12 9 6"/>
          </svg>
        </div>
      )}
    </div>
  );
}

function fmtDate(d) {
  if (!d) return "–";
  return new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [stats,     setStats]     = useState(null);
  const [byCompany, setByCompany] = useState([]);
  const [trend,     setTrend]     = useState([]);
  const [activity,  setActivity]  = useState([]);
  const [buildings, setBuildings] = useState([]);

  useEffect(() => {
    api.get("/dashboard/stats")
      .then(r => setStats(r.data))
      .catch(() => setStats({ companies: 0, newCompanies: 0, employees: 0, male: 0, female: 0, activeCards: 0, expiringPermits: 0, resigned: 0, newResigned: 0 }));
    api.get("/dashboard/by-company").then(r => setByCompany(r.data)) .catch(() => {});
    api.get("/dashboard/trend")     .then(r => setTrend(r.data))     .catch(() => {});
    api.get("/dashboard/activity")  .then(r => setActivity(r.data))  .catch(() => {});
    api.get("/building")            .then(r => setBuildings(r.data)) .catch(() => {});
  }, []);

  if (!stats) return (
    <div className="db-page">
      <h1 className="db-title">Dashboard</h1>
      <p className="db-sub">Global overview of the CMS platform</p>
      <div style={{ padding: "60px", textAlign: "center", color: "#9ca3af" }}>Loading...</div>
    </div>
  );

  return (
    <div className="db-page">

      {/* Header */}
      <h1 className="db-title">Dashboard</h1>
      <p className="db-sub">Global overview of the CMS platform</p>

      {/* ===== STAT CARDS ===== */}
      <div className="db-stats-grid">
        <StatCard
          iconBg="#dbeafe"
          icon={<svg width="28" height="28" viewBox="0 0 24 24" fill="#2f4aad"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>}
          value={stats?.companies}
          label="Total Companies"
          sub={stats ? `+${stats.newCompanies} this months` : ""}
          onClick={() => navigate("/companies")}
        />
        <StatCard
          iconBg="#f0fdf4"
          icon={<svg width="28" height="28" viewBox="0 0 24 24" fill="#16a34a"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>}
          value={stats?.employees}
          label="Total Customer (All)"
          sub={
            <span className="db-gender-row">
              <span className="db-gender-male">♂ {stats?.male ?? 0} {t("male")}</span>
              <span className="db-gender-sep">·</span>
              <span className="db-gender-female">♀ {stats?.female ?? 0} {t("female")}</span>
            </span>
          }
          onClick={() => navigate("/employees")}
        />
        <StatCard
          iconBg="#dcfce7"
          icon={<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><polyline points="20 6 9 17 4 12"/></svg>}
          value={stats?.activeCards}
          label="Active card"
          onClick={() => navigate("/idcard")}
        />
        <StatCard
          iconBg="#fef9c3"
          icon={<svg width="28" height="28" viewBox="0 0 24 24" fill="#ca8a04"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/></svg>}
          value={stats?.expiringPermits}
          label="Expiring permits"
          sub="(30 day)"
          onClick={() => navigate("/reports")}
        />
        <StatCard
          iconBg="#fee2e2"
          icon={<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2.5"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="23" y1="11" x2="17" y2="11"/></svg>}
          value={stats?.resigned}
          label={t("resigned_total")}
          sub={stats ? `+${stats.newResigned} ${t("this_month")}` : ""}
          onClick={() => navigate("/employees?status=Resigned")}
        />
        <StatCard
          iconBg="#ede9fe"
          icon={<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="1.8"><rect x="2" y="3" width="20" height="18" rx="2"/><path d="M2 9h20M9 21V9"/><rect x="13" y="12" width="3" height="3"/><rect x="13" y="17" width="3" height="3"/><rect x="5" y="12" width="3" height="3"/><rect x="5" y="17" width="3" height="3"/></svg>}
          value={buildings.reduce((s, b) => s + (b.available_rooms || 0), 0)}
          label={t("rooms_available")}
          sub={t("rooms_used").replace("{n}", buildings.reduce((s, b) => s + (b.occupied_rooms || 0), 0))}
          onClick={() => navigate("/building")}
        />
      </div>

      {/* ===== CHARTS ROW ===== */}
      <div className="db-charts-row">

        {/* Bar chart — employees by company */}
        <div className="db-chart-card">
          <div className="db-chart-header">
            <span className="db-chart-title">Employee by company</span>
            <button className="db-chart-filter">Total &#8964;</button>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={byCompany} margin={{ top: 8, right: 8, left: -20, bottom: 40 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#6b7280" }} angle={-30} textAnchor="end" interval={0} />
              <YAxis tick={{ fontSize: 11, fill: "#6b7280" }} />
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
              <Bar dataKey="active"   name="Active"   fill="#2f4aad" radius={[3,3,0,0]} />
              <Bar dataKey="resigned" name="Resigned"  fill="#f59e0b" radius={[3,3,0,0]} />
              <Bar dataKey="on_leave" name="On Leave"  fill="#60a5fa" radius={[3,3,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Area chart — monthly trend */}
        <div className="db-chart-card">
          <div className="db-chart-header">
            <span className="db-chart-title">Monthly headcount trend</span>
            <button className="db-chart-filter">Last 6 month &#8964;</button>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={trend} margin={{ top: 8, right: 8, left: -20, bottom: 10 }}>
              <defs>
                <linearGradient id="trendGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#2f4aad" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#2f4aad" stopOpacity={0}   />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#6b7280" }} />
              <YAxis tick={{ fontSize: 11, fill: "#6b7280" }} />
              <Tooltip />
              <Area type="monotone" dataKey="count" name="Employees"
                stroke="#2f4aad" strokeWidth={2.5}
                fill="url(#trendGrad)" dot={{ r: 4, fill: "#2f4aad" }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

      </div>

      {/* ===== BUILDING OVERVIEW ===== */}
      {buildings.length > 0 && (
        <div className="db-activity-card" style={{ marginBottom: 20 }}>
          <div className="db-activity-header">
            <span className="db-activity-title">Building Overview</span>
            <button className="db-viewall" onClick={() => navigate("/building")}>View All</button>
          </div>
          <div className="db-bld-grid">
            {buildings.map(b => {
              const total    = b.total_rooms    || 0;
              const occupied = b.occupied_rooms || 0;
              const avail    = b.available_rooms || 0;
              const maint    = b.maintenance_rooms || 0;
              const pct      = total > 0 ? Math.round(occupied / total * 100) : 0;
              const isOffice = b.building_type === "Office";
              return (
                <div key={b.building_id} className="db-bld-row" onClick={() => navigate("/building")}>
                  <div className="db-bld-icon" style={{ background: isOffice ? "#ede9fe" : "#dbeafe" }}>
                    {isOffice ? (
                      <svg viewBox="0 0 24 24" fill="none" stroke={isOffice?"#7c3aed":"#1e40af"} strokeWidth="1.8" width="22" height="22">
                        <rect x="2" y="3" width="20" height="18" rx="2"/>
                        <path d="M2 9h20M9 21V9"/>
                        <rect x="13" y="12" width="3" height="3"/><rect x="13" y="17" width="3" height="3"/>
                        <rect x="5"  y="12" width="3" height="3"/><rect x="5"  y="17" width="3" height="3"/>
                      </svg>
                    ) : (
                      <svg viewBox="0 0 24 24" fill="none" stroke="#1e40af" strokeWidth="1.8" width="22" height="22">
                        <rect x="3" y="2" width="18" height="20" rx="2"/>
                        <path d="M3 8h18M3 14h18"/>
                        <rect x="7" y="10" width="3" height="3"/><rect x="14" y="10" width="3" height="3"/>
                        <rect x="7" y="16" width="3" height="3"/><rect x="14" y="16" width="3" height="3"/>
                      </svg>
                    )}
                  </div>
                  <div className="db-bld-info">
                    <div className="db-bld-name">{b.building_name}</div>
                    <div className="db-bld-type">{isOffice ? t("bld_office") : t("bld_dormitory")} · {b.total_floors} {t("bld_floors")}</div>
                  </div>
                  {!isOffice && total > 0 ? (
                    <div className="db-bld-occ">
                      <div className="db-bld-chips">
                        <span className="db-bld-chip db-chip-avail">{avail} {t("bld_available")}</span>
                        <span className="db-bld-chip db-chip-occ">{occupied} {t("bld_occupied")}</span>
                        {maint > 0 && <span className="db-bld-chip db-chip-maint">{maint} {t("bld_maint_short")}</span>}
                      </div>
                      <div className="db-bld-bar-wrap">
                        <div className="db-bld-bar">
                          <div className="db-bld-bar-fill" style={{
                            width: `${pct}%`,
                            background: pct >= 90 ? "#dc2626" : pct >= 60 ? "#d97706" : "#2f4aad"
                          }}/>
                        </div>
                        <span className="db-bld-pct">{pct}%</span>
                      </div>
                    </div>
                  ) : (
                    <div className="db-bld-occ">
                      <span className="db-bld-chip db-chip-avail">Office Building</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ===== RECENT ACTIVITY ===== */}
      <div className="db-activity-card">
        <div className="db-activity-header">
          <span className="db-activity-title">Recent System Activity</span>
          <button className="db-viewall" onClick={() => navigate("/audit")}>View All</button>
        </div>

        {/* Desktop table */}
        <table className="db-activity-table">
          <thead>
            <tr>
              <th>Action</th>
              <th>Entity</th>
              <th>User</th>
              <th>Company</th>
              <th>Date &#8964;</th>
            </tr>
          </thead>
          <tbody>
            {activity.length === 0 ? (
              <tr><td colSpan="5" className="db-no-data">No recent activity</td></tr>
            ) : activity.map((a, i) => (
              <tr key={i}>
                <td className="db-action-cell">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                  {a.action || "–"}
                </td>
                <td>
                  <span className={`db-entity-badge ${a.status === "Inactive" ? "db-badge-inactive" : "db-badge-active"}`}>
                    {a.entity || a.status || "Active"}
                  </span>
                </td>
                <td>{a.fullname || "–"}</td>
                <td>{a.companies_name || "–"}</td>
                <td className="db-date-cell">{fmtDate(a.created_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Mobile card list */}
        <div className="db-activity-mobile">
          {activity.length === 0 ? (
            <p className="db-no-data">No recent activity</p>
          ) : activity.map((a, i) => (
            <div key={i} className="db-act-card">
              <div className="db-act-card-top">
                <span className="db-act-action">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                  {a.action || "–"}
                </span>
                <span className="db-act-date">{fmtDate(a.created_at)}</span>
              </div>
              <div className="db-act-meta">
                {a.fullname || "–"} · {a.companies_name || "–"}
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
