import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../../api";
import { useLanguage } from "../../context/LanguageContext";
import toast from "react-hot-toast";
import { printCards } from "../../utils/cardPrint";
import {
  companyAvatarColor, companyInitials, requestNo, fmtDate, STATUS_META, displayStatus,
} from "../../utils/cardRequestHelpers";
import "./idcard.css";
import "./card-requests.css";

const IconEye = () => (
  <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);
const IconDownload = () => (
  <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 3v12m0 0l-4-4m4 4l4-4" />
    <path d="M5 19h14" />
  </svg>
);

export default function CardRequests() {
  const { t } = useLanguage();
  const navigate = useNavigate();

  const [requests, setRequests] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [search,   setSearch]   = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [downloadingId, setDownloadingId] = useState(null);

  const load = () => {
    setLoading(true);
    api.get("/card-requests")
      .then(r => setRequests(r.data))
      .catch(() => toast.error("ໂຫລດຂໍ້ມູນບໍ່ສຳເລັດ"))
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const counts = useMemo(() => ({
    all:      requests.length,
    pending:  requests.filter(r => displayStatus(r) === "pending").length,
    approved: requests.filter(r => ["approved","issued"].includes(displayStatus(r))).length,
    printed:  requests.filter(r => displayStatus(r) === "printed").length,
    rejected: requests.filter(r => displayStatus(r) === "rejected").length,
  }), [requests]);

  const displayed = useMemo(() => {
    const q = search.trim().toLowerCase();
    return requests.filter(r => {
      if (statusFilter !== "all") {
        const ds = displayStatus(r);
        if (statusFilter === "approved" ? !["approved","issued"].includes(ds) : ds !== statusFilter) return false;
      }
      if (!q) return true;
      return requestNo(r).toLowerCase().includes(q)
        || (r.companies_name || "").toLowerCase().includes(q)
        || (r.requested_by_name || "").toLowerCase().includes(q);
    });
  }, [requests, search, statusFilter]);

  const handleDownload = async (b) => {
    if (b.status !== "approved" || downloadingId) return;
    setDownloadingId(b.batch_id);
    try {
      const detailRes = await api.get(`/card-requests/${b.batch_id}`);
      const employees = detailRes.data.employees_json || [];
      const results = await Promise.all(
        employees.map(e => api.get(`/idcard/${e.employee_id}`).then(r => r.data).catch(() => null))
      );
      const valid = results.filter(Boolean);
      if (valid.length === 0) toast.error("ບໍ່ພົບຂໍ້ມູນບັດ");
      else printCards(valid);
    } catch {
      toast.error("ດາວໂຫລດບໍ່ສຳເລັດ");
    }
    setDownloadingId(null);
  };

  return (
    <div className="idc-page">
      <div className="crq-header">
        <div>
          <h1 className="idc-title">{t("crq_title")}</h1>
          <div className="crq-breadcrumb">{t("nav_idcard")} <span>/</span> {t("nav_card_requests")}</div>
        </div>
      </div>

      <div className="idc-filters">
        <input
          className="idc-search"
          placeholder={t("crq_search_ph")}
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <select className="idc-select" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
          <option value="all">{t("all_status")}</option>
          <option value="pending">{t("crq_pending")}</option>
          <option value="approved">{t("crq_approved")}</option>
          <option value="printed">{t("crq_printed")}</option>
          <option value="rejected">{t("crq_rejected")}</option>
        </select>
        <button className="crq-new-btn" onClick={() => navigate("/idcard/request")}>
          {t("crq_new_request")}
        </button>
      </div>

      <div className="idc-stats">
        {[
          { key: "all",      label: t("total"),        value: counts.all,      color: "#2f4aad" },
          { key: "pending",  label: t("crq_pending"),  value: counts.pending,  color: "#d97706" },
          { key: "approved", label: t("crq_approved"), value: counts.approved, color: "#059669" },
          { key: "printed",  label: t("crq_printed"),  value: counts.printed,  color: "#0e7490" },
          { key: "rejected", label: t("crq_rejected"), value: counts.rejected, color: "#dc2626" },
        ].map(s => {
          const active = statusFilter === s.key;
          return (
            <div
              key={s.key}
              className={`idc-stat-box idc-stat-btn${active ? " idc-stat-active" : ""}`}
              style={active ? { borderColor: s.color, boxShadow: `0 0 0 2px ${s.color}22` } : {}}
              onClick={() => setStatusFilter(s.key)}
            >
              <div className="idc-stat-val" style={{ color: s.color }}>{s.value}</div>
              <div className="idc-stat-lbl">{s.label}</div>
              {active && <div className="idc-stat-active-dot" style={{ background: s.color }} />}
            </div>
          );
        })}
      </div>

      <div className="crq-tabs">
        {[
          ["all", t("all"), counts.all],
          ["pending", t("crq_pending"), counts.pending],
          ["approved", t("crq_approved"), counts.approved],
          ["printed", t("crq_printed"), counts.printed],
          ["rejected", t("crq_rejected"), counts.rejected],
        ].map(([k, lbl, n]) => (
          <button
            key={k}
            className={`crq-tab${statusFilter === k ? " crq-tab-active" : ""}`}
            onClick={() => setStatusFilter(k)}
          >
            {lbl} <span className="crq-tab-count">{n}</span>
          </button>
        ))}
      </div>

      <div className="crq-table-wrap">
        <table className="crq-table">
          <thead>
            <tr>
              <th>{t("crq_th_no")}</th>
              <th>{t("company")}</th>
              <th>{t("crq_th_sender")}</th>
              <th>{t("crq_th_qty")}</th>
              <th>{t("status")}</th>
              <th>{t("crq_th_date")}</th>
              <th>{t("manage")}</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} className="crq-td-empty">{t("loading")}</td></tr>
            ) : displayed.length === 0 ? (
              <tr><td colSpan={7} className="crq-td-empty">{t(requests.length === 0 ? "no_data" : "crq_no_match")}</td></tr>
            ) : (
              displayed.map(b => {
                const ds = displayStatus(b);
                const sm = STATUS_META[ds] || STATUS_META.pending;
                const isApproved = b.status === "approved";
                return (
                  <tr key={b.batch_id}>
                    <td className="crq-td-no">{requestNo(b)}</td>
                    <td>
                      <div className="crq-company-cell">
                        <div className="crq-avatar" style={{ background: companyAvatarColor(b.company_id) }}>
                          {companyInitials(b.companies_name)}
                        </div>
                        <span>{b.companies_name || "–"}</span>
                      </div>
                    </td>
                    <td>{b.requested_by_name || "–"}</td>
                    <td className="crq-td-qty">{b.total_count}</td>
                    <td>
                      <span className="crq-status-badge" style={{ background: sm.bg, color: sm.color }}>
                        {t(`crq_${ds}`) || ds}
                      </span>
                    </td>
                    <td>{fmtDate(b.created_at)}</td>
                    <td>
                      <div className="crq-actions">
                        <button className="crq-action-btn" title={t("crq_view")} onClick={() => navigate(`/idcard/requests/${b.batch_id}`)}>
                          <IconEye />
                        </button>
                        <button
                          className="crq-action-btn"
                          title={isApproved ? t("crq_download") : t("crq_download_disabled_tip")}
                          disabled={!isApproved || downloadingId === b.batch_id}
                          onClick={() => handleDownload(b)}
                        >
                          <IconDownload />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
