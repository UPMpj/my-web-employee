import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "../../api";
import { useLanguage } from "../../context/LanguageContext";
import toast from "react-hot-toast";
import { printCards } from "../../utils/cardPrint";
import { requestNo, fmtDate, fmtDateTime, STATUS_META, displayStatus } from "../../utils/cardRequestHelpers";
import "./idcard.css";
import "./card-request-detail.css";

const CARD_TYPE_COLORS = {
  "Manager Card":    { color: "#5b21b6", bg: "#ede9fe" },
  "Supervisor Card": { color: "#0a6e5a", bg: "#d1fae5" },
  "Staff Card":      { color: "#1a3a6b", bg: "#dbeafe" },
  "Contractor Card": { color: "#b45309", bg: "#fef3c7" },
  "Temporary Card":  { color: "#6b7280", bg: "#f3f4f6" },
  "Shop Card":       { color: "#9f1239", bg: "#ffe4e6" },
  "Visitor Card":    { color: "#374151", bg: "#f3f4f6" },
};

const ALL_CARD_TYPES = [
  "Staff Card", "Supervisor Card", "Manager Card", "Contractor Card",
  "Temporary Card", "Shop Card", "Visitor Card",
];

function CardTypeBadge({ type }) {
  const m = CARD_TYPE_COLORS[type] || CARD_TYPE_COLORS["Staff Card"];
  return <span className="crqd-type-badge" style={{ color: m.color, background: m.bg }}>{type || "–"}</span>;
}

const IconSearch = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="11" cy="11" r="7" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
);
const IconDoc = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="9" y1="13" x2="15" y2="13" /><line x1="9" y1="17" x2="13" y2="17" />
  </svg>
);
const IconPrinter = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <polyline points="6 9 6 2 18 2 18 9" />
    <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
    <rect x="6" y="14" width="12" height="8" />
  </svg>
);
const IconCheckCircle = () => (
  <svg viewBox="0 0 24 24" width="64" height="64" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
    <circle cx="12" cy="12" r="10" />
    <polyline points="9 12 11.5 14.5 16 9.5" />
  </svg>
);
const IconEyeBtn = () => (
  <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z" /><circle cx="12" cy="12" r="3" />
  </svg>
);
const IconBack = () => (
  <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <polyline points="15 18 9 12 15 6" />
  </svg>
);

function MiniCardPreview({ emp }) {
  const m = CARD_TYPE_COLORS[emp.cardType] || CARD_TYPE_COLORS["Staff Card"];
  const initials = `${(emp.firstname||"?")[0]}${(emp.lastname||"")[0]}`.toUpperCase();
  return (
    <div className="crqd-mini-card">
      <div className="crqd-mini-card-hdr" style={{ background: m.color }}>
        <div className="crqd-mini-card-hdr-label">PROJECT ACCESS CARD</div>
      </div>
      <div className="crqd-mini-card-body">
        <div className="crqd-mini-avatar" style={{ background: `${m.color}20`, color: m.color }}>{initials}</div>
        <div className="crqd-mini-name">{emp.firstname} {emp.lastname}</div>
        <div className="crqd-mini-role">{emp.position || "–"}</div>
        <div className="crqd-mini-type-badge" style={{ background: m.bg, color: m.color }}>
          {(emp.cardType || "Staff Card").toUpperCase()}
        </div>
      </div>
    </div>
  );
}

function MiniCardActive({ emp }) {
  const m = CARD_TYPE_COLORS[emp.cardType] || CARD_TYPE_COLORS["Staff Card"];
  const initials = `${(emp.firstname||"?")[0]}${(emp.lastname||"")[0]}`.toUpperCase();
  return (
    <div className="crqd-mini-card crqd-mini-card-active-wrap">
      <div className="crqd-mini-active-badge">ACTIVE</div>
      <div className="crqd-mini-card-body crqd-mini-card-body-top">
        <div className="crqd-mini-avatar" style={{ background: `${m.color}20`, color: m.color }}>{initials}</div>
        <div className="crqd-mini-name">{emp.firstname} {emp.lastname}</div>
        <div className="crqd-mini-role">{emp.position || "–"}</div>
        <div className="crqd-mini-type-badge" style={{ background: m.bg, color: m.color }}>
          {(emp.cardType || "Staff Card").toUpperCase()}
        </div>
      </div>
    </div>
  );
}
const IconCheck = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.2">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);
const IconX = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.2">
    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);
const IconWarning = () => (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M12 9v4M12 17h.01M10.29 3.86l-8.18 14.18A1 1 0 0 0 3 19.5h18a1 1 0 0 0 .87-1.46L13.71 3.86a1 1 0 0 0-1.73 0z" />
  </svg>
);

const STEP_HDR_META = {
  pending:  { Icon: IconSearch, bg: "#fef3c7", color: "#92400e" },
  approved: { Icon: IconCheck,  bg: "#dcfce7", color: "#065f46" },
  printed:  { Icon: IconCheck,  bg: "#cffafe", color: "#0e7490" },
  rejected: { Icon: IconX,      bg: "#fee2e2", color: "#991b1b" },
};

function buildSteps(d, t) {
  const rejected = d.status === "rejected";
  const base = [
    { n: 1, label: t("crq_step_submit"), date: d.created_at,      actor: d.requested_by_name },
    { n: 2, label: t("crq_step_review"), date: d.first_viewed_at, actor: d.first_viewed_by_name },
  ];
  if (rejected) {
    return [
      ...base,
      { n: 3, label: t("crq_step_reject"),   date: d.reviewed_at, actor: d.reviewed_by_name, rejected: true },
      { n: 4, label: t("crq_step_complete"), date: null, actor: null },
      { n: 5, label: t("crq_step_print"),    date: null, actor: null },
    ];
  }
  return [
    ...base,
    { n: 3, label: t("crq_step_approve"),  date: d.status === "approved" ? d.reviewed_at : null, actor: d.reviewed_by_name },
    { n: 4, label: t("crq_step_complete"), date: d.all_issued  ? d.reviewed_at     : null, actor: d.all_issued  ? d.reviewed_by_name : null },
    { n: 5, label: t("crq_step_print"),    date: d.all_printed ? d.last_printed_at : null, actor: null },
  ];
}

function getCurrentStep(d) {
  if (d.status === "rejected") return 3;
  if (d.status === "approved") {
    if (d.all_issued && d.all_printed) return 5;
    if (d.all_issued)                  return 4;
    return 3;
  }
  return d.first_viewed_at ? 2 : 1;
}

export default function CardRequestDetail() {
  const { t } = useLanguage();
  const { id } = useParams();
  const navigate = useNavigate();

  const [detail,          setDetail]          = useState(null);
  const [loading,         setLoading]         = useState(true);
  const [note,            setNote]            = useState("");
  const [acting,          setActing]          = useState(false);
  const [downloading,     setDownloading]     = useState(false);
  const [showSubmitted,   setShowSubmitted]   = useState(true);
  const [printerModel,    setPrinterModel]    = useState("Zebra ZC300");
  const [printQuality,    setPrintQuality]    = useState("high");
  const [printWithName,   setPrintWithName]   = useState(true);
  const [marking,         setMarking]         = useState(false);
  const [issuing,         setIssuing]         = useState(false);
  const [rollingBack,     setRollingBack]     = useState(false);

  const load = () => {
    setLoading(true);
    api.get(`/card-requests/${id}`)
      .then(r => setDetail(r.data))
      .catch(() => toast.error("ໂຫລດລາຍລະອຽດບໍ່ໄດ້"))
      .finally(() => setLoading(false));
  };

  const silentLoad = () => {
    api.get(`/card-requests/${id}`)
      .then(r => setDetail(r.data))
      .catch(() => {});
  };

  useEffect(() => { setShowSubmitted(true); load(); }, [id]);

  const approve = async () => {
    setActing(true);
    try {
      await api.patch(`/card-requests/${id}/approve`);
      toast.success("ອະນຸມັດສຳເລັດ");
      setShowSubmitted(false);
      setDetail(prev => prev ? { ...prev, status: "approved", reviewed_at: new Date().toISOString() } : prev);
      silentLoad();
    } catch (err) {
      toast.error(err?.response?.data?.message || "ອະນຸມັດບໍ່ສຳເລັດ");
    }
    setActing(false);
  };

  const reject = async () => {
    setActing(true);
    try {
      await api.patch(`/card-requests/${id}/reject`, { reason: note });
      toast.success("ປະຕິເສດແລ້ວ");
      load();
    } catch (err) {
      toast.error(err?.response?.data?.message || "ປະຕິເສດບໍ່ສຳເລັດ");
    }
    setActing(false);
  };

  const handleDownload = async () => {
    if (downloading) return;
    setDownloading(true);
    try {
      const employees = detail.employees_json || [];
      const results = await Promise.all(
        employees.map(e => api.get(`/idcard/${e.employee_id}`).then(r => r.data).catch(() => null))
      );
      const valid = results.filter(Boolean);
      if (valid.length === 0) toast.error("ບໍ່ພົບຂໍ້ມູນບັດ");
      else printCards(valid);
    } catch {
      toast.error("ດາວໂຫລດບໍ່ສຳເລັດ");
    }
    setDownloading(false);
  };

  const issueCards = async () => {
    if (issuing) return;
    setIssuing(true);
    try {
      // 1. Create cards
      await api.patch(`/card-requests/${id}/issue`);
      setShowSubmitted(false);
      setDetail(prev => prev ? { ...prev, all_issued: true } : prev);

      // 2. Fetch full card data for printing
      const employees = detail?.employees_json || [];
      const results = await Promise.all(
        employees.map(e => api.get(`/idcard/${e.employee_id}`).then(r => r.data).catch(() => null))
      );
      const valid = results.filter(Boolean);

      // 3. Open print dialog
      if (valid.length > 0) {
        printCards(valid);
      }

      // 4. Mark as printed and advance to Step 5
      setTimeout(async () => {
        try {
          await api.patch(`/card-requests/${id}/mark-printed`);
          setDetail(prev => prev ? { ...prev, all_printed: true } : prev);
          toast.success("ສ້າງ ແລະ ພ້ອມພິມແລ້ວ");
          silentLoad();
        } catch {
          silentLoad();
        }
      }, 1200);

    } catch (err) {
      toast.error(err?.response?.data?.message || "ສ້າງບັດບໍ່ສຳເລັດ");
    }
    setIssuing(false);
  };

  const markPrinted = async () => {
    if (marking) return;
    setMarking(true);
    try {
      await api.patch(`/card-requests/${id}/mark-printed`);
      setDetail(prev => prev ? { ...prev, all_printed: true } : prev);
      silentLoad();
    } catch {
      toast.error("ບັນທຶກການພິມບໍ່ສຳເລັດ");
    }
    setMarking(false);
  };

  const handlePrintAll = async () => {
    await handleDownload();
    setTimeout(() => markPrinted(), 1200);
  };

  const rollback = async (targetStep, confirmKey) => {
    if (!window.confirm(t(confirmKey))) return;
    setRollingBack(true);
    try {
      await api.patch(`/card-requests/${id}/rollback`, { target_step: targetStep });
      setShowSubmitted(false);
      if (targetStep === 2) {
        setDetail(prev => prev ? { ...prev, status: "pending", reviewed_at: null, reviewed_by_name: null, all_issued: false } : prev);
      } else if (targetStep === 3) {
        setDetail(prev => prev ? { ...prev, all_issued: false, all_printed: false } : prev);
      } else if (targetStep === 4) {
        setDetail(prev => prev ? { ...prev, all_printed: false } : prev);
      }
      silentLoad();
    } catch (err) {
      toast.error(err?.response?.data?.message || "ຍ້ອນກັບບໍ່ສຳເລັດ");
    }
    setRollingBack(false);
  };

  if (loading) {
    return <div className="idc-page"><div className="crqd-loading">{t("loading")}</div></div>;
  }
  if (!detail) {
    return <div className="idc-page"><div className="crqd-loading">{t("no_data")}</div></div>;
  }

  const ds              = displayStatus(detail);
  const sm              = STATUS_META[ds] || STATUS_META.pending;
  const steps           = buildSteps(detail, t);
  const curStep         = getCurrentStep(detail);
  const employees       = detail.employees_json || [];
  const isShowingSubmitted = showSubmitted && detail.status === "pending";
  const displayStep     = isShowingSubmitted ? 1 : curStep;
  const cardTypeCounts  = employees.reduce((acc, e) => {
    const type = e.cardType || "Staff Card";
    acc[type] = (acc[type] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="idc-page">
      <div className="crqd-header">
        <div>
          <h1 className="idc-title">{t("crq_detail_title")}</h1>
          <div className="crq-breadcrumb">
            {t("nav_idcard")} <span>/</span> {t("nav_card_requests")} <span>/</span> {requestNo(detail)}
          </div>
        </div>
      </div>

      <div className="crqd-stepper">
        {steps.map((step, i) => {
          const isRejectedStep = !!step.rejected;
          const active = isRejectedStep ? true : step.n <= displayStep && !(detail.status === "rejected" && step.n > 3);
          return (
            <div key={step.n} className="crqd-step-wrap">
              <div className={`crqd-step${active ? " crqd-step-active" : ""}${isRejectedStep ? " crqd-step-rejected" : ""}${active && step.n < displayStep && !isRejectedStep ? " crqd-step-done" : ""}`}>
                <div className="crqd-step-circle">
                  {active && step.n < displayStep && !isRejectedStep ? (
                    <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  ) : step.n}
                </div>
                <div className="crqd-step-label">{step.label}</div>
                <div className="crqd-step-meta">
                  {step.date ? <>{fmtDateTime(step.date)}{step.actor ? <><br />{step.actor}</> : null}</> : "–"}
                </div>
              </div>
              {i < steps.length - 1 && <div className={`crqd-step-line${step.n < displayStep ? " crqd-step-line-on" : ""}`} />}
            </div>
          );
        })}
      </div>

      <div className="crqd-body">
        <div className="crqd-summary">
          <div className="crqd-summary-hdr">
            <span>{t("crq_summary_title")}</span>
            <span className="crq-status-badge" style={{ background: sm.bg, color: sm.color }}>
              {t(`crq_${ds}`) || ds}
            </span>
          </div>

          <div className="crqd-summary-row">
            <span className="crqd-summary-lbl">{t("crq_th_no")}</span>
            <span className="crqd-summary-val crqd-summary-no">{requestNo(detail)}</span>
          </div>
          <div className="crqd-summary-row">
            <span className="crqd-summary-lbl">{t("company")}</span>
            <span className="crqd-summary-val">{detail.companies_name || "–"}</span>
          </div>
          <div className="crqd-summary-row">
            <span className="crqd-summary-lbl">{t("crq_th_sender")}</span>
            <span className="crqd-summary-val">{detail.requested_by_name || "–"}</span>
          </div>
          <div className="crqd-summary-row">
            <span className="crqd-summary-lbl">{t("crq_th_date")}</span>
            <span className="crqd-summary-val">{fmtDate(detail.created_at)}</span>
          </div>

          <div className="crqd-summary-stats">
            <div className="crqd-summary-stat">
              <div className="crqd-summary-stat-val">{detail.total_count}</div>
              <div className="crqd-summary-stat-lbl">{t("crq_members")}</div>
            </div>
            <div className="crqd-summary-stat">
              <div className="crqd-summary-stat-val">{detail.total_count}</div>
              <div className="crqd-summary-stat-lbl">{t("crq_cards")}</div>
            </div>
          </div>

          <div className="crqd-summary-row">
            <span className="crqd-summary-lbl">{t("crq_purpose")}</span>
            <span className="crqd-summary-val">{t("crq_purpose_new_card")}</span>
          </div>

          <div className="crqd-progress-bar">
            <div className="crqd-progress-fill" style={{ width: `${(displayStep / 5) * 100}%` }} />
          </div>
          <div className="crqd-progress-text">
            {t("crq_step_progress").replace("{n}", displayStep).replace("{label}", steps[displayStep - 1]?.label || "")}
          </div>
        </div>

        <div className="crqd-main">
          {isShowingSubmitted ? (
            <>
              <div className="crqd-step-hdr">
                <div className="crqd-step-hdr-icon" style={{ background: "#dbeafe", color: "#1e40af" }}>
                  <IconDoc />
                </div>
                <div>
                  <div className="crqd-step-hdr-eyebrow">{t("crq_step_n_of_5").replace("{n}", 1)}</div>
                  <div className="crqd-step-hdr-title">{t("crq_heading_submitted")}</div>
                </div>
              </div>

              <div className="crqd-banner crqd-banner-pending">
                {t("crq_pending_banner").replace("{name}", detail.requested_by_name || "")}
              </div>

              <div className="crqd-emp-title">{t("crq_employee_list")} ({employees.length})</div>
              <div className="crqd-emp-table-wrap">
                <table className="crqd-emp-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>{t("employee_code")}</th>
                      <th>{t("name")}</th>
                      <th>{t("position")}</th>
                      <th>{t("crq_card_type")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {employees.map((e, i) => (
                      <tr key={e.employee_id}>
                        <td>{i + 1}</td>
                        <td>{e.employee_code || "–"}</td>
                        <td className="crqd-emp-name">{e.firstname} {e.lastname}</td>
                        <td>{e.position || "–"}</td>
                        <td><CardTypeBadge type={e.cardType} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="crqd-submitted-actions">
                <button className="crqd-btn-go-review" onClick={() => setShowSubmitted(false)}>
                  {t("crq_go_to_review")}
                </button>
              </div>
            </>
          ) : curStep === 5 ? (
            /* ── Step 5: Completed ── */
            <>
              <div className="crqd-step-hdr">
                <div className="crqd-step-hdr-icon" style={{ background: "#dcfce7", color: "#16a34a" }}>
                  <IconCheck />
                </div>
                <div>
                  <div className="crqd-step-hdr-eyebrow">{t("crq_step_n_of_5").replace("{n}", 5)}</div>
                  <div className="crqd-step-hdr-title">{t("crq_heading_complete")}</div>
                </div>
              </div>

              <div className="crqd-complete-hero">
                <div className="crqd-complete-icon"><IconCheckCircle /></div>
                <div className="crqd-complete-title">{t("crq_complete_sub")}</div>
                <div className="crqd-complete-meta">
                  {t("crq_printed_info")
                    .replace("{n}", employees.length)
                    .replace("{date}", detail.last_printed_at ? new Date(detail.last_printed_at).toLocaleString("en-GB", { day:"2-digit", month:"short", year:"numeric", hour:"2-digit", minute:"2-digit" }) : "–")
                    .replace("{actor}", detail.reviewed_by_name || "System Admin")}
                </div>
              </div>

              <div className="crqd-mini-cards-row">
                {employees.map(e => <MiniCardActive key={e.employee_id} emp={e} />)}
              </div>

              <div className="crqd-complete-actions">
                <button className="crqd-btn-view-cards" onClick={() => navigate("/idcard")}>
                  <IconEyeBtn /> {t("crq_view_id_cards")}
                </button>
                <button className="crqd-btn-back-list" onClick={() => navigate("/idcard/requests")}>
                  <IconBack /> {t("crq_back_list")}
                </button>
              </div>
              <div className="crqd-rollback-row">
                <button className="crqd-btn-rollback" disabled={rollingBack} onClick={() => rollback(4, "crq_rollback_confirm_issued")}>
                  {t("crq_rollback_to_issued")}
                </button>
              </div>
            </>

          ) : curStep === 4 ? (
            /* ── Step 4: Issued / Print-ready ── */
            <>
              <div className="crqd-step-hdr">
                <div className="crqd-step-hdr-icon" style={{ background: "#dbeafe", color: "#1d4ed8" }}>
                  <IconPrinter />
                </div>
                <div>
                  <div className="crqd-step-hdr-eyebrow">{t("crq_step_n_of_5").replace("{n}", 4)}</div>
                  <div className="crqd-step-hdr-title">{t("crq_heading_issued")}</div>
                </div>
              </div>

              <div className="crqd-banner crqd-banner-approved">
                ✓ {t("crq_issued_banner")}
              </div>

              <div className="crqd-issued-layout">
                <div className="crqd-issued-left">
                  <div className="crqd-issued-bar">
                    <span className="crqd-issued-bar-title">{t("crqd_issued_title") || t("crq_issued_title")}</span>
                    <span className="crqd-issued-bar-count">{t("crq_total")}: {employees.length}</span>
                  </div>
                  <div className="crqd-mini-cards-row crqd-mini-cards-wrap">
                    {employees.map(e => <MiniCardPreview key={e.employee_id} emp={e} />)}
                  </div>
                </div>

                <div className="crqd-print-settings">
                  <div className="crqd-print-settings-title">{t("crq_print_settings")}</div>

                  <div className="crqd-print-field">
                    <label className="crqd-print-label">{t("crq_printer_model")}</label>
                    <select className="crqd-print-select" value={printerModel} onChange={e => setPrinterModel(e.target.value)}>
                      <option>Zebra ZC300</option>
                      <option>Zebra ZXP Series 7</option>
                      <option>Matica XID8300</option>
                      <option>HID Fargo HDP5000</option>
                    </select>
                  </div>

                  <div className="crqd-print-field">
                    <label className="crqd-print-label">{t("crq_print_quality")}</label>
                    <select className="crqd-print-select" value={printQuality} onChange={e => setPrintQuality(e.target.value)}>
                      <option value="high">{t("lang") === "lo" ? "ສູງ (300 dpi)" : "High (300 dpi)"}</option>
                      <option value="medium">{t("lang") === "lo" ? "ກາງ (200 dpi)" : "Medium (200 dpi)"}</option>
                    </select>
                  </div>

                  <label className="crqd-print-checkbox">
                    <input type="checkbox" checked={printWithName} onChange={e => setPrintWithName(e.target.checked)} />
                    <span>{t("crq_print_name_cb")}</span>
                  </label>

                  <div className="crqd-print-actions">
                    <button className="crqd-btn-preview" onClick={handleDownload} disabled={downloading}>
                      {downloading ? "..." : t("crq_quick_preview")}
                    </button>
                    <button className="crqd-btn-print-all" onClick={handlePrintAll} disabled={downloading || marking}>
                      {(downloading || marking) ? t("crq_acting") : t("crq_print_all")}
                    </button>
                    <button className="crqd-btn-rollback" disabled={rollingBack} onClick={() => rollback(3, "crq_rollback_confirm_approved")}>
                      {t("crq_rollback_to_approved")}
                    </button>
                  </div>
                </div>
              </div>
            </>

          ) : ds === "pending" ? (
            /* ── Step 2: Review ── */
            <>
              <div className="crqd-step-hdr">
                <div className="crqd-step-hdr-icon" style={{ background: "#fef3c7", color: "#92400e" }}>
                  <IconSearch />
                </div>
                <div>
                  <div className="crqd-step-hdr-eyebrow">{t("crq_step_n_of_5").replace("{n}", curStep)}</div>
                  <div className="crqd-step-hdr-title">{t("crq_heading_pending")}</div>
                </div>
              </div>

              <div className="crqd-warning-banner">
                <IconWarning />
                <span>{t("crq_review_warning")}</span>
              </div>

              <div className="crqd-emp-title">{t("crq_employee_list")} ({employees.length})</div>
              <div className="crqd-emp-table-wrap">
                <table className="crqd-emp-table">
                  <thead>
                    <tr>
                      <th>#</th><th>{t("employee_code")}</th><th>{t("name")}</th>
                      <th>{t("position")}</th><th>{t("crq_card_type")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {employees.map((e, i) => (
                      <tr key={e.employee_id}>
                        <td>{i + 1}</td>
                        <td>{e.employee_code || "–"}</td>
                        <td className="crqd-emp-name">{e.firstname} {e.lastname}</td>
                        <td>{e.position || "–"}</td>
                        <td><CardTypeBadge type={e.cardType} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="crqd-note-label">{t("crq_admin_note_label")}</div>
              <textarea
                className="crqd-note-textarea"
                maxLength={300}
                value={note}
                onChange={e => setNote(e.target.value)}
                placeholder={t("crq_admin_note_ph")}
              />
              <div className="crqd-note-counter">{note.length} / 300</div>

              <div className="crqd-decision-actions">
                <button className="crqd-btn-approve" disabled={acting} onClick={approve}>
                  {acting ? t("crq_acting") : t("crq_approve_short")}
                </button>
                <button className="crqd-btn-reject" disabled={acting} onClick={reject}>
                  {acting ? t("crq_acting") : t("crq_reject_short")}
                </button>
              </div>
            </>

          ) : ds === "rejected" ? (
            /* ── Rejected ── */
            <>
              <div className="crqd-step-hdr">
                <div className="crqd-step-hdr-icon" style={{ background: "#fee2e2", color: "#991b1b" }}>
                  <IconX />
                </div>
                <div>
                  <div className="crqd-step-hdr-eyebrow">{t("crq_step_n_of_5").replace("{n}", curStep)}</div>
                  <div className="crqd-step-hdr-title">{t("crq_rejected") || "ປະຕິເສດ"}</div>
                </div>
              </div>

              <div className="crqd-banner crqd-banner-rejected">{t("crq_rejected_banner")}</div>
              {detail.reject_reason && <div className="crqd-reject-display">{detail.reject_reason}</div>}

              <div className="crqd-emp-title">{t("crq_employee_list")} ({employees.length})</div>
              <div className="crqd-emp-table-wrap">
                <table className="crqd-emp-table">
                  <thead>
                    <tr>
                      <th>#</th><th>{t("employee_code")}</th><th>{t("name")}</th>
                      <th>{t("position")}</th><th>{t("crq_card_type")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {employees.map((e, i) => (
                      <tr key={e.employee_id}>
                        <td>{i + 1}</td>
                        <td>{e.employee_code || "–"}</td>
                        <td className="crqd-emp-name">{e.firstname} {e.lastname}</td>
                        <td>{e.position || "–"}</td>
                        <td><CardTypeBadge type={e.cardType} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>

          ) : (
            /* ── Step 3: Approved — card summary + issue button ── */
            <>
              <div className="crqd-step-hdr">
                <div className="crqd-step-hdr-icon" style={{ background: "#dcfce7", color: "#065f46" }}>
                  <IconCheck />
                </div>
                <div>
                  <div className="crqd-step-hdr-eyebrow">{t("crq_step_n_of_5").replace("{n}", 3)}</div>
                  <div className="crqd-step-hdr-title">{t("crq_approved")} — {t("crq_print_cards")}</div>
                </div>
              </div>

              <div className="crqd-banner crqd-banner-approved">✓ {t("crq_approved_ready")}</div>

              <div className="crqd-card-summary-title">{t("crq_card_summary")}</div>
              <div className="crqd-card-type-grid">
                {ALL_CARD_TYPES.map(type => {
                  const m = CARD_TYPE_COLORS[type] || CARD_TYPE_COLORS["Staff Card"];
                  const count = cardTypeCounts[type] || 0;
                  return (
                    <div key={type} className="crqd-card-type-box">
                      <div className="crqd-card-type-dot" style={{ background: m.bg, color: m.color }}><span>■</span></div>
                      <div className="crqd-card-type-label">{type}</div>
                      <div className="crqd-card-type-count" style={{ color: count > 0 ? m.color : "#9ca3af" }}>{count}</div>
                      <div className="crqd-card-type-unit">{t("crq_cards")}</div>
                    </div>
                  );
                })}
              </div>

              <div className="crqd-submitted-actions">
                <button className="crqd-btn-rollback crqd-btn-rollback-left" disabled={rollingBack} onClick={() => rollback(2, "crq_rollback_confirm_review")}>
                  {t("crq_rollback_to_review")}
                </button>
                <button className="crqd-btn-go-review" disabled={issuing} onClick={issueCards}>
                  {issuing ? t("crq_acting") : t("crq_print_cards")}
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      <div className="crqd-footer">
        <button className="crqd-back-btn" onClick={() => navigate("/idcard/requests")}>
          {t("crq_back_to_list")}
        </button>
        <div className="crqd-footer-right">
          {t("crq_step_progress").replace("{n}", displayStep).replace("{label}", steps[displayStep - 1]?.label || "")}
          <span className="crqd-footer-sep">·</span>
          {requestNo(detail)} · {detail.companies_name || "–"}
        </div>
      </div>
    </div>
  );
}
