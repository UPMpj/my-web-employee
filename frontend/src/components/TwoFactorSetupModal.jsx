import { useState, useEffect, useRef } from "react";
import { QRCodeSVG } from "qrcode.react";
import toast from "react-hot-toast";
import { api } from "../api";
import "./TwoFactorSetupModal.css";

export default function TwoFactorSetupModal({ onClose, onEnabled }) {
  const [qrData, setQrData]   = useState(null);
  const [code, setCode]       = useState("");
  const [loading, setLoading] = useState(false);
  const [backupCodes, setBackupCodes] = useState(null);
  const started = useRef(false); // guards against React StrictMode's double-invoked effect in dev

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    api.post("/2fa/setup").then(r => setQrData(r.data)).catch(() => {
      toast.error("ບໍ່ສາມາດສ້າງ QR code ໄດ້");
      onClose();
    });
  }, []);

  const confirm = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.post("/2fa/confirm", { code });
      setBackupCodes(res.data.backupCodes);
      onEnabled?.();
    } catch (err) {
      toast.error(err?.response?.data?.message || "ລະຫັດບໍ່ຖືກຕ້ອງ");
    }
    setLoading(false);
  };

  return (
    <div className="tfa-overlay" onClick={backupCodes ? undefined : onClose}>
      <div className="tfa-box" onClick={e => e.stopPropagation()}>
        {backupCodes ? (
          <>
            <h2 className="tfa-title">ບັນທຶກລະຫັດສຳຮອງ</h2>
            <p className="tfa-sub">ໃຊ້ໄດ້ຄັ້ງດຽວຕໍ່ໂຕ — ໃຊ້ເມື່ອເຄື່ອງ Authenticator ເສຍ ຫຼື ບໍ່ມີນຳ</p>
            <div className="tfa-codes-grid">
              {backupCodes.map(c => <code key={c}>{c}</code>)}
            </div>
            <button className="tfa-btn" onClick={onClose}>ສຳເລັດ</button>
          </>
        ) : (
          <>
            <h2 className="tfa-title">ຕັ້ງ Two-Factor Authentication</h2>
            <p className="tfa-sub">Scan QR ນີ້ດ້ວຍ Google Authenticator / Authy</p>
            {qrData && (
              <>
                <div className="tfa-qr-wrap">
                  <QRCodeSVG value={qrData.otpauth_url} size={170} />
                </div>
                <p className="tfa-secret">{qrData.secret}</p>
              </>
            )}
            <form onSubmit={confirm}>
              <input
                className="tfa-input"
                value={code}
                onChange={e => setCode(e.target.value)}
                placeholder="6-digit code"
                maxLength={6}
                autoFocus
              />
              <div className="tfa-btns">
                <button type="button" className="tfa-btn-cancel" onClick={onClose}>ຍົກເລີກ</button>
                <button type="submit" className="tfa-btn" disabled={loading || !qrData}>
                  {loading ? "ກຳລັງກວດສອບ..." : "ຢືນຢັນ & ເປີດໃຊ້"}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
