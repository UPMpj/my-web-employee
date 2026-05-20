import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { api, API_BASE } from "../../api";
import { useCompany } from "../../context/CompanyContext";
import toast from "react-hot-toast";
import ConfirmModal from "../../components/ConfirmModal";
import "../../components/ConfirmModal.css";
import "./employees.css";

const STATUS_STYLE = {
  "Active":   { bg: "#dcfce7", color: "#15803d" },
  "On Leave": { bg: "#dbeafe", color: "#1d4ed8" },
  "Inactive": { bg: "#f3f4f6", color: "#6b7280" },
  "Resigned": { bg: "#fee2e2", color: "#dc2626" },
};

function initials(f, l) {
  return `${f?.[0] || ""}${l?.[0] || ""}`.toUpperCase();
}

function Avatar({ emp }) {
  if (emp.photo) {
    return <img src={`${API_BASE}${emp.photo}`} alt="" className="emp-avatar-img" />;
  }
  const colors = ["#2f4aad","#059669","#7c3aed","#db2777","#d97706","#0891b2"];
  const bg = colors[(emp.employee_id || 0) % colors.length];
  return (
    <div className="emp-avatar-init" style={{ background: bg }}>
      {initials(emp.firstname, emp.lastname)}
    </div>
  );
}

function IconSearch() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2">
      <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
    </svg>
  );
}
function IconEye() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
      <circle cx="12" cy="12" r="3"/>
    </svg>
  );
}
function IconEdit() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
    </svg>
  );
}
function IconTrash() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="3 6 5 6 21 6"/>
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
      <path d="M10 11v6M14 11v6"/>
      <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
    </svg>
  );
}
function IconExport() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
      <polyline points="7 10 12 15 17 10"/>
      <line x1="12" y1="15" x2="12" y2="3"/>
    </svg>
  );
}

export default function Employees() {
  const { company } = useCompany();
  const navigate    = useNavigate();
  const [searchParams] = useSearchParams();
  const currentUser = JSON.parse(localStorage.getItem("user") || "{}");
  const isCompanyAdmin = currentUser.role === "Company Admin";

  const [employees,      setEmployees]      = useState([]);
  const [companies,      setCompanies]      = useState([]);
  const [loading,        setLoading]        = useState(false);
  const [total,          setTotal]          = useState(0);
  const [page,           setPage]           = useState(1);
  const [confirmId,      setConfirmId]      = useState(null);
  const limit = 200;

  const [search,         setSearch]         = useState("");
  const [filterCompany,  setFilterCompany]  = useState("all");
  const [filterStatus,   setFilterStatus]   = useState(searchParams.get("status") || "all");
  const [filterGender,   setFilterGender]   = useState("all");
  const [hireFrom,       setHireFrom]       = useState("");
  const [hireTo,         setHireTo]         = useState("");
  const [sort,           setSort]           = useState("newest");
  const [sortCol,        setSortCol]        = useState("");
  const [sortDir,        setSortDir]        = useState("asc");

  useEffect(() => {
    const s = searchParams.get("status");
    if (s) { setFilterStatus(s); setPage(1); }
  }, [searchParams]);

  useEffect(() => {
    const userStr = localStorage.getItem("user");
    if (!userStr) return;
    const user = JSON.parse(userStr);
    const ep = user.role === "Super Admin" ? "/company/all" : `/company/my/${user.user_id}`;
    api.get(ep).then(r => setCompanies(r.data)).catch(() => {});
  }, []);

  useEffect(() => { load(); }, [company, page, search, filterCompany, filterStatus, filterGender, hireFrom, hireTo, sort]);

  const load = async () => {
    setLoading(true);
    try {
      const cid = filterCompany !== "all" ? filterCompany : company ? company.company_id : "all";
      const res = await api.get("/employees", {
        params: { page, limit, search, company_id: cid, status: filterStatus, gender: filterGender, hire_from: hireFrom, hire_to: hireTo, sort },
      });
      setEmployees(res.data.data);
      setTotal(res.data.total);
    } catch { setEmployees([]); }
    setLoading(false);
  };

  const exportCSV = async () => {
    try {
      const cid = filterCompany !== "all" ? filterCompany : company ? company.company_id : "all";
      const res = await api.get("/employees", { params: { page: 1, limit: 9999, search, company_id: cid, status: filterStatus, gender: filterGender, hire_from: hireFrom, hire_to: hireTo, sort } });
      const rows = res.data.data;
      const headers = ["#","Employee Code","First Name","Last Name","Position","Gender","Company","Status","Employee Type","Nationality","Email","Phone","Hire Date"];
      const csv = [
        headers.join(","),
        ...rows.map((e, i) => [
          i+1, e.employee_code||"", e.firstname||"", e.lastname||"", e.position||"",
          e.gender||"", e.companies_name||"", e.status||"", e.employee_type||"",
          e.nationality||"", e.email||"", e.contact_no||"",
          e.hired_at ? new Date(e.hired_at).toLocaleDateString("en-GB") : "",
        ].map(v => `"${String(v).replace(/"/g,'""')}"`).join(","))
      ].join("\n");
      const blob = new Blob(["﻿"+csv], { type:"text/csv;charset=utf-8;" });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement("a");
      a.href = url; a.download = `employees_${new Date().toISOString().slice(0,10)}.csv`;
      a.click(); URL.revokeObjectURL(url);
      toast.success("Export CSV ສຳເລັດ");
    } catch { toast.error("Export ບໍ່ສຳເລັດ"); }
  };

  const remove = async (id) => {
    try {
      const res = await api.delete(`/employees/${id}`);
      if (res.data?.pending) {
        toast.success("ສົ່ງຄຳຂໍລຶບໄປຍັງ Super Admin ແລ້ວ — ລໍຖ້າການອະນຸຍາດ", { duration: 4000 });
      } else {
        toast.success("ລຶບພະນັກງານສຳເລັດ");
        load();
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || "ລຶບບໍ່ສຳເລັດ");
    } finally { setConfirmId(null); }
  };

  const resetFilters = () => {
    setSearch(""); setFilterCompany("all"); setFilterStatus("all");
    setFilterGender("all"); setHireFrom(""); setHireTo(""); setSort("newest"); setPage(1);
  };

  const pages = Math.ceil(total / limit);
  const from  = total === 0 ? 0 : (page - 1) * limit + 1;
  const to    = Math.min(page * limit, total);
  const fc    = (fn) => { setPage(1); fn(); };

  const hasFilter = search || filterCompany !== "all" || filterStatus !== "all" || filterGender !== "all" || hireFrom || hireTo;

  const handleSort = (col) => {
    if (sortCol === col) {
      setSortDir(d => d === "asc" ? "desc" : "asc");
    } else {
      setSortCol(col);
      setSortDir("asc");
    }
  };

  const sortedEmployees = [...employees].sort((a, b) => {
    if (!sortCol) return 0;
    let av = a[sortCol] ?? "";
    let bv = b[sortCol] ?? "";
    if (sortCol === "hired_at") {
      av = av ? new Date(av).getTime() : 0;
      bv = bv ? new Date(bv).getTime() : 0;
    } else {
      av = String(av).toLowerCase();
      bv = String(bv).toLowerCase();
    }
    if (av < bv) return sortDir === "asc" ? -1 : 1;
    if (av > bv) return sortDir === "asc" ? 1 : -1;
    return 0;
  });

  return (
    <div className="emp-page">

      {/* ── Header ── */}
      <div className="emp-topbar">
        <div>
          <h1 className="emp-title">Employees</h1>
          <p className="emp-sub">Manage and organize all employees.</p>
        </div>
        <div className="emp-topbar-right">
          <button className="emp-btn-outline" onClick={exportCSV}>
            <IconExport /> Export CSV
          </button>
          <button className="emp-btn-outline" onClick={() => navigate("/import")}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="7 10 12 15 17 10"/>
              <line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            Import
          </button>
          <button className="emp-btn-primary" onClick={() => navigate("/employees/add")}>
            + Add Employee
          </button>
        </div>
      </div>

      {/* ── Filter bar ── */}
      <div className="emp-filterbar">
        {/* Search */}
        <div className="emp-search-box">
          <IconSearch />
          <input
            className="emp-search-input"
            placeholder="ຄົ້ນຫາຊື່, ລະຫັດ, ຕຳແໜ່ງ..."
            value={search}
            onChange={e => fc(() => setSearch(e.target.value))}
          />
        </div>

        {/* Dropdowns */}
        <select className="emp-filter-select" value={filterCompany} onChange={e => fc(() => setFilterCompany(e.target.value))}>
          <option value="all">🏢 All Companies</option>
          {companies.map(c => <option key={c.company_id} value={c.company_id}>{c.companies_name}</option>)}
        </select>

        <select className="emp-filter-select" value={filterStatus} onChange={e => fc(() => setFilterStatus(e.target.value))}>
          <option value="all">📋 All Status</option>
          <option value="Active">Active</option>
          <option value="On Leave">On Leave</option>
          <option value="Inactive">Inactive</option>
          <option value="Resigned">Resigned</option>
        </select>

        <select className="emp-filter-select" value={filterGender} onChange={e => fc(() => setFilterGender(e.target.value))}>
          <option value="all">👤 All Gender</option>
          <option value="Male">Male</option>
          <option value="Female">Female</option>
        </select>

        <select className="emp-filter-select" value={sort} onChange={e => fc(() => setSort(e.target.value))}>
          <option value="newest">↓ Newest</option>
          <option value="oldest">↑ Oldest</option>
        </select>

        {/* Date range */}
        <div className="emp-date-range">
          <input type="date" className="emp-date-input" value={hireFrom} onChange={e => fc(() => setHireFrom(e.target.value))} />
          <span className="emp-date-sep">–</span>
          <input type="date" className="emp-date-input" value={hireTo}   onChange={e => fc(() => setHireTo(e.target.value))} />
        </div>

        {hasFilter && (
          <button className="emp-btn-reset" onClick={resetFilters}>✕ Reset</button>
        )}
      </div>

      {/* ── Result info ── */}
      <div className="emp-result-row">
        <span className="emp-result-text">
          {loading ? "ກຳລັງໂຫລດ..." : `ພົບ ${total.toLocaleString()} ລາຍການ${from > 0 ? ` (ສະແດງ ${from}–${to})` : ""}`}
        </span>
        {pages > 1 && (
          <div className="emp-mini-pager">
            <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}>‹</button>
            <span>{page} / {pages}</span>
            <button disabled={page >= pages} onClick={() => setPage(p => p + 1)}>›</button>
          </div>
        )}
      </div>

      {/* ── Table ── */}
      <div className="emp-table-wrap">
        <table className="emp-table">
          <thead>
            <tr>
              <th className="emp-th emp-th-no">#</th>
              <th className="emp-th emp-th-avatar"></th>
              {[
                { label: "ພະນັກງານ",     col: "firstname" },
                { label: "ລະຫັດ",         col: "employee_code" },
                { label: "ບໍລິສັດ",       col: "companies_name" },
                { label: "ຕຳແໜ່ງ",        col: "position" },
                { label: "ສະຖານະ",        col: "status" },
                { label: "ວັນທີເຂົ້າວຽກ", col: "hired_at" },
              ].map(({ label, col }) => (
                <th
                  key={col}
                  className={`emp-th emp-th-sort${sortCol === col ? " emp-th-active" : ""}`}
                  onClick={() => handleSort(col)}
                >
                  {label}
                  <span className="emp-sort-arrow">
                    {sortCol === col ? (sortDir === "asc" ? " ↑" : " ↓") : " ⇅"}
                  </span>
                </th>
              ))}
              <th className="emp-th emp-th-actions">ຈັດການ</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="9" className="emp-td-empty">
                <div className="emp-skeleton-rows">
                  {[...Array(5)].map((_, i) => <div key={i} className="emp-skeleton-row"/>)}
                </div>
              </td></tr>
            ) : employees.length === 0 ? (
              <tr><td colSpan="9" className="emp-td-empty">
                <div className="emp-empty-state">
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" strokeWidth="1.5">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                    <circle cx="9" cy="7" r="4"/>
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>
                  </svg>
                  <p>ບໍ່ພົບຂໍ້ມູນພະນັກງານ</p>
                  {hasFilter && <button className="emp-btn-outline" onClick={resetFilters}>ລ້າງ filter</button>}
                </div>
              </td></tr>
            ) : sortedEmployees.map((e, idx) => {
              const ss = STATUS_STYLE[e.status] || STATUS_STYLE["Inactive"];
              return (
                <tr key={e.employee_id} className="emp-tr" onClick={() => navigate(`/employees/${e.employee_id}`)}>
                  <td className="emp-td emp-td-no">{(page - 1) * limit + idx + 1}</td>
                  <td className="emp-td emp-td-avatar">
                    <Avatar emp={e} />
                  </td>
                  <td className="emp-td">
                    <div className="emp-name">{e.firstname} {e.lastname}</div>
                    {e.email && <div className="emp-email">{e.email}</div>}
                  </td>
                  <td className="emp-td">
                    <span className="emp-code">{e.employee_code || "–"}</span>
                  </td>
                  <td className="emp-td">
                    <span className="emp-company">{e.companies_name || "–"}</span>
                  </td>
                  <td className="emp-td">
                    <span className="emp-position">{e.position || "–"}</span>
                  </td>
                  <td className="emp-td">
                    <span className="emp-status-chip" style={{ background: ss.bg, color: ss.color }}>
                      {e.status}
                    </span>
                  </td>
                  <td className="emp-td emp-td-date">
                    {e.hired_at ? new Date(e.hired_at).toLocaleDateString("en-GB", { day:"2-digit", month:"short", year:"numeric" }) : "–"}
                  </td>
                  <td className="emp-td emp-td-actions" onClick={ev => ev.stopPropagation()}>
                    <div className="emp-action-group">
                      <button className="emp-icon-btn emp-icon-view" title="ເບິ່ງ" onClick={() => navigate(`/employees/${e.employee_id}`)}>
                        <IconEye />
                      </button>
                      <button className="emp-icon-btn emp-icon-edit" title="ແກ້ໄຂ" onClick={() => navigate(`/employees/edit/${e.employee_id}`)}>
                        <IconEdit />
                      </button>
                      <button className="emp-icon-btn emp-icon-del" title="ລຶບ" onClick={() => setConfirmId(e.employee_id)}>
                        <IconTrash />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* ── Pagination ── */}
      {!loading && pages > 1 && (
        <div className="emp-pagination">
          <span className="emp-pg-info">ສະແດງ {from}–{to} ຈາກ {total} ລາຍການ</span>
          <div className="emp-pg-btns">
            <button className="emp-pg-btn" disabled={page <= 1} onClick={() => setPage(1)}>«</button>
            <button className="emp-pg-btn" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>‹</button>
            {Array.from({ length: Math.min(pages, 7) }, (_, i) => {
              let n;
              if (pages <= 7) n = i + 1;
              else if (page <= 4) n = i + 1;
              else if (page >= pages - 3) n = pages - 6 + i;
              else n = page - 3 + i;
              return (
                <button key={n} className={`emp-pg-btn ${page === n ? "emp-pg-active" : ""}`} onClick={() => setPage(n)}>
                  {n}
                </button>
              );
            })}
            <button className="emp-pg-btn" disabled={page >= pages} onClick={() => setPage(p => p + 1)}>›</button>
            <button className="emp-pg-btn" disabled={page >= pages} onClick={() => setPage(pages)}>»</button>
          </div>
        </div>
      )}

      {confirmId && (
        <ConfirmModal
          message={isCompanyAdmin ? "ສົ່ງຄຳຂໍລຶບພະນັກງານ?" : "ລຶບພະນັກງານນີ້ແທ້ບໍ?"}
          subMessage={isCompanyAdmin
            ? "ຄຳຂໍຈະຖືກສົ່ງໃຫ້ Super Admin ອະນຸຍາດກ່ອນ"
            : "ຂໍ້ມູນຈະຖືກລຶບ ແລະ ບໍ່ສາມາດກູ້ຄືນໄດ້"}
          confirmLabel={isCompanyAdmin ? "ສົ່ງຄຳຂໍ" : "ລຶບ"}
          danger
          onConfirm={() => remove(confirmId)}
          onCancel={() => setConfirmId(null)}
        />
      )}
    </div>
  );
}
