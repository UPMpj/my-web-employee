import { useMemo, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { api } from "../../api";
import { useCurrentUser } from "../../hooks/useCurrentUser";
import toast from "react-hot-toast";
import "./preview-request.css";
import { useLanguage } from "../../context/LanguageContext";

const MANAGER_RE = /\b(manager|director|head|chief|president|ceo|lead|vp|vice|executive|officer)\b/i;

function getAutoCardType(position = "") {
  if (MANAGER_RE.test(position))       return "Manager Card";
  if (/supervisor/i.test(position))    return "Supervisor Card";
  if (/contractor|contract/i.test(position)) return "Contractor Card";
  if (/shop|vendor|vender/i.test(position))  return "Shop Card";
  if (/visitor/i.test(position))       return "Visitor Card";
  return "Staff Card";
}

const CARD_TYPE_META = {
  "Manager Card":    { color: "#5b21b6", bg: "#ede9fe", border: "#c4b5fd", icon: "M" },
  "Supervisor Card": { color: "#0a6e5a", bg: "#d1fae5", border: "#6ee7b7", icon: "S" },
  "Staff Card":      { color: "#1a3a6b", bg: "#dbeafe", border: "#93c5fd", icon: "ST" },
  "Contractor Card": { color: "#b45309", bg: "#fef3c7", border: "#fcd34d", icon: "C" },
  "Shop Card":       { color: "#9f1239", bg: "#ffe4e6", border: "#fca5a5", icon: "SH" },
  "Visitor Card":    { color: "#374151", bg: "#f3f4f6", border: "#d1d5db", icon: "V" },
};

const ALL_CARD_TYPES = [
  "Manager Card",
  "Supervisor Card",
  "Staff Card",
  "Contractor Card",
  "Shop Card",
  "Visitor Card",
];

function CardTypeIcon({ type }) {
  const m = CARD_TYPE_META[type] || CARD_TYPE_META["Staff Card"];
  return (
    <div className="prv-type-icon" style={{ background: m.color }}>
      <svg viewBox="0 0 24 24" fill="none" width="18" height="18">
        <rect x="3" y="4" width="18" height="16" rx="2" fill="white" opacity=".2"/>
        <circle cx="12" cy="10" r="3" fill="white" opacity=".85"/>
        <path d="M6 20c0-3.3 2.7-6 6-6s6 2.7 6 6" stroke="white" strokeWidth="1.5" opacity=".85"/>
      </svg>
    </div>
  );
}

function CardTypeBadge({ type }) {
  const m = CARD_TYPE_META[type] || CARD_TYPE_META["Staff Card"];
  return (
    <span
      className="prv-card-badge"
      style={{ color: m.color, background: m.bg, borderColor: m.border }}
    >
      {type}
    </span>
  );
}

export default function PreviewRequest() {
  const navigate   = useNavigate();
  const { state }  = useLocation();
  const employees  = state?.employees || [];
  const { fullname } = useCurrentUser();

  const { t } = useLanguage();
  const [submitting, setSubmitting] = useState(false);

  const empWithType = useMemo(() =>
    employees.map(e => ({ ...e, cardType: getAutoCardType(e.position) })),
    [employees]
  );

  const summary = useMemo(() => {
    const counts = {};
    ALL_CARD_TYPES.forEach(t => { counts[t] = 0; });
    empWithType.forEach(e => {
      if (counts[e.cardType] !== undefined) counts[e.cardType]++;
    });
    return counts;
  }, [empWithType]);

  if (employees.length === 0) {
    return (
      <div className="prv-page">
        <div className="prv-empty">
          <p>ບໍ່ມີຂໍ້ມູນພະນັກງານ — ກະລຸນາກັບໄປເລືອກພະນັກງານກ່ອນ</p>
          <button className="prv-back-btn" onClick={() => navigate("/idcard/request")}>
            ← Back to Selection
          </button>
        </div>
      </div>
    );
  }

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const companyId = employees[0]?.company_id || null;
      const res = await api.post("/card-requests", {
        company_id: companyId,
        employees: empWithType.map(e => ({
          employee_id:   e.employee_id,
          employee_code: e.employee_code,
          firstname:     e.firstname,
          lastname:      e.lastname,
          position:      e.position,
          cardType:      e.cardType,
        })),
      });

      const batch       = res.data.batch;
      const year         = new Date(batch.created_at).getFullYear();
      const requestNo    = `CR-${year}-${String(batch.batch_id).padStart(5, "0")}`;

      navigate("/idcard/request/success", {
        state: {
          requestNo,
          totalEmps:   empWithType.length,
          submittedBy: fullname || "Company Admin",
          submittedAt: batch.created_at,
        },
      });
    } catch (err) {
      toast.error(err?.response?.data?.message || "ບໍ່ສາມາດສົ່ງຄຳຂໍໄດ້");
    }
    setSubmitting(false);
  };

  return (
    <div className="prv-page">
      {/* Header */}
      <div className="prv-header">
        <h1 className="prv-title">Preview Request</h1>
        <p className="prv-sub">Please review the selected employees and the card that will be generate</p>
      </div>

      {/* Body: two columns */}
      <div className="prv-body">

        {/* ── Left: Selected Employees table ── */}
        <div className="prv-left">
          <div className="prv-section-title">1. Selected Employees</div>
          <div className="prv-table-wrap">
            <table className="prv-table">
              <thead>
                <tr>
                  <th>No.</th>
                  <th>Employee Code</th>
                  <th>Name</th>
                  <th>Position</th>
                  <th>Card Type (Auto)</th>
                </tr>
              </thead>
              <tbody>
                {empWithType.map((emp, i) => (
                  <tr key={emp.employee_id}>
                    <td className="prv-td-no">{i + 1}</td>
                    <td className="prv-td-code">{emp.employee_code || "–"}</td>
                    <td className="prv-td-name">{emp.firstname} {emp.lastname}</td>
                    <td>{emp.position || "–"}</td>
                    <td><CardTypeBadge type={emp.cardType} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="prv-auto-note">
            <svg viewBox="0 0 24 24" fill="none" width="15" height="15">
              <circle cx="12" cy="8" r="4" stroke="#2f4aad" strokeWidth="1.8"/>
              <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" stroke="#2f4aad" strokeWidth="1.8" strokeLinecap="round"/>
            </svg>
            Card types are automatically determined from position and role.
          </div>
        </div>

        {/* ── Right: Card Type Summary ── */}
        <div className="prv-right">
          <div className="prv-section-title">
            2. Card Type Summary
            <span className="prv-auto-tag">Auto Generate</span>
          </div>
          <div className="prv-summary-list">
            {ALL_CARD_TYPES.map(type => (
              <div key={type} className="prv-summary-row">
                <CardTypeIcon type={type} />
                <span className="prv-summary-name">{type}</span>
                <span
                  className="prv-summary-count"
                  style={{ color: summary[type] > 0 ? "#1a1a2e" : "#9ca3af" }}
                >
                  {summary[type]}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="prv-footer">
        <button
          className="prv-back-btn"
          onClick={() => navigate("/idcard/request", { state: { restoreIds: employees.map(e => e.employee_id) } })}
        >
          <svg viewBox="0 0 24 24" fill="none" width="16" height="16" style={{ marginRight: 6 }}>
            <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
          Back
        </button>

        <button
          className="prv-submit-btn"
          disabled={submitting}
          onClick={handleSubmit}
        >
          {submitting ? t("sending") : "Next: Submit Request"}
          {!submitting && (
            <svg viewBox="0 0 24 24" fill="none" width="16" height="16" style={{ marginLeft: 8 }}>
              <path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          )}
        </button>
      </div>
    </div>
  );
}
