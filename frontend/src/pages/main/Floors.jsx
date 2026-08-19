import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "../../api";
import toast from "react-hot-toast";
import { useLanguage } from "../../context/LanguageContext";
import SkeletonLoader from "../../components/SkeletonLoader";
import { csvCell } from "../../utils/csvCell";
import "./companies.css";
import "./building.css";

const IconOffice = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="44" height="44">
    <rect x="2" y="3" width="20" height="18" rx="2"/>
    <path d="M2 9h20M9 21V9"/>
    <rect x="13" y="12" width="3" height="3"/><rect x="13" y="17" width="3" height="3"/>
    <rect x="5"  y="12" width="3" height="3"/><rect x="5"  y="17" width="3" height="3"/>
  </svg>
);
const IconDorm = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="16" height="16">
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
    <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
  </svg>
);
const IconViewGrid = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/>
    <rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>
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
const IconChevronRight = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
    <path d="M9 18l6-6-6-6"/>
  </svg>
);
const IconChevronDown = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" width="13" height="13">
    <polyline points="6 9 12 15 18 9"/>
  </svg>
);

export default function Floors() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useLanguage();

  const [building, setBuilding] = useState(null);
  const [floors,   setFloors]   = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [viewMode, setViewMode] = useState(() => localStorage.getItem("bld_view_mode") || "list");
  const [search,   setSearch]   = useState("");
  const [page,     setPage]     = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [showAddFloor, setShowAddFloor] = useState(false);
  const [addCount,     setAddCount]     = useState(1);
  const [addRoomsPerFloor, setAddRoomsPerFloor] = useState(4);
  const [saving,   setSaving]   = useState(false);
  const [saveError, setSaveError] = useState("");

  const load = () => {
    setLoading(true);
    api.get(`/building/${id}`)
      .then(r => {
        setBuilding(r.data);
        setFloors(r.data.floors || []);
        localStorage.setItem("bld_last_building_id", id);
        window.dispatchEvent(new Event("bld_ctx_changed"));
      })
      .catch(() => toast.error("Failed to load building"))
      .finally(() => setLoading(false));
  };
  useEffect(load, [id]);

  useEffect(() => { setPage(1); }, [search]);

  const changeViewMode = (mode) => { setViewMode(mode); localStorage.setItem("bld_view_mode", mode); };
  const goToBuildings = () => navigate("/building");
  const openFloor = (fn) => navigate(`/building/${id}/floors/${fn}/rooms`);

  if (loading) return <div className="bld-page"><SkeletonLoader variant="table" rows={6} /></div>;
  if (!building) return null;

  const isOffice = building.building_type === "Office";
  const floorStart = isOffice ? 1 : 2; // dormitory floor 1 is a common area with no rooms
  const allFloorNums = Array.from({ length: Math.max(0, building.total_floors - floorStart + 1) }, (_, i) => i + floorStart);
  const filteredFloorNums = allFloorNums.filter(fn => {
    if (!search) return true;
    return String(fn).includes(search) || t("bld_floor_n").replace("{n}", fn).toLowerCase().includes(search.toLowerCase());
  });

  const totalRooms      = floors.reduce((s, f) => s + (f.total_rooms || 0), 0);
  const totalCapacity   = floors.reduce((s, f) => s + (f.total_capacity || 0), 0);
  const totalOccupants  = floors.reduce((s, f) => s + (f.total_occupants || 0), 0);
  const occPct          = totalCapacity > 0 ? Math.round(totalOccupants / totalCapacity * 100) : 0;

  const totalPages   = Math.max(1, Math.ceil(filteredFloorNums.length / pageSize));
  const currentPage  = Math.min(page, totalPages);
  const pagedFloorNums = filteredFloorNums.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const pgFrom = filteredFloorNums.length === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const pgTo   = Math.min(currentPage * pageSize, filteredFloorNums.length);

  const exportCSV = () => {
    const header = ["#", t("bld_tab_floors"), t("bld_rooms"), t("bld_available"), t("bld_occupied"), t("bld_people")];
    const rows = filteredFloorNums.map((fn, i) => {
      const fd = floors.find(f => parseInt(f.floor_number) === fn);
      return [i + 1, fn, fd?.total_rooms || 0, fd?.available || 0, (fd?.occupied || 0) + (fd?.partial || 0), fd?.total_occupants || 0].map(csvCell).join(",");
    });
    const blob = new Blob([[header.join(","), ...rows].join("\n")], { type: "text/csv;charset=utf-8;" });
    const a = Object.assign(document.createElement("a"), {
      href: URL.createObjectURL(blob),
      download: `${building.building_name}_floors_${new Date().toISOString().slice(0, 10)}.csv`,
    });
    a.click();
  };

  const addFloor = async () => {
    setSaveError("");
    if (!addCount || addCount < 1) { setSaveError("Must add at least 1 floor"); return; }
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append("building_name", building.building_name);
      fd.append("building_type", building.building_type);
      fd.append("total_floors", building.total_floors + Number(addCount));
      fd.append("description", building.description || "");
      fd.append("address", building.address || "");
      fd.append("zone_id", building.zone_id || "");
      fd.append("rooms_per_floor", addRoomsPerFloor);
      await api.put(`/building/${id}`, fd, { headers: { "Content-Type": "multipart/form-data" } });
      toast.success(t("bld_floor_added"));
      setShowAddFloor(false);
      setAddCount(1);
      load();
    } catch (err) {
      setSaveError(err?.response?.data?.message || t("save_failed"));
    }
    setSaving(false);
  };

  return (
    <div className="bld-page">
      <div className="bld-hd">
        <div className="bld-bc">
          <span className="bld-bc-link" onClick={goToBuildings}>{t("nav_building_list")}</span>
          <span className="bld-bc-sep">›</span>
          <span className="bld-bc-cur">{building.building_name}</span>
        </div>
        <div className="bld-hd-row">
          <div className="bld-hd-titlewrap">
            <div className="bld-hd-icon" style={{background:"#dbeafe", color:"#1d4ed8"}}>
              {isOffice ? <IconOffice /> : <IconDorm />}
            </div>
            <div>
              <h1 className="bld-title">{building.building_name} - {t("bld_tab_floors")}</h1>
              <p className="bld-sub">{t("bld_floors_sub")}</p>
            </div>
          </div>
          <div className="bld-hd-actions">
            <button className="bld-export-btn bld-export-btn-top" onClick={exportCSV}>
              <IconDownload /> {t("bld_export")}
            </button>
            <button className="bld-add-btn" onClick={() => { setAddCount(1); setSaveError(""); setShowAddFloor(true); }}>
              <span>+ {t("bld_add_floor")}</span>
              <IconChevronDown />
            </button>
          </div>
        </div>
      </div>

      <div className="bld-kpi-row">
        <div className="bld-kpi-card">
          <div className="bld-kpi-top">
            <div className="bld-kpi-icon" style={{background:"#dcfce7", color:"#15803d"}}><IconFloorBars /></div>
            <span className="bld-kpi-top-lbl">{t("bld_floors")}</span>
          </div>
          <span className="bld-kpi-num">{building.total_floors || 0}</span>
          <span className="bld-kpi-lbl">{t("bld_floors")}</span>
        </div>
        <div className="bld-kpi-card">
          <div className="bld-kpi-top">
            <div className="bld-kpi-icon" style={{background:"#ede9fe", color:"#6d28d9"}}><IconDorm /></div>
            <span className="bld-kpi-top-lbl">{t("bld_rooms")}</span>
          </div>
          <span className="bld-kpi-num">{totalRooms}</span>
          <span className="bld-kpi-lbl">{t("bld_rooms")}</span>
        </div>
        <div className="bld-kpi-card">
          <div className="bld-kpi-top">
            <div className="bld-kpi-icon" style={{background:"#ffedd5", color:"#c2410c"}}><IconUsers /></div>
            <span className="bld-kpi-top-lbl">{t("bld_occupancy_rate")}</span>
          </div>
          <span className="bld-kpi-num">{occPct}%</span>
          {totalCapacity > 0 ? (
            <>
              <div className="bld-kpi-bar"><div className="bld-kpi-bar-fill" style={{width:`${Math.min(occPct,100)}%`}} /></div>
              <span className="bld-kpi-sub">{totalOccupants} / {totalCapacity} {t("bld_rooms")}</span>
            </>
          ) : <span className="bld-kpi-lbl">{t("bld_occupancy_rate")}</span>}
        </div>
        <div className="bld-kpi-card">
          <div className="bld-kpi-top">
            <div className="bld-kpi-icon" style={{background:"#cffafe", color:"#0e7490"}}><IconUsers /></div>
            <span className="bld-kpi-top-lbl">{t("bld_people_in")}</span>
          </div>
          <span className="bld-kpi-num">{totalOccupants}</span>
          <span className="bld-kpi-lbl">{t("bld_people_in")}</span>
        </div>
      </div>

      <div className="bld-panel bld-panel-main">
        <div className="bld-panel-hd">
          <div>
            <h2 className="bld-panel-title">{t("bld_tab_floors")}</h2>
          </div>
          <div className="bld-panel-toolbar">
            <div className="bld-search-box">
              <IconSearch />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder={t("bld_search_floor_ph")} />
            </div>
            <div className="bld-view-toggle bld-view-toggle-text">
              <button className={`bld-view-btn-text${viewMode === "list" ? " bld-view-btn-active" : ""}`} title={t("view_table")} onClick={() => changeViewMode("list")}>
                <IconViewList /> {t("view_table")}
              </button>
              <button className={`bld-view-btn-text${viewMode === "grid" ? " bld-view-btn-active" : ""}`} title={t("view_grid")} onClick={() => changeViewMode("grid")}>
                <IconViewGrid /> {t("view_grid")}
              </button>
            </div>
          </div>
        </div>

        {viewMode === "list" && (
          <div className="bld-table-wrap">
            <table className="bld-table">
              <thead>
                <tr>
                  {[t("bld_tab_floors"), t("bld_rooms"), t("bld_occupancy_rate"), t("bld_status")].map(h => (
                    <th key={h}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredFloorNums.length === 0 ? (
                  <tr><td colSpan="4" className="bld-table-empty">{t("bld_no_results")}</td></tr>
                ) : pagedFloorNums.map((fn) => {
                  const fd    = floors.find(f => parseInt(f.floor_number) === fn);
                  const total = fd?.total_rooms || 0;
                  const cap   = fd?.total_capacity || 0;
                  const occ   = fd?.total_occupants || 0;
                  const pct   = cap > 0 ? Math.round(occ / cap * 100) : 0;
                  const maint = parseInt(fd?.maintenance) || 0;
                  return (
                    <tr
                      key={fn}
                      className={`bld-table-row${isOffice ? " bld-floor-card-office" : ""}`}
                      onClick={isOffice ? undefined : () => openFloor(fn)}
                    >
                      <td>{t("bld_floor_n").replace("{n}", fn)}</td>
                      <td>{isOffice ? "–" : total}</td>
                      <td>
                        {isOffice ? (
                          <span>{occ} {t("bld_people")}</span>
                        ) : cap > 0 ? (
                          <div className="bld-occ-wrap-table">
                            <div className="bld-occ-bar-table"><div className="bld-occ-fill-table" style={{width:`${pct}%`, background:"#16a34a"}} /></div>
                            <span className="bld-occ-pct-table">{pct}% <small>({occ}/{cap})</small></span>
                          </div>
                        ) : <span style={{color:"#9ca3af"}}>–</span>}
                      </td>
                      <td>
                        <span className={`bld-status-badge${maint > 0 ? " bld-status-maint" : ""}`}>
                          {maint > 0 ? t("bld_maintenance") : t("bld_active")}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {viewMode === "grid" && (
          <div className="bld-floors-layout">
            <div className="bld-floor-list">
              {filteredFloorNums.length === 0 && (
                <p className="bld-table-empty" style={{gridColumn:"1/-1"}}>{t("bld_no_results")}</p>
              )}
              {filteredFloorNums.map(fn => {
                const fd     = floors.find(f => parseInt(f.floor_number) === fn);
                const total  = fd?.total_rooms || 0;
                const avail  = fd?.available    || 0;
                const maint  = parseInt(fd?.maintenance) || 0;
                const people = fd?.total_occupants || 0;
                const pct    = total > 0 ? Math.round(avail / total * 100) : 0;
                const level  = isOffice ? "office" : pct >= 50 ? "high" : pct >= 20 ? "mid" : "low";
                return (
                  <div
                    key={fn}
                    className={`bld-floor-card lvl-${level}${isOffice ? " bld-floor-card-office" : ""}`}
                    onClick={isOffice ? undefined : () => openFloor(fn)}
                  >
                    <div className="bld-floor-card-hd">
                      <span className={`bld-floor-card-num lvl-${level}`}>{fn}</span>
                      <div className="bld-floor-card-main">
                        <div className="bld-floor-card-title">{t("bld_floor_n").replace("{n}", fn)}</div>
                        <div className="bld-floor-card-sub">
                          {isOffice ? t("bld_office") : t("bld_dorm_rooms").replace("{n}", fd?.total_rooms ?? "…")}
                        </div>
                      </div>
                      {!isOffice && <IconChevronRight className="bld-floor-card-chevron" />}
                    </div>

                    {!isOffice && (
                      <div className="bld-floor-card-bar-row">
                        <div className="bld-floor-card-bar"><div className={`bld-floor-card-bar-fill lvl-${level}`} style={{width:`${pct}%`}} /></div>
                        <span className="bld-floor-card-avail">{avail}/{total} {t("bld_avail_rooms")}</span>
                      </div>
                    )}

                    <div className="bld-floor-card-pills">
                      {!isOffice && maint > 0 && (
                        <span className="bld-floor-card-pill bld-floor-card-pill-maint"><b>{maint}</b> {t("bld_maint_short")}</span>
                      )}
                      <span className="bld-floor-card-pill bld-floor-card-pill-people"><IconUsers /> {people} {t("bld_people")}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {viewMode === "list" && filteredFloorNums.length > 0 && (
          <div className="bld-pagination">
            <div className="bld-pg-left">
              <span className="bld-pg-info">
                {t("showing_range").replace("{from}", pgFrom).replace("{to}", pgTo).replace("{total}", filteredFloorNums.length)}
              </span>
              <select className="bld-page-size-select" value={pageSize} onChange={e => setPageSize(Number(e.target.value))}>
                <option value={10}>10 / page</option>
                <option value={25}>25 / page</option>
                <option value={50}>50 / page</option>
              </select>
            </div>
            {totalPages > 1 && (
              <div className="bld-pg-btns">
                <button className="bld-pg-btn" disabled={currentPage <= 1} onClick={() => setPage(1)}>«</button>
                <button className="bld-pg-btn" disabled={currentPage <= 1} onClick={() => setPage(p => p - 1)}>‹</button>
                {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                  let n;
                  if (totalPages <= 7) n = i + 1;
                  else if (currentPage <= 4) n = i + 1;
                  else if (currentPage >= totalPages - 3) n = totalPages - 6 + i;
                  else n = currentPage - 3 + i;
                  return (
                    <button key={n} className={`bld-pg-btn ${currentPage === n ? "bld-pg-active" : ""}`} onClick={() => setPage(n)}>{n}</button>
                  );
                })}
                <button className="bld-pg-btn" disabled={currentPage >= totalPages} onClick={() => setPage(p => p + 1)}>›</button>
                <button className="bld-pg-btn" disabled={currentPage >= totalPages} onClick={() => setPage(totalPages)}>»</button>
              </div>
            )}
          </div>
        )}
      </div>

      {showAddFloor && (
        <div className="modal-overlay" onClick={() => setShowAddFloor(false)}>
          <div className="com-modal" onClick={e => e.stopPropagation()}>
            <div className="cm-header">
              <h2 className="cm-title">{t("bld_add_floor")}</h2>
              <button className="cm-close" onClick={() => setShowAddFloor(false)}>&#x2715;</button>
            </div>
            <div className="cm-body">
              <p className="cm-color-hint" style={{marginBottom:12}}>{t("bld_add_floor_sub")}</p>
              <div className="cm-field">
                <label className="cm-label">{t("bld_num_floors_add")}</label>
                <input type="number" min={1} className="cm-input" value={addCount} onChange={e => setAddCount(e.target.value)} />
              </div>
              {!isOffice && (
                <div className="cm-field">
                  <label className="cm-label">{t("bld_rooms_per_floor")}</label>
                  <input type="number" min={1} max={20} className="cm-input" value={addRoomsPerFloor} onChange={e => setAddRoomsPerFloor(e.target.value)} />
                </div>
              )}
            </div>
            <div className="cm-footer">
              {saveError && <span className="save-error">{saveError}</span>}
              <button className="cm-btn-cancel" onClick={() => setShowAddFloor(false)}>{t("cancel")}</button>
              <button className="cm-btn-create" disabled={saving} onClick={addFloor}>{saving ? t("saving") : t("save")}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
