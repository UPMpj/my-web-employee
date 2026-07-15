import "./PendingRequestBanner.css";

const TYPE_LABEL = {
  bulk_delete: (n) => `ລຶບ ${n} ຄົນ`,
  delete: () => "ລຶບ",
  update: () => "ແກ້ໄຂ",
};

export default function PendingRequestBanner({ item, queueCount, onClose, onReview }) {
  if (!item) return null;

  const isImport = item.kind === "import";
  const d = item.data;

  const entityName = isImport ? (d.companies_name || "–") : (d.entity_name || "–");

  const bulkCount = !isImport && d.request_type === "bulk_delete"
    ? (d.old_data?.ids?.length || d.old_data?.employees?.length || 0)
    : 0;

  const typeLabel = isImport
    ? `Import ${d.valid_rows ?? "?"} ຄົນ`
    : (TYPE_LABEL[d.request_type]?.(bulkCount) || "ແກ້ໄຂ");

  const requesterName = isImport ? d.submitted_by_name : (d.requester_name || d.requested_by_name);

  return (
    <div className="prb-bar">
      <span className="prb-icon">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
          <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
        </svg>
      </span>

      <span className="prb-text">
        <b>{isImport ? "Import ໃໝ່" : "ຄຳຂໍໃໝ່"}:</b> {entityName}
        <span className="prb-type-badge">{typeLabel}</span>
        {requesterName && <span className="prb-by">ໂດຍ {requesterName}</span>}
        {queueCount > 0 && <span className="prb-more">+{queueCount} ຄຳຂໍອື່ນ</span>}
      </span>

      <span className="prb-actions">
        <button className="prb-btn prb-btn-review" onClick={onReview}>ກວດສອບດຽວນີ້</button>
        <button className="prb-btn prb-btn-close" onClick={onClose} aria-label="ປິດ">✕</button>
      </span>
    </div>
  );
}
