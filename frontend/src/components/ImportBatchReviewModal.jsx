import { useEffect, useState } from "react";
import { api, photoUrl } from "../api";
import toast from "react-hot-toast";
import "./ImportBatchReviewModal.css";

const PAGE_SIZE = 50;

export default function ImportBatchReviewModal({ batchId, onClose, onApproved, onRejected }) {
  const [batch,         setBatch]         = useState(null);
  const [loading,       setLoading]       = useState(true);
  const [acting,        setActing]        = useState(false);
  const [rejectMode,    setRejectMode]    = useState(false);
  const [rejectText,    setRejectText]    = useState("");
  const [page,          setPage]          = useState(1);

  useEffect(() => {
    setLoading(true);
    api.get(`/import/batches/${batchId}`)
      .then(r => setBatch(r.data))
      .catch(() => toast.error("Failed to load batch data"))
      .finally(() => setLoading(false));
  }, [batchId]);

  const rows      = batch?.rows_json || [];
  const validRows = rows.filter(r => !r.error);
  const errRows   = rows.filter(r => r.error);
  const totalPages = Math.ceil(validRows.length / PAGE_SIZE);
  const pageRows   = validRows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleApprove = async () => {
    setActing(true);
    try {
      const r = await api.post(`/import/batches/${batchId}/approve`);
      toast.success(`Approved — imported ${r.data.inserted} employees`);
      onApproved?.();
      onClose();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Approval failed");
    }
    setActing(false);
  };

  const handleReject = async () => {
    setActing(true);
    try {
      await api.post(`/import/batches/${batchId}/reject`, { reason: rejectText });
      toast.success("Import rejected");
      onRejected?.();
      onClose();
    } catch {
      toast.error("An error occurred");
    }
    setActing(false);
  };

  return (
    <div className="ibr-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="ibr-modal">
        {/* Header */}
        <div className="ibr-header">
          <div className="ibr-header-left">
            <div className="ibr-icon">🔍</div>
            <div>
              <div className="ibr-title">Review Import Data</div>
              {batch && (
                <div className="ibr-sub">
                  {batch.companies_name} · Submitted by {batch.submitted_by_name}
                </div>
              )}
            </div>
          </div>
          <button className="ibr-close" onClick={onClose}>✕</button>
        </div>

        {loading ? (
          <div className="ibr-loading">Loading...</div>
        ) : (
          <>
            {/* Stats */}
            <div className="ibr-stats">
              <div className="ibr-stat ibr-stat-ok">
                <div className="ibr-stat-val">{validRows.length}</div>
                <div className="ibr-stat-lbl">To import</div>
              </div>
              <div className="ibr-stat ibr-stat-err">
                <div className="ibr-stat-val">{errRows.length}</div>
                <div className="ibr-stat-lbl">To skip (errors)</div>
              </div>
              <div className="ibr-stat ibr-stat-blue">
                <div className="ibr-stat-val">{validRows.filter(r => r.dorm_building).length}</div>
                <div className="ibr-stat-lbl">With room</div>
              </div>
              <div className="ibr-stat ibr-stat-purple">
                <div className="ibr-stat-val">{validRows.filter(r => r.doc_type || r.permit_type).length}</div>
                <div className="ibr-stat-lbl">With documents</div>
              </div>
              <div className="ibr-stat ibr-stat-orange">
                <div className="ibr-stat-val">{validRows.filter(r => photoUrl(r.photo)).length}</div>
                <div className="ibr-stat-lbl">With photo</div>
              </div>
            </div>

            {/* Table */}
            <div className="ibr-table-wrap">
              <table className="ibr-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Code</th>
                    <th>Full Name</th>
                    <th>Position</th>
                    <th>Type</th>
                    <th>Status</th>
                    <th>Hire Date</th>
                    <th>Address</th>
                    <th>Room</th>
                    <th>Office</th>
                    <th>Photo</th>
                    <th>Documents</th>
                    <th>Permits</th>
                  </tr>
                </thead>
                <tbody>
                  {pageRows.map(r => (
                    <tr key={r.row}>
                      <td>{r.row}</td>
                      <td>{r.employee_code || "–"}</td>
                      <td className="ibr-bold">{r.firstname} {r.lastname}</td>
                      <td>{r.position || "–"}</td>
                      <td>{r.employee_type || "–"}</td>
                      <td>{r.status || "Active"}</td>
                      <td>{r.hired_at || "–"}</td>
                      <td>{r.province ? `${r.province}${r.district ? ", " + r.district : ""}` : "–"}</td>
                      <td>
                        {r.dorm_building
                          ? <span className="ibr-chip ibr-chip-room">{r.dorm_building}/{r.dorm_floor}/{r.dorm_room}</span>
                          : "–"}
                      </td>
                      <td>{r.office_building || "–"}</td>
                      <td>
                        {photoUrl(r.photo)
                          ? <img
                              src={photoUrl(r.photo)}
                              alt=""
                              className="ibr-photo"
                              onError={e => {
                                e.currentTarget.style.display = "none";
                                const next = e.currentTarget.nextElementSibling;
                                if (next) next.style.display = "inline";
                              }}
                            />
                          : null}
                        <span
                          className="ibr-no-photo"
                          style={{ display: photoUrl(r.photo) ? "none" : "inline" }}
                        >
                          👤
                        </span>
                      </td>
                      <td>
                        {r.doc_type ? <span className="ibr-chip ibr-chip-doc">{r.doc_type}</span> : "–"}
                      </td>
                      <td>
                        {r.permit_type ? <span className="ibr-chip ibr-chip-permit">{r.permit_type}</span> : "–"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="ibr-pagination">
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>‹</button>
                <span>Page {page} / {totalPages}</span>
                <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>›</button>
              </div>
            )}

            {/* Error rows warning */}
            {errRows.length > 0 && (
              <div className="ibr-warn">
                ⚠ {errRows.length} row(s) have errors — they will be skipped automatically
              </div>
            )}

            {/* Actions */}
            <div className="ibr-actions">
              {rejectMode ? (
                <div className="ibr-reject-box">
                  <input
                    className="ibr-reject-input"
                    placeholder="Reason for rejection (optional)"
                    value={rejectText}
                    onChange={e => setRejectText(e.target.value)}
                    autoFocus
                  />
                  <div className="ibr-reject-btns">
                    <button className="ibr-btn-confirm-reject" onClick={handleReject} disabled={acting}>
                      {acting ? "Processing..." : "✕ Confirm Reject"}
                    </button>
                    <button className="ibr-btn-cancel" onClick={() => { setRejectMode(false); setRejectText(""); }} disabled={acting}>
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <button className="ibr-btn-reject" onClick={() => setRejectMode(true)} disabled={acting}>
                    ✕ Reject
                  </button>
                  <button className="ibr-btn-approve" onClick={handleApprove} disabled={acting || validRows.length === 0}>
                    {acting ? "Importing..." : `✓ Approve & Import ${validRows.length} employees`}
                  </button>
                </>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
