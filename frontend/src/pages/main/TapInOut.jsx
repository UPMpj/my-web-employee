import { useMemo, useState } from "react";
import { useLanguage } from "../../context/LanguageContext";
import "./tapinout.css";

/* ── Mockup data — 10 sample tap in/out scan records ──
   Replace with a real API call (e.g. GET /api/attendance) once the
   scanner/RFID integration is wired up on the backend. */
const MOCK_RECORDS = [
  { id: 1,  employee_code: "EMP-001", firstname: "ສົມພອນ",    lastname: "ວົງສະຫວັນ",  company: "ບໍລິສັດ ສີວິໄລ ກໍ່ສ້າງ", date: "2026-06-25", time_in: "07:55", time_out: "17:02", method: "QR Code" },
  { id: 2,  employee_code: "EMP-002", firstname: "ມະນີຈັນ",   lastname: "ສີວິໄລ",     company: "ບໍລິສັດ ສີວິໄລ ກໍ່ສ້າງ", date: "2026-06-25", time_in: "08:12", time_out: "17:10", method: "ບັດ RFID" },
  { id: 3,  employee_code: "EMP-003", firstname: "ທອງສະຫວັນ", lastname: "ບຸນມີ",      company: "ບໍລິສັດ ໄວດອນ ການຄ້າ",   date: "2026-06-25", time_in: "07:48", time_out: null,     method: "QR Code" },
  { id: 4,  employee_code: "EMP-004", firstname: "ຄຳແພງ",     lastname: "ພົມມະຈັນ",   company: "ບໍລິສັດ ໄວດອນ ການຄ້າ",   date: "2026-06-25", time_in: "08:25", time_out: "17:05", method: "ບັດ RFID" },
  { id: 5,  employee_code: "EMP-005", firstname: "ບຸນທັນ",    lastname: "ສີສຸພັນ",    company: "ບໍລິສັດ ສີວິໄລ ກໍ່ສ້າງ", date: "2026-06-24", time_in: "07:50", time_out: "17:00", method: "QR Code" },
  { id: 6,  employee_code: "EMP-006", firstname: "ວິໄລພອນ",   lastname: "ແສງອາລຸນ",   company: "ໂຮງງານ ນະຄອນຫລວງ",      date: "2026-06-24", time_in: "08:31", time_out: "17:15", method: "ບັດ RFID" },
  { id: 7,  employee_code: "EMP-001", firstname: "ສົມພອນ",    lastname: "ວົງສະຫວັນ",  company: "ບໍລິສັດ ສີວິໄລ ກໍ່ສ້າງ", date: "2026-06-24", time_in: "07:58", time_out: "17:03", method: "QR Code" },
  { id: 8,  employee_code: "EMP-002", firstname: "ມະນີຈັນ",   lastname: "ສີວິໄລ",     company: "ບໍລິສັດ ສີວິໄລ ກໍ່ສ້າງ", date: "2026-06-23", time_in: "08:05", time_out: "17:08", method: "ບັດ RFID" },
  { id: 9,  employee_code: "EMP-003", firstname: "ທອງສະຫວັນ", lastname: "ບຸນມີ",      company: "ບໍລິສັດ ໄວດອນ ການຄ້າ",   date: "2026-06-23", time_in: "07:42", time_out: "16:58", method: "QR Code" },
  { id: 10, employee_code: "EMP-006", firstname: "ວິໄລພອນ",   lastname: "ແສງອາລຸນ",   company: "ໂຮງງານ ນະຄອນຫລວງ",      date: "2026-06-23", time_in: "08:40", time_out: "17:20", method: "ບັດ RFID" },
];

const CUTOFF_MIN = 8 * 60 + 5; // 08:05 — later than this counts as Late

function toMinutes(hhmm) {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

function workHours(timeIn, timeOut) {
  if (!timeOut) return "–";
  const mins = toMinutes(timeOut) - toMinutes(timeIn);
  if (mins <= 0) return "–";
  const h = Math.floor(mins / 60), m = mins % 60;
  return `${h}ຊມ ${m}ນທ`;
}

function status(timeIn, timeOut) {
  if (!timeOut) return "working";
  return toMinutes(timeIn) > CUTOFF_MIN ? "late" : "ontime";
}

function fmtDate(d) {
  return new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function initials(f, l) {
  return `${f?.[0] || ""}${l?.[0] || ""}`.toUpperCase();
}

const AVATAR_COLORS = ["#2f4aad", "#059669", "#7c3aed", "#db2777", "#d97706", "#0891b2"];

function IconSearch() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2">
      <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
    </svg>
  );
}
function IconViewList() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="3" y1="6" x2="21" y2="6"/>
      <line x1="3" y1="12" x2="21" y2="12"/>
      <line x1="3" y1="18" x2="21" y2="18"/>
    </svg>
  );
}
function IconViewGrid() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="3" width="7" height="7" rx="1.5"/>
      <rect x="14" y="3" width="7" height="7" rx="1.5"/>
      <rect x="3" y="14" width="7" height="7" rx="1.5"/>
      <rect x="14" y="14" width="7" height="7" rx="1.5"/>
    </svg>
  );
}

const LIMIT = 15;

export default function TapInOut() {
  const { t } = useLanguage();

  const [search,    setSearch]    = useState("");
  const [company,   setCompany]   = useState("");
  const [statusF,   setStatusF]   = useState("");
  const [dateFrom,  setDateFrom]  = useState("");
  const [dateTo,    setDateTo]    = useState("");
  const [page,      setPage]      = useState(1);
  const [viewMode,  setViewMode]  = useState(() => localStorage.getItem("tio_view_mode") || "table");

  const changeViewMode = (mode) => {
    setViewMode(mode);
    localStorage.setItem("tio_view_mode", mode);
  };

  const companies = useMemo(
    () => [...new Set(MOCK_RECORDS.map(r => r.company))],
    []
  );

  const enriched = useMemo(
    () => MOCK_RECORDS.map(r => ({ ...r, _status: status(r.time_in, r.time_out) })),
    []
  );

  const filtered = useMemo(() => {
    return enriched
      .filter(r => {
        const name = `${r.firstname} ${r.lastname} ${r.employee_code}`.toLowerCase();
        if (search && !name.includes(search.toLowerCase())) return false;
        if (company && r.company !== company) return false;
        if (statusF && r._status !== statusF) return false;
        if (dateFrom && r.date < dateFrom) return false;
        if (dateTo && r.date > dateTo) return false;
        return true;
      })
      .sort((a, b) => `${b.date} ${b.time_in}`.localeCompare(`${a.date} ${a.time_in}`));
  }, [enriched, search, company, statusF, dateFrom, dateTo]);

  const total = filtered.length;
  const pages = Math.max(1, Math.ceil(total / LIMIT));
  const safePage = Math.min(page, pages);
  const from = total === 0 ? 0 : (safePage - 1) * LIMIT + 1;
  const to   = Math.min(safePage * LIMIT, total);
  const rows = filtered.slice((safePage - 1) * LIMIT, safePage * LIMIT);

  const hasFilter = search || company || statusF || dateFrom || dateTo;

  const counts = enriched.reduce((acc, r) => {
    acc[r._status] = (acc[r._status] || 0) + 1;
    return acc;
  }, {});

  const fc = (fn) => { setPage(1); fn(); };

  const reset = () => {
    setSearch(""); setCompany(""); setStatusF("");
    setDateFrom(""); setDateTo(""); setPage(1);
  };

  const STATUS_LABEL = {
    ontime:  { label: t("tio_stat_ontime"),   bg: "#dcfce7", color: "#15803d" },
    late:    { label: t("tio_stat_late"),     bg: "#fee2e2", color: "#dc2626" },
    working: { label: t("tio_stat_working"),  bg: "#dbeafe", color: "#1d4ed8" },
  };

  return (
    <div className="tio-page">
      <div className="tio-topbar">
        <div>
          <h1 className="tio-title">{t("tio_title")}</h1>
          <p className="tio-sub">{t("tio_sub")}</p>
        </div>
        <div className="tio-view-toggle">
          <button
            className={`tio-view-btn${viewMode === "table" ? " tio-view-btn-active" : ""}`}
            title={t("view_table")}
            onClick={() => changeViewMode("table")}
          >
            <IconViewList />
          </button>
          <button
            className={`tio-view-btn${viewMode === "grid" ? " tio-view-btn-active" : ""}`}
            title={t("view_grid")}
            onClick={() => changeViewMode("grid")}
          >
            <IconViewGrid />
          </button>
        </div>
      </div>

      {/* ── Stats ── */}
      <div className="tio-stats">
        <div className="tio-stat-box">
          <div className="tio-stat-dot" style={{ background: "#2f4aad" }} />
          <div>
            <div className="tio-stat-val">{enriched.length}</div>
            <div className="tio-stat-lbl">{t("total")}</div>
          </div>
        </div>
        {Object.entries(STATUS_LABEL).map(([k, s]) => (
          <div key={k} className="tio-stat-box">
            <div className="tio-stat-dot" style={{ background: s.color }} />
            <div>
              <div className="tio-stat-val" style={{ color: s.color }}>{counts[k] || 0}</div>
              <div className="tio-stat-lbl">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Filter bar ── */}
      <div className="tio-filterbar">
        <div className="tio-search-box">
          <IconSearch />
          <input
            className="tio-search-input"
            placeholder={t("tio_search_ph")}
            value={search}
            onChange={e => fc(() => setSearch(e.target.value))}
          />
        </div>

        <select className="tio-select" value={company} onChange={e => fc(() => setCompany(e.target.value))}>
          <option value="">{t("all_companies")}</option>
          {companies.map(c => <option key={c} value={c}>{c}</option>)}
        </select>

        <select className="tio-select" value={statusF} onChange={e => fc(() => setStatusF(e.target.value))}>
          <option value="">{t("all_status")}</option>
          {Object.entries(STATUS_LABEL).map(([k, s]) => <option key={k} value={k}>{s.label}</option>)}
        </select>

        <div className="tio-date-wrap">
          <input type="date" className="tio-date-input" value={dateFrom} onChange={e => fc(() => setDateFrom(e.target.value))} title="From" />
          <span className="tio-date-sep">–</span>
          <input type="date" className="tio-date-input" value={dateTo} onChange={e => fc(() => setDateTo(e.target.value))} title="To" />
        </div>

        {hasFilter && <button className="tio-btn-reset" onClick={reset}>✕ Reset</button>}
      </div>

      {/* ── Result count ── */}
      <div className="tio-result-row">
        <span className="tio-result-text">
          {total === 0 ? t("no_data") : t("showing_range").replace("{from}", from).replace("{to}", to).replace("{total}", total)}
        </span>
      </div>

      {/* ── Table ── */}
      {viewMode === "table" && (
      <div className="tio-table-wrap">
        <table className="tio-table">
          <thead>
            <tr>
              <th className="tio-th">#</th>
              <th className="tio-th">{t("tio_col_employee")}</th>
              <th className="tio-th">{t("company")}</th>
              <th className="tio-th">{t("tio_col_date")}</th>
              <th className="tio-th">{t("tio_col_timein")}</th>
              <th className="tio-th">{t("tio_col_timeout")}</th>
              <th className="tio-th">{t("tio_col_hours")}</th>
              <th className="tio-th">{t("tio_col_method")}</th>
              <th className="tio-th">{t("status")}</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr className="tio-empty-row">
                <td colSpan="9">
                  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" strokeWidth="1.5" style={{ display: "block", margin: "0 auto 8px" }}>
                    <rect x="3" y="4" width="18" height="18" rx="2"/>
                    <line x1="3" y1="10" x2="21" y2="10"/>
                    <line x1="8" y1="2" x2="8" y2="6"/>
                    <line x1="16" y1="2" x2="16" y2="6"/>
                  </svg>
                  {hasFilter ? t("tio_no_match") : t("tio_no_data")}
                </td>
              </tr>
            ) : rows.map((r, i) => {
              const s = STATUS_LABEL[r._status];
              const bg = AVATAR_COLORS[r.id % AVATAR_COLORS.length];
              return (
                <tr key={r.id} className="tio-tr">
                  <td className="tio-td" style={{ color: "#9ca3af", fontSize: 13 }}>{from + i}</td>
                  <td className="tio-td">
                    <div className="tio-emp-cell">
                      <div className="tio-emp-avatar" style={{ background: bg }}>
                        {initials(r.firstname, r.lastname)}
                      </div>
                      <div>
                        <div className="tio-emp-name">{r.firstname} {r.lastname}</div>
                        <div className="tio-emp-code">{r.employee_code}</div>
                      </div>
                    </div>
                  </td>
                  <td className="tio-td" style={{ color: "#6b7280" }}>{r.company}</td>
                  <td className="tio-td tio-date-cell">{fmtDate(r.date)}</td>
                  <td className="tio-td tio-time-cell">{r.time_in}</td>
                  <td className="tio-td tio-time-cell">{r.time_out || "–"}</td>
                  <td className="tio-td">{workHours(r.time_in, r.time_out)}</td>
                  <td className="tio-td">
                    <span className="tio-method-pill">{r.method}</span>
                  </td>
                  <td className="tio-td">
                    <span className="tio-pill" style={{ background: s.bg, color: s.color }}>{s.label}</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      )}

      {/* ── Grid view ── */}
      {viewMode === "grid" && (
      <div className="tio-grid-wrap">
        {rows.length === 0 ? (
          <div className="tio-grid-empty">{hasFilter ? t("tio_no_match") : t("tio_no_data")}</div>
        ) : rows.map(r => {
          const s = STATUS_LABEL[r._status];
          const bg = AVATAR_COLORS[r.id % AVATAR_COLORS.length];
          return (
            <div className="tio-grid-card" key={r.id}>
              <span className="tio-pill tio-grid-status" style={{ background: s.bg, color: s.color }}>{s.label}</span>
              <div className="tio-grid-avatar" style={{ background: bg }}>{initials(r.firstname, r.lastname)}</div>
              <div className="tio-grid-name">{r.firstname} {r.lastname}</div>
              <div className="tio-grid-meta">
                <span className="tio-emp-code">{r.employee_code}</span>
                <span className="tio-grid-company">{r.company}</span>
              </div>
              <div className="tio-grid-date">{fmtDate(r.date)}</div>
              <div className="tio-grid-divider" />
              <div className="tio-grid-times">
                <div className="tio-grid-time-col">
                  <span className="tio-grid-time-lbl">{t("tio_col_timein")}</span>
                  <span className="tio-grid-time-val">{r.time_in}</span>
                </div>
                <div className="tio-grid-time-col">
                  <span className="tio-grid-time-lbl">{t("tio_col_timeout")}</span>
                  <span className="tio-grid-time-val">{r.time_out || "–"}</span>
                </div>
                <div className="tio-grid-time-col">
                  <span className="tio-grid-time-lbl">{t("tio_col_hours")}</span>
                  <span className="tio-grid-time-val">{workHours(r.time_in, r.time_out)}</span>
                </div>
              </div>
              <span className="tio-method-pill tio-grid-method">{r.method}</span>
            </div>
          );
        })}
      </div>
      )}

      {/* ── Pagination ── */}
      {pages > 1 && (
        <div className="tio-pagination">
          <span className="tio-pg-info">{t("page_of").replace("{p}", safePage).replace("{total}", pages)}</span>
          <div className="tio-pg-btns">
            <button className="tio-pg-btn" disabled={safePage === 1} onClick={() => setPage(1)}>«</button>
            <button className="tio-pg-btn" disabled={safePage === 1} onClick={() => setPage(p => p - 1)}>‹</button>
            {Array.from({ length: pages }, (_, i) => i + 1).map(n => (
              <button key={n} className={`tio-pg-btn${safePage === n ? " tio-pg-active" : ""}`} onClick={() => setPage(n)}>{n}</button>
            ))}
            <button className="tio-pg-btn" disabled={safePage >= pages} onClick={() => setPage(p => p + 1)}>›</button>
            <button className="tio-pg-btn" disabled={safePage >= pages} onClick={() => setPage(pages)}>»</button>
          </div>
        </div>
      )}
    </div>
  );
}
