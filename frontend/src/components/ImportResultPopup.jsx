import { useEffect } from "react";
import "./ImportResultPopup.css";

export default function ImportResultPopup({ notif, onClose }) {
  if (!notif) return null;

  const msg = notif.message || "";
  const isApproved = msg.startsWith("APPROVED|");
  const isRejected = msg.startsWith("REJECTED|");

  let company = "", inserted = 0, skipped = 0, reason = "";
  if (isApproved) {
    const parts = msg.split("|");
    company  = parts[1] || "";
    inserted = parseInt(parts[2]) || 0;
    skipped  = parseInt(parts[3]) || 0;
  } else if (isRejected) {
    const parts = msg.split("|");
    reason   = parts[1] || "ຂໍ້ມູນບໍ່ຖືກຕ້ອງ";
    inserted = parseInt(parts[2]) || 0;
  } else {
    /* legacy plain-text messages */
    company = "";
  }

  useEffect(() => {
    const handler = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <div className="irp-overlay" onClick={onClose}>
      <div className="irp-modal" onClick={e => e.stopPropagation()}>

        {isApproved ? (
          <>
            {/* Success icon */}
            <div className="irp-icon irp-icon-success">
              <svg width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            </div>

            <div className="irp-tag irp-tag-success">ອະນຸມັດສຳເລັດ</div>
            <h2 className="irp-title">Import ຂໍ້ມູນສຳເລັດ!</h2>
            {company && <p className="irp-company">{company}</p>}

            <div className="irp-stats">
              <div className="irp-stat irp-stat-green">
                <span className="irp-stat-num">{inserted}</span>
                <span className="irp-stat-label">ຄົນ ນຳເຂົ້າສຳເລັດ</span>
              </div>
              {skipped > 0 && (
                <div className="irp-stat irp-stat-orange">
                  <span className="irp-stat-num">{skipped}</span>
                  <span className="irp-stat-label">ແຖວ ຂ້າມ</span>
                </div>
              )}
            </div>

            <p className="irp-desc">
              Super Admin ໄດ້ອະນຸມັດ ແລະ ນຳເຂົ້າຂໍ້ມູນພະນັກງານໃນລະບົບແລ້ວ
            </p>
            <button className="irp-btn irp-btn-success" onClick={onClose}>
              ✓ ຮັບຊາບ
            </button>
          </>
        ) : isRejected ? (
          <>
            {/* Reject icon */}
            <div className="irp-icon irp-icon-reject">
              <svg width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round">
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </div>

            <div className="irp-tag irp-tag-reject">ຖືກປະຕິເສດ</div>
            <h2 className="irp-title">Import ຂໍ້ມູນຖືກປະຕິເສດ</h2>

            <div className="irp-reason-box">
              <span className="irp-reason-label">ເຫດຜົນ:</span>
              <span className="irp-reason-text">{reason}</span>
            </div>

            <p className="irp-desc">
              ກະລຸນາກວດສອບຂໍ້ມູນ ແລ້ວ Import ໃໝ່ອີກຄັ້ງ
            </p>
            <button className="irp-btn irp-btn-reject" onClick={onClose}>
              ຮັບຊາບ
            </button>
          </>
        ) : (
          /* legacy fallback */
          <>
            <div className="irp-icon irp-icon-success">
              <svg width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
            </div>
            <h2 className="irp-title">{msg}</h2>
            <button className="irp-btn irp-btn-success" onClick={onClose}>ຮັບຊາບ</button>
          </>
        )}
      </div>
    </div>
  );
}
