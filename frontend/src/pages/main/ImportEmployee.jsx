import { useEffect, useRef, useState } from "react";
import { api, API_BASE } from "../../api";
import toast from "react-hot-toast";
import "./import.css";

const COL_GROUPS = [
  {
    label: "ຂໍ້ມູນພື້ນຖານ",
    color: "#2f4aad",
    cols: [
      "Employee Code",
      "ຊື່ແທ້ *",
      "ນາມສະກຸນ",
      "ເພດ",
      "ວັນເດືອນປີເກີດ",
      "ສັນຊາດ",
      "ຕຳແໜ່ງ",
      "ປະເພດພະນັກງານ",
      "ອີເມລ",
      "ເບີໂທລະສັບ",
      "ວັນທີເຂົ້າການ",
      "ສະຖານະ (ການເຮັດວຽກ)",
      "ວັນທີລາອອກ",
    ],
  },
  {
    label: "ທີ່ຢູ່ / ຫ້ອງ",
    color: "#059669",
    cols: ["ແຂວງ","ເມືອງ","ບ້ານ","ອາຄານ","ຊັ້ນ","ຫ້ອງ"],
  },
  {
    label: "ຮູບ / ເອກະສານ",
    color: "#d97706",
    cols: ["ຮູບໂປຣຟາຍ","ປະເພດເອກະສານ","ເລກທີເອກະສານ","ວັນໝົດອາຍຸເອກະສານ","ລາຍລະອຽດເອກະສານ","ຮູບພາບເອກະສານ"],
  },
  {
    label: "ໃບອະນຸຍາດ",
    color: "#7c3aed",
    cols: ["ປະເພດໃບອະນຸຍາດ","ເລກທີໃບອະນຸຍາດ","ສະຖານະໃບອະນຸຍາດ","ວັນທີອອກໃບອະນຸຍາດ","ວັນໝົດອາຍຸໃບອະນຸຍາດ","ໝາຍເຫດໃບອະນຸຍາດ"],
  },
];

const PAGE_SIZE = 50;
const STEPS = ["ອັບໂຫລດໄຟລ໌","ຕຣວດສອບ Format","Admin ກວດສອບ","ສຳເລັດ"];

export default function ImportEmployee() {
  const [companies, setCompanies] = useState([]);
  const [company,   setCompany]   = useState("");
  const [rows,      setRows]      = useState([]);
  const [step,      setStep]      = useState(1);
  const [result,    setResult]    = useState(null);
  const [loading,   setLoading]   = useState(false);
  const [progress,  setProgress]  = useState(0);
  const [dragging,   setDragging]   = useState(false);
  const [filter,     setFilter]     = useState("all");
  const [page,       setPage]       = useState(1);
  const [colsFound,    setColsFound]    = useState([]);
  const [colsMapped,   setColsMapped]   = useState({});
  const [noHeader,     setNoHeader]     = useState(false);
  const [headerRowAt,  setHeaderRowAt]  = useState(null);
  const fileRef = useRef();

  const user         = JSON.parse(localStorage.getItem("user") || "{}");
  const isSuperAdmin = user.role === "Super Admin";

  useEffect(() => {
    const ep = isSuperAdmin ? "/company/all" : `/company/my/${user.user_id}`;
    api.get(ep).then(r => {
      setCompanies(r.data);
      if (r.data.length > 0) setCompany(String(r.data[0].company_id));
    }).catch(() => {});
  }, []);

  const downloadTemplate = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_BASE}/api/import/template`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error("download failed");
      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement("a");
      a.href     = url;
      a.download = "employee_import_template.xlsx";
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error("ດາວໂຫລດ Template ບໍ່ສຳເລັດ");
    }
  };

  const processFile = async (file) => {
    if (!file) return;
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (!["xlsx","xls","csv"].includes(ext)) {
      toast.error("ກະລຸນາໃຊ້ໄຟລ໌ .xlsx, .xls ຫຼື .csv");
      return;
    }
    setLoading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const r = await api.post("/import/preview", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setRows(r.data.rows);
      setPage(1);
      setFilter("all");
      setColsFound(r.data.columns_found || []);
      setColsMapped(r.data.columns_mapped || {});
      setNoHeader(!!r.data.no_header);
      setHeaderRowAt(r.data.header_row_at || null);
      setStep(2);
      if (r.data.no_header) {
        toast.error("ບໍ່ພົບ Header Row — ກະລຸນາອ່ານຄຳແນະນຳດ້ານລຸ່ມ");
      } else if (!r.data.has_firstname) {
        toast.error(`ບໍ່ພົບ column "ຊື່ແທ້" — ເບິ່ງ "Columns ທີ່ພົບ" ດ້ານລຸ່ມ`);
      } else {
        toast.success(`ອ່ານໄດ້ ${r.data.total} ແຖວ — ຖືກຕ້ອງ ${r.data.valid}, ຜິດ ${r.data.invalid}`);
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || "ໄຟລ໌ຜິດ");
    }
    setLoading(false);
  };

  const handleFile  = (e) => { processFile(e.target.files[0]); e.target.value = ""; };
  const onDragOver  = (e) => { e.preventDefault(); setDragging(true); };
  const onDragLeave = ()  => setDragging(false);
  const onDrop      = (e) => { e.preventDefault(); setDragging(false); processFile(e.dataTransfer.files[0]); };

  const handleApprove = async () => {
    if (!company) { toast.error("ກະລຸນາເລືອກ Company"); return; }
    const valid = rows.filter(r => !r.error);
    if (valid.length === 0) { toast.error("ບໍ່ມີແຖວທີ່ຖືກຕ້ອງ"); return; }

    setLoading(true);
    setProgress(0);

    const CHUNK = 200;
    let inserted = 0, skipped = 0, allErrors = [];

    for (let i = 0; i < valid.length; i += CHUNK) {
      const chunk = valid.slice(i, i + CHUNK);
      try {
        const r = await api.post("/import/commit", { rows: chunk, company_id: parseInt(company) });
        inserted  += r.data.inserted;
        skipped   += r.data.skipped;
        allErrors  = allErrors.concat(r.data.errors || []);
      } catch {
        skipped += chunk.length;
      }
      setProgress(Math.min(100, Math.round(((i + CHUNK) / valid.length) * 100)));
    }

    setResult({ inserted, skipped, errors: allErrors });
    setStep(4);
    toast.success(`ນຳເຂົ້າສຳເລັດ ${inserted} ຄົນ`);
    setLoading(false);
  };

  const reset = () => {
    setRows([]); setResult(null); setStep(1); setProgress(0);
    setNoHeader(false); setHeaderRowAt(null); setColsFound([]); setColsMapped({});
  };

  const validRows   = rows.filter(r => !r.error);
  const invalidRows = rows.filter(r => r.error);
  const displayRows = filter === "error" ? invalidRows : filter === "ok" ? validRows : rows;
  const totalPages  = Math.ceil(displayRows.length / PAGE_SIZE);
  const pageRows    = displayRows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div className="imp-page">
      <div className="imp-header">
        <div>
          <h1 className="imp-title">ນຳເຂົ້າພະນັກງານ</h1>
          <p className="imp-sub">ອັບໂຫລດໄຟລ໌ Excel ເພື່ອນຳເຂົ້າພະນັກງານ ພ້ອມ ຫ້ອງ, ເອກະສານ ແລະ ໃບອະນຸຍາດ</p>
        </div>
      </div>

      {/* Steps */}
      <div className="imp-steps">
        {STEPS.map((s, i) => (
          <div key={i} className={`imp-step ${step===i+1?"imp-step-active":step>i+1?"imp-step-done":""}`}>
            <div className="imp-step-num">{step>i+1?"✓":i+1}</div>
            <span>{s}</span>
          </div>
        ))}
      </div>

      {/* ── STEP 1: Upload ── */}
      {step === 1 && (
        <div className="imp-card">
          <div className="imp-section-title">ຂັ້ນຕອນທີ 1: ດາວໂຫລດ Template ແລ້ວຕື່ມຂໍ້ມູນ</div>

          <div className="imp-template-row">
            <div className="imp-template-info">
              <div className="imp-template-icon">📥</div>
              <div>
                <div className="imp-template-label">ດາວໂຫລດ Template Excel</div>
                <div className="imp-template-sub">ມີ 33 column ຕາມໂຄງສ້າງລະຖານຂໍ້ມູນ ພ້ອມຕົວຢ່າງ</div>
              </div>
            </div>
            <button className="imp-dl-btn" onClick={downloadTemplate}>⬇ ດາວໂຫລດ Template</button>
          </div>

          <div className="imp-divider"/>

          <div className="imp-section-title">ເລືອກ Company</div>
          <select className="imp-select" value={company} onChange={e => setCompany(e.target.value)}>
            {companies.map(c => (
              <option key={c.company_id} value={c.company_id}>{c.companies_name}</option>
            ))}
          </select>

          <div className="imp-divider"/>

          <div className="imp-section-title">ອັບໂຫລດໄຟລ໌ Excel</div>
          <div
            className={`imp-drop-zone ${dragging ? "imp-drop-dragging" : ""}`}
            onClick={() => !loading && fileRef.current.click()}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
          >
            {loading ? (
              <div className="imp-drop-content">
                <div className="imp-spinner"/>
                <div className="imp-drop-label" style={{marginTop:12}}>ກຳລັງອ່ານໄຟລ໌...</div>
              </div>
            ) : (
              <div className="imp-drop-content">
                <div className="imp-drop-icon">📂</div>
                <div className="imp-drop-label">ລາກໄຟລ໌ມາວາງ ຫຼື ກົດເພື່ອເລືອກ</div>
                <div className="imp-drop-sub">.xlsx · .xls · .csv — ສູງສຸດ 20MB</div>
              </div>
            )}
            <input type="file" ref={fileRef} accept=".xlsx,.xls,.csv" hidden onChange={handleFile} />
          </div>

          <div className="imp-cols-hint">
            <div className="imp-cols-title">Columns ທີ່ຮອງຮັບ (33 column):</div>
            {COL_GROUPS.map(g => (
              <div key={g.label} className="imp-col-group">
                <div className="imp-col-group-label" style={{color: g.color}}>{g.label}</div>
                <div className="imp-cols-list">
                  {g.cols.map(c => (
                    <span key={c} className="imp-col-chip" style={{borderColor: g.color + "44"}}>{c}</span>
                  ))}
                </div>
              </div>
            ))}
            <div className="imp-cols-note">
              💡 building+floor+room ຈະເຊື່ອມ room ອັດຕະໂນມັດ | Doc Type ແລະ Permit Type ຈະບັນທຶກໃນ table ຂອງຕົນ | ຂໍ້ມູນທີ່ຢູ່ຈະບັນທຶກໃນ employee_profile
            </div>
          </div>
        </div>
      )}

      {/* ── STEP 2: Format Validation ── */}
      {step === 2 && (
        <div className="imp-card">
          <div className="imp-preview-header">
            <div>
              <div className="imp-section-title" style={{margin:0}}>ຜົນການຕຣວດສອບ Format</div>
              <div className="imp-preview-stats">
                <span className="imp-stat-ok">✓ {validRows.length} ຜ່ານ</span>
                {invalidRows.length > 0 && <span className="imp-stat-err">✗ {invalidRows.length} ຜິດ</span>}
                <span className="imp-stat-total">ທັງໝົດ {rows.length} ຄົນ</span>
              </div>
            </div>
            <div style={{display:"flex", gap:8, flexWrap:"wrap", alignItems:"center"}}>
              <button className="imp-back-btn" onClick={reset}>
                ✗ Reject ແລະ Upload ໃໝ່
              </button>
              <button
                className="imp-commit-btn"
                onClick={() => { setPage(1); setStep(3); }}
                disabled={validRows.length === 0}
              >
                ດຳເນີນການ → Admin ກວດສອບ ({validRows.length} ຄົນ)
              </button>
            </div>
          </div>

          {/* ── No-header warning ── */}
          {noHeader && (
            <div className="imp-noheader-box">
              <div className="imp-noheader-title">⚠ ໄຟລ໌ຂອງທ່ານບໍ່ມີ Header Row</div>
              <p className="imp-noheader-body">
                ລະບົບຊອກຫາຊື່ Column ໃນ 15 Row ທຳອິດແລ້ວ ແຕ່ບໍ່ພົບ Row ໃດທີ່ກົງກັບ Column ທີ່ລະບົບຮູ້ຈັກ.
                ກະລຸນາ <strong>ເພີ່ມ Row ທຳອິດ</strong> ໃນ Excel ຂອງທ່ານໃຫ້ເປັນຊື່ Column ດັ່ງນີ້:
              </p>
              <div className="imp-noheader-cols">
                {["Employee Code","ຊື່ແທ້","ນາມສະກຸນ","ເພດ","ວັນເດືອນປີເກີດ","ສັນຊາດ","ຕຳແໜ່ງ","ປະເພດພະນັກງານ","ອີເມລ","ເບີໂທລະສັບ","ວັນທີເຂົ້າການ","ສະຖານະ (ການເຮັດວຽກ)","ວັນທີລາອອກ","ແຂວງ","ເມືອງ","ບ້ານ","ອາຄານ","ຊັ້ນ","ຫ້ອງ"].map(h => (
                  <span key={h} className="imp-noheader-chip">{h}</span>
                ))}
              </div>
              <div style={{marginTop:10,display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
                <span style={{fontSize:12,color:"#92400e"}}>ຫຼື ດາວໂຫລດ Template ທີ່ມີ Header ພ້ອມແລ້ວ:</span>
                <button className="imp-dl-btn" style={{fontSize:12,padding:"5px 14px"}} onClick={downloadTemplate}>⬇ ດາວໂຫລດ Template</button>
              </div>
            </div>
          )}

          {/* ── Info: header found at row > 1 ── */}
          {!noHeader && headerRowAt && headerRowAt > 1 && (
            <div className="imp-info-box">
              ℹ ພົບ Header ຢູ່ Row {headerRowAt} — ຂ້າມ {headerRowAt - 1} Row ກ່ອນໜ້າ
            </div>
          )}

          {/* ── Debug: columns found in file ── */}
          {colsFound.length > 0 && (
            <div className="imp-debug-box">
              <div className="imp-debug-title">
                Columns ທີ່ພົບໃນໄຟລ໌ ({colsFound.length} columns, ກົງກັນ {Object.keys(colsMapped).length}):
              </div>
              <div className="imp-debug-cols">
                {colsFound.map((c, i) => (
                  <span key={i} className={`imp-debug-chip ${colsMapped[c] ? "imp-debug-ok" : "imp-debug-miss"}`}>
                    {c}{colsMapped[c] ? ` → ${colsMapped[c]}` : " ✗"}
                  </span>
                ))}
              </div>
              {!noHeader && !Object.values(colsMapped).includes("firstname") && (
                <div className="imp-debug-warn">
                  ⚠ ບໍ່ພົບ column ຊື່ (ຊື່ແທ້ / First Name) — ກວດ row ທຳອິດຂອງໄຟລ໌
                </div>
              )}
            </div>
          )}

          <div className="imp-filter-tabs">
            <button className={`imp-tab ${filter==="all"?"imp-tab-active":""}`} onClick={()=>{setFilter("all");setPage(1);}}>
              ທັງໝົດ ({rows.length})
            </button>
            <button className={`imp-tab ${filter==="ok"?"imp-tab-active":""}`} onClick={()=>{setFilter("ok");setPage(1);}}>
              ✓ ຜ່ານ ({validRows.length})
            </button>
            {invalidRows.length > 0 && (
              <button className={`imp-tab ${filter==="error"?"imp-tab-active imp-tab-err":""}`} onClick={()=>{setFilter("error");setPage(1);}}>
                ✗ ຜິດ ({invalidRows.length})
              </button>
            )}
          </div>

          <div className="imp-table-wrap">
            <table className="imp-table">
              <thead>
                <tr>
                  <th className="imp-th">#</th>
                  <th className="imp-th">ສະຖານະ</th>
                  <th className="imp-th">Code</th>
                  <th className="imp-th">ຊື່</th>
                  <th className="imp-th">ນາມສະກຸນ</th>
                  <th className="imp-th">ເພດ</th>
                  <th className="imp-th">ຕຳແໜ່ງ</th>
                  <th className="imp-th">ປະເພດ</th>
                  <th className="imp-th">ສະຖານະ</th>
                  <th className="imp-th">ວັນທີຈ້າງ</th>
                  <th className="imp-th">ຫ້ອງ (ຕືກ/ຊັ້ນ/ຫ້ອງ)</th>
                  <th className="imp-th">ຕືກ Office</th>
                  <th className="imp-th">ເອກະສານ</th>
                  <th className="imp-th">ໃບອະນຸຍາດ</th>
                </tr>
              </thead>
              <tbody>
                {pageRows.map(r => (
                  <tr key={r.row} className={r.error ? "imp-row-err" : "imp-row-ok"}>
                    <td className="imp-td">{r.row}</td>
                    <td className="imp-td">
                      {r.error
                        ? <span className="imp-badge-err" title={r.error}>✗ {r.error}</span>
                        : <span className="imp-badge-ok">✓ OK</span>}
                    </td>
                    <td className="imp-td">{r.employee_code || "–"}</td>
                    <td className="imp-td imp-bold">{r.firstname}</td>
                    <td className="imp-td">{r.lastname || "–"}</td>
                    <td className="imp-td">{r.gender || "–"}</td>
                    <td className="imp-td">{r.position || "–"}</td>
                    <td className="imp-td">{r.employee_type || "–"}</td>
                    <td className="imp-td">{r.status || "Active"}</td>
                    <td className="imp-td">{r.hired_at || "–"}</td>
                    <td className="imp-td">
                      {r.dorm_building
                        ? <span className="imp-room-chip">{r.dorm_building}/{r.dorm_floor}/{r.dorm_room}</span>
                        : "–"}
                    </td>
                    <td className="imp-td">{r.office_building || "–"}</td>
                    <td className="imp-td">
                      {r.doc_type ? <span className="imp-doc-chip">{r.doc_type}</span> : "–"}
                    </td>
                    <td className="imp-td">
                      {r.permit_type ? <span className="imp-permit-chip">{r.permit_type}</span> : "–"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="imp-pagination">
              <button className="imp-page-btn" onClick={() => setPage(p => Math.max(1,p-1))} disabled={page===1}>‹</button>
              <span className="imp-page-info">ໜ້າ {page} / {totalPages}</span>
              <button className="imp-page-btn" onClick={() => setPage(p => Math.min(totalPages,p+1))} disabled={page===totalPages}>›</button>
            </div>
          )}
        </div>
      )}

      {/* ── STEP 3: Admin Review & Approve ── */}
      {step === 3 && (
        <div className="imp-card">
          {/* Summary header */}
          <div className="imp-approve-header">
            <div className="imp-approve-icon">🔍</div>
            <div>
              <div className="imp-section-title" style={{margin:0}}>Admin ກວດສອບ ແລະ ອະນຸມັດ</div>
              <p style={{fontSize:13,color:"#6b7280",margin:"4px 0 0"}}>
                ກວດສອບຂໍ້ມູນທັງໝົດ {validRows.length} ຄົນ ກ່ອນ Approve ຫຼື Reject
              </p>
            </div>
          </div>

          {/* Stats boxes */}
          <div className="imp-approve-stats">
            <div className="imp-approve-stat-box imp-stat-box-ok">
              <div className="imp-stat-box-val">{validRows.length}</div>
              <div className="imp-stat-box-lbl">ຄົນທີ່ຈະນຳເຂົ້າ</div>
            </div>
            <div className="imp-approve-stat-box imp-stat-box-err">
              <div className="imp-stat-box-val">{invalidRows.length}</div>
              <div className="imp-stat-box-lbl">ຄົນທີ່ຈະຂ້າມ (ຜິດ)</div>
            </div>
            <div className="imp-approve-stat-box imp-stat-box-blue">
              <div className="imp-stat-box-val">{validRows.filter(r=>r.dorm_building).length}</div>
              <div className="imp-stat-box-lbl">ຄົນທີ່ມີຫ້ອງ</div>
            </div>
            <div className="imp-approve-stat-box imp-stat-box-purple">
              <div className="imp-stat-box-val">{validRows.filter(r=>r.doc_type||r.permit_type).length}</div>
              <div className="imp-stat-box-lbl">ຄົນທີ່ມີເອກະສານ</div>
            </div>
          </div>

          {/* Tables to be written */}
          <div className="imp-db-flow">
            <div className="imp-db-label">ຂໍ້ມູນຈະຖືກບັນທຶກໃສ່:</div>
            <div className="imp-db-chips">
              <span className="imp-db-chip imp-db-emp">employees</span>
              <span className="imp-db-arrow">→</span>
              <span className="imp-db-chip imp-db-profile">employee_profile</span>
              <span className="imp-db-arrow">→</span>
              <span className="imp-db-chip imp-db-doc">employee_documents</span>
              <span className="imp-db-arrow">→</span>
              <span className="imp-db-chip imp-db-permit">employee_permits</span>
              <span className="imp-db-arrow">→</span>
              <span className="imp-db-chip imp-db-audit">audit_log</span>
            </div>
          </div>

          {/* Company select */}
          <div style={{marginBottom:16}}>
            <div className="imp-cols-title" style={{marginBottom:6}}>Company ທີ່ຈະນຳເຂົ້າ:</div>
            <select className="imp-select" value={company} onChange={e => setCompany(e.target.value)} disabled={loading}>
              {companies.map(c => (
                <option key={c.company_id} value={c.company_id}>{c.companies_name}</option>
              ))}
            </select>
          </div>

          {/* Progress bar (while loading) */}
          {loading && (
            <div className="imp-progress-wrap" style={{marginBottom:16}}>
              <div className="imp-progress-bar" style={{width:`${progress}%`}}/>
              <div className="imp-progress-text">{progress}%</div>
            </div>
          )}

          {/* Valid rows preview */}
          <div className="imp-table-wrap" style={{marginBottom:16}}>
            <table className="imp-table">
              <thead>
                <tr>
                  <th className="imp-th">#</th>
                  <th className="imp-th">Code</th>
                  <th className="imp-th">ຊື່-ນາມສະກຸນ</th>
                  <th className="imp-th">ຕຳແໜ່ງ</th>
                  <th className="imp-th">ປະເພດ</th>
                  <th className="imp-th">ສະຖານະ</th>
                  <th className="imp-th">ວັນທີຈ້າງ</th>
                  <th className="imp-th">ທີ່ຢູ່</th>
                  <th className="imp-th">ຫ້ອງ</th>
                  <th className="imp-th">ຕືກ Office</th>
                  <th className="imp-th">ເອກະສານ</th>
                  <th className="imp-th">ໃບອະນຸຍາດ</th>
                </tr>
              </thead>
              <tbody>
                {validRows.slice((page-1)*PAGE_SIZE, page*PAGE_SIZE).map(r => (
                  <tr key={r.row} className="imp-row-ok">
                    <td className="imp-td">{r.row}</td>
                    <td className="imp-td">{r.employee_code || "–"}</td>
                    <td className="imp-td imp-bold">{r.firstname} {r.lastname}</td>
                    <td className="imp-td">{r.position || "–"}</td>
                    <td className="imp-td">{r.employee_type || "–"}</td>
                    <td className="imp-td">{r.status || "Active"}</td>
                    <td className="imp-td">{r.hired_at || "–"}</td>
                    <td className="imp-td">{r.province ? `${r.province}, ${r.district||""}` : "–"}</td>
                    <td className="imp-td">
                      {r.dorm_building
                        ? <span className="imp-room-chip">{r.dorm_building}/{r.dorm_floor}/{r.dorm_room}</span>
                        : "–"}
                    </td>
                    <td className="imp-td">{r.office_building || "–"}</td>
                    <td className="imp-td">
                      {r.doc_type ? <span className="imp-doc-chip">{r.doc_type}</span> : "–"}
                    </td>
                    <td className="imp-td">
                      {r.permit_type ? <span className="imp-permit-chip">{r.permit_type}</span> : "–"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {Math.ceil(validRows.length/PAGE_SIZE) > 1 && (
            <div className="imp-pagination" style={{marginBottom:20}}>
              <button className="imp-page-btn" onClick={() => setPage(p => Math.max(1,p-1))} disabled={page===1}>‹</button>
              <span className="imp-page-info">ໜ້າ {page} / {Math.ceil(validRows.length/PAGE_SIZE)}</span>
              <button className="imp-page-btn" onClick={() => setPage(p => Math.min(Math.ceil(validRows.length/PAGE_SIZE),p+1))} disabled={page===Math.ceil(validRows.length/PAGE_SIZE)}>›</button>
            </div>
          )}

          {/* Action buttons */}
          <div className="imp-approve-actions">
            <button className="imp-back-btn" onClick={() => { setPage(1); setStep(2); }} disabled={loading}>
              ← ກັບໄປກວດສອບ
            </button>
            <div style={{display:"flex", gap:10}}>
              <button className="imp-reject-btn" onClick={reset} disabled={loading}>
                ✗ Reject ແລະ Upload ໃໝ່
              </button>
              <button className="imp-approve-btn" onClick={handleApprove} disabled={loading || validRows.length === 0}>
                {loading ? `ກຳລັງນຳເຂົ້າ... ${progress}%` : `✅ Approve ແລະ Import ${validRows.length} ຄົນ`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── STEP 4: Done ── */}
      {step === 4 && result && (
        <div className="imp-card imp-done-card">
          <div className="imp-done-icon">✅</div>
          <div className="imp-done-title">Import ສຳເລັດ</div>
          <div className="imp-done-stats">
            <div className="imp-done-stat">
              <div className="imp-done-val" style={{color:"#059669"}}>{result.inserted}</div>
              <div className="imp-done-lbl">ນຳເຂົ້າສຳເລັດ</div>
            </div>
            <div className="imp-done-stat">
              <div className="imp-done-val" style={{color:"#dc2626"}}>{result.skipped}</div>
              <div className="imp-done-lbl">ຂ້າມ (ຊໍ້າ/ຜິດ)</div>
            </div>
          </div>
          <p style={{fontSize:13,color:"#6b7280",marginBottom:16}}>
            ຂໍ້ມູນຖືກບັນທຶກໃສ່ employees, employee_profile, employee_documents, employee_permits ແລະ audit_log ແລ້ວ
          </p>
          {result.errors?.length > 0 && (
            <div className="imp-error-list">
              <div style={{fontWeight:600,marginBottom:6,fontSize:12}}>ລາຍລະອຽດ error:</div>
              {result.errors.map((e, i) => <div key={i} className="imp-error-item">• {e}</div>)}
            </div>
          )}
          <div style={{display:"flex",gap:12,justifyContent:"center",marginTop:24}}>
            <button className="imp-commit-btn" onClick={reset}>ນຳເຂົ້າໄຟລ໌ໃໝ່</button>
            <a href="/employees" className="imp-dl-btn">ໄປໜ້າພະນັກງານ →</a>
          </div>
        </div>
      )}
    </div>
  );
}
