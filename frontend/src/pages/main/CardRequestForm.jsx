import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../../api";
import { useCurrentUser } from "../../hooks/useCurrentUser";
import toast from "react-hot-toast";
import "./card-request-form.css";

const STATUS_OPTIONS = ["Active", "Inactive", "Resigned"];

export default function CardRequestForm() {
  const navigate = useNavigate();
  const { user_id: userId, role: userRole } = useCurrentUser();

  const [companies,   setCompanies]   = useState([]);
  const [employees,   setEmployees]   = useState([]);
  const [loading,     setLoading]     = useState(false);

  /* filters */
  const [company,  setCompany]  = useState("all");
  const [position, setPosition] = useState("all");
  const [status,   setStatus]   = useState("Active");
  const [search,   setSearch]   = useState("");

  /* selection */
  const [selectedIds, setSelectedIds] = useState(new Set());

  /* modals */
  const [showRules, setShowRules] = useState(false);

  useEffect(() => {
    const ep = userRole === "Super Admin" ? "/company/all" : `/company/my/${userId}`;
    api.get(ep).then(r => setCompanies(r.data)).catch(() => {});
  }, [userId, userRole]);

  const loadEmps = async () => {
    setLoading(true);
    try {
      const params = { page: 1, limit: 200, search };
      if (company !== "all") params.company_id = company;
      if (status  !== "all") params.status = status;
      const r = await api.get("/employees", { params });
      setEmployees(r.data.data || []);
    } catch {
      toast.error("ໂຫລດຂໍ້ມູນບໍ່ສຳເລັດ");
    }
    setLoading(false);
  };

  useEffect(() => { loadEmps(); }, [company, status]);

  const positionOptions = useMemo(() => {
    const set = new Set(employees.map(e => e.position).filter(Boolean));
    return [...set].sort();
  }, [employees]);

  const filtered = useMemo(() => {
    if (position === "all") return employees;
    return employees.filter(e => e.position === position);
  }, [employees, position]);

  const toggleEmp = (id) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedIds.size === filtered.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map(e => e.employee_id)));
    }
  };

  const allChecked = filtered.length > 0 && selectedIds.size === filtered.length;
  const someChecked = selectedIds.size > 0 && selectedIds.size < filtered.length;

  return (
    <div className="crf-page">
      {/* Header */}
      <div className="crf-header">
        <button className="crf-back-btn" onClick={() => navigate("/idcard")}>
          <svg viewBox="0 0 24 24" fill="none" width="18" height="18">
            <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
          Back
        </button>
        <div>
          <h1 className="crf-title">Card Request Form</h1>
          <p className="crf-sub">Select employees or uploads list to request ID Cards in batch</p>
        </div>
      </div>

      {/* ── Section 1: Select Employees ── */}
      <div className="crf-section">
        <div className="crf-section-title">1. Select Employees</div>

        {/* Filters */}
        <div className="crf-filters">
          <select
            className="crf-filter-sel"
            value={company}
            onChange={e => { setCompany(e.target.value); setSelectedIds(new Set()); }}
          >
            <option value="all">Company: All</option>
            {companies.map(c => (
              <option key={c.company_id} value={c.company_id}>
                Company: {c.companies_name}
              </option>
            ))}
          </select>

          <select
            className="crf-filter-sel"
            value={position}
            onChange={e => setPosition(e.target.value)}
          >
            <option value="all">Position: All</option>
            {positionOptions.map(p => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>

          <select
            className="crf-filter-sel"
            value={status}
            onChange={e => { setStatus(e.target.value); setSelectedIds(new Set()); }}
          >
            <option value="all">Status: All</option>
            {STATUS_OPTIONS.map(s => (
              <option key={s} value={s}>Status: {s}</option>
            ))}
          </select>
        </div>

        {/* Search */}
        <div className="crf-search-row">
          <input
            className="crf-search"
            placeholder="Search employee name or code..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            onKeyDown={e => e.key === "Enter" && loadEmps()}
          />
          <button className="crf-search-btn" onClick={loadEmps}>Search</button>
        </div>

        {/* Table */}
        <div className="crf-table-wrap">
          <table className="crf-table">
            <thead>
              <tr>
                <th className="crf-th-check">
                  <input
                    type="checkbox"
                    className="crf-checkbox"
                    checked={allChecked}
                    ref={el => { if (el) el.indeterminate = someChecked; }}
                    onChange={toggleAll}
                  />
                </th>
                <th>Employee Code</th>
                <th>Name</th>
                <th>Position</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="crf-td-empty">Loading...</td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="crf-td-empty">No employees found</td>
                </tr>
              ) : (
                filtered.map(emp => {
                  const isSel = selectedIds.has(emp.employee_id);
                  return (
                    <tr
                      key={emp.employee_id}
                      className={isSel ? "crf-row-sel" : ""}
                      onClick={() => toggleEmp(emp.employee_id)}
                    >
                      <td className="crf-td-check">
                        <input
                          type="checkbox"
                          className="crf-checkbox"
                          checked={isSel}
                          onChange={() => toggleEmp(emp.employee_id)}
                          onClick={e => e.stopPropagation()}
                        />
                      </td>
                      <td className="crf-td-code">{emp.employee_code || "–"}</td>
                      <td className="crf-td-name">{emp.firstname} {emp.lastname}</td>
                      <td>{emp.position || "–"}</td>
                      <td>
                        <span className={`crf-status-badge crf-status-${(emp.status || "").toLowerCase()}`}>
                          {emp.status || "–"}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Selected count bar + Next button */}
        <div className="crf-selected-bar">
          <svg viewBox="0 0 24 24" fill="none" width="16" height="16">
            <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="1.8"/>
            <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
          </svg>
          Selected : <strong>{selectedIds.size} Employees</strong>

          <button
            className="crf-next-btn"
            onClick={() => {
              if (selectedIds.size === 0) {
                toast.error("ກະລຸນາເລືອກພະນັກງານກ່ອນ");
                return;
              }
              const selectedEmployees = filtered.filter(e => selectedIds.has(e.employee_id));
              navigate("/idcard/request/preview", { state: { employees: selectedEmployees } });
            }}
          >
            Next: Preview Request
            <svg viewBox="0 0 24 24" fill="none" width="16" height="16" style={{ marginLeft: 8 }}>
              <path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>
      </div>

      {/* ── Section 2: Regulation ── */}
      <div className="crf-section">
        <div className="crf-section-title">2. Regulation / rule</div>
        <p className="crf-section-sub">Please read the rule and regulations before requesting ID cards.</p>
        <button className="crf-reg-row" onClick={() => setShowRules(true)}>
          <div className="crf-reg-icon">
            <svg viewBox="0 0 24 24" fill="none" width="22" height="22">
              <rect x="4" y="2" width="16" height="20" rx="2" fill="#2f4aad" opacity=".15"/>
              <rect x="4" y="2" width="16" height="20" rx="2" stroke="#2f4aad" strokeWidth="1.5" fill="none"/>
              <line x1="8" y1="8"  x2="16" y2="8"  stroke="#2f4aad" strokeWidth="1.5"/>
              <line x1="8" y1="12" x2="16" y2="12" stroke="#2f4aad" strokeWidth="1.5"/>
              <line x1="8" y1="16" x2="13" y2="16" stroke="#2f4aad" strokeWidth="1.5"/>
            </svg>
          </div>
          <div className="crf-reg-text">
            <div className="crf-reg-title">View Regulations &amp; Rules</div>
            <div className="crf-reg-sub">Click to view all rules and regulation for ID Card.</div>
          </div>
          <svg viewBox="0 0 24 24" fill="none" width="18" height="18">
            <path d="M9 18l6-6-6-6" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        </button>
      </div>

      {/* ── Rules Modal ── */}
      {showRules && (
        <div className="crf-overlay" onClick={() => setShowRules(false)}>
          <div className="crf-modal" onClick={e => e.stopPropagation()}>
            <div className="crf-modal-hdr">
              <h3>Regulations &amp; Rules for ID Cards</h3>
              <button className="crf-modal-close" onClick={() => setShowRules(false)}>✕</button>
            </div>
            <div className="crf-modal-body">
              <ol className="crf-rules-list">
                <li>ID Cards are issued only to active employees and registered external staff.</li>
                <li>Each person is entitled to one ID Card per company.</li>
                <li>Lost or damaged cards must be reported immediately to the administrator.</li>
                <li>ID Cards must be worn visibly at all times within project premises.</li>
                <li>Cards must be returned upon resignation, contract end, or termination.</li>
                <li>Sharing or lending your ID Card to another person is strictly prohibited.</li>
                <li>Any misuse of the ID Card may result in disciplinary action.</li>
                <li>Requests for new or replacement cards require manager or admin approval.</li>
              </ol>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
