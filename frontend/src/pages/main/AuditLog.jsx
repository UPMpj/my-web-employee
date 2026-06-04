import { useCurrentUser } from "../../hooks/useCurrentUser";
import { useEffect, useState, useRef } from "react";
import { api } from "../../api";
import toast from "react-hot-toast";
import { useLanguage } from "../../context/LanguageContext";
import "./audit.css";

const ACTION_COLOR = {
  INSERT: { bg: "#dcfce7", color: "#166534" },
  UPDATE: { bg: "#dbeafe", color: "#1e40af" },
  DELETE: { bg: "#fee2e2", color: "#991b1b" },
};

function fmtDate(d) {
  if (!d) return "–";
  return new Date(d).toLocaleString("en-GB", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function IconSearch() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2">
      <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
    </svg>
  );
}

export default function AuditLog() {
  const { t } = useLanguage();
  const user      = useCurrentUser();
  const isSA      = user.role === "Super Admin";

  const [logs,         setLogs]         = useState([]);
  const [total,        setTotal]        = useState(0);
  const [page,         setPage]         = useState(1);
  const [loading,      setLoading]      = useState(false);
  const [entityTypes,  setEntityTypes]  = useState([]);
  const [companies,    setCompanies]    = useState([]);

  /* filters */
  const [search,     setSearch]     = useState("");
  const [action,     setAction]     = useState("");
  const [entityType, setEntityType] = useState("");
  const [companyId,  setCompanyId]  = useState("");
  const [dateFrom,   setDateFrom]   = useState("");
  const [dateTo,     setDateTo]     = useState("");

  const LIMIT = 20;

  /* load companies for Super Admin dropdown */
  useEffect(() => {
    if (!isSA) return;
    api.get("/company/all").then(r => setCompanies(r.data)).catch(() => {});
  }, []);

  const load = async (p = page, params = buildParams()) => {
    setLoading(true);
    try {
      const r = await api.get("/audit", { params: { ...params, page: p, limit: LIMIT } });
      setLogs(r.data.data);
      setTotal(r.data.total);
      if (r.data.entity_types?.length) setEntityTypes(r.data.entity_types);
    } catch {
      toast.error("Failed to load Audit Log");
      setLogs([]);
    }
    setLoading(false);
  };

  function buildParams() {
    return { search, action, entity_type: entityType, company_id: companyId, date_from: dateFrom, date_to: dateTo };
  }

  useEffect(() => { load(page); }, [page]);

  const doSearch = () => { setPage(1); load(1, buildParams()); };

  const reset = () => {
    setSearch(""); setAction(""); setEntityType("");
    setCompanyId(""); setDateFrom(""); setDateTo("");
    setPage(1);
    load(1, { search:"", action:"", entity_type:"", company_id:"", date_from:"", date_to:"" });
  };

  const hasFilter = search || action || entityType || companyId || dateFrom || dateTo;

  const pages = Math.ceil(total / LIMIT);
  const from  = total === 0 ? 0 : (page - 1) * LIMIT + 1;
  const to    = Math.min(page * LIMIT, total);

  /* stats counts from current result */
  const actionCounts = logs.reduce((acc, l) => {
    const k = l.action?.toUpperCase() || "OTHER";
    acc[k] = (acc[k] || 0) + 1;
    return acc;
  }, {});

  /* smart pagination */
  const pageBtns = () => {
    if (pages <= 7) return Array.from({ length: pages }, (_, i) => i + 1);
    if (page <= 4)  return [1, 2, 3, 4, 5, "…", pages];
    if (page >= pages - 3) return [1, "…", pages-4, pages-3, pages-2, pages-1, pages];
    return [1, "…", page-1, page, page+1, "…", pages];
  };

  return (
    <div className="al-page">
      <h1 className="al-title">{t("audit_title")}</h1>
      <p className="al-sub">{t("audit_sub")}</p>

      {/* ── Stats ── */}
      <div className="al-stats">
        <div className="al-stat-box">
          <div className="al-stat-dot" style={{ background: "#2f4aad" }} />
          <div>
            <div className="al-stat-val">{total.toLocaleString()}</div>
            <div className="al-stat-lbl">{t("audit_total")}</div>
          </div>
        </div>
        {Object.entries(ACTION_COLOR).map(([k, c]) => (
          <div key={k} className="al-stat-box">
            <div className="al-stat-dot" style={{ background: c.color }} />
            <div>
              <div className="al-stat-val" style={{ color: c.color }}>{actionCounts[k] || 0}</div>
              <div className="al-stat-lbl">{k}</div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Filter bar ── */}
      <div className="al-filterbar">
        {/* Search */}
        <div className="al-search-box">
          <IconSearch />
          <input
            className="al-search-input"
            placeholder={t("audit_search_ph")}
            value={search}
            onChange={e => setSearch(e.target.value)}
            onKeyDown={e => e.key === "Enter" && doSearch()}
          />
        </div>

        {/* Action */}
        <select className="al-select" value={action} onChange={e => { setAction(e.target.value); setPage(1); }}>
          <option value="">All Actions</option>
          <option value="INSERT">INSERT</option>
          <option value="UPDATE">UPDATE</option>
          <option value="DELETE">DELETE</option>
        </select>

        {/* Entity type */}
        <select className="al-select" value={entityType} onChange={e => { setEntityType(e.target.value); setPage(1); }}>
          <option value="">All Entities</option>
          {entityTypes.map(t => <option key={t} value={t}>{t}</option>)}
        </select>

        {/* Company (Super Admin only) */}
        {isSA && (
          <select className="al-select" value={companyId} onChange={e => { setCompanyId(e.target.value); setPage(1); }}>
            <option value="">All Companies</option>
            {companies.map(c => <option key={c.company_id} value={c.company_id}>{c.companies_name}</option>)}
          </select>
        )}

        {/* Date range */}
        <div className="al-date-wrap">
          <input type="date" className="al-date-input" value={dateFrom} onChange={e => setDateFrom(e.target.value)} title="From" />
          <span className="al-date-sep">–</span>
          <input type="date" className="al-date-input" value={dateTo} onChange={e => setDateTo(e.target.value)} title="To" />
        </div>

        {hasFilter && (
          <button className="al-btn-reset" onClick={reset}>✕ Reset</button>
        )}
      </div>

      {/* ── Result count ── */}
      <div className="al-result-row">
        <span className="al-result-text">
          {total === 0 ? t("no_data") : t("showing_range").replace("{from}", from).replace("{to}", to).replace("{total}", total.toLocaleString())}
        </span>
      </div>

      {/* ── Table ── */}
      <div className="al-table-wrap">
        {loading ? (
          <div className="al-skeleton-rows">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="al-skeleton-row" />
            ))}
          </div>
        ) : (
          <table className="al-table">
            <thead>
              <tr>
                <th className="al-th">#</th>
                <th className="al-th">Action</th>
                <th className="al-th">Entity</th>
                <th className="al-th">{t("audit_user")}</th>
                <th className="al-th">Company</th>
                <th className="al-th">{t("audit_date")}</th>
              </tr>
            </thead>
            <tbody>
              {logs.length === 0 ? (
                <tr className="al-empty-row">
                  <td colSpan="6">
                    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" strokeWidth="1.5" style={{ display:"block", margin:"0 auto 8px" }}>
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                      <polyline points="14 2 14 8 20 8"/>
                      <line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
                    </svg>
                    {t("audit_no_match")}
                  </td>
                </tr>
              ) : logs.map((log, i) => {
                const ac = ACTION_COLOR[log.action?.toUpperCase()] || { bg: "#f3f4f6", color: "#374151" };
                return (
                  <tr key={log.audit_id} className="al-tr">
                    <td className="al-td" style={{ color: "#9ca3af", fontSize: 13 }}>{from + i}</td>
                    <td className="al-td">
                      <span className="al-pill" style={{ background: ac.bg, color: ac.color }}>
                        {log.action || "–"}
                      </span>
                    </td>
                    <td className="al-td">
                      <span className="al-entity">{log.entity_type || "–"}</span>
                    </td>
                    <td className="al-td">
                      <div className="al-user-cell">
                        <div className="al-user-avatar">
                          {(log.fullname?.[0] || "?").toUpperCase()}
                        </div>
                        <span className="al-user-name">{log.fullname || "–"}</span>
                      </div>
                    </td>
                    <td className="al-td" style={{ color: "#6b7280" }}>{log.companies_name || "–"}</td>
                    <td className="al-td al-date-cell">{fmtDate(log.created_at)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* ── Pagination ── */}
      {pages > 1 && (
        <div className="al-pagination">
          <span className="al-pg-info">
            {t("page_of").replace("{p}", page).replace("{total}", pages)}
          </span>
          <div className="al-pg-btns">
            <button className="al-pg-btn" disabled={page === 1} onClick={() => setPage(1)}>«</button>
            <button className="al-pg-btn" disabled={page === 1} onClick={() => setPage(p => p - 1)}>‹</button>

            {pageBtns().map((n, i) =>
              n === "…"
                ? <span key={`e${i}`} style={{ padding: "0 4px", color: "#9ca3af" }}>…</span>
                : <button
                    key={n}
                    className={`al-pg-btn${page === n ? " al-pg-active" : ""}`}
                    onClick={() => setPage(n)}
                  >{n}</button>
            )}

            <button className="al-pg-btn" disabled={page >= pages} onClick={() => setPage(p => p + 1)}>›</button>
            <button className="al-pg-btn" disabled={page >= pages} onClick={() => setPage(pages)}>»</button>
          </div>
        </div>
      )}
    </div>
  );
}
