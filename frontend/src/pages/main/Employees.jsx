import { useEffect, useState, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useCurrentUser } from "../../hooks/useCurrentUser";
import { api, API_BASE, photoUrl as getPhotoUrl } from "../../api";
import { useCompany } from "../../context/CompanyContext";
import { useLanguage } from "../../context/LanguageContext";
import toast from "react-hot-toast";
import ConfirmModal from "../../components/ConfirmModal";
import "../../components/ConfirmModal.css";
import SkeletonLoader from "../../components/SkeletonLoader";
import EmptyState from "../../components/EmptyState";
import "./employees.css";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import JSZip from "jszip";
import { csvCell } from "../../utils/csvCell";

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
    return <img src={getPhotoUrl(emp.photo)} alt="" className="emp-avatar-img" />;
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
function IconViewList() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="3" y1="6" x2="21" y2="6"/>
      <line x1="3" y1="12" x2="21" y2="12"/>
      <line x1="3" y1="18" x2="21" y2="18"/>
    </svg>
  );
}
function IconViewGrid() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="3" width="7" height="7" rx="1.5"/>
      <rect x="14" y="3" width="7" height="7" rx="1.5"/>
      <rect x="3" y="14" width="7" height="7" rx="1.5"/>
      <rect x="14" y="14" width="7" height="7" rx="1.5"/>
    </svg>
  );
}

export default function Employees() {
  const { company } = useCompany();
  const navigate    = useNavigate();
  const { t }       = useLanguage();
  const [searchParams] = useSearchParams();
  const currentUser = useCurrentUser();
  const isCompanyAdmin = currentUser.role === "Company Admin";

  const [employees,      setEmployees]      = useState([]);
  const [companies,      setCompanies]      = useState([]);
  const [loading,        setLoading]        = useState(false);
  const [total,          setTotal]          = useState(0);
  const [page,           setPage]           = useState(1);
  const [confirmId,      setConfirmId]      = useState(null);
  const [selectedIds,    setSelectedIds]    = useState(new Set());
  const [confirmBulk,    setConfirmBulk]    = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showTurnstileModal, setShowTurnstileModal] = useState(false);
  const [turnstileCompany,   setTurnstileCompany]   = useState("all");
  const [turnstileBusy,      setTurnstileBusy]       = useState(false);
  const [pendingBatches,     setPendingBatches]      = useState([]);
  const [justExported,       setJustExported]        = useState(null);
  const [tnsCandidates,      setTnsCandidates]       = useState([]);
  const [tnsCandidatesLoading, setTnsCandidatesLoading] = useState(false);
  const [tnsSelectedIds,     setTnsSelectedIds]      = useState(new Set());
  const [tnsSearch,          setTnsSearch]           = useState("");
  const [viewMode,       setViewMode]       = useState(() => localStorage.getItem("emp_view_mode") || "table");
  const exportMenuRef = useRef(null);
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
    if (!currentUser.user_id) return;
    const ep = currentUser.role === "Super Admin" ? "/company/all" : `/company/my/${currentUser.user_id}`;
    api.get(ep).then(r => setCompanies(r.data)).catch(() => {});
  }, [currentUser.user_id]);

  useEffect(() => { load(); }, [company, page, search, filterCompany, filterStatus, filterGender, hireFrom, hireTo, sort]);

  useEffect(() => { loadPendingTurnstileBatches(); }, []);

  useEffect(() => {
    if (showTurnstileModal) loadTurnstileCandidates(turnstileCompany);
  }, [showTurnstileModal, turnstileCompany]);

  const loadPendingTurnstileBatches = async () => {
    try {
      const res = await api.get("/employees/export/turnstile/pending");
      setPendingBatches(res.data);
    } catch { /* non-critical */ }
  };

  const loadTurnstileCandidates = async (companyId) => {
    setTnsCandidatesLoading(true);
    try {
      const res = await api.get("/employees/export/turnstile/candidates", { params: { company_id: companyId } });
      setTnsCandidates(res.data);
      setTnsSelectedIds(new Set(res.data.filter(c => !c.turnstile_exported_at).map(c => c.employee_id)));
    } catch {
      setTnsCandidates([]);
    } finally {
      setTnsCandidatesLoading(false);
    }
  };

  const toggleTnsCandidate = (id) => {
    setTnsSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const tnsFilteredCandidates = tnsCandidates.filter(c => {
    if (!tnsSearch) return true;
    const s = tnsSearch.toLowerCase();
    return `${c.firstname || ""} ${c.lastname || ""} ${c.employee_code || ""}`.toLowerCase().includes(s);
  });

  useEffect(() => {
    const handler = (e) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(e.target)) {
        setShowExportMenu(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const load = async () => {
    setLoading(true);
    try {
      const cid = filterCompany !== "all" ? filterCompany : "all";
      const res = await api.get("/employees", {
        params: { page, limit, search, company_id: cid, status: filterStatus, gender: filterGender, hire_from: hireFrom, hire_to: hireTo, sort },
      });
      setEmployees(res.data.data);
      setTotal(res.data.total);
    } catch { setEmployees([]); }
    setLoading(false);
  };

  const fetchAllForExport = async () => {
    const cid = filterCompany !== "all" ? filterCompany : "all";
    const res = await api.get("/employees", { params: { page: 1, limit: 9999, search, company_id: cid, status: filterStatus, gender: filterGender, hire_from: hireFrom, hire_to: hireTo, sort } });
    return res.data.data;
  };

  const exportCSV = async () => {
    try {
      const rows = await fetchAllForExport();
      const headers = ["#","Employee Code","First Name","Last Name","Position","Gender","Company","Status","Employee Type","Nationality","Email","Phone","Hire Date"];
      const csv = [
        headers.join(","),
        ...rows.map((e, i) => [
          i+1, e.employee_code||"", e.firstname||"", e.lastname||"", e.position||"",
          e.gender||"", e.companies_name||"", e.status||"", e.employee_type||"",
          e.nationality||"", e.email||"", e.contact_no||"",
          e.hired_at ? new Date(e.hired_at).toLocaleDateString("en-GB") : "",
        ].map(csvCell).join(","))
      ].join("\n");
      const blob = new Blob(["﻿"+csv], { type:"text/csv;charset=utf-8;" });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement("a");
      a.href = url; a.download = `employees_${new Date().toISOString().slice(0,10)}.csv`;
      a.click(); URL.revokeObjectURL(url);
      toast.success("Export CSV successful");
    } catch { toast.error("Export failed"); }
  };

  const exportExcel = async () => {
    try {
      const rows = await fetchAllForExport();
      const headers = ["#","Employee Code","First Name","Last Name","Position","Gender","Company","Status","Employee Type","Nationality","Email","Phone","Hire Date"];
      const data = rows.map((e, i) => [
        i+1, e.employee_code||"", e.firstname||"", e.lastname||"", e.position||"",
        e.gender||"", e.companies_name||"", e.status||"", e.employee_type||"",
        e.nationality||"", e.email||"", e.contact_no||"",
        e.hired_at ? new Date(e.hired_at).toLocaleDateString("en-GB") : "",
      ]);
      const ws = XLSX.utils.aoa_to_sheet([headers, ...data]);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Employees");
      XLSX.writeFile(wb, `employees_${new Date().toISOString().slice(0,10)}.xlsx`);
      toast.success("Export Excel successful");
    } catch { toast.error("Export failed"); }
  };

  const exportPDF = async () => {
    try {
      const rows = await fetchAllForExport();
      const doc = new jsPDF({ orientation: "landscape" });
      doc.setFontSize(14);
      doc.text("Employee List", 14, 16);
      autoTable(doc, {
        startY: 22,
        styles: { fontSize: 9 },
        head: [["#","Code","First Name","Last Name","Position","Company","Status","Hire Date"]],
        body: rows.map((e, i) => [
          i+1, e.employee_code||"", e.firstname||"", e.lastname||"", e.position||"",
          e.companies_name||"", e.status||"",
          e.hired_at ? new Date(e.hired_at).toLocaleDateString("en-GB") : "",
        ]),
      });
      doc.save(`employees_${new Date().toISOString().slice(0,10)}.pdf`);
      toast.success("Export PDF successful");
    } catch { toast.error("Export failed"); }
  };

  const exportPhotos = async () => {
    const toastId = toast.loading("ກຳລັງດາວໂຫລດຮູບ...");
    try {
      const rows = await fetchAllForExport();
      const withPhotos = rows.filter(e => e.photo);

      if (withPhotos.length === 0) {
        toast.error("ບໍ່ມີຮູບໃຫ້ export", { id: toastId });
        return;
      }

      const zip = new JSZip();
      const rootName = `Photo_${new Date().toISOString().replace(/[-:T]/g, "").slice(0, 14)}`;
      const root = zip.folder(rootName);
      const companyFolders = {};

      let done = 0;
      await Promise.all(withPhotos.map(async (emp) => {
        try {
          const url = getPhotoUrl(emp.photo);
          const res = await fetch(url);
          if (!res.ok) return;
          const blob = await res.blob();
          const ext = emp.photo.split(".").pop()?.split("?")[0] || "jpg";
          const name = emp.employee_code || String(emp.employee_id);
          const company = emp.companies_name || "Unknown";
          if (!companyFolders[company]) {
            companyFolders[company] = root.folder(company);
          }
          companyFolders[company].file(`${name}.${ext}`, blob);
          done++;
        } catch { /* skip unavailable */ }
      }));

      const content = await zip.generateAsync({ type: "blob" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(content);
      a.download = `${rootName}.zip`;
      a.click();
      URL.revokeObjectURL(a.href);
      toast.success(`Export ຮູບສຳເລັດ ${done} ຮູບ`, { id: toastId });
    } catch {
      toast.error("Export ຮູບລົ້ມເຫລວ", { id: toastId });
    }
  };

  const openTurnstileModal = () => {
    setTurnstileCompany(filterCompany);
    setTnsSearch("");
    setJustExported(null);
    setShowTurnstileModal(true);
    loadPendingTurnstileBatches();
  };

  const runTurnstileExport = async () => {
    if (tnsSelectedIds.size === 0) { toast.error("ກະລຸນາເລືອກພະນັກງານກ່ອນ"); return; }
    setTurnstileBusy(true);
    try {
      const token = localStorage.getItem("token");
      const params = new URLSearchParams({ employee_ids: Array.from(tnsSelectedIds).join(",") });
      const res = await fetch(`${API_BASE}/api/employees/export/turnstile?${params}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error("export failed");
      const batchId = res.headers.get("X-Batch-Id");
      const count   = res.headers.get("X-Employee-Count");
      const blob    = await res.blob();

      if (!batchId || !count || count === "0") {
        toast.error("ບໍ່ມີພະນັກງານທີ່ເລືອກໃຫ້ Export");
        return;
      }

      const url = URL.createObjectURL(blob);
      const a   = Object.assign(document.createElement("a"), {
        href: url, download: `turnstile_export_${new Date().toISOString().slice(0, 10)}.xlsx`,
      });
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`ດາວໂຫລດໄຟລ໌ສຳເລັດ (${count} ຄົນ)`);
      setJustExported({ batch_id: batchId, employee_count: count });
      loadPendingTurnstileBatches();
      loadTurnstileCandidates(turnstileCompany);
    } catch {
      toast.error("Export ບໍ່ສຳເລັດ");
    } finally {
      setTurnstileBusy(false);
    }
  };

  const confirmTurnstileBatch = async (batchId) => {
    try {
      await api.post(`/employees/export/turnstile/${batchId}/confirm`);
      toast.success("ຢືນຢັນສຳເລັດ — ບໍ່ຕ້ອງ Export ຄົນເຫຼົ່ານີ້ຄືນອີກ");
      if (justExported?.batch_id === String(batchId)) setJustExported(null);
      loadPendingTurnstileBatches();
      loadTurnstileCandidates(turnstileCompany);
    } catch {
      toast.error("ຢືນຢັນບໍ່ສຳເລັດ");
    }
  };

  const dismissTurnstileBatch = async (batchId) => {
    try {
      await api.post(`/employees/export/turnstile/${batchId}/dismiss`);
      if (justExported?.batch_id === String(batchId)) setJustExported(null);
      loadPendingTurnstileBatches();
    } catch {
      toast.error("ປິດບໍ່ສຳເລັດ");
    }
  };

  const remove = async (id) => {
    try {
      const res = await api.delete(`/employees/${id}`);
      if (res.data?.pending) {
        toast.success("Delete request sent to Super Admin — waiting for approval", { duration: 4000 });
      } else {
        toast.success("Employee deleted successfully");
        load();
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || "Delete failed");
    } finally { setConfirmId(null); }
  };

  const removeBulk = async () => {
    try {
      const ids = Array.from(selectedIds);
      const res = await api.delete("/employees/bulk", { data: { ids } });
      if (res.data?.pending) {
        toast.success(`ສົ່ງຄຳຂໍລົບ ${res.data.count} ຄົນໄປຍັງ Super Admin ແລ້ວ`, { duration: 4000 });
      } else {
        toast.success(`ລົບ ${res.data.count} ຄົນສຳເລັດ`);
        load();
      }
      setSelectedIds(new Set());
    } catch (err) {
      toast.error(err?.response?.data?.message || "Bulk delete failed");
    } finally { setConfirmBulk(false); }
  };

  const toggleSelect = (id) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === sortedEmployees.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(sortedEmployees.map(e => e.employee_id)));
    }
  };

  const changeViewMode = (mode) => {
    setViewMode(mode);
    localStorage.setItem("emp_view_mode", mode);
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
          <div className="emp-view-toggle">
            <button
              className={`emp-view-btn${viewMode === "table" ? " emp-view-btn-active" : ""}`}
              title={t("view_table")}
              onClick={() => changeViewMode("table")}
            >
              <IconViewList />
            </button>
            <button
              className={`emp-view-btn${viewMode === "grid" ? " emp-view-btn-active" : ""}`}
              title={t("view_grid")}
              onClick={() => changeViewMode("grid")}
            >
              <IconViewGrid />
            </button>
          </div>
          {selectedIds.size > 0 && (
            <button className="emp-btn-danger" onClick={() => setConfirmBulk(true)}>
              <IconTrash /> Delete Selected ({selectedIds.size})
            </button>
          )}
          <div className="emp-dropdown-wrap" ref={exportMenuRef}>
            <button className="emp-btn-outline" onClick={() => setShowExportMenu(v => !v)}>
              <IconExport /> Export / Import
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ marginLeft: 2 }}>
                <polyline points="6 9 12 15 18 9"/>
              </svg>
            </button>
            {showExportMenu && (
              <div className="emp-dropdown-menu">
                <button className="emp-dropdown-item" onClick={() => { exportCSV(); setShowExportMenu(false); }}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                    <polyline points="14 2 14 8 20 8"/>
                    <line x1="16" y1="13" x2="8" y2="13"/>
                    <line x1="16" y1="17" x2="8" y2="17"/>
                  </svg>
                  Export CSV
                </button>
                <button className="emp-dropdown-item" onClick={() => { exportExcel(); setShowExportMenu(false); }}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#15803d" strokeWidth="2">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                    <polyline points="14 2 14 8 20 8"/>
                    <polyline points="8 13 10.5 17 13 13"/>
                  </svg>
                  <span style={{ color: "#15803d", fontWeight: 600 }}>Export Excel</span>
                </button>
                <button className="emp-dropdown-item" onClick={() => { exportPDF(); setShowExportMenu(false); }}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                    <polyline points="14 2 14 8 20 8"/>
                    <line x1="9" y1="15" x2="15" y2="15"/>
                  </svg>
                  <span style={{ color: "#dc2626", fontWeight: 600 }}>Export PDF</span>
                </button>
                <button className="emp-dropdown-item" onClick={() => { exportPhotos(); setShowExportMenu(false); }}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="2">
                    <rect x="3" y="3" width="18" height="18" rx="2"/>
                    <circle cx="8.5" cy="8.5" r="1.5"/>
                    <polyline points="21 15 16 10 5 21"/>
                  </svg>
                  <span style={{ color: "#7c3aed", fontWeight: 600 }}>Export ຮູບ (ZIP)</span>
                </button>
                <button className="emp-dropdown-item" onClick={() => { openTurnstileModal(); setShowExportMenu(false); }}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2">
                    <rect x="4" y="3" width="16" height="18" rx="1"/>
                    <path d="M14 21v-4a2 2 0 0 0-2-2 2 2 0 0 0-2 2v4"/>
                    <circle cx="15" cy="12" r="0.5" fill="#d97706"/>
                  </svg>
                  <span style={{ color: "#d97706", fontWeight: 600 }}>Export Turnstile (.xlsx)</span>
                  {pendingBatches.length > 0 && (
                    <span className="emp-pending-badge">
                      {pendingBatches.reduce((s, b) => s + b.employee_count, 0)}
                    </span>
                  )}
                </button>
                <div className="emp-dropdown-divider" />
                <button className="emp-dropdown-item" onClick={() => { navigate("/import"); setShowExportMenu(false); }}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                    <polyline points="7 10 12 5 17 10"/>
                    <line x1="12" y1="5" x2="12" y2="17"/>
                  </svg>
                  Import
                </button>
              </div>
            )}
          </div>
          <button className="emp-btn-outline" onClick={() => navigate("/bulk-photo")}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="18" height="18" rx="2"/>
              <circle cx="8.5" cy="8.5" r="1.5"/>
              <polyline points="21 15 16 10 5 21"/>
            </svg>
            Bulk Photo
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
            placeholder={t("search_emp_ph")}
            value={search}
            onChange={e => fc(() => { setSearch(e.target.value); setHireFrom(""); setHireTo(""); })}
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
          {loading ? t("loading") : `${t("found_records").replace("{total}", total.toLocaleString()).replace("{from}", from).replace("{to}", to)}`}
        </span>
        {pages > 1 && (
          <div className="emp-mini-pager">
            <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}>‹</button>
            <span>{page} / {pages}</span>
            <button disabled={page >= pages} onClick={() => setPage(p => p + 1)}>›</button>
          </div>
        )}
      </div>

      {/* ── Mobile cards ── */}
      <div className="emp-cards">
        {loading ? (
          <SkeletonLoader variant="cards" count={6} />
        ) : employees.length === 0 ? (
          <EmptyState type={hasFilter ? "search" : "data"} title={t("no_employees")} compact />
        ) : sortedEmployees.map(e => {
          const ss = STATUS_STYLE[e.status] || STATUS_STYLE["Inactive"];
          const initials = `${e.firstname?.[0] || ""}${e.lastname?.[0] || ""}`.toUpperCase();
          const pUrl = getPhotoUrl(e.photo);
          return (
            <div className="emp-card" key={e.employee_id}>
              {pUrl
                ? <img src={pUrl} alt="" className="emp-card-avatar" />
                : <div className="emp-card-avatar-placeholder">{initials}</div>
              }
              <div className="emp-card-body">
                <div className="emp-card-name">{e.firstname} {e.lastname}</div>
                <div className="emp-card-code">{e.employee_code || "–"} · {e.companies_name || "–"}</div>
                <div className="emp-card-pos">{e.position || "–"}</div>
                <div className="emp-card-meta">
                  <span className="emp-status-chip" style={{ background: ss.bg, color: ss.color, fontSize: 11, padding: "2px 8px" }}>{e.status}</span>
                </div>
                <div className="emp-card-actions">
                  <button className="emp-card-btn emp-card-btn-view" onClick={() => navigate(`/employees/${e.employee_id}`)}>
                    <IconEye /> {t("view")}
                  </button>
                  <button className="emp-card-btn emp-card-btn-edit" onClick={() => navigate(`/employees/edit/${e.employee_id}`)}>
                    <IconEdit /> {t("edit")}
                  </button>
                  <button className="emp-card-btn emp-card-btn-delete" onClick={() => setConfirmId(e.employee_id)}>
                    <IconTrash /> {t("delete")}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Table ── */}
      {viewMode === "table" && (
      <div className="emp-table-wrap">
        <table className="emp-table">
          <thead>
            <tr>
              <th className="emp-th emp-th-check" onClick={e => e.stopPropagation()}>
                <input
                  type="checkbox"
                  className="emp-checkbox"
                  checked={sortedEmployees.length > 0 && selectedIds.size === sortedEmployees.length}
                  onChange={toggleSelectAll}
                />
              </th>
              <th className="emp-th emp-th-no">#</th>
              <th className="emp-th emp-th-avatar"></th>
              {[
                { labelKey: "employee_name", col: "firstname" },
                { labelKey: "employee_code", col: "employee_code" },
                { labelKey: "company",       col: "companies_name" },
                { labelKey: "position",      col: "position" },
                { labelKey: "status",        col: "status" },
                { labelKey: "hire_date",     col: "hired_at" },
              ].map(({ labelKey, col }) => (
                <th
                  key={col}
                  className={`emp-th emp-th-sort${sortCol === col ? " emp-th-active" : ""}`}
                  onClick={() => handleSort(col)}
                >
                  {t(labelKey)}
                  <span className="emp-sort-arrow">
                    {sortCol === col ? (sortDir === "asc" ? " ↑" : " ↓") : " ⇅"}
                  </span>
                </th>
              ))}
              <th className="emp-th emp-th-actions">{t("manage")}</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="10" className="emp-td-empty">
                <SkeletonLoader variant="table" rows={8} cols={6} />
              </td></tr>
            ) : employees.length === 0 ? (
              <tr><td colSpan="10" className="emp-td-empty">
                <EmptyState
                  type={hasFilter ? "search" : "data"}
                  title={t("no_employees")}
                  action={hasFilter ? <button className="emp-btn-outline" onClick={resetFilters}>{t("clear_filter")}</button> : undefined}
                />
              </td></tr>
            ) : sortedEmployees.map((e, idx) => {
              const ss = STATUS_STYLE[e.status] || STATUS_STYLE["Inactive"];
              const isSelected = selectedIds.has(e.employee_id);
              return (
                <tr key={e.employee_id} className={`emp-tr${isSelected ? " emp-tr-selected" : ""}`} onClick={() => navigate(`/employees/${e.employee_id}`)}>
                  <td className="emp-td emp-td-check" onClick={ev => ev.stopPropagation()}>
                    <input
                      type="checkbox"
                      className="emp-checkbox"
                      checked={isSelected}
                      onChange={() => toggleSelect(e.employee_id)}
                    />
                  </td>
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
                      <button className="emp-icon-btn emp-icon-view" title="ເບິ່ງ" aria-label="View employee" onClick={() => navigate(`/employees/${e.employee_id}`)}>
                        <IconEye />
                      </button>
                      <button className="emp-icon-btn emp-icon-edit" title="ແກ້ໄຂ" aria-label="Edit employee" onClick={() => navigate(`/employees/edit/${e.employee_id}`)}>
                        <IconEdit />
                      </button>
                      <button className="emp-icon-btn emp-icon-del" title="ລຶບ" aria-label="Delete employee" onClick={() => setConfirmId(e.employee_id)}>
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
      )}

      {/* ── Grid view ── */}
      {viewMode === "grid" && (
      <div className="emp-grid-wrap">
        {loading ? (
          <SkeletonLoader variant="cards" count={8} />
        ) : employees.length === 0 ? (
          <EmptyState
            type={hasFilter ? "search" : "data"}
            title={t("no_employees")}
            action={hasFilter ? <button className="emp-btn-outline" onClick={resetFilters}>{t("clear_filter")}</button> : undefined}
            compact
          />
        ) : sortedEmployees.map(e => {
          const ss = STATUS_STYLE[e.status] || STATUS_STYLE["Inactive"];
          const isSelected = selectedIds.has(e.employee_id);
          return (
            <div
              className={`emp-grid-card${isSelected ? " emp-grid-card-selected" : ""}`}
              key={e.employee_id}
              onClick={() => navigate(`/employees/${e.employee_id}`)}
            >
              <input
                type="checkbox"
                className="emp-checkbox emp-grid-checkbox"
                checked={isSelected}
                onClick={ev => ev.stopPropagation()}
                onChange={() => toggleSelect(e.employee_id)}
              />
              <span className="emp-status-chip emp-grid-status" style={{ background: ss.bg, color: ss.color }}>
                {e.status}
              </span>
              <div className="emp-grid-avatar">
                <Avatar emp={e} />
              </div>
              <div className="emp-grid-name">{e.firstname} {e.lastname}</div>
              <div className="emp-grid-position">{e.position || "–"}</div>
              <div className="emp-grid-meta">
                <span className="emp-code">{e.employee_code || "–"}</span>
                <span className="emp-grid-company">{e.companies_name || "–"}</span>
              </div>
              <div className="emp-grid-date">
                {e.hired_at ? new Date(e.hired_at).toLocaleDateString("en-GB", { day:"2-digit", month:"short", year:"numeric" }) : "–"}
              </div>
              <div className="emp-grid-actions" onClick={ev => ev.stopPropagation()}>
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
            </div>
          );
        })}
      </div>
      )}

      {/* ── Pagination ── */}
      {!loading && pages > 1 && (
        <div className="emp-pagination">
          <span className="emp-pg-info">{t("showing_range").replace("{from}", from).replace("{to}", to).replace("{total}", total)}</span>
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
          message={isCompanyAdmin ? t("confirm_delete_emp_admin") : t("confirm_delete_emp")}
          subMessage={isCompanyAdmin ? t("delete_request_info") : t("delete_info")}
          confirmLabel={isCompanyAdmin ? t("send_request") : t("delete")}
          danger
          onConfirm={() => remove(confirmId)}
          onCancel={() => setConfirmId(null)}
        />
      )}
      {confirmBulk && (
        <ConfirmModal
          message={isCompanyAdmin
            ? `ສົ່ງຄຳຂໍລົບ ${selectedIds.size} ຄົນ ໄປຍັງ Super Admin?`
            : `ລົບ ${selectedIds.size} ຄົນທີ່ເລືອກທັງໝົດ?`}
          subMessage={isCompanyAdmin ? t("delete_request_info") : "ຂໍ້ມູນຈະຖືກລຶບຖາວອນ ແລະ ບໍ່ສາມາດກູ້ຄືນໄດ້"}
          confirmLabel={isCompanyAdmin ? t("send_request") : `ລົບ ${selectedIds.size} ຄົນ`}
          danger
          onConfirm={removeBulk}
          onCancel={() => setConfirmBulk(false)}
        />
      )}

      {showTurnstileModal && (
        <div className="tns-overlay" onClick={() => setShowTurnstileModal(false)}>
          <div className="tns-box" onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <h3 className="tns-title">Export Turnstile</h3>
                <p className="tns-sub">ສ້າງໄຟລ໌ .xlsx ສຳລັບ Import ເຂົ້າເວັບ Turnstile</p>
              </div>
              <button className="tns-close-btn" onClick={() => setShowTurnstileModal(false)}>✕</button>
            </div>

            {pendingBatches.filter(b => String(b.batch_id) !== String(justExported?.batch_id)).length > 0 && (
              <>
                <p className="tns-section-label">ລໍຖ້າຢືນຢັນ</p>
                <div className="tns-pending-list">
                  {pendingBatches
                    .filter(b => String(b.batch_id) !== String(justExported?.batch_id))
                    .map(b => (
                      <div className="tns-pending-item" key={b.batch_id}>
                        <span>
                          {b.companies_name || "ທຸກບໍລິສັດ"} — {b.employee_count} ຄົນ<br/>
                          {new Date(b.exported_at).toLocaleString("en-GB")}
                        </span>
                        <div className="tns-pending-actions">
                          <button className="tns-pending-btn tns-pending-confirm" onClick={() => confirmTurnstileBatch(b.batch_id)}>✓ ຢືນຢັນ</button>
                          <button className="tns-pending-btn tns-pending-dismiss" onClick={() => dismissTurnstileBatch(b.batch_id)}>✕ ປິດ</button>
                        </div>
                      </div>
                    ))}
                </div>
              </>
            )}

            {justExported && (
              <div className="tns-result-banner">
                ດາວໂຫລດໄຟລ໌ແລ້ວ ({justExported.employee_count} ຄົນ) — ນຳໄຟລ໌ນີ້ໄປ Import ໃສ່ Turnstile, ແລ້ວກົດຢືນຢັນລຸ່ມນີ້ເມື່ອ Import ສຳເລັດ
                <div className="tns-result-actions">
                  <button className="tns-pending-btn tns-pending-confirm" onClick={() => confirmTurnstileBatch(justExported.batch_id)}>✓ ຢືນຢັນ Import ສຳເລັດ</button>
                  <button className="tns-pending-btn tns-pending-dismiss" onClick={() => setJustExported(null)}>ຍັງ — ຢືນຢັນທີ່ຫຼັງ</button>
                </div>
              </div>
            )}

            <p className="tns-section-label">Export ໃໝ່</p>
            <div className="tns-field">
              <label>ບໍລິສັດ</label>
              <select className="tns-select" value={turnstileCompany} onChange={e => setTurnstileCompany(e.target.value)}>
                <option value="all">🏢 ທຸກບໍລິສັດ</option>
                {companies.map(c => <option key={c.company_id} value={c.company_id}>{c.companies_name}</option>)}
              </select>
            </div>

            <div className="tns-field">
              <label className="tns-select-count-label">ເລືອກພະນັກງານ ({tnsSelectedIds.size} / {tnsCandidates.length} ຄົນ)</label>
              <input
                className="tns-select"
                placeholder="🔍 ຄົ້ນຫາຊື່ ຫຼື ລະຫັດພະນັກງານ..."
                value={tnsSearch}
                onChange={e => setTnsSearch(e.target.value)}
                style={{ marginBottom: 8 }}
              />
              <div className="tns-select-actions">
                <button type="button" className="tns-link-btn" onClick={() => setTnsSelectedIds(new Set(tnsCandidates.filter(c => !c.turnstile_exported_at).map(c => c.employee_id)))}>ສະເພາະຄົນໃໝ່</button>
                <button type="button" className="tns-link-btn" onClick={() => setTnsSelectedIds(new Set(tnsCandidates.map(c => c.employee_id)))}>ເລືອກທັງໝົດ</button>
                <button type="button" className="tns-link-btn" onClick={() => setTnsSelectedIds(new Set())}>ລ້າງທີ່ເລືອກ</button>
              </div>

              <div className="tns-candidate-list">
                {tnsCandidatesLoading ? (
                  <div className="tns-candidate-empty">ກຳລັງໂຫລດ...</div>
                ) : tnsFilteredCandidates.length === 0 ? (
                  <div className="tns-candidate-empty">ບໍ່ມີພະນັກງານ</div>
                ) : tnsFilteredCandidates.map(c => (
                  <label className="tns-candidate-item" key={c.employee_id}>
                    <input
                      type="checkbox"
                      checked={tnsSelectedIds.has(c.employee_id)}
                      onChange={() => toggleTnsCandidate(c.employee_id)}
                    />
                    <span className="tns-candidate-name">
                      {c.firstname} {c.lastname}
                      <span className="tns-candidate-code">{c.employee_code}</span>
                    </span>
                    {c.turnstile_exported_at ? (
                      <span className="tns-badge-done">Export ແລ້ວ {new Date(c.turnstile_exported_at).toLocaleDateString("en-GB")}</span>
                    ) : (
                      <span className="tns-badge-new">ໃໝ່</span>
                    )}
                  </label>
                ))}
              </div>
            </div>

            <div className="tns-btns">
              <button className="tns-btn-cancel" onClick={() => setShowTurnstileModal(false)}>ປິດ</button>
              <button className="tns-btn-export" disabled={turnstileBusy || tnsSelectedIds.size === 0} onClick={runTurnstileExport}>
                {turnstileBusy ? "ກຳລັງສ້າງ..." : `⬇ Export (${tnsSelectedIds.size})`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
