import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "../../api";
import toast from "react-hot-toast";
import { useLanguage } from "../../context/LanguageContext";
import SkeletonLoader from "../../components/SkeletonLoader";
import { csvCell } from "../../utils/csvCell";
import "./companies.css";
import "./building.css";

const STATUS_KEYS = ["Available", "Partial", "Occupied", "Maintenance"];

const IconDorm = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="30" height="30">
    <rect x="3" y="2" width="18" height="20" rx="2"/>
    <path d="M3 8h18M3 14h18"/>
    <rect x="7" y="10" width="3" height="3"/><rect x="14" y="10" width="3" height="3"/>
    <rect x="7" y="16" width="3" height="3"/><rect x="14" y="16" width="3" height="3"/>
  </svg>
);
const IconOffice = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="24" height="24">
    <rect x="2" y="3" width="20" height="18" rx="2"/>
    <path d="M2 9h20M9 21V9"/>
    <rect x="13" y="12" width="3" height="3"/><rect x="13" y="17" width="3" height="3"/>
    <rect x="5"  y="12" width="3" height="3"/><rect x="5"  y="17" width="3" height="3"/>
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
const IconUsers = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="15" height="15">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
    <circle cx="9" cy="7" r="4"/>
    <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
    <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
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
const IconChevronDown = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" width="13" height="13">
    <polyline points="6 9 12 15 18 9"/>
  </svg>
);

export default function Rooms() {
  const { id, floor } = useParams();
  const navigate = useNavigate();
  const { t } = useLanguage();

  const STATUS = {
    Available:   { bg: "#d1fae5", color: "#065f46", label: t("bld_available") },
    Partial:     { bg: "#fff7ed", color: "#c2410c", label: t("bld_partial") || "ຫ້ອງວ່າງບາງສ່ວນ" },
    Occupied:    { bg: "#dbeafe", color: "#1e40af", label: t("bld_occupied") },
    Maintenance: { bg: "#fef3c7", color: "#92400e", label: t("bld_maintenance") },
  };

  const [building, setBuilding] = useState(null);
  const [rooms,    setRooms]    = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [roomModal, setRoomModal] = useState(null);
  const [search,   setSearch]   = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [viewMode, setViewMode] = useState(() => localStorage.getItem("bld_room_view_mode") || "grid");
  const [page,     setPage]     = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [showAddRoom, setShowAddRoom] = useState(false);
  const [addCapacity, setAddCapacity] = useState(2);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  const loadRooms = () => {
    return api.get(`/building/${id}/floor/${floor}`).then(r => setRooms(r.data));
  };

  useEffect(() => {
    setLoading(true);
    Promise.all([api.get(`/building/${id}`), loadRooms()])
      .then(([bd]) => {
        setBuilding(bd.data);
        localStorage.setItem("bld_last_building_id", id);
        localStorage.setItem("bld_last_floor", floor);
        window.dispatchEvent(new Event("bld_ctx_changed"));
      })
      .catch(() => toast.error("Failed to load rooms"))
      .finally(() => setLoading(false));
  }, [id, floor]);

  useEffect(() => { setPage(1); }, [search, statusFilter]);

  const changeViewMode = (mode) => { setViewMode(mode); localStorage.setItem("bld_room_view_mode", mode); };
  const goToBuildings = () => navigate("/building");
  const goToFloors    = () => navigate(`/building/${id}/floors`);

  const updateRoom = async (roomId, status, note) => {
    try {
      await api.patch(`/building/room/${roomId}`, { status, note });
      toast.success("Room updated");
      setRoomModal(null);
      loadRooms();
    } catch { toast.error("Failed to update room"); }
  };

  const assignEmployee = async (roomId, employeeId) => {
    try {
      await api.post("/building/assign-room", { room_id: roomId, employee_id: employeeId });
      toast.success("Room assigned");
      const r = await api.get(`/building/${id}/floor/${floor}`);
      setRooms(r.data);
      const updated = r.data.find(rm => rm.room_id === roomId);
      if (updated) setRoomModal(updated);
    } catch (e) { toast.error(e?.response?.data?.message || "Failed to assign room"); }
  };

  const assignEmployees = async (roomId, employeeIds) => {
    try {
      await Promise.all(employeeIds.map(eid => api.post("/building/assign-room", { room_id: roomId, employee_id: eid })));
      toast.success(`Added ${employeeIds.length} resident${employeeIds.length > 1 ? "s" : ""}`);
      const r = await api.get(`/building/${id}/floor/${floor}`);
      setRooms(r.data);
      const updated = r.data.find(rm => rm.room_id === roomId);
      if (updated) setRoomModal(updated);
    } catch (e) { toast.error(e?.response?.data?.message || "Failed to assign room"); }
  };

  const unassignEmployee = async (roomId, empId) => {
    try {
      await api.delete(`/building/unassign-room/${empId}`);
      toast.success("Moved out of room");
      const r = await api.get(`/building/${id}/floor/${floor}`);
      setRooms(r.data);
      const updated = r.data.find(rm => rm.room_id === roomId);
      if (updated) setRoomModal(updated);
    } catch { toast.error("Failed to move out"); }
  };

  const addRoom = async () => {
    setSaveError("");
    setSaving(true);
    try {
      await api.post(`/building/${id}/floor/${floor}/room`, { capacity: addCapacity });
      toast.success(t("bld_room_added"));
      setShowAddRoom(false);
      setAddCapacity(2);
      loadRooms();
    } catch (err) {
      setSaveError(err?.response?.data?.message || t("save_failed"));
    }
    setSaving(false);
  };

  const exportCSV = () => {
    const header = ["#", "Room", "Capacity", "Occupants", "Status"];
    const rows = filteredRooms.map((r, i) => [i + 1, r.room_number, r.capacity || 2, r.occupant_count || 0, r.status].map(csvCell).join(","));
    const blob = new Blob([[header.join(","), ...rows].join("\n")], { type: "text/csv;charset=utf-8;" });
    const a = Object.assign(document.createElement("a"), {
      href: URL.createObjectURL(blob),
      download: `${building?.building_name || "building"}_floor${floor}_rooms_${new Date().toISOString().slice(0, 10)}.csv`,
    });
    a.click();
  };

  if (loading) return <div className="bld-page"><SkeletonLoader variant="table" rows={6} /></div>;
  if (!building) return null;

  const effectiveStatusOf = (room) => room.status === "Maintenance" ? "Maintenance"
    : (room.occupant_count || 0) === 0 ? "Available"
    : (room.occupant_count || 0) >= (room.capacity || 2) ? "Occupied" : "Partial";

  const filteredRooms = rooms.filter(r => {
    if (search && !String(r.room_number).toLowerCase().includes(search.toLowerCase())) return false;
    if (statusFilter !== "all" && effectiveStatusOf(r) !== statusFilter) return false;
    return true;
  });

  const totalRooms     = rooms.length;
  const totalCapacity  = rooms.reduce((s, r) => s + (r.capacity || 2), 0);
  const totalOccupants = rooms.reduce((s, r) => s + (r.occupant_count || 0), 0);
  const availableCnt   = rooms.filter(r => effectiveStatusOf(r) === "Available").length;
  const occupiedCnt    = rooms.filter(r => effectiveStatusOf(r) === "Occupied" || effectiveStatusOf(r) === "Partial").length;
  const occupiedPct    = totalRooms > 0 ? Math.round(occupiedCnt / totalRooms * 100) : 0;
  const availablePct   = totalRooms > 0 ? Math.round(availableCnt / totalRooms * 100) : 0;
  const isOffice        = building.building_type === "Office";

  const totalPages  = Math.max(1, Math.ceil(filteredRooms.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pagedRooms  = filteredRooms.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const pgFrom = filteredRooms.length === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const pgTo   = Math.min(currentPage * pageSize, filteredRooms.length);

  return (
    <div className="bld-page">
      <div className="bld-hd">
        <div className="bld-bc">
          <span className="bld-bc-link" onClick={goToBuildings}>{t("nav_building_list")}</span>
          <span className="bld-bc-sep">›</span>
          <span className="bld-bc-link" onClick={goToFloors}>{building.building_name}</span>
          <span className="bld-bc-sep">›</span>
          <span className="bld-bc-cur">{t("bld_floor_n").replace("{n}", floor)}</span>
        </div>
        <div className="bld-hd-row">
          <div className="bld-hd-titlewrap">
            <div className="bld-hd-icon" style={{background:"#dbeafe", color:"#1d4ed8"}}>
              {isOffice ? <IconOffice /> : <IconDorm />}
            </div>
            <div>
              <h1 className="bld-title">{t("bld_floor_n_of_bld").replace("{bld}", building.building_name).replace("{n}", floor)}</h1>
              <p className="bld-sub">{t("bld_rooms_sub")}</p>
            </div>
          </div>
          <div className="bld-hd-actions">
            <button className="bld-export-btn bld-export-btn-top" onClick={exportCSV}>
              <IconDownload /> {t("bld_export")}
            </button>
            <button className="bld-add-btn" onClick={() => { setAddCapacity(2); setSaveError(""); setShowAddRoom(true); }}>
              <span>+ {t("bld_add_room")}</span>
              <IconChevronDown />
            </button>
          </div>
        </div>
      </div>

      <div className="bld-kpi-row">
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
            <div className="bld-kpi-icon" style={{background:"#dbeafe", color:"#1d4ed8"}}><IconDorm /></div>
            <span className="bld-kpi-top-lbl">{t("bld_occupied")}</span>
          </div>
          <span className="bld-kpi-num">{occupiedCnt}</span>
          <span className="bld-kpi-lbl">{t("bld_occupied")} · {occupiedPct}%</span>
        </div>
        <div className="bld-kpi-card">
          <div className="bld-kpi-top">
            <div className="bld-kpi-icon" style={{background:"#dcfce7", color:"#15803d"}}><IconDorm /></div>
            <span className="bld-kpi-top-lbl">{t("bld_available")}</span>
          </div>
          <span className="bld-kpi-num">{availableCnt}</span>
          <span className="bld-kpi-lbl">{t("bld_available")} · {availablePct}%</span>
        </div>
        <div className="bld-kpi-card">
          <div className="bld-kpi-top">
            <div className="bld-kpi-icon" style={{background:"#cffafe", color:"#0e7490"}}><IconUsers /></div>
            <span className="bld-kpi-top-lbl">{t("bld_people_in")}</span>
          </div>
          <span className="bld-kpi-num">{totalOccupants}</span>
          <span className="bld-kpi-lbl">{t("bld_people_in")} / {totalCapacity}</span>
        </div>
      </div>

      <div className="bld-panel bld-panel-main">
        <div className="bld-panel-hd">
          <div><h2 className="bld-panel-title">{t("bld_tab_rooms")}</h2></div>
          <div className="bld-panel-toolbar">
            <div className="bld-search-box">
              <IconSearch />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder={t("bld_search_room_ph")} />
            </div>
            <div className="bld-filter-group">
              <label className="bld-filter-label">{t("bld_status")}</label>
              <select className="bld-type-select" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
                <option value="all">{t("bld_filter_all_status")}</option>
                {STATUS_KEYS.map(s => <option key={s} value={s}>{STATUS[s].label}</option>)}
              </select>
            </div>
            <div className="bld-view-toggle bld-view-toggle-text">
              <button className={`bld-view-btn-text${viewMode === "grid" ? " bld-view-btn-active" : ""}`} title={t("view_grid")} onClick={() => changeViewMode("grid")}>
                <IconViewGrid /> {t("view_grid")}
              </button>
              <button className={`bld-view-btn-text${viewMode === "list" ? " bld-view-btn-active" : ""}`} title={t("view_table")} onClick={() => changeViewMode("list")}>
                <IconViewList /> {t("view_table")}
              </button>
            </div>
          </div>
        </div>

        <div className="bld-legend">
          {STATUS_KEYS.map(s => (
            <span key={s} className="bld-leg-item">
              <span className="bld-leg-dot" style={{background: STATUS[s].bg, border: `2px solid ${STATUS[s].color}`}}/>
              {STATUS[s].label}
            </span>
          ))}
          <span style={{marginLeft:"auto", fontSize:13, color:"#6b7280"}}>
            {t("bld_total_rooms").replace("{n}", filteredRooms.length)}
          </span>
        </div>

        {filteredRooms.length === 0 ? (
          <p className="bld-table-empty">{t("bld_no_results")}</p>
        ) : viewMode === "grid" ? (
          <div className="bld-rooms-grid">
            {pagedRooms.map(room => {
              const eff = effectiveStatusOf(room);
              const sc  = STATUS[eff] || STATUS.Available;
              const cap = room.capacity || 2;
              const occ = room.occupant_count || 0;
              const firstOccupant = (room.occupants || [])[0];
              return (
                <div key={room.room_id} className="bld-room-card" style={{borderColor: sc.color + "55"}} onClick={() => setRoomModal(room)}>
                  <div className="bld-room-card-top">
                    <span className="bld-room-card-icon" style={{background: sc.bg, color: sc.color}}><IconUsers /></span>
                    <span className="bld-room-card-badge" style={{color: sc.color}}>
                      {occ > 0 ? `${occ}/${cap}` : sc.label}
                    </span>
                  </div>
                  <div className="bld-room-card-num">{room.room_number}</div>
                  <div className="bld-room-card-status" style={{color: sc.color}}>{sc.label}</div>
                  {firstOccupant ? (
                    <div className="bld-room-card-occ">
                      {firstOccupant.firstname} {firstOccupant.lastname}{occ > 1 ? ` +${occ - 1}` : ""}
                    </div>
                  ) : (
                    <div className="bld-room-card-occ bld-room-card-occ-empty">{t("room_no_occupants")}</div>
                  )}
                  <div className="bld-room-card-foot">{occ}/{cap} {t("bld_people")}</div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="bld-table-wrap">
            <table className="bld-table">
              <thead>
                <tr>
                  {[t("bld_tab_rooms"), t("bld_capacity"), t("bld_occupants_col"), t("bld_status"), t("actions")].map(h => (
                    <th key={h}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pagedRooms.map(room => {
                  const eff = effectiveStatusOf(room);
                  const sc  = STATUS[eff] || STATUS.Available;
                  const cap = room.capacity || 2;
                  const occ = room.occupant_count || 0;
                  const names = (room.occupants || []).map(o => `${o.firstname} ${o.lastname}`).join(", ");
                  return (
                    <tr key={room.room_id} className="bld-table-row" onClick={() => setRoomModal(room)}>
                      <td style={{fontWeight:700, color:"#0f172a"}}>{room.room_number}</td>
                      <td>{cap} {t("bld_people")}</td>
                      <td>{names || <span style={{color:"#9ca3af"}}>–</span>}</td>
                      <td>
                        <span className="bld-status-badge" style={{background: sc.bg, color: sc.color}}>{sc.label}</span>
                      </td>
                      <td onClick={e => e.stopPropagation()}>
                        <button className="bld-row-menu-trigger" onClick={() => setRoomModal(room)} title={t("bld_view_rooms_action")}>
                          <IconUsers />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {filteredRooms.length > 0 && (
          <div className="bld-pagination">
            <div className="bld-pg-left">
              <span className="bld-pg-info">
                {t("showing_range").replace("{from}", pgFrom).replace("{to}", pgTo).replace("{total}", filteredRooms.length)}
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

      {roomModal && (
        <RoomModal
          room={roomModal}
          onClose={() => setRoomModal(null)}
          onSave={(status, note) => updateRoom(roomModal.room_id, status, note)}
          onAssign={(empId) => assignEmployee(roomModal.room_id, empId)}
          onAssignMultiple={(empIds) => assignEmployees(roomModal.room_id, empIds)}
          onUnassign={(empId) => unassignEmployee(roomModal.room_id, empId)}
        />
      )}

      {showAddRoom && (
        <div className="modal-overlay" onClick={() => setShowAddRoom(false)}>
          <div className="com-modal" onClick={e => e.stopPropagation()}>
            <div className="cm-header">
              <h2 className="cm-title">{t("bld_add_room")}</h2>
              <button className="cm-close" onClick={() => setShowAddRoom(false)}>&#x2715;</button>
            </div>
            <div className="cm-body">
              <p className="cm-color-hint" style={{marginBottom:12}}>{t("bld_add_room_sub")}</p>
              <div className="cm-field">
                <label className="cm-label">{t("bld_room_capacity_lbl")}</label>
                <input type="number" min={1} max={20} className="cm-input" value={addCapacity} onChange={e => setAddCapacity(e.target.value)} />
              </div>
            </div>
            <div className="cm-footer">
              {saveError && <span className="save-error">{saveError}</span>}
              <button className="cm-btn-cancel" onClick={() => setShowAddRoom(false)}>{t("cancel")}</button>
              <button className="cm-btn-create" disabled={saving} onClick={addRoom}>{saving ? t("saving") : t("save")}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function RoomModal({ room, onClose, onSave, onAssign, onAssignMultiple, onUnassign }) {
  const { t } = useLanguage();

  const STATUS = {
    Available:   { bg: "#d1fae5", color: "#065f46", label: t("bld_available") },
    Partial:     { bg: "#fff7ed", color: "#c2410c", label: t("bld_partial") || "ຫ້ອງວ່າງບາງສ່ວນ" },
    Occupied:    { bg: "#dbeafe", color: "#1e40af", label: t("bld_occupied") },
    Maintenance: { bg: "#fef3c7", color: "#92400e", label: t("bld_maintenance") },
  };

  const [status,       setStatus]       = useState(room.status);
  const [note,         setNote]         = useState(room.note || "");
  const [showTab,      setShowTab]      = useState("occupants");
  const [unassigned,   setUnassigned]   = useState([]);
  const [selEmps,      setSelEmps]      = useState([]);
  const [search,       setSearch]       = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [loadingEmp,   setLoadingEmp]   = useState(false);

  const occupants  = room.occupants || [];
  const capacity   = room.capacity || 2;
  const slotsLeft  = capacity - occupants.length - selEmps.length;
  const isFull     = slotsLeft <= 0;

  useEffect(() => {
    if (showTab !== "occupants") return;
    setLoadingEmp(true);
    api.get("/building/unassigned-employees")
      .then(r => setUnassigned(r.data))
      .catch(() => {})
      .finally(() => setLoadingEmp(false));
  }, [showTab, room]);

  const toggleEmp = (emp) => {
    const id = String(emp.employee_id);
    setSelEmps(prev =>
      prev.find(e => String(e.employee_id) === id)
        ? prev.filter(e => String(e.employee_id) !== id)
        : [...prev, emp]
    );
    setSearch("");
  };

  const removeSelEmp = (id) => {
    setSelEmps(prev => prev.filter(e => String(e.employee_id) !== String(id)));
  };

  const handleAdd = () => {
    if (selEmps.length === 0) return;
    const ids = selEmps.map(e => e.employee_id);
    if (ids.length === 1) {
      onAssign(ids[0]);
    } else {
      onAssignMultiple(ids);
    }
    setSelEmps([]);
    setSearch("");
    setShowDropdown(false);
  };

  const filteredUnassigned = unassigned.filter(e => {
    const alreadySelected = selEmps.find(s => String(s.employee_id) === String(e.employee_id));
    if (alreadySelected) return false;
    const q = search.toLowerCase();
    return !q
      || `${e.firstname} ${e.lastname}`.toLowerCase().includes(q)
      || (e.employee_code || "").toLowerCase().includes(q)
      || (e.position || "").toLowerCase().includes(q);
  });

  return (
    <div className="bld-overlay" onClick={onClose}>
      <div className="bld-modal" onClick={e => e.stopPropagation()}>

        <div className="bld-modal-hd">
          <div>
            <h3 className="bld-modal-title">{t("room_n").replace("{n}", room.room_number)}</h3>
            <p className="bld-modal-sub">{t("room_capacity").replace("{cap}", capacity).replace("{occ}", occupants.length)}</p>
          </div>
          <button className="bld-modal-x" onClick={onClose}>✕</button>
        </div>

        <div className="bld-modal-tabs">
          <button className={`bld-modal-tab ${showTab==="occupants"?"tab-active":""}`} onClick={()=>setShowTab("occupants")}>
            {t("room_residents").replace("{n}", occupants.length)}
          </button>
          <button className={`bld-modal-tab ${showTab==="status"?"tab-active":""}`} onClick={()=>setShowTab("status")}>
            {t("room_status")}
          </button>
        </div>

        {showTab === "occupants" && (
          <div>
            {occupants.length === 0 ? (
              <p className="bld-no-occ">{t("room_no_occupants")}</p>
            ) : (
              <div className="bld-occ-list">
                {occupants.map(emp => (
                  <div key={emp.employee_id} className="bld-occ-row">
                    {emp.photo
                      ? <img src={emp.photo} className="bld-occ-photo" alt="" />
                      : <div className="bld-occ-avatar">{(emp.firstname?.[0] || "?").toUpperCase()}</div>
                    }
                    <div className="bld-occ-info">
                      <div className="bld-occ-name">{emp.firstname} {emp.lastname}</div>
                      <div className="bld-occ-code">{emp.employee_code}{emp.position ? ` · ${emp.position}` : ""}</div>
                    </div>
                    <button className="bld-occ-remove" onClick={() => onUnassign(emp.employee_id)}>✕</button>
                  </div>
                ))}
              </div>
            )}

            {occupants.length < capacity && (
              <div className="bld-assign-wrap">
                <p className="bld-assign-label">{t("room_add_resident")}</p>

                {selEmps.length > 0 && (
                  <div className="bld-sel-chips">
                    {selEmps.map(e => (
                      <span key={e.employee_id} className="bld-sel-chip">
                        {e.photo
                          ? <img src={e.photo} style={{width:20,height:20,borderRadius:"50%",objectFit:"cover",flexShrink:0}} alt="" />
                          : <span className="bld-chip-avatar">{(e.firstname?.[0]||"?").toUpperCase()}</span>
                        }
                        <span className="bld-chip-name">{e.firstname} {e.lastname}</span>
                        <button className="bld-chip-x" onMouseDown={() => removeSelEmp(e.employee_id)}>✕</button>
                      </span>
                    ))}
                  </div>
                )}

                {!isFull && (
                  <div className="bld-search-wrap" style={{position:"relative"}}>
                    <input
                      className="bld-search-input"
                      placeholder={t("room_search")}
                      value={search}
                      onChange={e => { setSearch(e.target.value); setShowDropdown(true); }}
                      onFocus={() => setShowDropdown(true)}
                      onBlur={() => setTimeout(() => setShowDropdown(false), 150)}
                      disabled={loadingEmp}
                    />
                    {showDropdown && (
                      <div className="bld-search-dropdown">
                        {loadingEmp && <div className="bld-search-item bld-search-hint">{t("loading")}</div>}
                        {!loadingEmp && filteredUnassigned.slice(0, 8).map(e => (
                          <div key={e.employee_id} className="bld-search-item"
                            onMouseDown={() => toggleEmp(e)}>
                            {e.photo
                              ? <img src={e.photo} className="bld-search-photo" alt="" />
                              : <div className="bld-search-avatar">{(e.firstname?.[0]||"?").toUpperCase()}</div>
                            }
                            <div style={{flex:1,minWidth:0}}>
                              <div className="bld-search-name">{e.firstname} {e.lastname}</div>
                              {e.companies_name && <div className="bld-search-company">{e.companies_name}</div>}
                              <div className="bld-search-meta">{e.employee_code}{e.position ? ` · ${e.position}` : ""}</div>
                            </div>
                          </div>
                        ))}
                        {!loadingEmp && filteredUnassigned.length === 0 && (
                          <div className="bld-search-item bld-search-hint">{t("room_not_found")}</div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                <button
                  className="bld-assign-btn"
                  style={{width:"100%", marginTop:10}}
                  disabled={selEmps.length === 0}
                  onClick={handleAdd}
                >
                  {selEmps.length > 1
                    ? `${t("room_add_btn")} (${selEmps.length})`
                    : t("room_add_btn")}
                </button>
              </div>
            )}
            {occupants.length >= capacity && selEmps.length === 0 && (
              <p className="bld-room-full">{t("room_full").replace("{cap}", capacity)}</p>
            )}
          </div>
        )}

        {showTab === "status" && (
          <div>
            <label className="bld-modal-lbl">{t("room_status")}</label>
            <div className="bld-st-btns">
              {STATUS_KEYS.map(s => (
                <button key={s}
                  className={`bld-st-btn ${status===s?"st-sel":""}`}
                  style={status===s ? {background:STATUS[s].bg, color:STATUS[s].color, borderColor:STATUS[s].color} : {}}
                  onClick={() => setStatus(s)}>{STATUS[s].label}</button>
              ))}
            </div>
            <label className="bld-modal-lbl">{t("notes")}</label>
            <textarea className="bld-modal-ta" rows={3} value={note}
              onChange={e => setNote(e.target.value)} placeholder={t("notes_placeholder")} />
            <div className="bld-modal-footer">
              <button className="bld-modal-cancel" onClick={onClose}>{t("cancel")}</button>
              <button className="bld-modal-save" onClick={() => onSave(status, note)}>{t("save")}</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
