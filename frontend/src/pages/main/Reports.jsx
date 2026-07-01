import { useCurrentUser } from "../../hooks/useCurrentUser";
import { useEffect, useState, useRef } from "react";
import { api } from "../../api";
import toast from "react-hot-toast";
import { useLanguage, translations } from "../../context/LanguageContext";
import * as XLSX from "xlsx";
import { buildReportPages, renderPagesToPdf, printPages } from "../../utils/reportLetterhead";
import { csvCell } from "../../utils/csvCell";
import SkeletonLoader from "../../components/SkeletonLoader";
import "./reports.css";

const EMP_REPORT_TITLE = { lo: "ລາຍງານພະນັກງານ", en: "Employee Report" };
const BLD_REPORT_TITLE = { lo: "ລາຍງານ Building", en: "Building Report" };
const CLIENT_REPORT_TITLE = { lo: "ລາຍງານຂໍ້ມູນລູກຄ້າ", en: "Client Data Report" };
const CLIENT_REPORT_COL_KEYS = ["employee_code", "name", "position", "gender", "passport_no", "visa_no"];

const EMP_COL_KEYS = [
  { key: "employee_code",  tk: "col_code",        render: e => e.employee_code || "–" },
  { key: "name",           tk: "col_name",         render: e => `${e.firstname||""} ${e.lastname||""}`.trim() || "–" },
  { key: "position",       tk: "col_position",     render: e => e.position || "–" },
  { key: "companies_name", tk: "col_company",      render: e => e.companies_name || "–" },
  { key: "status",         tk: "col_status",       render: e => e.status || "–" },
  { key: "gender",         tk: "col_gender",       render: e => e.gender || "–" },
  { key: "nationality",    tk: "col_nationality",  render: e => e.nationality || "–" },
  { key: "contact_no",     tk: "col_phone",        render: e => e.contact_no || "–" },
  { key: "passport_no",    tk: "col_passport",     render: e => e.passport_no || "–" },
  { key: "visa_no",        tk: "col_visa",         render: e => e.visa_no || "–" },
];

/* bilingual header labels for the letterhead template, independent of the active UI language */
const reportColumnsFor = (cols) => cols.map(c => ({
  key: c.key,
  headerLo: translations.lo[c.tk] || c.label,
  headerEn: translations.en[c.tk] || c.label,
  render: c.render,
}));

const empSummaryLines = (stats, total) => {
  const parts = [`Active ${stats.active || 0}`];
  if (stats.onLeave)  parts.push(`On Leave ${stats.onLeave}`);
  if (stats.resigned) parts.push(`Resigned ${stats.resigned}`);
  return [
    `ຈຳນວນພະນັກງານທັງໝົດ: <b>${total}</b>`,
    `ສະຖານະ: ${parts.join(" · ")}`,
  ];
};

const bldSummaryLines = (stats, total) => [
  `ຈຳນວນຕືກທັງໝົດ: <b>${total}</b>`,
  `ຫ້ອງທັງໝົດ: ${stats.totalRooms || 0} · ວ່າງ ${stats.available || 0} · ມີຄົນ ${stats.occupied || 0} · ສ້ອມແປງ ${stats.maintenance || 0}`,
];

const BLD_REPORT_COLS = [
  { key: "building_name",     headerLo: "ຊື່ຕືກ",         headerEn: "Building Name", render: b => b.building_name || "–" },
  { key: "building_type",     headerLo: "ປະເພດ",          headerEn: "Type",          render: b => b.building_type === "Office" ? "Office" : "ຫ້ອງນອນ" },
  { key: "total_floors",      headerLo: "ຊັ້ນ",           headerEn: "Floors",        render: b => String(b.total_floors || 0) },
  { key: "total_rooms",       headerLo: "ຫ້ອງທັງໝົດ",     headerEn: "Total Rooms",   render: b => String(b.total_rooms || 0) },
  { key: "available_rooms",   headerLo: "ວ່າງ",           headerEn: "Available",     render: b => String(b.available_rooms || 0) },
  { key: "occupied_rooms",    headerLo: "ມີຄົນ",          headerEn: "Occupied",      render: b => String(b.occupied_rooms || 0) },
  { key: "maintenance_rooms", headerLo: "ສ້ອມແປງ",        headerEn: "Maintenance",   render: b => String(b.maintenance_rooms || 0) },
  { key: "occupancy_pct",     headerLo: "ອັດຕາການໃຊ້ງານ", headerEn: "Occupancy %",   render: b => `${b.total_rooms > 0 ? Math.round(b.occupied_rooms / b.total_rooms * 100) : 0}%` },
];

const fmt = (d) => d ? new Date(d).toLocaleDateString("en-GB", { day:"2-digit", month:"short", year:"numeric" }) : "–";

const STATUS_COLOR = {
  "Active":   { bg:"#d1fae5", color:"#065f46" },
  "On Leave": { bg:"#fef3c7", color:"#92400e" },
  "Inactive": { bg:"#f3f4f6", color:"#374151" },
  "Resigned": { bg:"#fee2e2", color:"#991b1b" },
};

export default function Reports() {
  const { t }    = useLanguage();
  const currentUser = useCurrentUser();
  const userRole = currentUser.role || "";
  const userId   = currentUser.user_id || null;

  const ALL_EMP_COLS = EMP_COL_KEYS.map(c => ({ ...c, label: t(c.tk) }));

  const [activeTab, setActiveTab] = useState("employee"); // employee | building

  /* ── Employee state ── */
  const [employees,  setEmployees]  = useState([]);
  const [companies,  setCompanies]  = useState([]);
  const [loading,    setLoading]    = useState(false);
  const [total,      setTotal]      = useState(0);
  const [search,     setSearch]     = useState("");
  const [company,    setCompany]    = useState("all");
  const [status,     setStatus]     = useState("all");
  const [gender,     setGender]     = useState("all");
  const [empType,    setEmpType]    = useState("all");
  const [hireFrom,   setHireFrom]   = useState("");
  const [hireTo,     setHireTo]     = useState("");
  const [stats, setStats] = useState({ total:0, active:0, resigned:0, onLeave:0 });

  /* ── Column selector state ── */
  const [selectedCols, setSelectedCols] = useState(() => CLIENT_REPORT_COL_KEYS);
  const [reportTitle,  setReportTitle]  = useState(CLIENT_REPORT_TITLE);
  const [colDropOpen,    setColDropOpen]    = useState(false);
  const [exportOpen,     setExportOpen]     = useState(false);
  const [bldExportOpen,  setBldExportOpen]  = useState(false);
  const colDropRef   = useRef(null);
  const exportRef    = useRef(null);
  const bldExportRef = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (colDropRef.current && !colDropRef.current.contains(e.target)) setColDropOpen(false);
      if (exportRef.current && !exportRef.current.contains(e.target)) setExportOpen(false);
      if (bldExportRef.current && !bldExportRef.current.contains(e.target)) setBldExportOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const toggleCol = (key) => setSelectedCols(prev =>
    prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
  );
  const activeCols = ALL_EMP_COLS.filter(c => selectedCols.includes(c.key));

  /* ── Building state ── */
  const [buildings,     setBuildings]     = useState([]);
  const [bldLoading,    setBldLoading]    = useState(false);
  const [bldTypeFilter, setBldTypeFilter] = useState("all");
  const [bldSearch,     setBldSearch]     = useState("");
  const [bldStats,      setBldStats]      = useState({ total:0, totalRooms:0, available:0, occupied:0, maintenance:0 });

  /* ── Load employee data ── */
  useEffect(() => {
    const endpoint = userRole === "Super Admin" ? "/company/all" : `/company/my/${userId}`;
    api.get(endpoint).then(r => setCompanies(r.data)).catch(() => {});
  }, []);

  useEffect(() => { loadEmployees(); }, [company, status]);

  const loadEmployees = async () => {
    setLoading(true);
    try {
      const res = await api.get("/employees/report/list", {
        params: { search, company_id: company, status, limit: 500 },
      });
      const data = res.data.data ?? res.data;
      setEmployees(data);
      setTotal(res.data.total ?? data.length);
      setStats({
        total:    data.length,
        active:   data.filter(e => e.status === "Active").length,
        resigned: data.filter(e => e.status === "Resigned").length,
        onLeave:  data.filter(e => e.status === "On Leave").length,
      });
    } catch { toast.error("ໂຫຼດຂໍ້ມູນບໍ່ໄດ້"); }
    setLoading(false);
  };

  /* ── Load building data ── */
  const loadBuildings = async () => {
    setBldLoading(true);
    try {
      const res = await api.get("/building");
      const data = res.data;
      setBuildings(data);
      setBldStats({
        total:       data.length,
        totalRooms:  data.reduce((s, b) => s + (b.total_rooms || 0), 0),
        available:   data.reduce((s, b) => s + (b.available_rooms || 0), 0),
        occupied:    data.reduce((s, b) => s + (b.occupied_rooms || 0), 0),
        maintenance: data.reduce((s, b) => s + (b.maintenance_rooms || 0), 0),
      });
    } catch { toast.error("ໂຫຼດຂໍ້ມູນ Building ບໍ່ໄດ້"); }
    setBldLoading(false);
  };

  useEffect(() => {
    if (activeTab === "building") loadBuildings();
  }, [activeTab]);

  /* ── Employee actions ── */
  const doSearch = () => loadEmployees();

  const exportCSV = () => {
    const headers = ["#", ...activeCols.map(c => c.label)];
    const csv = [
      headers.join(","),
      ...filtered.map((e, i) => [
        i + 1,
        ...activeCols.map(c => c.render(e)),
      ].map(csvCell).join(","))
    ].join("\n");
    const blob = new Blob(["﻿"+csv], { type:"text/csv;charset=utf-8;" });
    const a = Object.assign(document.createElement("a"), { href: URL.createObjectURL(blob), download:`employee_report_${new Date().toISOString().slice(0,10)}.csv` });
    a.click(); URL.revokeObjectURL(a.href);
    toast.success("Export CSV ສຳເລັດ");
  };

  const printReport = () => {
    const { styles, pagesHtml } = buildReportPages({
      columns: reportColumnsFor(activeCols), rows: filtered,
      summaryLines: empSummaryLines(stats, filtered.length), title: reportTitle,
    });
    printPages({ title: reportTitle.en, styles, pagesHtml });
  };

  const filtered = employees.filter(e =>
    !search || `${e.firstname} ${e.lastname} ${e.employee_code} ${e.position}`.toLowerCase().includes(search.toLowerCase())
  );

  const exportPDF = async () => {
    const { styles, pagesHtml } = buildReportPages({
      columns: reportColumnsFor(activeCols), rows: filtered,
      summaryLines: empSummaryLines(stats, filtered.length), title: reportTitle,
    });
    const toastId = toast.loading("ກຳລັງສ້າງ PDF...");
    try {
      const doc = await renderPagesToPdf({ styles, pagesHtml });
      doc.save(`employee_report_${new Date().toISOString().slice(0, 10)}.pdf`);
      toast.success("Export PDF ສຳເລັດ", { id: toastId });
    } catch (e) {
      console.error("exportPDF failed:", e);
      toast.error("Export PDF ບໍ່ສຳເລັດ", { id: toastId });
    }
  };

  const exportExcel = () => {
    const headers = ["#", ...activeCols.map(c => c.label)];
    const rows = filtered.map((e, i) => [i + 1, ...activeCols.map(c => c.render(e))]);
    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    // column widths
    ws["!cols"] = [{ wch: 5 }, ...activeCols.map(c => ({ wch: c.key === "name" ? 24 : c.key === "position" ? 20 : 16 }))];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Employees");
    XLSX.writeFile(wb, `employee_report_${new Date().toISOString().slice(0, 10)}.xlsx`);
    toast.success("Export Excel ສຳເລັດ");
  };

  /* ── Building actions ── */
  const exportBuildingCSV = () => {
    const headers = ["#","Building Name","Type","Total Floors","Total Rooms","Available","Occupied","Maintenance","Occupancy %"];
    const csv = [
      headers.join(","),
      ...filteredBuildings.map((b, i) => {
        const pct = b.total_rooms > 0 ? Math.round(b.occupied_rooms / b.total_rooms * 100) : 0;
        return [
          i+1, b.building_name||"", b.building_type||"",
          b.total_floors||0, b.total_rooms||0,
          b.available_rooms||0, b.occupied_rooms||0, b.maintenance_rooms||0, pct+"%",
        ].map(csvCell).join(",");
      })
    ].join("\n");
    const blob = new Blob(["﻿"+csv], { type:"text/csv;charset=utf-8;" });
    const a = Object.assign(document.createElement("a"), { href: URL.createObjectURL(blob), download:`building_report_${new Date().toISOString().slice(0,10)}.csv` });
    a.click(); URL.revokeObjectURL(a.href);
    toast.success("Export CSV Building ສຳເລັດ");
  };

  const exportBuildingPDF = async () => {
    const { styles, pagesHtml } = buildReportPages({
      columns: BLD_REPORT_COLS, rows: filteredBuildings,
      summaryLines: bldSummaryLines(bldStats, filteredBuildings.length), title: BLD_REPORT_TITLE,
    });
    const toastId = toast.loading("ກຳລັງສ້າງ PDF...");
    try {
      const doc = await renderPagesToPdf({ styles, pagesHtml });
      doc.save(`building_report_${new Date().toISOString().slice(0, 10)}.pdf`);
      toast.success("Export PDF Building ສຳເລັດ", { id: toastId });
    } catch (e) {
      console.error("exportBuildingPDF failed:", e);
      toast.error("Export PDF ບໍ່ສຳເລັດ", { id: toastId });
    }
  };

  const exportBuildingExcel = () => {
    const headers = ["#", "Building Name", "Type", "Total Floors", "Total Rooms", "Available", "Occupied", "Maintenance", "Total Occupants", "Occupancy %"];
    const rows = filteredBuildings.map((b, i) => {
      const pct = b.total_rooms > 0 ? Math.round(b.occupied_rooms / b.total_rooms * 100) : 0;
      return [i+1, b.building_name||"", b.building_type||"", b.total_floors||0, b.total_rooms||0, b.available_rooms||0, b.occupied_rooms||0, b.maintenance_rooms||0, b.total_occupants||0, pct+"%"];
    });
    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    ws["!cols"] = [{ wch:5 },{ wch:24 },{ wch:12 },{ wch:8 },{ wch:10 },{ wch:10 },{ wch:10 },{ wch:12 },{ wch:14 },{ wch:10 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Buildings");
    XLSX.writeFile(wb, `building_report_${new Date().toISOString().slice(0, 10)}.xlsx`);
    toast.success("Export Excel Building ສຳເລັດ");
  };

  const printBuildingReport = () => {
    const { styles, pagesHtml } = buildReportPages({
      columns: BLD_REPORT_COLS, rows: filteredBuildings,
      summaryLines: bldSummaryLines(bldStats, filteredBuildings.length), title: BLD_REPORT_TITLE,
    });
    printPages({ title: BLD_REPORT_TITLE.en, styles, pagesHtml });
  };

  const filteredBuildings = buildings.filter(b => {
    const matchType = bldTypeFilter === "all" || b.building_type === bldTypeFilter;
    const matchSearch = !bldSearch || b.building_name.toLowerCase().includes(bldSearch.toLowerCase());
    return matchType && matchSearch;
  });

  return (
    <div className="rp-page">
      {/* Header */}
      <div className="rp-header">
        <div>
          <h1 className="rp-title">{t("reports_title")}</h1>
          <p className="rp-sub">{t("reports_sub")}</p>
        </div>
        <div className="rp-header-actions">
          {activeTab === "employee" ? (
            <>
              {/* Column selector */}
              <div className="rp-col-picker" ref={colDropRef}>
                <button className="rp-btn rp-btn-cols" onClick={() => setColDropOpen(v => !v)}>
                  &#9776; {t("select_cols")}
                  <span className="rp-col-badge">{activeCols.length}/{ALL_EMP_COLS.length}</span>
                </button>
                {colDropOpen && (
                  <div className="rp-col-drop">
                    <div className="rp-col-drop-head">
                      <span>{t("select_cols")}</span>
                      <div style={{ display:"flex", gap:6 }}>
                        <button className="rp-col-all-btn" onClick={() => { setSelectedCols(EMP_COL_KEYS.map(c => c.key)); setReportTitle(EMP_REPORT_TITLE); }}>{t("all")}</button>
                        <button className="rp-col-all-btn" onClick={() => { setSelectedCols([]); setReportTitle(EMP_REPORT_TITLE); }}>{t("deselect_all")}</button>
                      </div>
                    </div>
                    <button
                      className="rp-col-all-btn"
                      style={{ width: "100%", margin: "6px 0 4px" }}
                      onClick={() => { setSelectedCols(CLIENT_REPORT_COL_KEYS); setReportTitle(CLIENT_REPORT_TITLE); }}
                    >
                      {CLIENT_REPORT_TITLE.lo} / {CLIENT_REPORT_TITLE.en}
                    </button>
                    {ALL_EMP_COLS.map(col => (
                      <label key={col.key} className="rp-col-item">
                        <input
                          type="checkbox"
                          checked={selectedCols.includes(col.key)}
                          onChange={() => toggleCol(col.key)}
                        />
                        <span>{col.label}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
              <div className="rp-export-wrap" ref={exportRef}>
                <button className={`rp-export-trigger ${exportOpen ? "open" : ""}`} onClick={() => setExportOpen(v => !v)}>
                  &#128229; Export
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M6 9l6 6 6-6"/></svg>
                </button>
                {exportOpen && (
                  <div className="rp-export-menu">
                    <button className="rp-export-item" onClick={() => { exportPDF(); setExportOpen(false); }}>
                      <span className="rp-export-icon pdf">📄</span>
                      <span className="rp-export-item-text"><span>PDF</span><span>Adobe PDF document</span></span>
                    </button>
                    <button className="rp-export-item" onClick={() => { exportExcel(); setExportOpen(false); }}>
                      <span className="rp-export-icon excel">📊</span>
                      <span className="rp-export-item-text"><span>Excel (.xlsx)</span><span>Microsoft Excel spreadsheet</span></span>
                    </button>
                    <button className="rp-export-item" onClick={() => { exportCSV(); setExportOpen(false); }}>
                      <span className="rp-export-icon csv">📋</span>
                      <span className="rp-export-item-text"><span>CSV</span><span>Comma-separated values</span></span>
                    </button>
                    <button className="rp-export-item" onClick={() => { printReport(); setExportOpen(false); }}>
                      <span className="rp-export-icon print">🖨️</span>
                      <span className="rp-export-item-text"><span>Print</span><span>Open print dialog</span></span>
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              <div className="rp-export-wrap" ref={bldExportRef}>
                <button className={`rp-export-trigger ${bldExportOpen ? "open" : ""}`} onClick={() => setBldExportOpen(v => !v)}>
                  &#128229; Export
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M6 9l6 6 6-6"/></svg>
                </button>
                {bldExportOpen && (
                  <div className="rp-export-menu">
                    <button className="rp-export-item" onClick={() => { exportBuildingPDF(); setBldExportOpen(false); }}>
                      <span className="rp-export-icon pdf">📄</span>
                      <span className="rp-export-item-text"><span>PDF</span><span>Adobe PDF document</span></span>
                    </button>
                    <button className="rp-export-item" onClick={() => { exportBuildingExcel(); setBldExportOpen(false); }}>
                      <span className="rp-export-icon excel">📊</span>
                      <span className="rp-export-item-text"><span>Excel (.xlsx)</span><span>Microsoft Excel spreadsheet</span></span>
                    </button>
                    <button className="rp-export-item" onClick={() => { exportBuildingCSV(); setBldExportOpen(false); }}>
                      <span className="rp-export-icon csv">📋</span>
                      <span className="rp-export-item-text"><span>CSV</span><span>Comma-separated values</span></span>
                    </button>
                    <button className="rp-export-item" onClick={() => { printBuildingReport(); setBldExportOpen(false); }}>
                      <span className="rp-export-icon print">🖨️</span>
                      <span className="rp-export-item-text"><span>Print</span><span>Open print dialog</span></span>
                    </button>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="rp-tabs">
        <button
          className={`rp-tab ${activeTab === "employee" ? "rp-tab-active" : ""}`}
          onClick={() => setActiveTab("employee")}
        >
          &#128100; {t("tab_employee")}
        </button>
        <button
          className={`rp-tab ${activeTab === "building" ? "rp-tab-active" : ""}`}
          onClick={() => setActiveTab("building")}
        >
          &#127970; {t("tab_building")}
        </button>
      </div>

      {/* ══════════ TAB: EMPLOYEE ══════════ */}
      {activeTab === "employee" && (
        <>
          <div className="rp-stats">
            {[
              { label: t("total"),    value: stats.total,    color:"#2f4aad" },
              { label: t("active"),   value: stats.active,   color:"#059669" },
              { label: t("resigned"), value: stats.resigned, color:"#dc2626" },
              { label: t("on_leave"), value: stats.onLeave,  color:"#d97706" },
            ].map(s => (
              <div key={s.label} className="rp-stat-box">
                <div className="rp-stat-val" style={{ color: s.color }}>{s.value}</div>
                <div className="rp-stat-lbl">{s.label}</div>
              </div>
            ))}
          </div>

          <div className="rp-filters">
            <input className="rp-search" placeholder={t("search_emp")}
              value={search} onChange={e => setSearch(e.target.value)}
              onKeyDown={e => e.key === "Enter" && doSearch()} />

            <select className="rp-select" value={company} onChange={e => setCompany(e.target.value)}>
              <option value="all">{t("all_companies")}</option>
              {companies.map(c => <option key={c.company_id} value={c.company_id}>{c.companies_name}</option>)}
            </select>

            <select className="rp-select" value={status} onChange={e => setStatus(e.target.value)}>
              <option value="all">{t("all_status")}</option>
              <option value="Active">Active</option>
              <option value="On Leave">On Leave</option>
              <option value="Inactive">Inactive</option>
              <option value="Resigned">Resigned</option>
            </select>

            <button className="rp-search-btn" onClick={doSearch}>{t("search")}</button>
          </div>

          <div className="rp-table-wrap">
            {loading ? (
              <SkeletonLoader variant="table" rows={8} cols={6} />
            ) : activeCols.length === 0 ? (
              <div className="rp-empty" style={{ padding:40 }}>{t("select_min_col")}</div>
            ) : (
                <table className="rp-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      {activeCols.map(c => <th key={c.key}>{c.label}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.length === 0 ? (
                      <tr><td colSpan={activeCols.length + 1} className="rp-empty">{t("no_data")}</td></tr>
                    ) : filtered.map((e, i) => (
                      <tr key={e.employee_id}>
                        <td className="rp-td-num">{i + 1}</td>
                        {activeCols.map(c => {
                          const val = c.render(e);
                          const isDoc = c.key === "passport_no" || c.key === "visa_no";
                          const isCode = c.key === "employee_code";
                          const isName = c.key === "name";
                          const isStatus = c.key === "status";
                          if (isStatus) {
                            const sc = STATUS_COLOR[val] || { bg:"#f3f4f6", color:"#374151" };
                            return (
                              <td key={c.key}>
                                {val !== "–" ? (
                                  <span className="rp-badge" style={{ background: sc.bg, color: sc.color }}>{val}</span>
                                ) : <span className="rp-doc-none">–</span>}
                              </td>
                            );
                          }
                          return (
                            <td key={c.key}
                              className={isDoc ? "rp-td-doc" : isCode ? "rp-td-code" : isName ? "rp-td-name" : ""}>
                              {val === "–" && (isDoc) ? <span className="rp-doc-none">ບໍ່ມີ</span> : val}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
            )}
            {!loading && filtered.length > 0 && (
              <div className="rp-footer">{t("showing")} {filtered.length} / {total} {t("items")}</div>
            )}
          </div>
        </>
      )}

      {/* ══════════ TAB: BUILDING ══════════ */}
      {activeTab === "building" && (
        <>
          {/* Building Stats */}
          <div className="rp-stats">
            {[
              { label: t("total_buildings"), value: bldStats.total,       color:"#2f4aad" },
              { label: t("total_rooms"),   value: bldStats.totalRooms,  color:"#6b7280" },
              { label: t("available"),     value: bldStats.available,   color:"#059669" },
              { label: t("occupied"),      value: bldStats.occupied,    color:"#1e40af" },
              { label: t("maintenance"),   value: bldStats.maintenance, color:"#d97706" },
            ].map(s => (
              <div key={s.label} className="rp-stat-box">
                <div className="rp-stat-val" style={{ color: s.color }}>{s.value}</div>
                <div className="rp-stat-lbl">{s.label}</div>
              </div>
            ))}
          </div>

          {/* Building Filters */}
          <div className="rp-filters">
            <input
              className="rp-search"
              placeholder={t("search_building")}
              value={bldSearch}
              onChange={e => setBldSearch(e.target.value)}
            />
            <select className="rp-select" value={bldTypeFilter} onChange={e => setBldTypeFilter(e.target.value)}>
              <option value="all">{t("all_types")}</option>
              <option value="Office">Office</option>
              <option value="Dormitory">{t("dormitory")}</option>
            </select>
            <button className="rp-search-btn" onClick={loadBuildings}>&#8635; {t("reload")}</button>
          </div>

          {/* Building Table */}
          <div className="rp-table-wrap">
            {bldLoading ? (
              <SkeletonLoader variant="table" rows={6} cols={6} />
            ) : (
              <>
                <table className="rp-table">
                  <thead>
                    <tr>
                      {["#", t("building_name"), t("building_type"), t("floors"), t("total_rooms"), t("available"), t("occupied"), t("maintenance"), t("total_occupants"), t("occupancy")].map(h => (
                        <th key={h}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredBuildings.length === 0 ? (
                      <tr><td colSpan="10" className="rp-empty">{t("no_data")}</td></tr>
                    ) : filteredBuildings.map((b, i) => {
                      const pct = b.total_rooms > 0 ? Math.round(b.occupied_rooms / b.total_rooms * 100) : 0;
                      const isOffice = b.building_type === "Office";
                      return (
                        <tr key={b.building_id}>
                          <td className="rp-td-num">{i + 1}</td>
                          <td className="rp-td-name">{b.building_name}</td>
                          <td>
                            <span className="rp-badge" style={isOffice
                              ? { background:"#ede9fe", color:"#5b21b6" }
                              : { background:"#dbeafe", color:"#1e40af" }}>
                              {isOffice ? "Office" : t("dormitory")}
                            </span>
                          </td>
                          <td>{b.total_floors || 0}</td>
                          <td>{b.total_rooms || 0}</td>
                          <td style={{ color:"#059669", fontWeight:600 }}>{b.available_rooms || 0}</td>
                          <td style={{ color:"#1e40af", fontWeight:600 }}>{b.occupied_rooms || 0}</td>
                          <td style={{ color:"#d97706", fontWeight:600 }}>{b.maintenance_rooms || 0}</td>
                          <td style={{ color:"#374151", fontWeight:600 }}>{b.total_occupants || 0}</td>
                          <td>
                            {b.total_rooms > 0 ? (
                              <div className="rp-occ-wrap">
                                <div className="rp-occ-bar">
                                  <div className="rp-occ-fill" style={{
                                    width: `${pct}%`,
                                    background: pct >= 90 ? "#dc2626" : pct >= 60 ? "#d97706" : "#059669"
                                  }}/>
                                </div>
                                <span className="rp-occ-pct">{pct}%</span>
                              </div>
                            ) : (
                              <span style={{ color:"#9ca3af" }}>–</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                {filteredBuildings.length > 0 && (
                  <div className="rp-footer">
                    {t("showing")} {filteredBuildings.length} / {buildings.length} {t("buildings")}
                    {" · "}{t("available")} {bldStats.available} · {t("occupied")} {bldStats.occupied}
                  </div>
                )}
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}
