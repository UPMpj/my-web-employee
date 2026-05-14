import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { api } from "../../api";
import { useCompany } from "../../context/CompanyContext";
import toast from "react-hot-toast";
import ConfirmModal from "../../components/ConfirmModal";
import "../../components/ConfirmModal.css";
import "./employees.css";

const STATUS_CLASS = {
  "Active":   "badge-active",
  "On Leave": "badge-leave",
  "Inactive": "badge-inactive",
  "Resigned": "badge-resigned",
};

function IconEye() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
      <circle cx="12" cy="12" r="3"/>
    </svg>
  );
}
function IconEdit() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
    </svg>
  );
}
function IconTrash() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="3 6 5 6 21 6"/>
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
      <path d="M10 11v6M14 11v6"/>
      <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
    </svg>
  );
}

export default function Employees() {
  const { company } = useCompany();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [employees, setEmployees]   = useState([]);
  const [companies, setCompanies]   = useState([]);
  const [loading, setLoading]       = useState(false);
  const [total, setTotal]           = useState(0);
  const [page, setPage]             = useState(1);
  const limit = 10;

  /* filters */
  const [search, setSearch]         = useState("");
  const [filterCompany, setFilterCompany] = useState("all");
  const [filterStatus, setFilterStatus]   = useState(searchParams.get("status") || "all");

  /* sync filterStatus when URL param changes (e.g. navigating from Dashboard) */
  useEffect(() => {
    const s = searchParams.get("status");
    if (s) { setFilterStatus(s); setPage(1); }
  }, [searchParams]);
  const [filterGender, setFilterGender]   = useState("all");
  const [hireFrom, setHireFrom]     = useState("");
  const [hireTo, setHireTo]         = useState("");
  const [sort, setSort]             = useState("newest");
  const [confirmId, setConfirmId]   = useState(null);

  /* ---- load companies for filter dropdown ---- */
  useEffect(() => {
    const userStr = localStorage.getItem("user");
    if (!userStr) return;
    const user = JSON.parse(userStr);
    const endpoint = user.role === "Super Admin"
      ? "/company/all"
      : `/company/my/${user.user_id}`;
    api.get(endpoint)
      .then(res => setCompanies(res.data))
      .catch(() => {});
  }, []);

  /* ---- load employees ---- */
  useEffect(() => {
    load();
  }, [company, page, search, filterCompany, filterStatus, filterGender, hireFrom, hireTo, sort]);

  const load = async () => {
    setLoading(true);
    try {
      const companyId =
        filterCompany !== "all" ? filterCompany :
        company ? company.company_id : "all";

      const res = await api.get("/employees", {
        params: {
          page, limit, search,
          company_id: companyId,
          status:     filterStatus,
          gender:     filterGender,
          hire_from:  hireFrom,
          hire_to:    hireTo,
          sort,
        },
      });
      setEmployees(res.data.data);
      setTotal(res.data.total);
    } catch {
      setEmployees([]);
    }
    setLoading(false);
  };

  /* ---- export CSV ---- */
  const exportCSV = async () => {
    try {
      const companyId =
        filterCompany !== "all" ? filterCompany :
        company ? company.company_id : "all";
      const res = await api.get("/employees", {
        params: { page: 1, limit: 9999, search, company_id: companyId, status: filterStatus, gender: filterGender, hire_from: hireFrom, hire_to: hireTo, sort },
      });
      const rows = res.data.data;
      const headers = ["#","Employee Code","First Name","Last Name","Position","Gender","Company","Status","Employee Type","Nationality","Email","Phone","Hire Date"];
      const csv = [
        headers.join(","),
        ...rows.map((e, i) => [
          i + 1,
          e.employee_code || "",
          e.firstname || "",
          e.lastname || "",
          e.position || "",
          e.gender || "",
          e.companies_name || "",
          e.status || "",
          e.employee_type || "",
          e.nationality || "",
          e.email || "",
          e.contact_no || "",
          e.hired_at ? new Date(e.hired_at).toLocaleDateString("en-GB") : "",
        ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(","))
      ].join("\n");
      const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement("a");
      a.href = url; a.download = `employees_${new Date().toISOString().slice(0,10)}.csv`;
      a.click(); URL.revokeObjectURL(url);
      toast.success("Export CSV ສຳເລັດ");
    } catch { toast.error("Export ບໍ່ສຳເລັດ"); }
  };

  /* ---- delete ---- */
  const remove = async (id) => {
    try {
      await api.delete(`/employees/${id}`);
      toast.success("ລຶບພະນັກງານສຳເລັດ");
      load();
    } catch (err) {
      toast.error(err?.response?.data?.message || "ລຶບບໍ່ສຳເລັດ");
    } finally {
      setConfirmId(null);
    }
  };

  const pages = Math.ceil(total / limit);
  const from  = total === 0 ? 0 : (page - 1) * limit + 1;
  const to    = Math.min(page * limit, total);

  const filterChange = (fn) => { setPage(1); fn(); };

  return (
    <div className="emp-page">

      {/* ===== HEADER ===== */}
      <div className="emp-header">
        <div>
          <h1>Employees</h1>
          <p className="emp-subtitle">Manage and organize all Employees.</p>
        </div>
      </div>

      {/* ===== ACTION BAR ===== */}
      <div className="emp-actions">
        <div className="emp-search-wrap">
          <span className="search-icon">&#128269;</span>
          <input
            className="emp-search"
            placeholder="search name, code, position..."
            value={search}
            onChange={e => filterChange(() => setSearch(e.target.value))}
          />
        </div>
        <div className="emp-action-right">
          <button className="btn-export" onClick={exportCSV}>&#128229; Export CSV</button>
          <button className="btn-add" onClick={() => navigate("/employees/add")}>+ Add Employees</button>
        </div>
      </div>

      {/* ===== FILTER BAR ===== */}
      <div className="emp-filters">
        {/* Row 1 — Labels */}
        <div className="filter-row filter-labels">
          <div className="filter-col">
            <span className="filter-label-blue">Company:</span>
            <span className="filter-val">
              {filterCompany === "all" ? "All" : (companies.find(c => c.company_id == filterCompany)?.companies_name || "All")}
              <span className="arrow">&#8964;</span>
            </span>
          </div>
          <div className="filter-vsep" />
          <div className="filter-col"><span className="filter-label-gray">Status</span></div>
          <div className="filter-vsep" />
          <div className="filter-col"><span className="filter-label-gray">Gender</span></div>
          <div className="filter-vsep" />
          <div className="filter-col"><span className="filter-label-gray">Hire Date</span></div>
          <div className="filter-vsep" />
          <div className="filter-col">
            <span className="filter-label-gray">Sort: </span>
            <span className="filter-val-gray">{sort === "newest" ? "Newest" : "Oldest"}</span>
          </div>
          <div className="filter-vsep" />
          <div className="filter-col">
            <button
              className="btn-reset-filter"
              onClick={() => {
                setSearch(""); setFilterCompany("all"); setFilterStatus("all");
                setFilterGender("all"); setHireFrom(""); setHireTo("");
                setSort("newest"); setPage(1);
              }}
            >&#10005; Reset</button>
          </div>
        </div>

        {/* Row 2 — Controls */}
        <div className="filter-row filter-controls">
          <div className="filter-col">
            <select className="filter-select filter-select-company"
              value={filterCompany} onChange={e => filterChange(() => setFilterCompany(e.target.value))}>
              <option value="all">All</option>
              {companies.map(c => (
                <option key={c.company_id} value={c.company_id}>{c.companies_name}</option>
              ))}
            </select>
          </div>
          <div className="filter-vsep" />
          <div className="filter-col">
            <select className="filter-select"
              value={filterStatus} onChange={e => filterChange(() => setFilterStatus(e.target.value))}>
              <option value="all">All</option>
              <option value="Active">Active</option>
              <option value="On Leave">On Leave</option>
              <option value="Inactive">Inactive</option>
              <option value="Resigned">Resigned</option>
            </select>
          </div>
          <div className="filter-vsep" />
          <div className="filter-col">
            <select className="filter-select"
              value={filterGender} onChange={e => filterChange(() => setFilterGender(e.target.value))}>
              <option value="all">All Genders</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Other">Other</option>
            </select>
          </div>
          <div className="filter-vsep" />
          <div className="filter-col filter-col-date">
            <input type="date" className="filter-date" value={hireFrom}
              placeholder="From"
              onChange={e => filterChange(() => setHireFrom(e.target.value))} />
            <span className="date-to">→</span>
            <input type="date" className="filter-date" value={hireTo}
              placeholder="To"
              onChange={e => filterChange(() => setHireTo(e.target.value))} />
          </div>
          <div className="filter-vsep" />
          <div className="filter-col">
            <select className="filter-select"
              value={sort} onChange={e => filterChange(() => setSort(e.target.value))}>
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
            </select>
          </div>
          <div className="filter-vsep" />
          <div className="filter-col" />
        </div>
      </div>

      {/* ===== SORT ROW ===== */}
      <div className="emp-sort-row">
        <span className="sort-label">Sort: {sort === "newest" ? "Newest First" : "Oldest First"} &#8964;</span>
        <div className="emp-top-pager">
          <button disabled={page === 1} onClick={() => setPage(p => p - 1)}>Prev</button>
          <span className="cur-page">{page}</span>
          {pages > 1 && <span className="page-range">{page + 1}-{pages}</span>}
          <button disabled={page === pages || pages === 0} onClick={() => setPage(p => p + 1)}>Next &gt;</button>
        </div>
      </div>

      {/* ===== TABLE ===== */}
      {loading ? (
        <div className="emp-loading">Loading...</div>
      ) : (
        <>
          <table className="emp-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Employee_code</th>
                <th>Name</th>
                <th>Company</th>
                <th>Position</th>
                <th>Status</th>
                <th>Hire Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {employees.length === 0 ? (
                <tr><td colSpan="8" className="no-data">No employees found</td></tr>
              ) : employees.map(e => (
                <tr key={e.employee_id}>
                  <td>{e.employee_id}</td>
                  <td>{e.employee_code}</td>
                  <td>{e.firstname} {e.lastname}</td>
                  <td>{e.companies_name || "-"}</td>
                  <td>{e.position}</td>
                  <td>
                    <span className={`badge ${STATUS_CLASS[e.status] || "badge-inactive"}`}>
                      {e.status}
                    </span>
                  </td>
                  <td>{e.hired_at ? new Date(e.hired_at).toLocaleDateString("en-GB", { day:"2-digit", month:"short", year:"numeric" }) : "-"}</td>
                  <td>
                    <div className="action-btns">
                      <button className="btn-icon btn-view"   title="View" onClick={() => navigate(`/employees/${e.employee_id}`)}><IconEye /></button>
                      <button className="btn-icon btn-edit"   title="Edit"   onClick={() => navigate(`/employees/edit/${e.employee_id}`)}><IconEdit /></button>
                      <button className="btn-icon btn-delete" title="Delete" onClick={() => setConfirmId(e.employee_id)}><IconTrash /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* ===== PAGINATION FOOTER ===== */}
          <div className="emp-footer">
            <span className="showing">Showing {from} to {to} of {total} Item</span>
            <div className="pager">
              <button disabled={page === 1} onClick={() => setPage(1)}>Prev</button>
              {Array.from({ length: Math.min(pages, 6) }, (_, i) => i + 1).map(n => (
                <button
                  key={n}
                  className={page === n ? "pager-active" : ""}
                  onClick={() => setPage(n)}
                >
                  {n}
                </button>
              ))}
              {pages > 6 && <span>...</span>}
              <button disabled={page === pages || pages === 0} onClick={() => setPage(pages)}>Next &gt;</button>
            </div>
          </div>
        </>
      )}

      {confirmId && (
        <ConfirmModal
          message="ລຶບພະນັກງານນີ້ແທ້ບໍ?"
          subMessage="ຂໍ້ມູນຈະຖືກລຶບ ແລະ ບໍ່ສາມາດກູ້ຄືນໄດ້"
          confirmLabel="ລຶບ"
          onConfirm={() => remove(confirmId)}
          onCancel={() => setConfirmId(null)}
        />
      )}
    </div>
  );
}
