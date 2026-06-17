import { useLocation, useNavigate } from "react-router-dom";
import "./request-success.css";

const fmt = (d) =>
  new Date(d).toLocaleString("en-GB", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  }).replace(",", "");

export default function RequestSuccess() {
  const navigate = useNavigate();
  const { state } = useLocation();

  const requestNo    = state?.requestNo    || "–";
  const totalEmps    = state?.totalEmps    || 0;
  const submittedBy  = state?.submittedBy  || "Company Admin";
  const submittedAt  = state?.submittedAt  || new Date().toISOString();

  return (
    <div className="rs-page">
      <div className="rs-card">

        {/* Success icon */}
        <div className="rs-icon-wrap">
          <div className="rs-icon-circle">
            <svg viewBox="0 0 24 24" fill="none" width="32" height="32">
              <rect x="4" y="2" width="16" height="20" rx="2" fill="#059669" opacity=".15"/>
              <rect x="4" y="2" width="16" height="20" rx="2" stroke="#059669" strokeWidth="1.6" fill="none"/>
              <line x1="8" y1="8"  x2="16" y2="8"  stroke="#059669" strokeWidth="1.5"/>
              <line x1="8" y1="12" x2="16" y2="12" stroke="#059669" strokeWidth="1.5"/>
              <line x1="8" y1="16" x2="12" y2="16" stroke="#059669" strokeWidth="1.5"/>
            </svg>
          </div>
          <div className="rs-check-badge">
            <svg viewBox="0 0 24 24" fill="none" width="14" height="14">
              <circle cx="12" cy="12" r="10" fill="#059669"/>
              <polyline points="7 12 10 15 17 8" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
        </div>

        {/* Title */}
        <h1 className="rs-title">Request Submitted Successfully!</h1>
        <p className="rs-sub">Your ID Card request has been submitted to System Admin for approval.</p>

        {/* Details table */}
        <div className="rs-details">
          <div className="rs-detail-row">
            <span className="rs-detail-label">Request No.</span>
            <span className="rs-detail-value rs-request-no">{requestNo}</span>
          </div>
          <div className="rs-detail-row">
            <span className="rs-detail-label">Total Employees</span>
            <span className="rs-detail-value">{totalEmps}</span>
          </div>
          <div className="rs-detail-row">
            <span className="rs-detail-label">Submitted By</span>
            <span className="rs-detail-value">{submittedBy}</span>
          </div>
          <div className="rs-detail-row">
            <span className="rs-detail-label">Submitted Date</span>
            <span className="rs-detail-value">{fmt(submittedAt)}</span>
          </div>
          <div className="rs-detail-row">
            <span className="rs-detail-label">Status</span>
            <span className="rs-status-badge">Pending Approval</span>
          </div>
        </div>

        {/* Info note */}
        <div className="rs-note">
          <svg viewBox="0 0 24 24" fill="none" width="16" height="16" style={{ flexShrink: 0 }}>
            <circle cx="12" cy="12" r="10" fill="#2f4aad" opacity=".12"/>
            <circle cx="12" cy="12" r="10" stroke="#2f4aad" strokeWidth="1.5" fill="none"/>
            <line x1="12" y1="10" x2="12" y2="16" stroke="#2f4aad" strokeWidth="2" strokeLinecap="round"/>
            <circle cx="12" cy="7.5" r="1" fill="#2f4aad"/>
          </svg>
          You can track the status of your request in the ID Card Requests list.
        </div>

        {/* Button */}
        <button className="rs-btn" onClick={() => navigate("/idcard")}>
          <svg viewBox="0 0 24 24" fill="none" width="18" height="18" style={{ marginRight: 8 }}>
            <rect x="3" y="3" width="18" height="18" rx="3" stroke="#fff" strokeWidth="1.8" fill="none"/>
            <line x1="7" y1="8"  x2="17" y2="8"  stroke="#fff" strokeWidth="1.5"/>
            <line x1="7" y1="12" x2="17" y2="12" stroke="#fff" strokeWidth="1.5"/>
            <line x1="7" y1="16" x2="13" y2="16" stroke="#fff" strokeWidth="1.5"/>
          </svg>
          Go to ID Card Requests
        </button>
      </div>
    </div>
  );
}
