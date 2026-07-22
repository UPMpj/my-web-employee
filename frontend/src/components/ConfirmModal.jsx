export default function ConfirmModal({ message, subMessage, confirmLabel = "ຢືນຢັນ", cancelLabel = "ຍົກເລີກ", danger = true, onConfirm, onCancel }) {
  return (
    <div className="cfm-overlay" onClick={onCancel}>
      <div className="cfm-box" onClick={e => e.stopPropagation()}>
        <div className="cfm-icon-wrap" style={{ background: danger ? "#fee2e2" : "#dbeafe" }}>
          {danger ? (
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2.5">
              <polyline points="3 6 5 6 21 6"/>
              <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
              <path d="M10 11v6M14 11v6"/>
            </svg>
          ) : (
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2.5">
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="8" x2="12" y2="12"/>
              <line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
          )}
        </div>
        <p className="cfm-msg">{message}</p>
        {subMessage && <p className="cfm-sub">{subMessage}</p>}
        <div className="cfm-btns">
          <button className="cfm-cancel" onClick={onCancel}>{cancelLabel}</button>
          <button
            className="cfm-confirm"
            style={{ background: danger ? "#dc2626" : "var(--primary)" }}
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
