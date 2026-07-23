import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "../../context/LanguageContext";
import { useCurrentUser } from "../../hooks/useCurrentUser";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area, PieChart, Pie, Cell,
} from "recharts";
import { api } from "../../api";
import SkeletonLoader from "../../components/SkeletonLoader";
import "./dashboard.css";

const STATUS_COLORS = { active: "#2f4aad", on_leave: "#22d3ee", resigned: "#f43f5e" };
const COMPANY_FILTER_KEYS = ["total", "active", "on_leave", "resigned"];

function CompanyBarTooltip({ active, payload, label }) {
  if (!active || !payload || !payload.length) return null;
  return (
    <div className="db-bar-tooltip">
      <div className="db-bar-tooltip-title">{label}</div>
      {payload.map(p => (
        <div className="db-bar-tooltip-row" key={p.dataKey}>
          <span className="db-bar-tooltip-left">
            <span className="db-bar-tooltip-dot" style={{ background: p.color }} />
            {p.name}
          </span>
          <span className="db-bar-tooltip-value">{p.value}</span>
        </div>
      ))}
    </div>
  );
}

function StatCard({ icon, iconBg, accent, value, label, trend, sparkData, onClick }) {
  return (
    <div
      className={`db-stat-card${onClick ? " db-stat-card-link" : ""}`}
      onClick={onClick}
      style={{ '--card-accent': accent }}
    >
      <div className="db-stat-head">
        <div className="db-stat-icon" style={{ background: iconBg }}>{icon}</div>
        <span className="db-stat-label">{label}</span>
      </div>
      <div className="db-stat-mid">
        <div className="db-stat-value" style={{ color: accent }}>{Number(value || 0).toLocaleString()}</div>
        {sparkData && sparkData.length > 1 && (
          <div className="db-stat-spark"><Sparkline color={accent} data={sparkData} id={label} /></div>
        )}
      </div>
      <div className="db-stat-bottom">
        {trend}
      </div>
    </div>
  );
}

function TrendBadge({ pct, tone = "up", suffix }) {
  const isDown = tone === "down";
  return (
    <span className={`db-stat-trend db-stat-trend-${tone}`}>
      {tone !== "neutral" && (isDown ? "↘" : "↗")} {Math.abs(pct)}%{" "}
      <span className="db-stat-trend-sub">{suffix}</span>
    </span>
  );
}

function Sparkline({ color, data, id }) {
  const gradId = `spark-${id}`.replace(/\s+/g, "");
  return (
    <ResponsiveContainer width={72} height={36}>
      <AreaChart data={data} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%"  stopColor={color} stopOpacity={0.35} />
            <stop offset="95%" stopColor={color} stopOpacity={0}    />
          </linearGradient>
        </defs>
        <Area type="monotone" dataKey="v" stroke={color} strokeWidth={2}
          fill={`url(#${gradId})`} dot={false} isAnimationActive={false} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

/* Simple two-point interpolation for cards without a stored monthly history —
   both endpoints are real values, only the points between are a straight-line fill. */
function synthSpark(start, end, points = 6) {
  const s = Number(start) || 0, e = Number(end) || 0;
  return Array.from({ length: points }, (_, i) => ({ v: Math.round(s + (e - s) * (i / (points - 1))) }));
}

function IconPeopleSmall() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
      <circle cx="9" cy="7" r="4"/>
      <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
      <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
  );
}

function fmtDate(d) {
  if (!d) return "–";
  return new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function getGreeting(lang) {
  const hour = new Date().getHours();
  if (lang === "lo") {
    if (hour < 12) return "ສະບາຍດີຕອນເຊົ້າ";
    if (hour < 18) return "ສະບາຍດີຕອນບ່າຍ";
    return "ສະບາຍດີຕອນແລງ";
  }
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

const LAO_WEEKDAYS = ["ວັນອາທິດ", "ວັນຈັນ", "ວັນອັງຄານ", "ວັນພຸດ", "ວັນພະຫັດ", "ວັນສຸກ", "ວັນເສົາ"];
const LAO_MONTHS = [
  "ມັງກອນ", "ກຸມພາ", "ມີນາ", "ເມສາ", "ພຶດສະພາ", "ມິຖຸນາ",
  "ກໍລະກົດ", "ສິງຫາ", "ກັນຍາ", "ຕຸລາ", "ພະຈິກ", "ທັນວາ",
];

function fmtFullDate(lang) {
  const d = new Date();
  if (lang === "lo") {
    return `${LAO_WEEKDAYS[d.getDay()]} ທີ ${d.getDate()} ${LAO_MONTHS[d.getMonth()]} ${d.getFullYear()}`;
  }
  return d.toLocaleDateString("en-US", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { t, lang } = useLanguage();
  const user = useCurrentUser();
  const isSuperAdmin = user.role === "Super Admin";
  const greetingTitle = `${getGreeting(lang)}, ${user.fullname || user.username || "Admin"}`;
  const subText = `${fmtFullDate(lang)} · ${t("dashboard_sub")}`;
  const [stats,     setStats]     = useState(null);
  const [byCompany, setByCompany] = useState([]);
  const [trend,     setTrend]     = useState([]);
  const [activity,  setActivity]  = useState([]);
  const [buildings, setBuildings] = useState([]);
  const [companySummary, setCompanySummary] = useState(null);
  const [companyFilter, setCompanyFilter] = useState("total");
  const [loadError, setLoadError] = useState(false);
  const [slowLoad,  setSlowLoad]  = useState(false);
  const [retryKey,  setRetryKey]  = useState(0);

  useEffect(() => {
    setLoadError(false);
    setSlowLoad(false);

    /* Render's free tier puts the backend to sleep after inactivity — the first
       request after that can take 30-50s+ to wake it up. Tell the user why it's
       slow instead of leaving a bare "Loading..." that looks broken. */
    const slowTimer = setTimeout(() => setSlowLoad(true), 4000);

    // generous enough to cover a cold start, short enough to not hang forever on a real outage
    const STATS_TIMEOUT = 55000;

    api.get("/dashboard/stats", { timeout: STATS_TIMEOUT })
      .then(r => setStats(r.data))
      .catch(() => setLoadError(true));
    api.get("/dashboard/by-company").then(r => setByCompany(r.data)) .catch(() => {});
    api.get("/dashboard/trend")     .then(r => setTrend(r.data))     .catch(() => {});
    api.get("/dashboard/activity")  .then(r => setActivity(r.data))  .catch(() => {});
    api.get("/company/summary")     .then(r => setCompanySummary(r.data)).catch(() => {});
    if (isSuperAdmin) {
      api.get("/building").then(r => setBuildings(r.data)).catch(() => {});
    }

    return () => clearTimeout(slowTimer);
  }, [retryKey, isSuperAdmin]);

  if (loadError) return (
    <div className="db-page">
      <h1 className="db-title">{greetingTitle}</h1>
      <p className="db-sub">{subText}</p>
      <div style={{ padding: "60px", textAlign: "center", color: "#9ca3af" }}>
        <p>ໂຫຼດຂໍ້ມູນບໍ່ສຳເລັດ — server ອາດຍັງຕື່ນບໍ່ທັນ ຫຼື ເຊື່ອມຕໍ່ບໍ່ໄດ້</p>
        <button
          onClick={() => setRetryKey(k => k + 1)}
          style={{ marginTop: 12, padding: "8px 20px", background: "var(--primary)", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 600 }}
        >
          ລອງໃໝ່
        </button>
      </div>
    </div>
  );

  if (!stats) return (
    <div className="db-page">
      <h1 className="db-title">{greetingTitle}</h1>
      <p className="db-sub">{subText}</p>
      <div>
        <SkeletonLoader variant="dashboard" />
        {slowLoad && (
          <p style={{ marginTop: 16, textAlign: "center", fontSize: 13, color: "#9ca3af" }}>
            ກຳລັງຕື່ນ server (ໃຊ້ເວລາສູງສຸດ ~1 ນາທີ ຖ້າບໍ່ມີຄົນເຂົ້າໃຊ້ດົນ) — ກະລຸນາລໍຖ້າ...
          </p>
        )}
      </div>
    </div>
  );

  const onLeaveCount = Number(stats.onLeave || 0);
  const resignedCount = Number(stats.resigned || 0);
  const activeCount = Math.max(0, Number(stats.employees || 0) - onLeaveCount - resignedCount);
  const statusTotal = activeCount + onLeaveCount + resignedCount;
  const statusData = [
    { key: "active",   name: t("active"),   value: activeCount,   color: STATUS_COLORS.active },
    { key: "on_leave", name: t("on_leave"), value: onLeaveCount,  color: STATUS_COLORS.on_leave },
    { key: "resigned", name: t("resigned"), value: resignedCount, color: STATUS_COLORS.resigned },
  ];

  const trendDelta = trend.length >= 2 ? Number(trend[trend.length - 1].count) - Number(trend[0].count) : 0;

  const totalRooms        = buildings.reduce((s, b) => s + (b.total_rooms || 0), 0);
  const totalAvailRooms   = buildings.reduce((s, b) => s + (b.available_rooms || 0), 0);
  const totalOccupiedRooms = buildings.reduce((s, b) => s + (b.occupied_rooms || 0), 0);
  const occupancyPct      = totalRooms > 0 ? Math.round(totalOccupiedRooms / totalRooms * 1000) / 10 : 0;

  /* ── Stat card trend %s + sparklines — real data where a monthly history
     exists, a straight-line interpolation between two real values otherwise. */
  const companiesSpark = (companySummary?.growth || []).map(g => ({ v: Number(g.count) }));
  const companiesPct   = stats.companies > 0 ? Math.round((stats.newCompanies / stats.companies) * 100) : 0;

  const employeesSpark = trend.map(t => ({ v: Number(t.count) }));
  const empPrev = trend.length >= 2 ? Number(trend[trend.length - 2].count) : null;
  const empLast = trend.length >= 1 ? Number(trend[trend.length - 1].count) : null;
  const employeesPct = empPrev != null && empLast != null
    ? (empPrev > 0 ? Math.round(((empLast - empPrev) / empPrev) * 100) : (empLast > 0 ? 100 : 0))
    : 0;

  const idCardsSpark = synthSpark(Math.max(0, (stats.activeCards || 0) - (stats.newActiveCards || 0)), stats.activeCards || 0);
  const idCardsPct   = stats.activeCards > 0 ? Math.round((stats.newActiveCards / stats.activeCards) * 100) : 0;

  const roomsSpark = buildings.length
    ? buildings.map(b => ({ v: b.total_rooms ? Math.round((b.occupied_rooms || 0) / b.total_rooms * 100) : 0 }))
    : [];

  return (
    <div className="db-page">

      {/* Header */}
      <h1 className="db-title">{greetingTitle}</h1>
      <p className="db-sub">{subText}</p>

      {/* ===== STAT CARDS ===== */}
      <div className={`db-stats-grid${isSuperAdmin ? "" : " db-stats-grid-3"}`}>
        <StatCard
          accent="#2563eb"
          iconBg="#dbeafe"
          icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="1.8"><path d="M3 21V8l6-4 6 4v13"/><path d="M15 21V11l6-3v13"/><path d="M9 9h0M9 13h0M9 17h0"/></svg>}
          value={stats.companies}
          label={t("db_stat_companies")}
          trend={<TrendBadge pct={companiesPct} tone={companiesPct > 0 ? "up" : "neutral"} suffix={t("db_trend_last_month")} />}
          sparkData={companiesSpark}
          onClick={() => navigate("/companies")}
        />

        <StatCard
          accent="#16a34a"
          iconBg="#dcfce7"
          icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="1.8"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>}
          value={stats.employees}
          label={t("db_stat_employees")}
          trend={<TrendBadge pct={employeesPct} tone={employeesPct > 0 ? "up" : employeesPct < 0 ? "down" : "neutral"} suffix={t("db_trend_last_month")} />}
          sparkData={employeesSpark}
          onClick={() => navigate("/employees")}
        />

        <StatCard
          accent="#7c3aed"
          iconBg="#ede9fe"
          icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="1.8"><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/><path d="M6 15h4"/></svg>}
          value={stats.activeCards}
          label={t("db_stat_active_cards")}
          trend={<TrendBadge pct={idCardsPct} tone={idCardsPct > 0 ? "up" : "neutral"} suffix={t("db_trend_last_month")} />}
          sparkData={idCardsSpark}
          onClick={() => navigate("/idcard")}
        />

        {isSuperAdmin && (
          <StatCard
            accent="#d97706"
            iconBg="#fef3c7"
            icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="1.8"><rect x="2" y="3" width="20" height="18" rx="2"/><path d="M2 9h20M9 21V9"/><rect x="13" y="12" width="3" height="3"/><rect x="13" y="17" width="3" height="3"/><rect x="5" y="12" width="3" height="3"/><rect x="5" y="17" width="3" height="3"/></svg>}
            value={totalAvailRooms}
            label={t("db_stat_avail_rooms")}
            trend={<TrendBadge pct={occupancyPct} tone="neutral" suffix={t("db_trend_occupied")} />}
            sparkData={roomsSpark}
            onClick={() => navigate("/building")}
          />
        )}
      </div>

      {/* ===== ROW 1: employees-by-company + employee status donut ===== */}
      <div className="db-row-main">

        {/* Bar chart — employees by company */}
        <div className="db-chart-card db-chart-wide">
          <div className="db-chart-header">
            <span className="db-chart-title">{t("db_chart_emp_by_company")}</span>
            <div className="db-filter-group">
              {COMPANY_FILTER_KEYS.map(key => (
                <button
                  key={key}
                  className={`db-filter-btn${companyFilter === key ? " db-filter-btn-active" : ""}`}
                  onClick={() => setCompanyFilter(key)}
                >
                  {t(key)}
                </button>
              ))}
            </div>
          </div>
          <div className="db-mini-legend">
            <span className="db-mini-legend-item"><span className="db-mini-dot" style={{ background: STATUS_COLORS.active }}/>{t("active")}</span>
            <span className="db-mini-legend-item"><span className="db-mini-dot" style={{ background: STATUS_COLORS.on_leave }}/>{t("on_leave")}</span>
            <span className="db-mini-legend-item"><span className="db-mini-dot" style={{ background: STATUS_COLORS.resigned }}/>{t("resigned")}</span>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={byCompany} margin={{ top: 8, right: 8, left: -20, bottom: 10 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#6b7280" }} interval={0} />
              <YAxis tick={{ fontSize: 11, fill: "#6b7280" }} />
              <Tooltip content={<CompanyBarTooltip />} cursor={{ fill: "rgba(0,0,0,.03)" }} />
              {companyFilter === "total" ? (
                <>
                  <Bar dataKey="active"   name={t("active")}   fill={STATUS_COLORS.active}   radius={[3,3,0,0]} />
                  <Bar dataKey="on_leave" name={t("on_leave")} fill={STATUS_COLORS.on_leave} radius={[3,3,0,0]} />
                  <Bar dataKey="resigned" name={t("resigned")} fill={STATUS_COLORS.resigned} radius={[3,3,0,0]} />
                </>
              ) : (
                <Bar dataKey={companyFilter} name={t(companyFilter)}
                  fill={STATUS_COLORS[companyFilter]} radius={[3,3,0,0]} />
              )}
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Donut — employee status */}
        <div className="db-chart-card db-chart-narrow">
          <div className="db-chart-header">
            <div>
              <div className="db-chart-title">{t("db_chart_emp_status")}</div>
              <div className="db-chart-subtitle">{t("db_chart_emp_status_sub")}</div>
            </div>
          </div>
          <div className="db-donut-body">
            <div className="db-donut-wrap">
              <ResponsiveContainer width={140} height={140}>
                <PieChart>
                  <Pie data={statusData} dataKey="value" nameKey="name"
                    innerRadius={44} outerRadius={68} startAngle={90} endAngle={-270} paddingAngle={2}
                    isAnimationActive={false}>
                    {statusData.map(d => <Cell key={d.key} fill={d.color} stroke="none" />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="db-donut-center">
                <div className="db-donut-total">{statusTotal.toLocaleString()}</div>
                <div className="db-donut-total-label">{t("total")}</div>
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
          <div className="db-donut-minis">
            {statusData.map(d => (
              <div className="db-donut-mini" key={d.key} style={{ background: `${d.color}1a` }}>
                <span className="db-donut-mini-icon" style={{ color: d.color }}><IconPeopleSmall /></span>
                <div className="db-donut-mini-text">
                  <div className="db-donut-mini-label" style={{ color: d.color }}>{d.name}</div>
                  <div className="db-donut-mini-value">{d.value.toLocaleString()}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* ===== ROW 2: monthly trend + building overview ===== */}
      <div className={`db-row-main${isSuperAdmin ? "" : " db-row-single"}`} style={{ marginBottom: 20 }}>

        {/* Area chart — monthly trend */}
        <div className="db-chart-card db-chart-wide">
          <div className="db-chart-header">
            <div>
              <div className="db-chart-title">{t("db_chart_monthly_trend")}</div>
              {trend.length > 1 && (
                <div className="db-chart-subtitle-trend">
                  {trendDelta >= 0 ? "+" : ""}{t("db_trend_months").replace("{delta}", trendDelta).replace("{n}", trend.length)}
                </div>
              )}
            </div>
            <select className="db-chart-select" defaultValue="6">
              <option value="6">{t("db_last_6_months")}</option>
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
              <Area type="monotone" dataKey="count" name={t("nav_employees")}
                stroke="#2f4aad" strokeWidth={2.5}
                fill="url(#trendGrad)" dot={{ r: 4, fill: "#2f4aad" }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Building overview */}
        {isSuperAdmin && (
          <div className="db-chart-card db-chart-narrow">
            <div className="db-chart-header">
              <span className="db-chart-title">{t("db_building_overview")}</span>
              <button className="db-viewall" onClick={() => navigate("/building")}>{t("db_view_all")}</button>
            </div>
            <div className="db-bld-compact-list">
              {buildings.length === 0 ? (
                <p className="db-no-data">{t("db_no_buildings")}</p>
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
                      <span className={`db-bld-compact-status ${isOpen ? "db-status-open" : "db-status-full"}`}>{isOpen ? t("db_status_open") : t("db_status_full")}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

      </div>

      {/* ===== RECENT ACTIVITY ===== */}
      <div className="db-activity-card">
        <div className="db-activity-header">
          <span className="db-activity-title">{t("db_recent_activity")}</span>
          <button className="db-viewall" onClick={() => navigate("/audit")}>{t("db_view_all_plain")}</button>
        </div>

        {/* Desktop table */}
        <table className="db-activity-table">
          <thead>
            <tr>
              <th>{t("db_col_action")}</th>
              <th>{t("db_col_entity")}</th>
              <th>{t("db_col_user")}</th>
              <th>{t("company")}</th>
              <th>{t("db_col_date")} &#8964;</th>
            </tr>
          </thead>
          <tbody>
            {activity.length === 0 ? (
              <tr><td colSpan="5" className="db-no-data">{t("db_no_activity")}</td></tr>
            ) : activity.map((a, i) => (
              <tr key={i}>
                <td className="db-action-cell">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                  {a.action || "–"}
                </td>
                <td>
                  <span className={`db-entity-badge ${a.status === "Inactive" ? "db-badge-inactive" : "db-badge-active"}`}>
                    {a.entity || a.status || t("active")}
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
            <p className="db-no-data">{t("db_no_activity")}</p>
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
