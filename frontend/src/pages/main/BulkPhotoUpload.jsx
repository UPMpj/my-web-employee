import { useRef, useState } from "react";
import { api } from "../../api";
import { useLanguage } from "../../context/LanguageContext";
import toast from "react-hot-toast";
import "./bulk-photo-upload.css";

export default function BulkPhotoUpload() {
  const { t } = useLanguage();
  const fileRef = useRef(null);
  const [files, setFiles]       = useState([]);
  const [results, setResults]   = useState(null);
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);

  const handleFiles = (selected) => {
    const imgs = Array.from(selected).filter(f => f.type.startsWith("image/"));
    if (imgs.length === 0) { toast.error(t("bpu_img_only")); return; }
    setFiles(imgs);
    setResults(null);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    handleFiles(e.dataTransfer.files);
  };

  const handleUpload = async () => {
    if (files.length === 0) return;
    setUploading(true);
    try {
      const form = new FormData();
      files.forEach(f => form.append("photos", f));
      const res = await api.post("/employees/bulk-photo", form, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setResults(res.data);
      toast.success(t("bpu_toast_ok").replace("{n}", res.data.success).replace("{total}", res.data.total));
    } catch (err) {
      toast.error(err?.response?.data?.message || t("bpu_toast_err"));
    }
    setUploading(false);
  };

  const successList  = results?.results.filter(r => r.status === "ok")       || [];
  const notFound     = results?.results.filter(r => r.status === "not_found") || [];
  const errorList    = results?.results.filter(r => r.status === "error")     || [];

  return (
    <div className="bpu-page">
      <h1 className="bpu-title">{t("nav_bulk_photo")}</h1>
      <p className="bpu-sub">{t("bpu_sub")}</p>

      {/* Instructions */}
      <div className="bpu-instruction">
        <div className="bpu-inst-icon">💡</div>
        <div>
          <strong>{t("bpu_how_to")}</strong> {t("bpu_name_match")} <strong>Employee Code</strong> ຂອງພະນັກງານ
          <br/>
          <span className="bpu-example">ຕົວຢ່າງ: <code>JOJO-019.jpg</code>, <code>UDM-005.png</code>, <code>JOJO-022.jpeg</code></span>
        </div>
      </div>

      {/* Drop zone */}
      <div
        className={`bpu-dropzone${dragging ? " bpu-dz-active" : ""}${files.length > 0 ? " bpu-dz-has-files" : ""}`}
        onDragOver={e => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => fileRef.current?.click()}
      >
        <input ref={fileRef} type="file" accept="image/*" multiple style={{ display: "none" }} onChange={e => handleFiles(e.target.files)} />
        {files.length === 0 ? (
          <>
            <div className="bpu-dz-icon">📁</div>
            <div className="bpu-dz-text">{t("bpu_drag_text")}</div>
            <div className="bpu-dz-sub">{t("bpu_supports")}</div>
          </>
        ) : (
          <>
            <div className="bpu-dz-icon">🖼️</div>
            <div className="bpu-dz-text">{t("bpu_selected_n").replace("{n}", files.length)}</div>
            <div className="bpu-dz-sub">{t("bpu_click_change")}</div>
          </>
        )}
      </div>

      {/* Preview grid */}
      {files.length > 0 && (
        <div className="bpu-preview-grid">
          {files.map((f, i) => (
            <div key={i} className="bpu-preview-item">
              <img src={URL.createObjectURL(f)} alt={f.name} className="bpu-preview-img" />
              <div className="bpu-preview-name">{f.name.replace(/\.[^.]+$/, "")}</div>
            </div>
          ))}
        </div>
      )}

      {/* Upload button */}
      {files.length > 0 && !results && (
        <div className="bpu-actions">
          <button className="bpu-btn-upload" onClick={handleUpload} disabled={uploading}>
            {uploading ? t("bpu_uploading") : t("bpu_upload_n").replace("{n}", files.length)}
          </button>
          <button className="bpu-btn-clear" onClick={() => setFiles([])}>{t("bpu_clear")}</button>
        </div>
      )}

      {/* Results */}
      {results && (
        <div className="bpu-results">
          <div className="bpu-results-summary">
            <div className="bpu-rs-item bpu-rs-ok">{t("bpu_success_n").replace("{n}", successList.length)}</div>
            <div className="bpu-rs-item bpu-rs-nf">{t("bpu_notfound_n").replace("{n}", notFound.length)}</div>
            {errorList.length > 0 && <div className="bpu-rs-item bpu-rs-err">{t("bpu_error_n").replace("{n}", errorList.length)}</div>}
          </div>

          {successList.length > 0 && (
            <div className="bpu-result-section">
              <div className="bpu-result-heading bpu-rh-ok">{t("bpu_ok_heading")}</div>
              <div className="bpu-result-list">
                {successList.map((r, i) => (
                  <div key={i} className="bpu-result-row bpu-rr-ok">
                    {r.photo && <img src={r.photo} alt={r.code} className="bpu-result-thumb"/>}
                    <span>{r.code}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {notFound.length > 0 && (
            <div className="bpu-result-section">
              <div className="bpu-result-heading bpu-rh-nf">{t("bpu_nf_heading")}</div>
              <div className="bpu-result-list">
                {notFound.map((r, i) => (
                  <div key={i} className="bpu-result-row bpu-rr-nf"><span>{r.code}</span></div>
                ))}
              </div>
            </div>
          )}

          <div className="bpu-actions">
            <button className="bpu-btn-upload" onClick={() => { setFiles([]); setResults(null); }}>
              {t("bpu_new_batch")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
