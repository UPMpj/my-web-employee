import { useEffect, useRef, useState } from "react";
import { api, API_BASE } from "../../api";
import toast from "react-hot-toast";
import "./import.css";

const ALL_COLS = [
  { key: "employee_code", label: "Employee Code" },
  { key: "firstname",     label: "First Name *"  },
  { key: "lastname",      label: "Last Name"      },
  { key: "gender",        label: "Gender"         },
  { key: "date_of_birth", label: "Date of Birth"  },
  { key: "nationality",   label: "Nationality"    },
  { key: "email",         label: "Email"          },
  { key: "contact_no",    label: "Phone"          },
  { key: "position",      label: "Position"       },
  { key: "employee_type", label: "Employee Type"  },
  { key: "hired_at",      label: "Hire Date"      },
  { key: "status",        label: "Status"         },
  { key: "province",      label: "Province"       },
  { key: "district",      label: "District"       },
  { key: "village",       label: "Village"        },
  { key: "notes",         label: "Notes"          },
];

const PAGE_SIZE = 50;

export default function ImportEmployee() {
  const [companies,   setCompanies]   = useState([]);
  const [company,     setCompany]     = useState("");
  const [rows,        setRows]        = useState([]);
  const [step,        setStep]        = useState(1);
  const [result,      setResult]      = useState(null);
  const [loading,     setLoading]     = useState(false);
  const [progress,    setProgress]    = useState(0);
  const [dragging,    setDragging]    = useState(false);
  const [filter,      setFilter]      = useState("all");
  const [page,        setPage]        = useState(1);
  const fileRef = useRef();

  const user        = JSON.parse(localStorage.getItem("user") || "{}");
  const isSuperAdmin = user.role === "Super Admin";

  useEffect(() => {
    const ep = isSuperAdmin ? "/company/all" : `/company/my/${user.user_id}`;
    api.get(ep).then(r => {
      setCompanies(r.data);
      if (r.data.length > 0) setCompany(String(r.data[0].company_id));
    }).catch(() => {});
  }, []);

  const downloadTemplate = () => {
    window.open(`${API_BASE}/api/import/template`, "_blank");
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
      setStep(2);
      toast.success(`ອ່ານໄດ້ ${r.data.total} ແຖວ — ຖືກຕ້ອງ ${r.data.valid}, ຜິດ ${r.data.invalid}`);
    } catch (err) {
      toast.error(err?.response?.data?.message || "ໄຟລ໌ຜິດ");
    }
    setLoading(false);
  };

  const handleFile = (e) => {
    processFile(e.target.files[0]);
    e.target.value = "";
  };

  /* drag-and-drop */
  const onDragOver  = (e) => { e.preventDefault(); setDragging(true); };
  const onDragLeave = ()  => setDragging(false);
  const onDrop      = (e) => {
    e.preventDefault();
    setDragging(false);
    processFile(e.dataTransfer.files[0]);
  };

  /* commit — send all valid rows, show progress */
  const handleCommit = async () => {
    if (!company) { toast.error("ກະລຸນາເລືອກ Company"); return; }
    const valid = rows.filter(r => !r.error);
    if (valid.length === 0) { toast.error("ບໍ່ມີແຖວທີ່ຖືກຕ້ອງ"); return; }

    setLoading(true);
    setProgress(0);

    /* send in chunks of 200 to show progress */
    const CHUNK = 200;
    let inserted = 0;
    let skipped  = 0;
    let allErrors = [];

    for (let i = 0; i < valid.length; i += CHUNK) {
      const chunk = valid.slice(i, i + CHUNK);
      try {
        const r = await api.post("/import/commit", {
          rows: chunk,
          company_id: parseInt(company),
        });
        inserted  += r.data.inserted;
        skipped   += r.data.skipped;
        allErrors  = allErrors.concat(r.data.errors || []);
      } catch {
        skipped += chunk.length;
      }
      setProgress(Math.min(100, Math.round(((i + CHUNK) / valid.length) * 100)));
    }

    setResult({ inserted, skipped, errors: allErrors });
    setStep(3);
    toast.success(`ນຳເຂົ້າສຳເລັດ ${inserted} ຄົນ`);
    setLoading(false);
  };

  const reset = () => { setRows([]); setResult(null); setStep(1); setProgress(0); };

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
          <p className="imp-sub">ອັບໂຫລດໄຟລ໌ Excel ຫລື CSV ເພື່ອນຳເຂົ້າພະນັກງານຫຼາຍຄົນພ້ອມກັນ (ຮອງຮັບ 1,500+ ຄົນ)</p>
        </div>
      </div>

      {/* Steps */}
      <div className="imp-steps">
        {["ອັບໂຫລດໄຟລ໌", "ຕຣວດສອບຂໍ້ມູນ", "ສຳເລັດ"].map((s, i) => (
          <div key={i} className={`imp-step ${step === i+1 ? "imp-step-active" : step > i+1 ? "imp-step-done" : ""}`}>
            <div className="imp-step-num">{step > i+1 ? "✓" : i+1}</div>
            <span>{s}</span>
          </div>
        ))}
      </div>

      {/* ── STEP 1: Upload ── */}
      {step === 1 && (
        <div className="imp-card">
          <div className="imp-section-title">ຂັ້ນຕອນທີ 1: ດາວໂຫລດ Template ແລະ ອັບໂຫລດໄຟລ໌</div>

          <div className="imp-template-row">
            <div className="imp-template-info">
              <div className="imp-template-icon">📥</div>
              <div>
                <div className="imp-template-label">ດາວໂຫລດ Template Excel</div>
                <div className="imp-template-sub">ໄຟລ໌ Excel ທີ່ມີ column ຖືກຕ້ອງ ພ້ອມຕົວຢ່າງ 3 ແຖວ</div>
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

          <div className="imp-section-title">ອັບໂຫລດໄຟລ໌</div>
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
                <div className="imp-drop-sub">.xlsx · .xls · .csv — ສູງສຸດ 20MB — ຮອງຮັບ 1,500+ ແຖວ</div>
              </div>
            )}
            <input type="file" ref={fileRef} accept=".xlsx,.xls,.csv" hidden onChange={handleFile} />
          </div>

          <div className="imp-cols-hint">
            <div className="imp-cols-title">Columns ທີ່ຮອງຮັບ:</div>
            <div className="imp-cols-list">
              {ALL_COLS.map(c => (
                <span key={c.key} className={`imp-col-chip ${c.key === "firstname" ? "imp-col-req" : ""}`}>{c.label}</span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── STEP 2: Preview ── */}
      {step === 2 && (
        <div className="imp-card">
          <div className="imp-preview-header">
            <div>
              <div className="imp-section-title" style={{margin:0}}>ຕຣວດສອບຂໍ້ມູນ</div>
              <div className="imp-preview-stats">
                <span className="imp-stat-ok">✓ {validRows.length} ແຖວຖືກຕ້ອງ</span>
                {invalidRows.length > 0 && <span className="imp-stat-err">✗ {invalidRows.length} ແຖວຜິດ</span>}
                <span className="imp-stat-total">ທັງໝົດ {rows.length} ຄົນ</span>
              </div>
            </div>
            <div style={{display:"flex", gap:8, flexWrap:"wrap", alignItems:"center"}}>
              <button className="imp-back-btn" onClick={reset} disabled={loading}>‹ ກັບ</button>
              <select className="imp-select" style={{width:"auto"}} value={company} onChange={e => setCompany(e.target.value)} disabled={loading}>
                {companies.map(c => (
                  <option key={c.company_id} value={c.company_id}>{c.companies_name}</option>
                ))}
              </select>
              <button className="imp-commit-btn" onClick={handleCommit} disabled={loading || validRows.length === 0}>
                {loading ? `ກຳລັງນຳເຂົ້າ... ${progress}%` : `ນຳເຂົ້າ ${validRows.length} ຄົນ`}
              </button>
            </div>
          </div>

          {/* Progress bar */}
          {loading && (
            <div className="imp-progress-wrap">
              <div className="imp-progress-bar" style={{width: `${progress}%`}}/>
              <div className="imp-progress-text">{progress}%</div>
            </div>
          )}

          {/* Filter tabs */}
          <div className="imp-filter-tabs">
            <button className={`imp-tab ${filter==="all"   ?"imp-tab-active":""}`} onClick={()=>{setFilter("all");setPage(1);}}>
              ທັງໝົດ ({rows.length})
            </button>
            <button className={`imp-tab ${filter==="ok"    ?"imp-tab-active":""}`} onClick={()=>{setFilter("ok");setPage(1);}}>
              ✓ ຖືກຕ້ອງ ({validRows.length})
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
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="imp-pagination">
              <button className="imp-page-btn" onClick={() => setPage(p => Math.max(1, p-1))} disabled={page===1}>‹</button>
              <span className="imp-page-info">ໜ້າ {page} / {totalPages} (ສະແດງ {PAGE_SIZE} ແຖວ/ໜ້າ)</span>
              <button className="imp-page-btn" onClick={() => setPage(p => Math.min(totalPages, p+1))} disabled={page===totalPages}>›</button>
            </div>
          )}
        </div>
      )}

      {/* ── STEP 3: Done ── */}
      {step === 3 && result && (
        <div className="imp-card imp-done-card">
          <div className="imp-done-icon">✅</div>
          <div className="imp-done-title">ນຳເຂົ້າສຳເລັດ</div>
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
          {result.errors?.length > 0 && (
            <div className="imp-error-list">
              <div style={{fontWeight:600, marginBottom:6, fontSize:12}}>ລາຍລະອຽດ error:</div>
              {result.errors.map((e, i) => <div key={i} className="imp-error-item">• {e}</div>)}
            </div>
          )}
          <div style={{display:"flex", gap:12, justifyContent:"center", marginTop:24}}>
            <button className="imp-commit-btn" onClick={reset}>ນຳເຂົ້າໄຟລ໌ໃໝ່</button>
            <a href="/employees" className="imp-dl-btn">ໄປໜ້າພະນັກງານ →</a>
          </div>
        </div>
      )}
    </div>
  );
}
