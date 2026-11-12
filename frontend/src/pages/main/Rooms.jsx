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
  const floorLabel = String(floor) === "1" ? "M" : floor; // dormitory floor 1 = M floor
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
      download: `${building?.building_name || "building"}_floor${floorLabel}_rooms_${new Date().toISOString().slice(0, 10)}.csv`,
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

  return (
    <div className="bld-page">
      <div className="bld-hd">
        <div className="bld-bc">
          <span className="bld-bc-link" onClick={goToBuildings}>{t("nav_building_list")}</span>
          <span className="bld-bc-sep">›</span>
          <span className="bld-bc-link" onClick={goToFloors}>{building.building_name}</span>
          <span className="bld-bc-sep">›</span>
          <span className="bld-bc-cur">{t("bld_floor_n").replace("{n}", floorLabel)}</span>
        </div>
        <div className="bld-hd-row">
          <div className="bld-hd-titlewrap">
            <div className="bld-hd-icon" style={{background:"#dbeafe", color:"#1d4ed8"}}>
              {isOffice ? <IconOffice /> : <IconDorm />}
            </div>
            <div>
              <h1 className="bld-title">{t("bld_floor_n_of_bld").replace("{bld}", building.building_name).replace("{n}", floorLabel)}</h1>
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
            {filteredRooms.map(room => {
              const eff = effectiveStatusOf(room);
              const sc  = STATUS[eff] || STATUS.Available;
              const cap = room.capacity || 2;
              const occ = room.occupant_count || 0;
              const firstOccupant = (room.occupants || [])[0];
              const fillPct = Math.min(100, Math.round((occ / cap) * 100));
              return (
                <div key={room.room_id} className="bld-room-card" style={{borderLeftColor: sc.color}} onClick={() => setRoomModal(room)}>
                  <div className="bld-room-card-top">
                    <span className="bld-room-card-num">{room.room_number}</span>
                    <span className="bld-room-card-badge" style={{background: sc.bg, color: sc.color}}>
                      <span className="bld-room-card-dot" style={{background: sc.color}} />
                      {sc.label}
                    </span>
                  </div>
                  {firstOccupant ? (
                    <div className="bld-room-card-occ">
                      <span className="bld-room-card-avatar" style={{background: sc.bg, color: sc.color}}>
                        {(firstOccupant.firstname?.[0] || "?").toUpperCase()}
                      </span>
                      <span className="bld-room-card-occ-name">
                        {firstOccupant.firstname} {firstOccupant.lastname}{occ > 1 ? ` +${occ - 1}` : ""}
                      </span>
                    </div>
                  ) : (
                    <div className="bld-room-card-occ">
                      <span className="bld-room-card-occ-empty">{t("room_no_occupants")}</span>
                    </div>
                  )}
                  <div className="bld-room-card-cap-row">
                    <div className="bld-room-card-cap-track">
                      <div className="bld-room-card-cap-fill" style={{width: `${fillPct}%`, background: sc.color}} />
                    </div>
                    <span className="bld-room-card-cap-txt">{occ}/{cap}</span>
                  </div>
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
                {filteredRooms.map(room => {
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

      </div>

      {roomModal && (
        <RoomModal
          room={roomModal}
          contextLabel={`${building.building_name} · ${t("bld_floor_n").replace("{n}", floorLabel)}`}
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

function RoomModal({ room, contextLabel, onClose, onSave, onAssign, onAssignMultiple, onUnassign }) {
  const { t, lang } = useLanguage();
  const navigate = useNavigate();
  const L = (lo, en) => (lang === "en" ? en : lo);

  const STATUS = {
    Available:   { bg: "#dcfce7", color: "#15803d", label: t("bld_available") },
    Partial:     { bg: "#ffedd5", color: "#c2410c", label: t("bld_partial") || "ຫ້ອງວ່າງບາງສ່ວນ" },
    Occupied:    { bg: "#dbeafe", color: "#1d4ed8", label: t("bld_occupied") },
    Maintenance: { bg: "#fef3c7", color: "#b45309", label: t("bld_maintenance") },
  };

  const [tab,        setTab]        = useState("residents");
  const [status,     setStatus]     = useState(room.status);
  const [note,       setNote]       = useState(room.note || "");
  const [unassigned, setUnassigned] = useState([]);
  const [loadingEmp, setLoadingEmp] = useState(false);
  const [picking,    setPicking]    = useState(false);   // "add resident" panel open
  const [selIds,     setSelIds]     = useState([]);
  const [search,     setSearch]     = useState("");
  const [confirmOut, setConfirmOut] = useState(null);    // employee_id waiting for move-out confirm
  const [busy,       setBusy]       = useState(false);

  const occupants = room.occupants || [];
  const capacity  = room.capacity || 2;
  const freeSlots = Math.max(0, capacity - occupants.length);
  const isMaint   = room.status === "Maintenance";
  const effStatus = isMaint ? "Maintenance"
    : occupants.length === 0 ? "Available"
    : occupants.length >= capacity ? "Occupied" : "Partial";
  const st = STATUS[effStatus];

  /* close on Esc */
  useEffect(() => {
    const onKey = e => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  /* load people without a room when the picker opens */
  useEffect(() => {
    if (!picking) return;
    setLoadingEmp(true);
    api.get("/building/unassigned-employees")
      .then(r => setUnassigned(r.data || []))
      .catch(() => setUnassigned([]))
      .finally(() => setLoadingEmp(false));
  }, [picking, room]);

  /* after the room refreshes (assign / move out) reset local UI */
  useEffect(() => { setSelIds([]); setConfirmOut(null); setBusy(false); }, [room]);

  const q = search.trim().toLowerCase();
  const results = unassigned.filter(e => !q
    || `${e.firstname} ${e.lastname}`.toLowerCase().includes(q)
    || (e.employee_code || "").toLowerCase().includes(q)
    || (e.companies_name || "").toLowerCase().includes(q)
    || (e.position || "").toLowerCase().includes(q));
  const shown = results.slice(0, 50);

  const toggle = id => setSelIds(prev =>
    prev.includes(id) ? prev.filter(x => x !== id)
      : prev.length >= freeSlots ? prev : [...prev, id]);

  const addSelected = async () => {
    if (selIds.length === 0) return;
    setBusy(true);
    if (selIds.length === 1) await onAssign(selIds[0]);
    else await onAssignMultiple(selIds);
    setSearch("");
    setPicking(false);
    setBusy(false);
  };

  const moveOut = async empId => {
    setBusy(true);
    await onUnassign(empId);
    setBusy(false);
  };

  const Avatar = ({ emp, size = 40 }) => emp.photo
    ? <img src={emp.photo} alt="" className="rmx-avatar" style={{ width: size, height: size }} />
    : <div className="rmx-avatar rmx-avatar-txt" style={{ width: size, height: size, fontSize: size * 0.4 }}>
        {(emp.firstname?.[0] || "?").toUpperCase()}
      </div>;

  return (
    <div className="bld-overlay" onClick={onClose}>
      <div className="rmx" onClick={e => e.stopPropagation()} role="dialog" aria-modal="true">

        {/* ── Header ── */}
        <div className="rmx-hd">
          <div className="rmx-hd-main">
            {contextLabel && <div className="rmx-ctx">{contextLabel}</div>}
            <div className="rmx-title-row">
              <h3 className="rmx-title">{t("room_n").replace("{n}", room.room_number)}</h3>
              <span className="rmx-pill" style={{ background: st.bg, color: st.color }}>{st.label}</span>
            </div>
          </div>
          <button className="rmx-x" onClick={onClose} aria-label="Close">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>

        {/* ── Occupancy meter ── */}
        <div className="rmx-meter">
          <div className="rmx-beds">
            {Array.from({ length: capacity }, (_, i) => (
              <span key={i} className={`rmx-bed${i < occupants.length ? " on" : ""}`} />
            ))}
          </div>
          <span className="rmx-meter-txt">
            <b>{occupants.length}</b> / {capacity} {L("ຄົນ", "people")}
            {freeSlots > 0 && !isMaint && <span className="rmx-meter-free"> · {L(`ວ່າງ ${freeSlots} ບ່ອນ`, `${freeSlots} free`)}</span>}
          </span>
        </div>

        {/* ── Tabs ── */}
        <div className="rmx-tabs">
          <button className={`rmx-tab${tab === "residents" ? " on" : ""}`} onClick={() => setTab("residents")}>
            {L("ຜູ້ພັກ", "Residents")} <span className="rmx-tab-n">{occupants.length}</span>
          </button>
          <button className={`rmx-tab${tab === "status" ? " on" : ""}`} onClick={() => setTab("status")}>
            {L("ສະຖານະ & ໝາຍເຫດ", "Status & notes")}
          </button>
        </div>

        {/* ── Residents tab ── */}
        {tab === "residents" && !picking && (
          <div className="rmx-body">
            {isMaint && (
              <div className="rmx-warn">{L("ຫ້ອງນີ້ກຳລັງສ້ອມແປງ", "This room is under maintenance")}{room.note ? ` — ${room.note}` : ""}</div>
            )}

            <div className="rmx-slots">
              {occupants.map(emp => (
                <div key={emp.employee_id} className={`rmx-person${confirmOut === emp.employee_id ? " confirm" : ""}`}>
                  <Avatar emp={emp} />
                  <div className="rmx-person-info">
                    <button className="rmx-person-name" onClick={() => navigate(`/employees/${emp.employee_id}`)} title={L("ເປີດໂປຣໄຟລ໌", "Open profile")}>
                      {emp.firstname} {emp.lastname}
                    </button>
                    <div className="rmx-person-meta">{[emp.employee_code, emp.position].filter(Boolean).join(" · ")}</div>
                  </div>
                  {confirmOut === emp.employee_id ? (
                    <div className="rmx-confirm">
                      <span>{L("ຍ້າຍອອກ?", "Move out?")}</span>
                      <button className="rmx-btn rmx-btn-danger" disabled={busy} onClick={() => moveOut(emp.employee_id)}>{L("ຢືນຢັນ", "Confirm")}</button>
                      <button className="rmx-btn rmx-btn-ghost" disabled={busy} onClick={() => setConfirmOut(null)}>{L("ຍົກເລີກ", "Cancel")}</button>
                    </div>
                  ) : (
                    <button className="rmx-out" onClick={() => setConfirmOut(emp.employee_id)} title={L("ຍ້າຍອອກຈາກຫ້ອງ", "Move out of room")}>
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
                      <span>{L("ຍ້າຍອອກ", "Move out")}</span>
                    </button>
                  )}
                </div>
              ))}

              {!isMaint && Array.from({ length: freeSlots }, (_, i) => (
                <button key={`free-${i}`} className="rmx-empty" onClick={() => setPicking(true)}>
                  <span className="rmx-empty-plus">+</span>
                  <span>{L("ບ່ອນວ່າງ — ກົດເພື່ອເພີ່ມຜູ້ພັກ", "Free bed — click to add a resident")}</span>
                </button>
              ))}
            </div>

            {freeSlots === 0 && (
              <p className="rmx-full">{t("room_full").replace("{cap}", capacity)}</p>
            )}
          </div>
        )}

        {/* ── Add-resident picker ── */}
        {tab === "residents" && picking && (
          <div className="rmx-body rmx-picker">
            <div className="rmx-picker-hd">
              <button className="rmx-back" onClick={() => { setPicking(false); setSelIds([]); setSearch(""); }}>← {L("ກັບຄືນ", "Back")}</button>
              <span className="rmx-picker-hint">
                {L(`ເລືອກໄດ້ອີກ ${freeSlots - selIds.length} ຄົນ`, `${freeSlots - selIds.length} more can be selected`)}
              </span>
            </div>
            <div className="rmx-search">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              <input
                autoFocus
                placeholder={L("ຄົ້ນຫາ ຊື່, ລະຫັດ, ບໍລິສັດ…", "Search name, code, company…")}
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <div className="rmx-results">
              {loadingEmp ? (
                <div className="rmx-results-msg">{t("loading")}</div>
              ) : shown.length === 0 ? (
                <div className="rmx-results-msg">{L("ບໍ່ພົບພະນັກງານທີ່ຍັງບໍ່ມີຫ້ອງ", "No unassigned employees found")}</div>
              ) : shown.map(e => {
                const on = selIds.includes(e.employee_id);
                const locked = !on && selIds.length >= freeSlots;
                return (
                  <button key={e.employee_id} className={`rmx-result${on ? " on" : ""}`} disabled={locked} onClick={() => toggle(e.employee_id)}>
                    <span className={`rmx-check${on ? " on" : ""}`}>
                      {on && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>}
                    </span>
                    <Avatar emp={e} size={34} />
                    <span className="rmx-result-info">
                      <span className="rmx-result-name">{e.firstname} {e.lastname}</span>
                      <span className="rmx-result-meta">{[e.employee_code, e.position, e.companies_name].filter(Boolean).join(" · ")}</span>
                    </span>
                  </button>
                );
              })}
              {!loadingEmp && results.length > shown.length && (
                <div className="rmx-results-msg">{L(`ສະແດງ ${shown.length} ຈາກ ${results.length} — ພິມເພື່ອຄົ້ນຫາ`, `Showing ${shown.length} of ${results.length} — type to search`)}</div>
              )}
            </div>
            <div className="rmx-foot">
              <button className="rmx-btn rmx-btn-ghost" onClick={() => { setPicking(false); setSelIds([]); setSearch(""); }}>{t("cancel")}</button>
              <button className="rmx-btn rmx-btn-primary" disabled={selIds.length === 0 || busy} onClick={addSelected}>
                {selIds.length === 0
                  ? L("ເລືອກຜູ້ພັກ", "Select residents")
                  : L(`ເພີ່ມ ${selIds.length} ຄົນເຂົ້າຫ້ອງ`, `Add ${selIds.length} to room`)}
              </button>
            </div>
          </div>
        )}

        {/* ── Status tab ── */}
        {tab === "status" && (
          <div className="rmx-body">
            <label className="rmx-lbl">{L("ສະຖານະຫ້ອງ", "Room status")}</label>
            <div className="rmx-status-grid">
              {STATUS_KEYS.map(k => (
                <button key={k}
                  className={`rmx-status${status === k ? " on" : ""}`}
                  style={status === k ? { borderColor: STATUS[k].color, background: STATUS[k].bg, color: STATUS[k].color } : undefined}
                  onClick={() => setStatus(k)}>
                  <span className="rmx-dot" style={{ background: STATUS[k].color }} />
                  {STATUS[k].label}
                </button>
              ))}
            </div>
            <p className="rmx-help">{L("ສະຖານະ ວ່າງ / ເຕັມ ຈະປັບຕາມຈຳນວນຜູ້ພັກເອງ. ເລືອກ \"ສ້ອມແປງ\" ເພື່ອປິດຫ້ອງຊົ່ວຄາວ.",
              "Available / occupied update automatically from the residents. Choose \"Maintenance\" to close the room temporarily.")}</p>
            <label className="rmx-lbl">{t("notes")}</label>
            <textarea className="rmx-ta" rows={3} value={note} onChange={e => setNote(e.target.value)} placeholder={t("notes_placeholder")} />
            <div className="rmx-foot rmx-foot-flat">
              <button className="rmx-btn rmx-btn-ghost" onClick={onClose}>{t("cancel")}</button>
              <button className="rmx-btn rmx-btn-primary" onClick={() => onSave(status, note)}>{t("save")}</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
