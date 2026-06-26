import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "../../context/LanguageContext";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area, PieChart, Pie, Cell,
} from "recharts";
import { api } from "../../api";
import "./dashboard.css";

const STATUS_COLORS = { active: "#2f4aad", on_leave: "#22d3ee", resigned: "#f43f5e" };
const COMPANY_FILTERS = [
  { key: "total",    label: "Total" },
  { key: "active",   label: "Active" },
  { key: "on_leave", label: "On Leave" },
  { key: "resigned", label: "Resigned" },
];

function StatCard({ icon, iconBg, badge, value, label, footer, onClick }) {
  return (
    <div className={`db-stat-card${onClick ? " db-stat-card-link" : ""}`} onClick={onClick}>
      <div className="db-stat-top">
        <div className="db-stat-icon" style={{ background: iconBg }}>{icon}</div>
        {badge}
      </div>
      <div className="db-stat-value">{Number(value || 0).toLocaleString()}</div>
      <div className="db-stat-label">{label}</div>
      {footer && <div className="db-stat-footer">{footer}</div>}
    </div>
  );
}

function StatPill({ tone, children }) {
  return <span className={`db-stat-pill db-stat-pill-${tone}`}>{children}</span>;
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
  const [companyFilter, setCompanyFilter] = useState("total");

  useEffect(() => {
    api.get("/dashboard/stats")
      .then(r => setStats(r.data))
      .catch(() => setStats({ companies: 0, newCompanies: 0, employees: 0, male: 0, female: 0, activeCards: 0, expiringPermits: 0, resigned: 0, newResigned: 0, onLeave: 0 }));
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

  const onLeaveCount = Number(stats.onLeave || 0);
  const resignedCount = Number(stats.resigned || 0);
  const activeCount = Math.max(0, Number(stats.employees || 0) - onLeaveCount - resignedCount);
  const statusTotal = activeCount + onLeaveCount + resignedCount;
  const statusData = [
    { key: "active",   name: "Active",   value: activeCount,   color: STATUS_COLORS.active },
    { key: "on_leave", name: "On Leave", value: onLeaveCount,  color: STATUS_COLORS.on_leave },
    { key: "resigned", name: "Resigned", value: resignedCount, color: STATUS_COLORS.resigned },
  ];

  const trendDelta = trend.length >= 2 ? Number(trend[trend.length - 1].count) - Number(trend[0].count) : 0;

  const totalRooms        = buildings.reduce((s, b) => s + (b.total_rooms || 0), 0);
  const totalAvailRooms   = buildings.reduce((s, b) => s + (b.available_rooms || 0), 0);
  const totalOccupiedRooms = buildings.reduce((s, b) => s + (b.occupied_rooms || 0), 0);
  const occupancyPct      = totalRooms > 0 ? Math.round(totalOccupiedRooms / totalRooms * 1000) / 10 : 0;

  return (
    <div className="db-page">

      {/* Header */}
      <h1 className="db-title">Dashboard</h1>
      <p className="db-sub">Global overview of the CMS platform</p>

      {/* ===== STAT CARDS ===== */}
      <div className="db-stats-grid">
        <StatCard
          iconBg="#ede9fe"
          icon={<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="1.8"><path d="M3 21V8l6-4 6 4v13"/><path d="M15 21V11l6-3v13"/><path d="M9 9h0M9 13h0M9 17h0"/></svg>}
          badge={<StatPill tone="violet">+{stats.newCompanies} this month</StatPill>}
          value={stats.companies}
          label="Total Companies"
          onClick={() => navigate("/companies")}
        />

        <StatCard
          iconBg="#f0fdf4"
          icon={<svg width="22" height="22" viewBox="0 0 24 24" fill="#16a34a"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>}
          badge={
            <span className="db-stat-mini-gender">
              <span className="db-gender-male">♂ {stats.male ?? 0}</span>
              <span className="db-gender-female">♀ {stats.female ?? 0}</span>
            </span>
          }
          value={stats.employees}
          label="Total Employees"
          footer={
            <>
              <div className="db-stat-segbar">
                <span style={{ width: `${stats.employees ? (stats.male / stats.employees * 100) : 0}%`, background: "#2563eb" }}/>
                <span style={{ width: `${stats.employees ? (stats.female / stats.employees * 100) : 0}%`, background: "#db2777" }}/>
              </div>
              <div className="db-stat-seglegend">
                <span className="db-gender-male">♂ {stats.male ?? 0} {t("male")}</span>
                <span className="db-gender-female">♀ {stats.female ?? 0} {t("female")}</span>
              </div>
            </>
          }
          onClick={() => navigate("/employees")}
        />

        <StatCard
          iconBg="#dbeafe"
          icon={<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#1e40af" strokeWidth="1.8"><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/><path d="M6 15h4"/></svg>}
          badge={stats.expiringPermits > 0
            ? <StatPill tone="amber">{stats.expiringPermits} expiring</StatPill>
            : <StatPill tone="green">All valid</StatPill>}
          value={stats.activeCards}
          label="Active ID Cards"
          footer={<span className="db-stat-footer-text">{stats.expiringPermits} expiring in next 30 days</span>}
          onClick={() => navigate("/idcard")}
        />

        <StatCard
          iconBg="#fef3c7"
          icon={<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#b45309" strokeWidth="1.8"><rect x="2" y="3" width="20" height="18" rx="2"/><path d="M2 9h20M9 21V9"/><rect x="13" y="12" width="3" height="3"/><rect x="13" y="17" width="3" height="3"/><rect x="5" y="12" width="3" height="3"/><rect x="5" y="17" width="3" height="3"/></svg>}
          badge={<StatPill tone="amber">{totalOccupiedRooms} used</StatPill>}
          value={totalAvailRooms}
          label="Available Rooms"
          footer={
            <>
              <div className="db-stat-bar"><div className="db-stat-bar-fill" style={{ width: `${occupancyPct}%` }}/></div>
              <span className="db-stat-footer-text">{occupancyPct}% occupancy rate</span>
            </>
          }
          onClick={() => navigate("/building")}
        />
      </div>

      {/* ===== ROW 1: employees-by-company + employee status donut ===== */}
      <div className="db-row-main">

        {/* Bar chart — employees by company */}
        <div className="db-chart-card db-chart-wide">
          <div className="db-chart-header">
            <span className="db-chart-title">Employees by company</span>
            <div className="db-filter-group">
              {COMPANY_FILTERS.map(f => (
                <button
                  key={f.key}
                  className={`db-filter-btn${companyFilter === f.key ? " db-filter-btn-active" : ""}`}
                  onClick={() => setCompanyFilter(f.key)}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>
          <div className="db-mini-legend">
            <span className="db-mini-legend-item"><span className="db-mini-dot" style={{ background: STATUS_COLORS.active }}/>Active</span>
            <span className="db-mini-legend-item"><span className="db-mini-dot" style={{ background: STATUS_COLORS.on_leave }}/>On Leave</span>
            <span className="db-mini-legend-item"><span className="db-mini-dot" style={{ background: STATUS_COLORS.resigned }}/>Resigned</span>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={byCompany} margin={{ top: 8, right: 8, left: -20, bottom: 40 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#6b7280" }} angle={-30} textAnchor="end" interval={0} />
              <YAxis tick={{ fontSize: 11, fill: "#6b7280" }} />
              <Tooltip />
              {companyFilter === "total" ? (
                <>
                  <Bar dataKey="active"   name="Active"   fill={STATUS_COLORS.active}   radius={[3,3,0,0]} />
                  <Bar dataKey="on_leave" name="On Leave" fill={STATUS_COLORS.on_leave} radius={[3,3,0,0]} />
                  <Bar dataKey="resigned" name="Resigned" fill={STATUS_COLORS.resigned} radius={[3,3,0,0]} />
                </>
              ) : (
                <Bar dataKey={companyFilter} name={COMPANY_FILTERS.find(f => f.key === companyFilter)?.label}
                  fill={STATUS_COLORS[companyFilter]} radius={[3,3,0,0]} />
              )}
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Donut — employee status */}
        <div className="db-chart-card db-chart-narrow">
          <div className="db-chart-header">
            <div>
              <div className="db-chart-title">Employee status</div>
              <div className="db-chart-subtitle">Distribution across all companies</div>
            </div>
          </div>
          <div className="db-donut-wrap">
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={statusData} dataKey="value" nameKey="name"
                  innerRadius={62} outerRadius={88} startAngle={90} endAngle={-270} paddingAngle={2}
                  isAnimationActive={false}>
                  {statusData.map(d => <Cell key={d.key} fill={d.color} stroke="none" />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="db-donut-center">
              <div className="db-donut-total">{statusTotal.toLocaleString()}</div>
              <div className="db-donut-total-label">total</div>
            </div>
          </div>
          <div className="db-donut-legend">
            {statusData.map(d => (
              <div className="db-donut-legend-row" key={d.key}>
                <span className="db-donut-legend-left">
                  <span className="db-donut-dot" style={{ background: d.color }}/>
                  {d.name}
                </span>
                <span className="db-donut-legend-right">
                  <b>{d.value.toLocaleString()}</b>
                  <span className="db-donut-pct">{statusTotal ? Math.round(d.value / statusTotal * 100) : 0}%</span>
                </span>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* ===== ROW 2: monthly trend + building overview ===== */}
      <div className="db-row-main" style={{ marginBottom: 20 }}>

        {/* Area chart — monthly trend */}
        <div className="db-chart-card db-chart-wide">
          <div className="db-chart-header">
            <div>
              <div className="db-chart-title">Monthly headcount trend</div>
              {trend.length > 1 && (
                <div className="db-chart-subtitle-trend">
                  {trendDelta >= 0 ? "+" : ""}{trendDelta} employees over {trend.length} months
                </div>
              )}
            </div>
            <select className="db-chart-select" defaultValue="6">
              <option value="6">Last 6 months</option>
            </select>
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

        {/* Building overview */}
        <div className="db-chart-card db-chart-narrow">
          <div className="db-chart-header">
            <span className="db-chart-title">Building overview</span>
            <button className="db-viewall" onClick={() => navigate("/building")}>View all &#8594;</button>
          </div>
          <div className="db-bld-compact-list">
            {buildings.length === 0 ? (
              <p className="db-no-data">No buildings</p>
            ) : buildings.map(b => {
              const total    = b.total_rooms    || 0;
              const occupied = b.occupied_rooms || 0;
              const avail    = b.available_rooms || 0;
              const isOffice = b.building_type === "Office";
              const isOpen   = total === 0 || avail > 0;
              return (
                <div key={b.building_id} className="db-bld-compact-row" onClick={() => navigate("/building")}>
                  <div className="db-bld-compact-icon" style={{ background: isOffice ? "#ede9fe" : "#dbeafe" }}>
                    {isOffice ? (
                      <svg viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="1.8" width="18" height="18">
                        <rect x="2" y="3" width="20" height="18" rx="2"/>
                        <path d="M2 9h20M9 21V9"/>
                        <rect x="13" y="12" width="3" height="3"/><rect x="13" y="17" width="3" height="3"/>
                        <rect x="5"  y="12" width="3" height="3"/><rect x="5"  y="17" width="3" height="3"/>
                      </svg>
                    ) : (
                      <svg viewBox="0 0 24 24" fill="none" stroke="#1e40af" strokeWidth="1.8" width="18" height="18">
                        <rect x="3" y="2" width="18" height="20" rx="2"/>
                        <path d="M3 8h18M3 14h18"/>
                        <rect x="7" y="10" width="3" height="3"/><rect x="14" y="10" width="3" height="3"/>
                        <rect x="7" y="16" width="3" height="3"/><rect x="14" y="16" width="3" height="3"/>
                      </svg>
                    )}
                  </div>
                  <div className="db-bld-compact-info">
                    <div className="db-bld-compact-name">{b.building_name}</div>
                    <div className="db-bld-compact-type">{isOffice ? t("bld_office") : t("bld_dormitory")} · {b.total_floors} {t("bld_floors")}</div>
                  </div>
                  <div className="db-bld-compact-right">
                    {total > 0 && <span className="db-bld-compact-frac">{occupied}<span className="db-bld-compact-frac-sep">/{total}</span></span>}
                    <span className={`db-bld-compact-status ${isOpen ? "db-status-open" : "db-status-full"}`}>{isOpen ? "Open" : "Full"}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>

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
