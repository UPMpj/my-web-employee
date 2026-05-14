import { useEffect, useState } from "react";
import { api } from "../../api";
import toast from "react-hot-toast";
import "./reports.css";

const fmt = (d) => d ? new Date(d).toLocaleDateString("en-GB", { day:"2-digit", month:"short", year:"numeric" }) : "–";

const STATUS_COLOR = {
  "Active":   { bg:"#d1fae5", color:"#065f46" },
  "On Leave": { bg:"#fef3c7", color:"#92400e" },
  "Inactive": { bg:"#f3f4f6", color:"#374151" },
  "Resigned": { bg:"#fee2e2", color:"#991b1b" },
};

export default function Reports() {
  const userStr   = localStorage.getItem("user");
  const userRole  = userStr ? JSON.parse(userStr).role : "";
  const userId    = userStr ? JSON.parse(userStr).user_id : null;

  const [employees,  setEmployees]  = useState([]);
  const [companies,  setCompanies]  = useState([]);
  const [loading,    setLoading]    = useState(false);
  const [total,      setTotal]      = useState(0);

  /* filters */
  const [search,     setSearch]     = useState("");
  const [company,    setCompany]    = useState("all");
  const [status,     setStatus]     = useState("all");
  const [gender,     setGender]     = useState("all");
  const [empType,    setEmpType]    = useState("all");
  const [hireFrom,   setHireFrom]   = useState("");
  const [hireTo,     setHireTo]     = useState("");

  /* stats */
  const [stats, setStats] = useState({ total:0, active:0, resigned:0, onLeave:0 });

  useEffect(() => {
    const endpoint = userRole === "Super Admin" ? "/company/all" : `/company/my/${userId}`;
    api.get(endpoint).then(r => setCompanies(r.data)).catch(() => {});
  }, []);

  useEffect(() => { load(); }, [company, status, gender, empType, hireFrom, hireTo]);

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get("/employees", {
        params: { page: 1, limit: 9999, search, company_id: company, status, gender, hire_from: hireFrom, hire_to: hireTo },
      });
      const data = res.data.data;
      setEmployees(data);
      setTotal(data.length);
      setStats({
        total:    data.length,
        active:   data.filter(e => e.status === "Active").length,
        resigned: data.filter(e => e.status === "Resigned").length,
        onLeave:  data.filter(e => e.status === "On Leave").length,
      });
    } catch { toast.error("ໂຫຼດຂໍ້ມູນບໍ່ໄດ້"); }
    setLoading(false);
  };

  const doSearch = () => load();

  /* ---- CSV export ---- */
  const exportCSV = () => {
    const headers = ["#","Employee Code","First Name","Last Name","Position","Gender","Type","Company","Status","Nationality","Email","Phone","Hire Date"];
    const csv = [
      headers.join(","),
      ...employees.map((e, i) => [
        i+1, e.employee_code||"", e.firstname||"", e.lastname||"",
        e.position||"", e.gender||"", e.employee_type||"",
        e.companies_name||"", e.status||"", e.nationality||"",
        e.email||"", e.contact_no||"",
        e.hired_at ? new Date(e.hired_at).toLocaleDateString("en-GB") : "",
      ].map(v => `"${String(v).replace(/"/g,'""')}"`).join(","))
    ].join("\n");
    const blob = new Blob(["﻿"+csv], { type:"text/csv;charset=utf-8;" });
    const a = Object.assign(document.createElement("a"), { href: URL.createObjectURL(blob), download:`report_${new Date().toISOString().slice(0,10)}.csv` });
    a.click(); URL.revokeObjectURL(a.href);
    toast.success("Export CSV ສຳເລັດ");
  };

  /* ---- Print ---- */
  const printReport = () => {
    const rows = employees.map((e, i) => `
      <tr>
        <td>${i+1}</td><td>${e.employee_code||"–"}</td>
        <td>${e.firstname||""} ${e.lastname||""}</td>
        <td>${e.position||"–"}</td><td>${e.companies_name||"–"}</td>
        <td>${e.status||"–"}</td><td>${e.employee_type||"–"}</td>
        <td>${e.hired_at ? new Date(e.hired_at).toLocaleDateString("en-GB") : "–"}</td>
      </tr>`).join("");
    const w = window.open("","_blank","width=1000,height=700");
    w.document.write(`<!DOCTYPE html><html><head><title>Employee Report</title>
      <style>body{font-family:sans-serif;padding:24px;font-size:12px}
      h2{margin:0 0 16px}table{width:100%;border-collapse:collapse}
      th,td{border:1px solid #ddd;padding:6px 10px;text-align:left}
      th{background:#2f4aad;color:#fff}tr:nth-child(even){background:#f9f9f9}
      @media print{body{padding:0}}</style></head><body>
      <h2>Employee Report — ${new Date().toLocaleDateString("en-GB")}</h2>
      <p>ທັງໝົດ: ${stats.total} | Active: ${stats.active} | Resigned: ${stats.resigned} | On Leave: ${stats.onLeave}</p>
      <table><thead><tr><th>#</th><th>Code</th><th>Name</th><th>Position</th><th>Company</th><th>Status</th><th>Type</th><th>Hire Date</th></tr></thead>
      <tbody>${rows}</tbody></table>
      <script>window.onload=()=>{window.print();window.onafterprint=()=>window.close();}</script>
      </body></html>`);
    w.document.close();
  };

  const filtered = employees.filter(e =>
    empType === "all" || e.employee_type === empType
  ).filter(e =>
    !search || `${e.firstname} ${e.lastname} ${e.employee_code} ${e.position}`.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="rp-page">
      {/* Header */}
      <div className="rp-header">
        <div>
          <h1 className="rp-title">Reports</h1>
          <p className="rp-sub">ລາຍງານຂໍ້ມູນພະນັກງານທັງໝົດ</p>
        </div>
        <div className="rp-header-actions">
          <button className="rp-btn rp-btn-csv" onClick={exportCSV}>&#128229; Export CSV</button>
          <button className="rp-btn rp-btn-print" onClick={printReport}>&#128424; Print</button>
        </div>
      </div>

      {/* Stats */}
      <div className="rp-stats">
        {[
          { label:"ທັງໝົດ",    value: stats.total,    color:"#2f4aad" },
          { label:"Active",    value: stats.active,   color:"#059669" },
          { label:"Resigned",  value: stats.resigned, color:"#dc2626" },
          { label:"On Leave",  value: stats.onLeave,  color:"#d97706" },
        ].map(s => (
          <div key={s.label} className="rp-stat-box">
            <div className="rp-stat-val" style={{ color: s.color }}>{s.value}</div>
            <div className="rp-stat-lbl">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="rp-filters">
        <input className="rp-search" placeholder="ຄົ້ນຫາຊື່, ລະຫັດ, ຕຳແໜ່ງ..."
          value={search} onChange={e => setSearch(e.target.value)}
          onKeyDown={e => e.key === "Enter" && doSearch()} />

        <select className="rp-select" value={company} onChange={e => setCompany(e.target.value)}>
          <option value="all">All Companies</option>
          {companies.map(c => <option key={c.company_id} value={c.company_id}>{c.companies_name}</option>)}
        </select>

        <select className="rp-select" value={status} onChange={e => setStatus(e.target.value)}>
          <option value="all">All Status</option>
          <option value="Active">Active</option>
          <option value="On Leave">On Leave</option>
          <option value="Inactive">Inactive</option>
          <option value="Resigned">Resigned</option>
        </select>

        <select className="rp-select" value={gender} onChange={e => setGender(e.target.value)}>
          <option value="all">All Gender</option>
          <option value="Male">Male</option>
          <option value="Female">Female</option>
        </select>

        <select className="rp-select" value={empType} onChange={e => setEmpType(e.target.value)}>
          <option value="all">All Types</option>
          <option value="Full-time">Full-time</option>
          <option value="Part-time">Part-time</option>
          <option value="Contract">Contract</option>
          <option value="Intern">Intern</option>
        </select>

        <div className="rp-date-wrap">
          <input type="date" className="rp-date" value={hireFrom} onChange={e => setHireFrom(e.target.value)} title="Hire From" />
          <span className="rp-date-sep">–</span>
          <input type="date" className="rp-date" value={hireTo} onChange={e => setHireTo(e.target.value)} title="Hire To" />
        </div>

        <button className="rp-search-btn" onClick={doSearch}>ຄົ້ນຫາ</button>
      </div>

      {/* Table */}
      <div className="rp-table-wrap">
        {loading ? (
          <div className="rp-loading">Loading...</div>
        ) : (
          <table className="rp-table">
            <thead>
              <tr>
                {["#","ລະຫັດ","ຊື່-ນາມສະກຸນ","ຕຳແໜ່ງ","ປະເພດ","ບໍລິສັດ","ສະຖານະ","ວັນທີເຂົ້າວຽກ"].map(h => (
                  <th key={h}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan="8" className="rp-empty">ບໍ່ມີຂໍ້ມູນ</td></tr>
              ) : filtered.map((e, i) => {
                const sc = STATUS_COLOR[e.status] || { bg:"#f3f4f6", color:"#374151" };
                return (
                  <tr key={e.employee_id}>
                    <td className="rp-td-num">{i + 1}</td>
                    <td className="rp-td-code">{e.employee_code || "–"}</td>
                    <td className="rp-td-name">{e.firstname} {e.lastname}</td>
                    <td>{e.position || "–"}</td>
                    <td>{e.employee_type || "–"}</td>
                    <td>{e.companies_name || "–"}</td>
                    <td>
                      <span className="rp-badge" style={{ background: sc.bg, color: sc.color }}>
                        {e.status}
                      </span>
                    </td>
                    <td>{fmt(e.hired_at)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
        {!loading && filtered.length > 0 && (
          <div className="rp-footer">ສະແດງ {filtered.length} / {total} ລາຍການ</div>
        )}
      </div>
    </div>
  );
}
