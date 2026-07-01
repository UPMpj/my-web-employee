import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "../../api";
import { useLanguage } from "../../context/LanguageContext";
import toast from "react-hot-toast";
import { printCards } from "../../utils/cardPrint";
import { requestNo, fmtDate, fmtDateTime, STATUS_META, displayStatus } from "../../utils/cardRequestHelpers";
import SkeletonLoader from "../../components/SkeletonLoader";
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

const PURPOSES = {
  new:     { labelLo: "ອອກບັດໃໝ່",       subLo: "ພະນັກງານໃໝ່", labelEn: "New Card",    subEn: "New Employee",  color: "#1d4ed8", bg: "#dbeafe", dot: "#3b82f6" },
  replace: { labelLo: "ອອກຄືນ (ບັດເສຍ)", subLo: "ກຶດແທນ",      labelEn: "Replacement", subEn: "Lost/Damaged",  color: "#c2410c", bg: "#ffedd5", dot: "#f97316" },
};

function CardTypeBadge({ type }) {
  const m = CARD_TYPE_COLORS[type] || CARD_TYPE_COLORS["Staff Card"];
  return <span className="crqd-type-badge" style={{ color: m.color, background: m.bg }}>{type || "–"}</span>;
}

const IconSearch = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="11" cy="11" r="7" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
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

function buildSteps(d, t) {
  return [
    { n: 1, label: t("crq_step_review_approve"), date: d.reviewed_at || d.first_viewed_at, actor: d.reviewed_by_name || d.first_viewed_by_name, rejected: d.status === "rejected" },
    { n: 2, label: t("crq_step_create_print"),   date: d.all_issued ? d.reviewed_at : null, actor: d.all_issued ? d.reviewed_by_name : null },
    { n: 3, label: t("crq_step_complete"),        date: d.all_printed ? d.last_printed_at : null, actor: null },
  ];
}

function getCurrentStep(d) {
  if (d.status === "rejected") return 1;
  if (d.all_printed) return 3;
  if (d.all_issued || d.status === "approved") return 2;
  return 1;
}

export default function CardRequestDetail() {
  const { t } = useLanguage();
  const { id } = useParams();
  const navigate = useNavigate();

  const [detail,        setDetail]        = useState(null);
  const [loading,       setLoading]       = useState(true);
  const [note,          setNote]          = useState("");
  const [acting,        setActing]        = useState(false);
  const [downloading,   setDownloading]   = useState(false);
  const [printerModel,  setPrinterModel]  = useState("Zebra ZC300");
  const [printQuality,  setPrintQuality]  = useState("high");
  const [printWithName, setPrintWithName] = useState(true);
  const [marking,       setMarking]       = useState(false);
  const [issuing,       setIssuing]       = useState(false);
  const [viewStep,      setViewStep]      = useState(null);
  const [rollingBack,   setRollingBack]   = useState(false);
  const [purposeFilter, setPurposeFilter] = useState(null);

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

  useEffect(() => { load(); }, [id]);

  // If a previous approve succeeded but issue failed, auto-retry issue silently
  useEffect(() => {
    if (!detail || detail.status !== "approved" || detail.all_issued) return;
    api.patch(`/card-requests/${id}/issue`)
      .then(() => setDetail(prev => prev ? { ...prev, all_issued: true } : prev))
      .catch(() => {});
  }, [detail?.id, detail?.status, detail?.all_issued]);

  const approve = async () => {
    setActing(true);
    try {
      await api.patch(`/card-requests/${id}/approve`);
      setDetail(prev => prev ? { ...prev, status: "approved", reviewed_at: new Date().toISOString() } : prev);

      // immediately issue cards so we skip the summary screen
      await api.patch(`/card-requests/${id}/issue`);
      setDetail(prev => prev ? { ...prev, all_issued: true } : prev);
      toast.success("ອະນຸມັດ ແລະ ສ້າງບັດສຳເລັດ");
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
      await api.patch(`/card-requests/${id}/issue`);
      setDetail(prev => prev ? { ...prev, all_issued: true } : prev);

      const employees = detail?.employees_json || [];
      const results = await Promise.all(
        employees.map(e => api.get(`/idcard/${e.employee_id}`).then(r => r.data).catch(() => null))
      );
      const valid = results.filter(Boolean);
      if (valid.length > 0) printCards(valid);

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
      if (targetStep === 2) {
        setDetail(prev => prev ? { ...prev, status: "pending", reviewed_at: null, reviewed_by_name: null, all_issued: false, all_printed: false } : prev);
      } else if (targetStep === 3) {
        setDetail(prev => prev ? { ...prev, all_issued: false, all_printed: false } : prev);
      } else if (targetStep === 4) {
        setDetail(prev => prev ? { ...prev, all_printed: false } : prev);
      }
      toast.success("ຍ້ອນກັບສຳເລັດ");
      load();
    } catch (err) {
      toast.error(err?.response?.data?.message || "ຍ້ອນກັບບໍ່ສຳເລັດ");
    }
    setRollingBack(false);
  };

  if (loading) {
    return <div className="idc-page"><SkeletonLoader variant="detail" /></div>;
  }
  if (!detail) {
    return <div className="idc-page"><div className="crqd-loading">{t("no_data")}</div></div>;
  }

  const ds         = displayStatus(detail);
  const sm          = STATUS_META[ds] || STATUS_META.pending;
  const steps       = buildSteps(detail, t);
  const curStep     = getCurrentStep(detail);
  const activeStep  = viewStep !== null ? viewStep : curStep;
  const employees   = detail.employees_json || [];
  const cardTypeCounts = employees.reduce((acc, e) => {
    const type = e.cardType || "Staff Card";
    acc[type] = (acc[type] || 0) + 1;
    return acc;
  }, {});
  const purposeCounts = employees.reduce((acc, e) => {
    const p = e.cardPurpose || "new";
    acc[p] = (acc[p] || 0) + 1;
    return acc;
  }, {});
  const hasMixedPurposes = Object.keys(purposeCounts).length > 1;
  const displayEmployees = purposeFilter
    ? employees.filter(e => (e.cardPurpose || "new") === purposeFilter)
    : employees;

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

      {/* ── 3-step stepper ── */}
      <div className="crqd-stepper">
        {steps.map((step, i) => {
          const isRejected  = !!step.rejected;
          const isDone      = !isRejected && step.n < curStep;
          const isActive    = isRejected ? true : step.n === curStep;
          const isOff       = !isRejected && step.n > curStep;
          const isViewing   = viewStep === step.n;
          const isClickable = isDone || isActive;
          return (
            <div key={step.n} className="crqd-step-wrap">
              <div
                className={[
                  "crqd-step",
                  (isDone || isActive) && !isOff ? "crqd-step-active" : "",
                  isRejected ? "crqd-step-rejected" : "",
                  isDone ? "crqd-step-done" : "",
                  isClickable ? "crqd-step-clickable" : "",
                  isViewing ? "crqd-step-viewing" : "",
                ].filter(Boolean).join(" ")}
                onClick={() => isClickable && setViewStep(viewStep === step.n ? null : step.n)}
              >
                <div className="crqd-step-circle">
                  {isDone ? (
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
              {i < steps.length - 1 && <div className={`crqd-step-line${step.n < curStep ? " crqd-step-line-on" : ""}`} />}
            </div>
          );
        })}
      </div>

      <div className="crqd-body">
        {/* ── Summary sidebar ── */}
        <div className="crqd-summary">
          <div className="crqd-summary-hdr">
            <span>{t("crq_summary_title")}</span>
            <span className="crq-status-badge" style={{ background: sm.bg, color: sm.color }}>
              {steps[curStep - 1]?.label || (t(`crq_${ds}`) || ds)}
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

          <div className="crqd-purpose-section">
            <div className="crqd-purpose-hdr">
              <span>{t("lang") === "lo" ? "ແຕ່ດ / ຈຸດປະສຳ" : "Card / Purpose"}</span>
              {hasMixedPurposes && (
                <span className="crqd-purpose-hint">{t("lang") === "lo" ? "ກົດເລືອກ" : "Click to filter"}</span>
              )}
            </div>
            {Object.entries(purposeCounts).map(([p, count]) => {
              const meta = PURPOSES[p] || PURPOSES.new;
              const lang = t("lang");
              const isActive = purposeFilter === p;
              return (
                <button
                  key={p}
                  className={`crqd-purpose-chip${isActive ? " crqd-purpose-chip-active" : ""}${!hasMixedPurposes ? " crqd-purpose-chip-solo" : ""}`}
                  style={{ borderColor: isActive ? meta.color : "#e5e7eb", background: isActive ? meta.bg : "#f9fafb" }}
                  onClick={() => hasMixedPurposes && setPurposeFilter(isActive ? null : p)}
                >
                  <span className="crqd-purpose-dot" style={{ background: meta.dot }} />
                  <div className="crqd-purpose-text">
                    <div className="crqd-purpose-label" style={{ color: isActive ? meta.color : "#374151" }}>
                      {lang === "lo" ? meta.labelLo : meta.labelEn}
                    </div>
                    <div className="crqd-purpose-sub">{lang === "lo" ? meta.subLo : meta.subEn}</div>
                  </div>
                  <span className="crqd-purpose-count" style={{ background: meta.bg, color: meta.color }}>{count}</span>
                </button>
              );
            })}
          </div>

          <div className="crqd-progress-bar">
            <div className="crqd-progress-fill" style={{ width: `${(curStep / 3) * 100}%` }} />
          </div>
          <div className="crqd-progress-text">
            {t("crq_step_progress").replace("{n}", curStep).replace("{label}", steps[curStep - 1]?.label || "")}
          </div>
        </div>

        {/* ── Main content ── */}
        <div className="crqd-main">

          {/* Banner shown when user is viewing a past step */}
          {viewStep !== null && viewStep < curStep && (
            <div className="crqd-viewing-banner">
              <span>ກຳລັງເບິ່ງຂັ້ນຕອນ {viewStep} — </span>
              <button className="crqd-viewing-back" onClick={() => setViewStep(null)}>
                ກັບຄືນຂັ້ນຕອນປັດຈຸບັນ →
              </button>
            </div>
          )}

          {activeStep === 3 ? (
            /* ── Step 3: Complete ── */
            <>
              <div className="crqd-step-hdr">
                <div className="crqd-step-hdr-icon" style={{ background: "#dcfce7", color: "#16a34a" }}>
                  <IconCheck />
                </div>
                <div>
                  <div className="crqd-step-hdr-eyebrow">{t("crq_step_n_of_3").replace("{n}", 3)}</div>
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

          ) : activeStep === 2 && !detail.all_issued ? (
            /* ── Step 2: Approved but issue pending — auto-retrying ── */
            <div className="crqd-loading">{t("crq_acting")}</div>

          ) : activeStep === 2 ? (
            /* ── Step 2: Cards issued — ready to print / reprint ── */
            <>
              <div className="crqd-step-hdr">
                <div className="crqd-step-hdr-icon" style={{ background: "#dbeafe", color: "#1d4ed8" }}>
                  <IconPrinter />
                </div>
                <div>
                  <div className="crqd-step-hdr-eyebrow">{t("crq_step_n_of_3").replace("{n}", 2)}</div>
                  <div className="crqd-step-hdr-title">{t("crq_heading_create_print")}</div>
                </div>
              </div>

              <div className="crqd-banner crqd-banner-approved">
                ✓ {t("crq_issued_banner")}
              </div>

              <div className="crqd-issued-layout">
                <div className="crqd-issued-left">
                  <div className="crqd-issued-bar">
                    <span className="crqd-issued-bar-title">{t("crq_issued_title")}</span>
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
                    {curStep === 2 && (
                      <button className="crqd-btn-rollback" disabled={rollingBack} onClick={() => rollback(3, "crq_rollback_confirm_approved")}>
                        {t("crq_rollback_to_approved")}
                      </button>
                    )}
                  </div>
                </div>
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
                  <div className="crqd-step-hdr-eyebrow">{t("crq_step_n_of_3").replace("{n}", 1)}</div>
                  <div className="crqd-step-hdr-title">{t("crq_rejected") || "ປະຕິເສດ"}</div>
                </div>
              </div>

              <div className="crqd-banner crqd-banner-rejected">{t("crq_rejected_banner")}</div>
              {detail.reject_reason && <div className="crqd-reject-display">{detail.reject_reason}</div>}

              <div className="crqd-emp-title-row">
                <span className="crqd-emp-title">{t("crq_employee_list")} ({displayEmployees.length}{purposeFilter && employees.length !== displayEmployees.length ? `/${employees.length}` : ""})</span>
                {purposeFilter && PURPOSES[purposeFilter] && (
                  <button
                    className="crqd-filter-chip"
                    style={{ color: PURPOSES[purposeFilter].color, background: PURPOSES[purposeFilter].bg }}
                    onClick={() => setPurposeFilter(null)}
                  >
                    {t("lang") === "lo" ? "ກຳດ / ຈຸດປະສົງ" : "Card / Purpose"}: {t("lang") === "lo" ? PURPOSES[purposeFilter].labelLo : PURPOSES[purposeFilter].labelEn} ×
                  </button>
                )}
              </div>
              <div className="crqd-emp-table-wrap">
                <table className="crqd-emp-table">
                  <thead>
                    <tr>
                      <th>#</th><th>{t("employee_code")}</th><th>{t("name")}</th>
                      <th>{t("position")}</th><th>{t("crq_card_type")}</th>
                      <th>{t("lang") === "lo" ? "ສະຖານະ" : "Status"}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayEmployees.map((e) => {
                      const origIdx = employees.indexOf(e) + 1;
                      const purpose = e.cardPurpose || "new";
                      const pmeta = PURPOSES[purpose] || PURPOSES.new;
                      const lang = t("lang");
                      return (
                        <tr key={e.employee_id}>
                          <td>{origIdx}</td>
                          <td>{e.employee_code || "–"}</td>
                          <td className="crqd-emp-name">{e.firstname} {e.lastname}</td>
                          <td>{e.position || "–"}</td>
                          <td><CardTypeBadge type={e.cardType} /></td>
                          <td>
                            <span className="crqd-purpose-status-badge" style={{ color: pmeta.dot }}>
                              <span className="crqd-purpose-dot-sm" style={{ background: pmeta.dot }} />
                              {lang === "lo" ? pmeta.labelLo : pmeta.labelEn}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>

          ) : (
            /* ── Step 1: Review & Approve (pending) OR view-only if already done ── */
            <>
              <div className="crqd-step-hdr">
                <div className="crqd-step-hdr-icon" style={{ background: "#fef3c7", color: "#92400e" }}>
                  <IconSearch />
                </div>
                <div>
                  <div className="crqd-step-hdr-eyebrow">{t("crq_step_n_of_3").replace("{n}", 1)}</div>
                  <div className="crqd-step-hdr-title">{t("crq_heading_review_approve")}</div>
                </div>
              </div>

              {curStep === 1 ? (
                <div className="crqd-warning-banner">
                  <IconWarning />
                  <span>{t("crq_pending_banner").replace("{name}", detail.requested_by_name || "")}</span>
                </div>
              ) : (
                <div className="crqd-banner crqd-banner-approved">
                  ✓ {detail.reviewed_by_name || ""} {t("crq_approved")} · {fmtDateTime(detail.reviewed_at)}
                </div>
              )}

              <div className="crqd-emp-title-row">
                <span className="crqd-emp-title">{t("crq_employee_list")} ({displayEmployees.length}{purposeFilter && employees.length !== displayEmployees.length ? `/${employees.length}` : ""})</span>
                {purposeFilter && PURPOSES[purposeFilter] && (
                  <button
                    className="crqd-filter-chip"
                    style={{ color: PURPOSES[purposeFilter].color, background: PURPOSES[purposeFilter].bg }}
                    onClick={() => setPurposeFilter(null)}
                  >
                    {t("lang") === "lo" ? "ກຳດ / ຈຸດປະສົງ" : "Card / Purpose"}: {t("lang") === "lo" ? PURPOSES[purposeFilter].labelLo : PURPOSES[purposeFilter].labelEn} ×
                  </button>
                )}
              </div>
              <div className="crqd-emp-table-wrap">
                <table className="crqd-emp-table">
                  <thead>
                    <tr>
                      <th>#</th><th>{t("employee_code")}</th><th>{t("name")}</th>
                      <th>{t("position")}</th><th>{t("crq_card_type")}</th>
                      <th>{t("lang") === "lo" ? "ສະຖານະ" : "Status"}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayEmployees.map((e) => {
                      const origIdx = employees.indexOf(e) + 1;
                      const purpose = e.cardPurpose || "new";
                      const pmeta = PURPOSES[purpose] || PURPOSES.new;
                      const lang = t("lang");
                      return (
                        <tr key={e.employee_id}>
                          <td>{origIdx}</td>
                          <td>{e.employee_code || "–"}</td>
                          <td className="crqd-emp-name">{e.firstname} {e.lastname}</td>
                          <td>{e.position || "–"}</td>
                          <td><CardTypeBadge type={e.cardType} /></td>
                          <td>
                            <span className="crqd-purpose-status-badge" style={{ color: pmeta.dot }}>
                              <span className="crqd-purpose-dot-sm" style={{ background: pmeta.dot }} />
                              {lang === "lo" ? pmeta.labelLo : pmeta.labelEn}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {curStep === 1 && (
                <>
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
              )}
            </>
          )}
        </div>
      </div>

      <div className="crqd-footer">
        <button className="crqd-back-btn" onClick={() => navigate("/idcard/requests")}>
          {t("crq_back_to_list")}
        </button>
        <div className="crqd-footer-right">
          {t("crq_step_progress").replace("{n}", curStep).replace("{label}", steps[curStep - 1]?.label || "")}
          <span className="crqd-footer-sep">·</span>
          {requestNo(detail)} · {detail.companies_name || "–"}
        </div>
      </div>
    </div>
  );
}
