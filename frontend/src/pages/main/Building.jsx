import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { api, photoUrl } from "../../api";
import toast from "react-hot-toast";
import { useLanguage } from "../../context/LanguageContext";
import SkeletonLoader from "../../components/SkeletonLoader";
import { csvCell } from "../../utils/csvCell";
import ConfirmModal from "../../components/ConfirmModal";
import "../../components/ConfirmModal.css";
import "./companies.css";
import "./building.css";

const EMPTY_BLD_FORM = {
  building_name: "", building_type: "Dormitory", total_floors: "",
  rooms_per_floor: "4", zone_id: "", address: "", description: "",
};

const PALETTES = [
  { bar: "#2563eb", icon: "#dbeafe", text: "#1d4ed8" },
  { bar: "#16a34a", icon: "#dcfce7", text: "#15803d" },
  { bar: "#7c3aed", icon: "#ede9fe", text: "#6d28d9" },
  { bar: "#ea580c", icon: "#ffedd5", text: "#c2410c" },
  { bar: "#0891b2", icon: "#cffafe", text: "#0e7490" },
  { bar: "#db2777", icon: "#fce7f3", text: "#be185d" },
];

const IconOffice = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="44" height="44">
    <rect x="2" y="3" width="20" height="18" rx="2"/>
    <path d="M2 9h20M9 21V9"/>
    <rect x="13" y="12" width="3" height="3"/><rect x="13" y="17" width="3" height="3"/>
    <rect x="5"  y="12" width="3" height="3"/><rect x="5"  y="17" width="3" height="3"/>
  </svg>
);
const IconDorm = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="44" height="44">
    <rect x="3" y="2" width="18" height="20" rx="2"/>
    <path d="M3 8h18M3 14h18"/>
    <rect x="7" y="10" width="3" height="3"/><rect x="14" y="10" width="3" height="3"/>
    <rect x="7" y="16" width="3" height="3"/><rect x="14" y="16" width="3" height="3"/>
  </svg>
);
const IconFloorBars = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" width="30" height="30">
    <rect x="1" y="3"   width="22" height="3.4" rx="1.5"/>
    <rect x="1" y="10.3" width="15" height="3.4" rx="1.5"/>
    <rect x="1" y="17.6" width="18" height="3.4" rx="1.5"/>
  </svg>
);
const IconChevronRight = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
    <path d="M9 18l6-6-6-6"/>
  </svg>
);
const IconUsers = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="15" height="15">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
    <circle cx="9" cy="7" r="4"/>
    <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
    <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
  </svg>
);
const IconViewList = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="3" y1="6" x2="21" y2="6"/>
    <line x1="3" y1="12" x2="21" y2="12"/>
    <line x1="3" y1="18" x2="21" y2="18"/>
  </svg>
);
const IconViewGrid = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="3" width="7" height="7" rx="1.5"/>
    <rect x="14" y="3" width="7" height="7" rx="1.5"/>
    <rect x="3" y="14" width="7" height="7" rx="1.5"/>
    <rect x="14" y="14" width="7" height="7" rx="1.5"/>
  </svg>
);
const IconSearch = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/>
  </svg>
);
const IconDownload = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="M7 10l5 5 5-5"/><path d="M12 15V3"/>
  </svg>
);
const IconMapPin = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
  </svg>
);
const IconZones = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/>
    <line x1="8" y1="2" x2="8" y2="18"/><line x1="16" y1="6" x2="16" y2="22"/>
  </svg>
);
const IconClock = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 16 14"/>
  </svg>
);
const IconEdit = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
  </svg>
);
const IconTrash = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="3 6 5 6 21 6"/>
    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
    <path d="M10 11v6M14 11v6"/>
    <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
  </svg>
);

export default function Building() {
  const { t } = useLanguage();
  const navigate = useNavigate();

  const [buildings,   setBuildings]   = useState([]);
  const [zones,       setZones]       = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [viewMode,    setViewMode]    = useState(() => localStorage.getItem("bld_view_mode") || "list");
  const [search,      setSearch]      = useState("");
  const [typeFilter,  setTypeFilter]  = useState("all");
  const [zoneFilter,  setZoneFilter]  = useState("all");
  const [selectedId,  setSelectedId]  = useState(null);

  /* add/edit building modal */
  const [showModal,   setShowModal]   = useState(false);
  const [editTarget,  setEditTarget]  = useState(null);
  const [form,        setForm]        = useState(EMPTY_BLD_FORM);
  const [coverFile,   setCoverFile]   = useState(null);
  const [coverPreview, setCoverPreview] = useState(null);
  const [saveError,   setSaveError]   = useState("");
  const [saving,      setSaving]      = useState(false);

  /* delete confirmation */
  const [deleteTarget, setDeleteTarget] = useState(null);

  const changeViewMode = (mode) => {
    setViewMode(mode);
    localStorage.setItem("bld_view_mode", mode);
  };

  const load = () => {
    setLoading(true);
    return Promise.all([api.get("/building"), api.get("/zones")])
      .then(([bl, zl]) => { setBuildings(bl.data); setZones(zl.data); })
      .catch(() => toast.error("Failed to load buildings"))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const openAdd = () => {
    setEditTarget(null);
    setForm(EMPTY_BLD_FORM);
    setCoverFile(null);
    setCoverPreview(null);
    setSaveError("");
    setShowModal(true);
  };

  const openEdit = (b) => {
    setEditTarget(b);
    setForm({
      building_name:   b.building_name || "",
      building_type:   b.building_type || "Dormitory",
      total_floors:    String(b.total_floors || ""),
      rooms_per_floor: "4",
      zone_id:         b.zone_id ? String(b.zone_id) : "",
      address:         b.address || "",
      description:     b.description || "",
    });
    setCoverFile(null);
    setCoverPreview(b.cover_image ? photoUrl(b.cover_image) : null);
    setSaveError("");
    setShowModal(true);
  };

  const handleCoverChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setCoverFile(file);
    setCoverPreview(URL.createObjectURL(file));
  };

  const saveBuilding = async () => {
    setSaveError("");
    if (!form.building_name.trim() || !form.total_floors || parseInt(form.total_floors) < 1) {
      setSaveError(t("fill_required"));
      return;
    }
    if (editTarget && parseInt(form.total_floors) < editTarget.total_floors) {
      setSaveError(t("bld_floors_cant_decrease"));
      return;
    }

    setSaving(true);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => fd.append(k, v ?? ""));
      if (coverFile) fd.append("cover_image", coverFile);
      const cfg = { headers: { "Content-Type": "multipart/form-data" } };

      if (editTarget) {
        await api.put(`/building/${editTarget.building_id}`, fd, cfg);
      } else {
        await api.post("/building", fd, cfg);
      }
      toast.success(t("bld_saved"));
      setShowModal(false);
      load();
    } catch (err) {
      setSaveError(err?.response?.data?.message || t("save_failed"));
    } finally {
      setSaving(false);
    }
  };

  const removeBuilding = async () => {
    if (!deleteTarget) return;
    try {
      await api.delete(`/building/${deleteTarget.building_id}`);
      toast.success(t("bld_deleted"));
      if (selectedId === deleteTarget.building_id) setSelectedId(null);
      load();
    } catch (err) {
      toast.error(err?.response?.data?.message || t("save_failed"));
    } finally {
      setDeleteTarget(null);
    }
  };

  const openBuildingFloors = (b) => navigate(`/building/${b.building_id}/floors`);
  const openBuildingAuditLog = (b) =>
    navigate(`/audit?building_id=${b.building_id}&building_name=${encodeURIComponent(b.building_name)}`);

  const totalFloors    = buildings.reduce((s, b) => s + (b.total_floors    || 0), 0);
  const totalRooms     = buildings.reduce((s, b) => s + (b.total_rooms     || 0), 0);
  const totalOccupants = buildings.reduce((s, b) => s + (b.total_occupants || 0), 0);
  const totalCapacity  = buildings.reduce((s, b) => s + (b.total_capacity  || 0), 0);
  const overallOccPct  = totalCapacity > 0 ? Math.round(totalOccupants / totalCapacity * 100) : 0;
  const officeCount    = buildings.filter(b => b.building_type === "Office").length;
  const dormCount      = buildings.length - officeCount;
  const bldBreakdownParts = [];
  if (officeCount > 0) bldBreakdownParts.push(`${officeCount} ${officeCount === 1 ? t("bld_office_block") : t("bld_office_blocks")}`);
  if (dormCount   > 0) bldBreakdownParts.push(`${dormCount} ${dormCount === 1 ? t("bld_dormitory_word") : t("bld_dormitories")}`);
  const bldBreakdown = bldBreakdownParts.join(", ");

  const filteredBuildings = buildings.filter(b => {
    if (typeFilter !== "all" && b.building_type !== typeFilter) return false;
    if (zoneFilter !== "all" && String(b.zone_id || "") !== zoneFilter) return false;
    if (search && !b.building_name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const selectedBuilding = filteredBuildings.find(b => b.building_id === selectedId) || filteredBuildings[0] || null;

  const exportBuildingsCSV = () => {
    const header = ["#", "Building", "Type", "Floors", "Rooms", "Available", "Occupied", "Occupants", "Occupancy %"];
    const rows = filteredBuildings.map((b, i) => {
      const cap = b.total_capacity || 0;
      const occ = b.total_occupants || 0;
      const pct = cap > 0 ? Math.round(occ / cap * 100) : 0;
      return [i + 1, b.building_name, b.building_type, b.total_floors || 0, b.total_rooms || 0, b.available_rooms || 0, (b.occupied_rooms||0)+(b.partial_rooms||0), occ, `${pct}%`].map(csvCell).join(",");
    });
    const blob = new Blob([[header.join(","), ...rows].join("\n")], { type: "text/csv;charset=utf-8;" });
    const a = Object.assign(document.createElement("a"), {
      href: URL.createObjectURL(blob),
      download: `buildings_${new Date().toISOString().slice(0,10)}.csv`,
    });
    a.click();
  };

  if (loading) return <div className="bld-page"><SkeletonLoader variant="building" count={6} /></div>;

  return (
    <div className="bld-page">

      <div className="bld-hd">
            <div className="bld-hd-row">
              <div>
                <h1 className="bld-title">{t("bld_title")}</h1>
                <p className="bld-sub">
                  {t("bld_sub").replace("{n}", buildings.length)}
                  {bldBreakdown && <> — {bldBreakdown}.</>}
                </p>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button className="bld-export-btn" onClick={() => navigate("/zones")}>
                  <IconZones /> {t("bld_view_zones")}
                </button>
                <button className="bld-export-btn bld-export-btn-top" onClick={exportBuildingsCSV}>
                  <IconDownload /> {t("bld_export")}
                </button>
                <button className="btn-add" onClick={openAdd}>+ {t("bld_add_building")}</button>
              </div>
            </div>
          </div>

          <div className="bld-kpi-row">
            <div className="bld-kpi-card">
              <div className="bld-kpi-icon" style={{background:"#dbeafe", color:"#1d4ed8"}}><IconOffice /></div>
              <div className="bld-kpi-body">
                <span className="bld-kpi-num">{buildings.length}</span>
                <span className="bld-kpi-lbl">{t("bld_total_buildings")}</span>
              </div>
            </div>
            <div className="bld-kpi-card">
              <div className="bld-kpi-icon" style={{background:"#dcfce7", color:"#15803d"}}><IconFloorBars /></div>
              <div className="bld-kpi-body">
                <span className="bld-kpi-num">{totalFloors}</span>
                <span className="bld-kpi-lbl">{t("bld_floors")}</span>
              </div>
            </div>
            <div className="bld-kpi-card">
              <div className="bld-kpi-icon" style={{background:"#ede9fe", color:"#6d28d9"}}><IconDorm /></div>
              <div className="bld-kpi-body">
                <span className="bld-kpi-num">{totalRooms}</span>
                <span className="bld-kpi-lbl">{t("bld_rooms")}</span>
              </div>
            </div>
            <div className="bld-kpi-card">
              <div className="bld-kpi-icon" style={{background:"#ffedd5", color:"#c2410c"}}><IconUsers /></div>
              <div className="bld-kpi-body">
                <span className="bld-kpi-num">{overallOccPct}%</span>
                <span className="bld-kpi-lbl">{t("bld_occupancy_rate")}</span>
                {totalCapacity > 0 && <span className="bld-kpi-sub">{totalOccupants} / {totalCapacity}</span>}
              </div>
            </div>
            <div className="bld-kpi-card">
              <div className="bld-kpi-icon" style={{background:"#cffafe", color:"#0e7490"}}><IconUsers /></div>
              <div className="bld-kpi-body">
                <span className="bld-kpi-num">{totalOccupants}</span>
                <span className="bld-kpi-lbl">{t("bld_people_in")}</span>
              </div>
            </div>
          </div>

          <div className="bld-list-outer">
          <div className="bld-panel bld-panel-main">
            <div className="bld-panel-hd">
              <div>
                <h2 className="bld-panel-title">{t("bld_all_buildings")}</h2>
                <p className="bld-panel-sub">{t("bld_panel_sub")}</p>
              </div>
              <div className="bld-panel-toolbar">
                <div className="bld-search-box">
                  <IconSearch />
                  <input
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder={t("bld_search_ph")}
                  />
                </div>
                <select className="bld-type-select" value={typeFilter} onChange={e => setTypeFilter(e.target.value)}>
                  <option value="all">{t("bld_filter_all")}</option>
                  <option value="Office">{t("bld_office")}</option>
                  <option value="Dormitory">{t("bld_dormitory")}</option>
                </select>
                {zones.length > 0 && (
                  <select className="bld-type-select" value={zoneFilter} onChange={e => setZoneFilter(e.target.value)}>
                    <option value="all">{t("bld_filter_all_zones")}</option>
                    {zones.map(z => (
                      <option key={z.zone_id} value={String(z.zone_id)}>{z.zone_name}</option>
                    ))}
                  </select>
                )}
                <div className="bld-view-toggle">
                  <button
                    className={`bld-view-btn${viewMode === "list" ? " bld-view-btn-active" : ""}`}
                    title={t("view_table")}
                    onClick={() => changeViewMode("list")}
                  >
                    <IconViewList />
                  </button>
                  <button
                    className={`bld-view-btn${viewMode === "grid" ? " bld-view-btn-active" : ""}`}
                    title={t("view_grid")}
                    onClick={() => changeViewMode("grid")}
                  >
                    <IconViewGrid />
                  </button>
                </div>
              </div>
            </div>

          {viewMode === "list" ? (
              <div className="bld-table-wrap">
                <table className="bld-table">
                  <thead>
                    <tr>
                      {["#", t("building_name"), t("bld_floors"), t("bld_rooms"), t("bld_occupancy_rate"), t("bld_status"), t("actions")].map(h => (
                        <th key={h}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredBuildings.length === 0 ? (
                      <tr><td colSpan="7" className="bld-table-empty">{t("bld_no_results")}</td></tr>
                    ) : filteredBuildings.map((b, idx) => {
                      const pal      = PALETTES[buildings.indexOf(b) % PALETTES.length];
                      const total    = b.total_rooms     || 0;
                      const totalCap = b.total_capacity   || 0;
                      const totalOcc = b.total_occupants  || 0;
                      const pct      = totalCap > 0 ? Math.round(totalOcc / totalCap * 100) : 0;
                      const isOffice = b.building_type === "Office";
                      const isSel    = selectedBuilding && selectedBuilding.building_id === b.building_id;
                      const maint    = b.maintenance_rooms || 0;
                      return (
                        <tr
                          key={b.building_id}
                          className={`bld-table-row${isSel ? " bld-table-row-sel" : ""}`}
                          onClick={() => setSelectedId(b.building_id)}
                        >
                          <td className="bld-td-num">{idx + 1}</td>
                          <td className="bld-td-name">
                            <span className="bld-td-icon" style={{ background: pal.icon, color: pal.text }}>
                              {isOffice ? <IconOffice /> : <IconDorm />}
                            </span>
                            <div>
                              <div>{b.building_name}</div>
                              <span className="bld-type-badge" style={{ background: pal.icon, color: pal.text }}>
                                {isOffice ? t("bld_office") : t("bld_dormitory")}
                              </span>
                            </div>
                          </td>
                          <td>{b.total_floors || 0}</td>
                          <td>{isOffice ? "–" : total}</td>
                          <td>
                            {isOffice ? (
                              totalOcc > 0
                                ? <span className="bld-occ-pct-table">{totalOcc} {t("bld_people")}</span>
                                : <span style={{ color: "#9ca3af" }}>–</span>
                            ) : totalCap > 0 ? (
                              <div className="bld-occ-wrap-table">
                                <div className="bld-occ-bar-table">
                                  <div className="bld-occ-fill-table" style={{ width: `${pct}%`, background: pal.bar }} />
                                </div>
                                <span className="bld-occ-pct-table">{pct}% <small>({totalOcc}/{totalCap})</small></span>
                              </div>
                            ) : (
                              <span style={{ color: "#9ca3af" }}>–</span>
                            )}
                          </td>
                          <td>
                            <span className={`bld-status-badge${maint > 0 ? " bld-status-maint" : ""}`}>
                              {maint > 0 ? t("bld_maintenance") : t("bld_active")}
                            </span>
                          </td>
                          <td onClick={e => e.stopPropagation()}>
                            <div className="action-btns">
                              <button className="btn-icon btn-edit" title={t("edit")} onClick={() => openEdit(b)}><IconEdit /></button>
                              <button className="btn-icon btn-delete" title={t("delete")} onClick={() => setDeleteTarget(b)}><IconTrash /></button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
          ) : (
          <div className="bld-grid">
            {filteredBuildings.length === 0 && (
              <p className="bld-table-empty" style={{gridColumn:"1/-1"}}>{t("bld_no_results")}</p>
            )}
            {filteredBuildings.map((b) => {
              const pal      = PALETTES[buildings.indexOf(b) % PALETTES.length];
              const total    = b.total_rooms    || 0;
              const avail    = b.available_rooms || 0;
              const hasOccupants = (b.occupied_rooms || 0) + (b.partial_rooms || 0);
              const totalCap = b.total_capacity || 0;
              const totalOcc = b.total_occupants || 0;
              const pct      = totalCap > 0 ? Math.round(totalOcc / totalCap * 100) : 0;
              const isOffice = b.building_type === "Office";
              return (
                <div key={b.building_id} className="bld-card" onClick={() => openBuildingFloors(b)}>
                  <div className="bld-card-strip" style={{background: pal.bar}} />
                  <div className="bld-card-inner">
                    <div className="bld-card-top">
                      <div className="bld-card-icon-plain">
                        <IconFloorBars />
                      </div>
                      <div className="bld-card-info">
                        <div className="bld-card-name">{b.building_name}</div>
                        <span className="bld-badge" style={{background: pal.icon, color: pal.text}}>
                          {isOffice ? t("bld_office") : t("bld_dormitory")}
                        </span>
                      </div>
                      <span className="bld-card-nav-btn">›</span>
                    </div>

                    <div className="bld-stats-box">
                      <div className="bld-stat">
                        <span className="bld-sn" style={{color: pal.bar}}>{b.total_floors}</span>
                        <span className="bld-sl">{t("bld_floors")}</span>
                      </div>
                      {!isOffice ? (<>
                        <div className="bld-stat">
                          <span className="bld-sn">{total}</span>
                          <span className="bld-sl">{t("bld_rooms")}</span>
                        </div>
                        <div className="bld-stat">
                          <span className="bld-sn" style={{color:"#16a34a"}}>{avail}</span>
                          <span className="bld-sl">{t("bld_available")}</span>
                        </div>
                        <div className="bld-stat">
                          <span className="bld-sn" style={{color: pal.bar}}>{hasOccupants}</span>
                          <span className="bld-sl">{t("bld_occupied")}</span>
                        </div>
                      </>) : (
                        <div className="bld-stat" style={{flex:3}}>
                          <span className="bld-sn" style={{color: pal.bar, fontSize:15}}>{b.total_floors} {t("bld_floors")}</span>
                          <span className="bld-sl">{t("bld_office_bld")}</span>
                        </div>
                      )}
                    </div>

                    {!isOffice && total > 0 && (
                      <div className="bld-occ-wrap">
                        <div className="bld-occ-bar-row">
                          <div className="bld-occ-bar">
                            <div className="bld-occ-fill" style={{width:`${pct}%`, background: pal.bar}}/>
                          </div>
                          <span className="bld-occ-pct-inline" style={{color: pal.bar}}>{pct}%</span>
                        </div>
                        <div className="bld-occ-meta">
                          <span className="bld-occ-label">{t("bld_usage")}</span>
                          <span className="bld-occ-cnt">{totalOcc} / {totalCap} {t("bld_people")}</span>
                        </div>
                      </div>
                    )}
                    {isOffice && (
                      <p className="bld-office-note">
                        {t("bld_office_note").replace("{n}", b.total_floors)}
                        {totalOcc > 0 ? ` · ${totalOcc} ${t("bld_people")}` : ""}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          )}
          </div>

          {viewMode === "list" && selectedBuilding && (() => {
            const pal      = PALETTES[buildings.indexOf(selectedBuilding) % PALETTES.length];
            const isOffice = selectedBuilding.building_type === "Office";
            const totalCap = selectedBuilding.total_capacity  || 0;
            const totalOcc = selectedBuilding.total_occupants || 0;
            const pct      = totalCap > 0 ? Math.round(totalOcc / totalCap * 100) : 0;
            const maint    = selectedBuilding.maintenance_rooms || 0;
            return (
              <aside className="bld-detail-panel">
                <div className="bld-detail-banner" style={{background: `linear-gradient(135deg, ${pal.bar}, ${pal.text})`}}>
                  {isOffice ? <IconOffice /> : <IconDorm />}
                </div>
                <div className="bld-detail-body">
                  <div className="bld-detail-hd">
                    <h3 className="bld-detail-name">{selectedBuilding.building_name}</h3>
                    <span className={`bld-status-badge${maint > 0 ? " bld-status-maint" : ""}`}>
                      {maint > 0 ? t("bld_maintenance") : t("bld_active")}
                    </span>
                  </div>
                  <span className="bld-type-badge" style={{ background: pal.icon, color: pal.text }}>
                    {isOffice ? t("bld_office") : t("bld_dormitory")}
                  </span>

                  <div className="bld-detail-rows">
                    <div className="bld-detail-row">
                      <span className="bld-detail-row-lbl"><IconFloorBars /> {t("bld_floors")}</span>
                      <span className="bld-detail-row-val">{selectedBuilding.total_floors || 0}</span>
                    </div>
                    {!isOffice ? (
                      <>
                        <div className="bld-detail-row">
                          <span className="bld-detail-row-lbl"><IconDorm /> {t("bld_rooms")}</span>
                          <span className="bld-detail-row-val">{selectedBuilding.total_rooms || 0}</span>
                        </div>
                        <div className="bld-detail-row">
                          <span className="bld-detail-row-lbl"><IconUsers /> {t("bld_occupancy_rate")}</span>
                          <span className="bld-detail-row-val">{pct}% ({totalOcc}/{totalCap})</span>
                        </div>
                      </>
                    ) : (
                      <div className="bld-detail-row">
                        <span className="bld-detail-row-lbl"><IconUsers /> {t("bld_people_in")}</span>
                        <span className="bld-detail-row-val">{totalOcc}</span>
                      </div>
                    )}
                    {selectedBuilding.zone_name && (
                      <div className="bld-detail-row">
                        <span className="bld-detail-row-lbl"><IconZones /> {t("bld_zone")}</span>
                        <span className="bld-detail-row-val">{selectedBuilding.zone_name}</span>
                      </div>
                    )}
                    {selectedBuilding.address && (
                      <div className="bld-detail-row">
                        <span className="bld-detail-row-lbl"><IconMapPin /> {t("bld_address")}</span>
                        <span className="bld-detail-row-val">{selectedBuilding.address}</span>
                      </div>
                    )}
                  </div>

                  <div className="bld-detail-actions">
                    <button className="bld-detail-action-btn" onClick={() => openBuildingFloors(selectedBuilding)}>
                      <IconFloorBars /> {t("bld_view_floors")}
                    </button>
                    <button className="bld-detail-action-btn" onClick={() => openBuildingAuditLog(selectedBuilding)}>
                      <IconClock /> {t("bld_view_access_log")}
                    </button>
                    <button className="bld-detail-action-btn" onClick={exportBuildingsCSV}>
                      <IconDownload /> {t("bld_export")}
                    </button>
                    <button className="bld-detail-action-btn" onClick={() => openEdit(selectedBuilding)}>
                      <IconEdit /> {t("edit")}
                    </button>
                    <button className="bld-detail-action-btn" style={{ color: "#dc2626" }} onClick={() => setDeleteTarget(selectedBuilding)}>
                      <IconTrash /> {t("delete")}
                    </button>
                  </div>
                </div>
              </aside>
            );
          })()}
          </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="com-modal" onClick={e => e.stopPropagation()}>
            <div className="cm-header">
              <h2 className="cm-title">{editTarget ? t("bld_edit_building") : t("bld_add_building")}</h2>
              <button className="cm-close" onClick={() => setShowModal(false)}>&#x2715;</button>
            </div>

            <div className="cm-body">
              <div className="cm-field">
                <label className="cm-label">{t("bld_building_name")} <span className="cm-req">*</span></label>
                <input
                  className="cm-input"
                  maxLength={50}
                  value={form.building_name}
                  onChange={e => setForm({ ...form, building_name: e.target.value })}
                />
              </div>

              <div style={{ display: "flex", gap: 12 }}>
                <div className="cm-field" style={{ flex: 1 }}>
                  <label className="cm-label">{t("building_type")}</label>
                  <select
                    className="cm-input"
                    value={form.building_type}
                    onChange={e => setForm({ ...form, building_type: e.target.value })}
                  >
                    <option value="Dormitory">{t("bld_dormitory")}</option>
                    <option value="Office">{t("bld_office")}</option>
                  </select>
                </div>
                <div className="cm-field" style={{ flex: 1 }}>
                  <label className="cm-label">{t("bld_total_floors_lbl")} <span className="cm-req">*</span></label>
                  <input
                    className="cm-input"
                    type="number"
                    min={editTarget ? editTarget.total_floors : 1}
                    value={form.total_floors}
                    onChange={e => setForm({ ...form, total_floors: e.target.value })}
                  />
                  {editTarget && <span className="cm-color-hint">{t("bld_floors_cant_decrease")}</span>}
                </div>
              </div>

              {form.building_type === "Dormitory" && (
                <div className="cm-field">
                  <label className="cm-label">{t("bld_rooms_per_floor")}</label>
                  <input
                    className="cm-input"
                    type="number"
                    min={1}
                    max={20}
                    value={form.rooms_per_floor}
                    onChange={e => setForm({ ...form, rooms_per_floor: e.target.value })}
                  />
                </div>
              )}

              <div className="cm-field">
                <label className="cm-label">{t("bld_zone")}</label>
                <select
                  className="cm-input"
                  value={form.zone_id}
                  onChange={e => setForm({ ...form, zone_id: e.target.value })}
                >
                  <option value="">{t("bld_no_zone")}</option>
                  {zones.map(z => (
                    <option key={z.zone_id} value={String(z.zone_id)}>{z.zone_name}</option>
                  ))}
                </select>
              </div>

              <div className="cm-field">
                <label className="cm-label">{t("bld_address")}</label>
                <input
                  className="cm-input"
                  value={form.address}
                  onChange={e => setForm({ ...form, address: e.target.value })}
                />
              </div>

              <div className="cm-field">
                <label className="cm-label">{t("bld_description")}</label>
                <textarea
                  className="cm-input"
                  rows={3}
                  value={form.description}
                  onChange={e => setForm({ ...form, description: e.target.value })}
                />
              </div>

              <div className="cm-field">
                <label className="cm-label">{t("bld_cover_image")}</label>
                <input type="file" accept="image/*" onChange={handleCoverChange} />
                {coverPreview && (
                  <img src={coverPreview} alt="" style={{ marginTop: 8, width: 120, height: 80, objectFit: "cover", borderRadius: 8 }} />
                )}
              </div>
            </div>

            <div className="cm-footer">
              {saveError && <span className="save-error">{saveError}</span>}
              <button className="cm-btn-cancel" onClick={() => setShowModal(false)}>{t("cancel")}</button>
              <button className="cm-btn-create" disabled={saving} onClick={saveBuilding}>
                {editTarget ? t("save") : t("bld_add_building")}
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteTarget && (
        <ConfirmModal
          message={t("bld_delete_confirm").replace("{name}", deleteTarget.building_name)}
          subMessage={t("bld_delete_sub")
            .replace("{rooms}", deleteTarget.total_rooms || 0)
            .replace("{occ}", deleteTarget.total_occupants || 0)}
          confirmLabel={t("delete")}
          onConfirm={removeBuilding}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}
