import { useCurrentUser } from "../../hooks/useCurrentUser";
import { useEffect, useRef, useState } from "react";
import { api, API_BASE, photoUrl } from "../../api";
import toast from "react-hot-toast";
import "./import.css";

const COL_GROUPS = [
  {
    label: "Basic Info",
    color: "#2f4aad",
    cols: [
      "Employee Code",
      "First Name *",
      "Last Name",
      "Gender",
      "Date of Birth",
      "Nationality",
      "Position",
      "Employee Type",
      "Email",
      "Phone",
      "Hire Date",
      "Status",
      "Resigned Date",
    ],
  },
  {
    label: "Address / Room",
    color: "#059669",
    cols: [
      "Province",
      "District",
      "Village",
      "Dorm Building",
      "Dorm Floor",
      "Dorm Room",
      "Office Building",
      "Office Floor",
      "Office Room",
    ],
  },
  {
    label: "Photo / Documents",
    color: "#d97706",
    cols: [
      "Profile Photo",
      "Doc Type",
      "Doc Number",
      "Doc Expiry",
      "Doc Description",
      "Doc Image",
    ],
  },
  {
    label: "Permits",
    color: "#7c3aed",
    cols: [
      "Permit Type",
      "Permit Number",
      "Permit Status",
      "Permit Issue Date",
      "Permit Expiry",
      "Permit Note",
      "Permit Image",
    ],
  },
];

const PAGE_SIZE = 50;
const STEPS = ["Upload File", "Validate Format", "Admin Review", "Done"];

export default function ImportEmployee() {
  const [companies, setCompanies] = useState([]);
  const [company,   setCompany]   = useState("");
  const [rows,      setRows]      = useState([]);
  const [step,      setStep]      = useState(1);
  const [result,    setResult]    = useState(null);
  const [loading,   setLoading]   = useState(false);
  const [progress,  setProgress]  = useState(0);
  const [dragging,   setDragging]   = useState(false);
  const [gsUrl,      setGsUrl]      = useState("");
  const [gsLoading,  setGsLoading]  = useState(false);
  const [filter,     setFilter]     = useState("all");
  const [page,       setPage]       = useState(1);
  const [colsFound,      setColsFound]      = useState([]);
  const [colsMapped,     setColsMapped]     = useState({});
  const [lightbox,       setLightbox]       = useState(null);
  const [colsSuggested,  setColsSuggested]  = useState({});
  const [noHeader,       setNoHeader]       = useState(false);
  const [headerRowAt,    setHeaderRowAt]    = useState(null);
  const [duplicates,     setDuplicates]     = useState({});
  const fileRef = useRef();

  const user         = useCurrentUser();
  const isSuperAdmin = user.role === "Super Admin";

  useEffect(() => {
    const ep = isSuperAdmin ? "/company/all" : `/company/my/${user.user_id}`;
    api.get(ep).then(r => {
      setCompanies(r.data);
      if (r.data.length > 0) setCompany(String(r.data[0].company_id));
    }).catch(() => {});
  }, []);

  const checkDuplicates = async (rowsData, cid) => {
    if (!cid || !rowsData.length) return;
    try {
      const r = await api.post("/import/check-duplicates", {
        rows: rowsData,
        company_id: parseInt(cid),
      });
      setDuplicates(r.data.duplicates || {});
    } catch {
      setDuplicates({});
    }
  };

  useEffect(() => {
    if ((step === 2 || step === 3) && rows.length > 0) {
      checkDuplicates(rows, company);
    }
  }, [company]);

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
      toast.error("Failed to download template");
    }
  };

  const uploadTemplate = async (file) => {
    if (!file) return;
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (!["xlsx","xls"].includes(ext)) { toast.error("File must be .xlsx or .xls"); return; }
    try {
      const fd = new FormData();
      fd.append("template", file);
      await api.post("/import/template", fd, { headers: { "Content-Type": "multipart/form-data" } });
      toast.success("Template uploaded! Everyone will now download this new template.");
    } catch {
      toast.error("Failed to upload template");
    }
  };

  const processFile = async (file) => {
    if (!file) return;
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (!["xlsx","xls","csv"].includes(ext)) {
      toast.error("Please use a .xlsx, .xls or .csv file");
      return;
    }
    setLoading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const r = await api.post("/import/preview", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      const indexedRows = r.data.rows.map((row, i) => ({ ...row, _idx: i }));
      setRows(indexedRows);
      setDuplicates({});
      setPage(1);
      setFilter("all");
      setColsFound(r.data.columns_found || []);
      setColsMapped(r.data.columns_mapped || {});
      setColsSuggested(r.data.column_suggestions || {});
      setNoHeader(!!r.data.no_header);
      setHeaderRowAt(r.data.header_row_at || null);
      setStep(2);
      if (r.data.no_header) {
        toast.error("Header row not found — please read the instructions below");
      } else if (!r.data.has_firstname) {
        toast.error(`Column "First Name" not found — check the "Columns Found" section below`);
      } else {
        toast.success(`Read ${r.data.total} rows — valid: ${r.data.valid}, errors: ${r.data.invalid}`);
      }
      checkDuplicates(indexedRows, company);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Invalid file");
    }
    setLoading(false);
  };

  const handleFile  = (e) => { processFile(e.target.files[0]); e.target.value = ""; };
  const onDragOver  = (e) => { e.preventDefault(); setDragging(true); };
  const onDragLeave = ()  => setDragging(false);
  const onDrop      = (e) => { e.preventDefault(); setDragging(false); processFile(e.dataTransfer.files[0]); };

  const processGsheets = async () => {
    if (!gsUrl.trim()) { toast.error("Please enter a Google Sheets URL"); return; }
    if (!gsUrl.includes("docs.google.com/spreadsheets")) {
      toast.error("URL must be a Google Sheets link"); return;
    }
    setGsLoading(true);
    try {
      const r = await api.post("/import/from-gsheets", { url: gsUrl.trim() });
      const indexedRows = r.data.rows.map((row, i) => ({ ...row, _idx: i }));
      setRows(indexedRows);
      setDuplicates({});
      setPage(1); setFilter("all");
      setColsFound(r.data.columns_found || []);
      setColsMapped(r.data.columns_mapped || {});
      setColsSuggested(r.data.column_suggestions || {});
      setNoHeader(!!r.data.no_header);
      setHeaderRowAt(r.data.header_row_at || null);
      setStep(2);
      if (r.data.no_header) {
        toast.error("Header row not found");
      } else if (!r.data.has_firstname) {
        toast.error(`Column "First Name" not found`);
      } else {
        toast.success(`Google Sheets loaded — ${r.data.total} rows`);
      }
      checkDuplicates(indexedRows, company);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to load Google Sheets");
    }
    setGsLoading(false);
  };

  /* Super Admin commits directly */
  const handleCommitDirect = async () => {
    if (!company) { toast.error("Please select a company"); return; }
    const valid = rows.filter(r => !r.error);
    if (valid.length === 0) { toast.error("No valid rows to import"); return; }
    setLoading(true);
    setProgress(0);
    const CHUNK = 200;
    let inserted = 0, skipped = 0, allErrors = [];
    for (let i = 0; i < valid.length; i += CHUNK) {
      const chunk = valid.slice(i, i + CHUNK);
      try {
        const r = await api.post("/import/commit", { rows: chunk, company_id: parseInt(company) });
        inserted += r.data.inserted;
        skipped  += r.data.skipped;
        allErrors = allErrors.concat(r.data.errors || []);
      } catch { skipped += chunk.length; }
      setProgress(Math.min(100, Math.round(((i + CHUNK) / valid.length) * 100)));
    }
    setResult({ inserted, skipped, errors: allErrors });
    setStep(4);
    toast.success(`Successfully imported ${inserted} employees`);
    setLoading(false);
  };

  /* Company Admin submits for Super Admin approval */
  const handleSubmitForApproval = async () => {
    if (!company) { toast.error("Please select a company"); return; }
    const valid = rows.filter(r => !r.error);
    if (valid.length === 0) { toast.error("No valid rows to import"); return; }
    setLoading(true);
    try {
      await api.post("/import/submit", { rows, company_id: parseInt(company), filename: null });
      setStep(4);
      setResult({ submitted: true, valid: valid.length, total: rows.length });
      toast.success("Request submitted — waiting for Super Admin approval");
    } catch (err) {
      toast.error(err?.response?.data?.message || "Submission failed");
    }
    setLoading(false);
  };

  const handleApprove = isSuperAdmin ? handleCommitDirect : handleSubmitForApproval;

  const reset = () => {
    setRows([]); setResult(null); setStep(1); setProgress(0);
    setNoHeader(false); setHeaderRowAt(null); setColsFound([]); setColsMapped({}); setColsSuggested({});
    setDuplicates({});
  };

  const validRows   = rows.filter(r => !r.error);
  const invalidRows = rows.filter(r => r.error);
  const dupRows     = rows.filter(r => !r.error && duplicates[r._idx]);
  const displayRows = filter === "error" ? invalidRows : filter === "ok" ? validRows : filter === "dup" ? dupRows : rows;
  const totalPages  = Math.ceil(displayRows.length / PAGE_SIZE);
  const pageRows    = displayRows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div className="imp-page">
      {lightbox && (
        <div className="imp-lightbox-overlay" onClick={() => setLightbox(null)}>
          <img src={lightbox} alt="" className="imp-lightbox-img" onClick={e => e.stopPropagation()} />
          <button className="imp-lightbox-close" onClick={() => setLightbox(null)}>✕</button>
        </div>
      )}

      <div className="imp-header">
        <div>
          <h1 className="imp-title">Import Employees</h1>
          <p className="imp-sub">Upload an Excel file to import employees with rooms, documents and permits</p>
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
          <div className="imp-section-title">Step 1: Download the template and fill in your data</div>

          <div className="imp-template-row">
            <div className="imp-template-info">
              <div className="imp-template-icon">📥</div>
              <div>
                <div className="imp-template-label">Download Excel Template</div>
                <div className="imp-template-sub">35 columns (English headers) — open the "Reference" sheet for Lao translations</div>
              </div>
            </div>
            <div style={{display:"flex",gap:8,alignItems:"center"}}>
              <button className="imp-dl-btn" onClick={downloadTemplate}>⬇ Download Template</button>
              {isSuperAdmin && (
                <>
                  <label className="imp-upload-tpl-btn" title="Upload New Template (Super Admin only)">
                    ⬆ Upload Template
                    <input type="file" accept=".xlsx,.xls" hidden
                      onChange={e => { uploadTemplate(e.target.files[0]); e.target.value=""; }} />
                  </label>
                </>
              )}
            </div>
          </div>

          <div className="imp-divider"/>

          <div className="imp-section-title">Select Company</div>
          <select className="imp-select" value={company} onChange={e => setCompany(e.target.value)}>
            {companies.map(c => (
              <option key={c.company_id} value={c.company_id}>{c.companies_name}</option>
            ))}
          </select>

          <div className="imp-divider"/>

          <div className="imp-section-title">Upload Excel File</div>
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
                <div className="imp-drop-label" style={{marginTop:12}}>Reading file...</div>
              </div>
            ) : (
              <div className="imp-drop-content">
                <div className="imp-drop-icon">📂</div>
                <div className="imp-drop-label">Drag & drop a file or click to browse</div>
                <div className="imp-drop-sub">.xlsx · .xls · .csv — max 20MB</div>
              </div>
            )}
            <input type="file" ref={fileRef} accept=".xlsx,.xls,.csv" hidden onChange={handleFile} />
          </div>

          {/* ── Google Sheets import ── */}
          <div className="imp-or-divider"><span>OR</span></div>

          <div className="imp-gs-section">
            <div className="imp-gs-header">
              <svg viewBox="0 0 24 24" width="22" height="22" fill="none">
                <rect x="3" y="2" width="18" height="20" rx="2" fill="#0F9D58" opacity=".15"/>
                <rect x="3" y="2" width="18" height="20" rx="2" stroke="#0F9D58" strokeWidth="1.5" fill="none"/>
                <line x1="7" y1="8"  x2="17" y2="8"  stroke="#0F9D58" strokeWidth="1.2"/>
                <line x1="7" y1="12" x2="17" y2="12" stroke="#0F9D58" strokeWidth="1.2"/>
                <line x1="7" y1="16" x2="13" y2="16" stroke="#0F9D58" strokeWidth="1.2"/>
              </svg>
              <span className="imp-gs-title">Import from Google Sheets</span>
            </div>

            <div className="imp-gs-body">
              <div className="imp-gs-input-row">
                <input
                  className="imp-gs-input"
                  placeholder="https://docs.google.com/spreadsheets/d/..."
                  value={gsUrl}
                  onChange={e => setGsUrl(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && processGsheets()}
                  disabled={gsLoading}
                />
                <button
                  className="imp-gs-btn"
                  onClick={processGsheets}
                  disabled={gsLoading || !gsUrl.trim()}
                >
                  {gsLoading
                    ? <><div className="imp-spinner-sm"/> Loading...</>
                    : "📥 Import"}
                </button>
              </div>
              <div className="imp-gs-note">
                ⚠ Sheet must be set to <strong>Anyone with the link can view</strong> first.
                <a
                  href="https://support.google.com/docs/answer/183965"
                  target="_blank"
                  rel="noreferrer"
                  className="imp-gs-link"
                > How to set →</a>
              </div>
            </div>
          </div>

          <div className="imp-cols-hint">
            <div className="imp-cols-title">Supported columns (35 columns — English or Lao headers accepted):</div>
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
              💡 building+floor+room will auto-link to a room | Doc Type and Permit Type are saved in their own tables | Address data is saved to employee_profile
            </div>
          </div>
        </div>
      )}

      {/* ── STEP 2: Format Validation ── */}
      {step === 2 && (
        <div className="imp-card">
          <div className="imp-preview-header">
            <div>
              <div className="imp-section-title" style={{margin:0}}>Format Validation Results</div>
              <div className="imp-preview-stats">
                <span className="imp-stat-ok">✓ {validRows.length} passed</span>
                {invalidRows.length > 0 && <span className="imp-stat-err">✗ {invalidRows.length} errors</span>}
                {dupRows.length > 0 && <span className="imp-stat-dup">⚠ {dupRows.length} duplicates</span>}
                <span className="imp-stat-total">Total: {rows.length} rows</span>
              </div>
            </div>
            <div style={{display:"flex", gap:8, flexWrap:"wrap", alignItems:"center"}}>
              <button className="imp-back-btn" onClick={reset}>
                ✗ Reject & Re-upload
              </button>
              <div style={{display:"flex", flexDirection:"column", alignItems:"flex-end", gap:4}}>
                <button
                  className="imp-commit-btn"
                  onClick={() => { setPage(1); setStep(3); }}
                  disabled={validRows.length === 0 || dupRows.length > 0}
                  title={dupRows.length > 0 ? `${dupRows.length} employees already exist — remove duplicate rows from Excel and re-upload` : ""}
                >
                  Proceed → Admin Review ({validRows.length} employees)
                </button>
                {dupRows.length > 0 && (
                  <div className="imp-dup-block-msg">
                    ⚠ {dupRows.length} employees already exist in the system — remove duplicate rows from Excel and re-upload
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ── No-header warning ── */}
          {noHeader && (
            <div className="imp-noheader-box">
              <div className="imp-noheader-title">⚠ Your file has no Header Row</div>
              <p className="imp-noheader-body">
                The system searched the first 15 rows for column names but found no row matching known columns.
                Please <strong>add a header row</strong> as the first row of your Excel file:
              </p>
              <div className="imp-noheader-cols">
                {["Employee Code","First Name","Last Name","Gender","Date of Birth","Nationality","Position","Employee Type","Email","Phone","Hire Date","Status","Resigned Date","Province","District","Village","Building","Floor","Room"].map(h => (
                  <span key={h} className="imp-noheader-chip">{h}</span>
                ))}
              </div>
              <div style={{marginTop:10,display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
                <span style={{fontSize:12,color:"#92400e"}}>Or download a template with headers ready:</span>
                <button className="imp-dl-btn" style={{fontSize:12,padding:"5px 14px"}} onClick={downloadTemplate}>⬇ Download Template</button>
              </div>
            </div>
          )}

          {/* ── Info: header found at row > 1 ── */}
          {!noHeader && headerRowAt && headerRowAt > 1 && (
            <div className="imp-info-box">
              ℹ Header found at row {headerRowAt} — skipped {headerRowAt - 1} row(s) above
            </div>
          )}

          {/* ── Debug: columns found in file ── */}
          {colsFound.length > 0 && (
            <div className="imp-debug-box">
              <div className="imp-debug-title">
                Columns found in file ({colsFound.length} columns — matched {Object.keys(colsMapped).length}
                {Object.keys(colsSuggested).length > 0 && `, suggested ${Object.keys(colsSuggested).length}`}):
              </div>
              <div className="imp-debug-cols">
                {colsFound.map((c, i) => (
                  colsMapped[c] ? (
                    <span key={i} className="imp-debug-chip imp-debug-ok" title={`Matched: ${colsMapped[c]}`}>
                      {c} <span className="imp-chip-arrow">→</span> {colsMapped[c]}
                    </span>
                  ) : colsSuggested[c] ? (
                    <span key={i} className="imp-debug-chip imp-debug-suggest" title={`Suggested name: "${colsSuggested[c]}"`}>
                      {c} <span className="imp-chip-arrow">≈</span> {colsSuggested[c]} ?
                    </span>
                  ) : (
                    <span key={i} className="imp-debug-chip imp-debug-miss">
                      {c} ✗
                    </span>
                  )
                ))}
              </div>
              {!noHeader && !Object.values(colsMapped).includes("firstname") && (
                <div className="imp-debug-warn">
                  ⚠ Column "First Name" not found — check the first row of your file
                </div>
              )}
            </div>
          )}

          {/* ── Template fix suggestions ── */}
          {Object.keys(colsSuggested).length > 0 && (
            <div className="imp-suggest-box">
              <div className="imp-suggest-title">💡 Suggestion: Rename columns in your template</div>
              <p className="imp-suggest-desc">
                The system found columns with similar names but no exact match. Please rename the columns in Excel as shown below:
              </p>
              <table className="imp-suggest-table">
                <thead>
                  <tr>
                    <th>Found in file</th>
                    <th>Correct name (please rename)</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(colsSuggested).map(([found, suggested]) => (
                    <tr key={found}>
                      <td><span className="imp-suggest-old">{found}</span></td>
                      <td><span className="imp-suggest-new">{suggested}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="imp-suggest-note">
                Or <button className="imp-link-btn" onClick={downloadTemplate}>download the updated template</button> with correct column names already included
              </div>
            </div>
          )}

          <div className="imp-filter-tabs">
            <button className={`imp-tab ${filter==="all"?"imp-tab-active":""}`} onClick={()=>{setFilter("all");setPage(1);}}>
              All ({rows.length})
            </button>
            <button className={`imp-tab ${filter==="ok"?"imp-tab-active":""}`} onClick={()=>{setFilter("ok");setPage(1);}}>
              ✓ Passed ({validRows.length})
            </button>
            {invalidRows.length > 0 && (
              <button className={`imp-tab ${filter==="error"?"imp-tab-active imp-tab-err":""}`} onClick={()=>{setFilter("error");setPage(1);}}>
                ✗ Errors ({invalidRows.length})
              </button>
            )}
            {dupRows.length > 0 && (
              <button className={`imp-tab ${filter==="dup"?"imp-tab-active imp-tab-dup":""}`} onClick={()=>{setFilter("dup");setPage(1);}}>
                ⚠ Duplicates ({dupRows.length})
              </button>
            )}
          </div>

          <div className="imp-table-wrap">
            <table className="imp-table">
              <thead>
                <tr>
                  <th className="imp-th">#</th>
                  <th className="imp-th">Status</th>
                  <th className="imp-th">Code</th>
                  <th className="imp-th">First Name</th>
                  <th className="imp-th">Last Name</th>
                  <th className="imp-th">Gender</th>
                  <th className="imp-th">Position</th>
                  <th className="imp-th">Type</th>
                  <th className="imp-th">Status</th>
                  <th className="imp-th">Hire Date</th>
                  <th className="imp-th">Room (Bldg/Fl/Rm)</th>
                  <th className="imp-th">Office Bldg</th>
                  <th className="imp-th">Photo</th>
                  <th className="imp-th">Documents</th>
                  <th className="imp-th">Permits</th>
                </tr>
              </thead>
              <tbody>
                {pageRows.map(r => (
                  <tr key={r.row} className={r.error ? "imp-row-err" : duplicates[r._idx] ? "imp-row-dup" : "imp-row-ok"}>
                    <td className="imp-td">{r.row}</td>
                    <td className="imp-td">
                      {r.error
                        ? <span className="imp-badge-err" title={r.error}>✗ {r.error}</span>
                        : duplicates[r._idx]
                          ? <span className="imp-badge-dup" title={duplicates[r._idx]}>⚠ Duplicate</span>
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
                    <td className="imp-td imp-photo-cell">
                      {photoUrl(r.photo)
                        ? <img
                            src={photoUrl(r.photo)}
                            alt=""
                            className="imp-photo-thumb imp-photo-clickable"
                            onClick={() => setLightbox(photoUrl(r.photo))}
                            onError={e => { e.currentTarget.style.display = "none"; const n = e.currentTarget.nextElementSibling; if (n) n.style.display = "inline"; }}
                          />
                        : null}
                      <span className="imp-no-photo" style={{ display: photoUrl(r.photo) ? "none" : "inline" }}>–</span>
                    </td>
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
              <span className="imp-page-info">Page {page} / {totalPages}</span>
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
              <div className="imp-section-title" style={{margin:0}}>Admin Review & Approve</div>
              <p style={{fontSize:13,color:"#6b7280",margin:"4px 0 0"}}>
                Review all {validRows.length} employees before approving or rejecting
              </p>
            </div>
          </div>

          {/* Stats boxes */}
          <div className="imp-approve-stats">
            <div className="imp-approve-stat-box imp-stat-box-ok">
              <div className="imp-stat-box-val">{validRows.length}</div>
              <div className="imp-stat-box-lbl">To import</div>
            </div>
            <div className="imp-approve-stat-box imp-stat-box-err">
              <div className="imp-stat-box-val">{invalidRows.length}</div>
              <div className="imp-stat-box-lbl">To skip (errors)</div>
            </div>
            <div className="imp-approve-stat-box imp-stat-box-blue">
              <div className="imp-stat-box-val">{validRows.filter(r=>r.dorm_building).length}</div>
              <div className="imp-stat-box-lbl">With room</div>
            </div>
            <div className="imp-approve-stat-box imp-stat-box-purple">
              <div className="imp-stat-box-val">{validRows.filter(r=>r.doc_type||r.permit_type).length}</div>
              <div className="imp-stat-box-lbl">With documents</div>
            </div>
            <div className="imp-approve-stat-box imp-stat-box-orange">
              <div className="imp-stat-box-val">{validRows.filter(r=>r.photo).length}</div>
              <div className="imp-stat-box-lbl">With photo</div>
            </div>
          </div>

          {/* Tables to be written */}
          <div className="imp-db-flow">
            <div className="imp-db-label">Data will be saved to:</div>
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
            <div className="imp-cols-title" style={{marginBottom:6}}>Target company:</div>
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
                  <th className="imp-th">Full Name</th>
                  <th className="imp-th">Position</th>
                  <th className="imp-th">Type</th>
                  <th className="imp-th">Status</th>
                  <th className="imp-th">Hire Date</th>
                  <th className="imp-th">Address</th>
                  <th className="imp-th">Room</th>
                  <th className="imp-th">Office Bldg</th>
                  <th className="imp-th">Photo</th>
                  <th className="imp-th">Documents</th>
                  <th className="imp-th">Permits</th>
                </tr>
              </thead>
              <tbody>
                {validRows.slice((page-1)*PAGE_SIZE, page*PAGE_SIZE).map(r => (
                  <tr key={r.row} className={duplicates[r._idx] ? "imp-row-dup" : "imp-row-ok"}>
                    <td className="imp-td">{r.row}</td>
                    <td className="imp-td">{r.employee_code || "–"}</td>
                    <td className="imp-td imp-bold">
                      {r.firstname} {r.lastname}
                      {duplicates[r._idx] && (
                        <div className="imp-dup-note" title={duplicates[r._idx]}>⚠ Duplicate — will be skipped</div>
                      )}
                    </td>
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
                    <td className="imp-td imp-photo-cell">
                      {photoUrl(r.photo)
                        ? <img
                            src={photoUrl(r.photo)}
                            alt=""
                            className="imp-photo-thumb imp-photo-clickable"
                            onClick={() => setLightbox(photoUrl(r.photo))}
                            onError={e => { e.currentTarget.style.display = "none"; const n = e.currentTarget.nextElementSibling; if (n) n.style.display = "inline"; }}
                          />
                        : null}
                      <span className="imp-no-photo" style={{ display: photoUrl(r.photo) ? "none" : "inline" }}>–</span>
                    </td>
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
              <span className="imp-page-info">Page {page} / {Math.ceil(validRows.length/PAGE_SIZE)}</span>
              <button className="imp-page-btn" onClick={() => setPage(p => Math.min(Math.ceil(validRows.length/PAGE_SIZE),p+1))} disabled={page===Math.ceil(validRows.length/PAGE_SIZE)}>›</button>
            </div>
          )}

          {/* Action buttons */}
          <div className="imp-approve-actions">
            <button className="imp-back-btn" onClick={() => { setPage(1); setStep(2); }} disabled={loading}>
              ← Back to Review
            </button>
            <div style={{display:"flex", gap:10}}>
              <button className="imp-reject-btn" onClick={reset} disabled={loading}>
                ✗ Reject & Re-upload
              </button>
              <button className="imp-approve-btn" onClick={handleApprove} disabled={loading || validRows.length === 0}>
                {loading
                  ? (isSuperAdmin ? `Importing... ${progress}%` : "Submitting...")
                  : isSuperAdmin
                    ? `✅ Approve & Import ${validRows.length} employees`
                    : `📤 Submit for Super Admin Approval (${validRows.length} employees)`
                }
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── STEP 4: Done ── */}
      {step === 4 && result && (
        <div className="imp-card imp-done-card">
          {result.submitted ? (
            /* Company Admin — waiting for approval */
            <>
              <div className="imp-done-icon">⏳</div>
              <div className="imp-done-title" style={{color:"#92400e"}}>Awaiting Super Admin Approval</div>
              <p style={{fontSize:14,color:"#6b7280",margin:"12px 0 20px",textAlign:"center",lineHeight:1.7}}>
                Submitted <strong style={{color:"#1e293b"}}>{result.valid} employees</strong> (from {result.total} rows) to Super Admin.<br/>
                Please wait — data will be added to the database after Super Admin approves.
              </p>
              <div style={{display:"flex",gap:12,justifyContent:"center"}}>
                <button className="imp-commit-btn" onClick={reset}>Submit Another File</button>
              </div>
            </>
          ) : (
            /* Super Admin — committed directly */
            <>
              <div className="imp-done-icon">✅</div>
              <div className="imp-done-title">Import Complete</div>
              <div className="imp-done-stats">
                <div className="imp-done-stat">
                  <div className="imp-done-val" style={{color:"#059669"}}>{result.inserted}</div>
                  <div className="imp-done-lbl">Imported</div>
                </div>
                <div className="imp-done-stat">
                  <div className="imp-done-val" style={{color:"#dc2626"}}>{result.skipped}</div>
                  <div className="imp-done-lbl">Skipped (dup/error)</div>
                </div>
              </div>
              <p style={{fontSize:13,color:"#6b7280",marginBottom:16}}>
                Data saved to employees, employee_documents, and employee_permits.
              </p>
              {result.errors?.length > 0 && (
                <div className="imp-error-list">
                  <div style={{fontWeight:600,marginBottom:6,fontSize:12}}>Error details:</div>
                  {result.errors.map((e, i) => <div key={i} className="imp-error-item">• {e}</div>)}
                </div>
              )}
              <div style={{display:"flex",gap:12,justifyContent:"center",marginTop:24}}>
                <button className="imp-commit-btn" onClick={reset}>Import Another File</button>
                <a href="/employees" className="imp-dl-btn">Go to Employees →</a>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
