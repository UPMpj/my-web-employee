import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { api } from "../../api";
import toast from "react-hot-toast";
import { useLanguage } from "../../context/LanguageContext";
import "./building.css";

const PALETTES = [
  { bar: "#2563eb", icon: "#dbeafe", text: "#1d4ed8" },
  { bar: "#16a34a", icon: "#dcfce7", text: "#15803d" },
  { bar: "#7c3aed", icon: "#ede9fe", text: "#6d28d9" },
  { bar: "#ea580c", icon: "#ffedd5", text: "#c2410c" },
  { bar: "#0891b2", icon: "#cffafe", text: "#0e7490" },
  { bar: "#db2777", icon: "#fce7f3", text: "#be185d" },
];

const STATUS_KEYS = ["Available", "Partial", "Occupied", "Maintenance"];

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

export default function Building() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const bid      = searchParams.get("bid");
  const floorNum = searchParams.get("floor");
  const view     = !bid ? "buildings" : !floorNum ? "floors" : "rooms";

  const STATUS = {
    Available:   { bg: "#d1fae5", color: "#065f46", label: t("bld_available") },
    Partial:     { bg: "#fff7ed", color: "#c2410c", label: t("bld_partial") || "ຫ້ອງວ່າງບາງສ່ວນ" },
    Occupied:    { bg: "#dbeafe", color: "#1e40af", label: t("bld_occupied") },
    Maintenance: { bg: "#fef3c7", color: "#92400e", label: t("bld_maintenance") },
  };

  const [buildings,   setBuildings]   = useState([]);
  const [selBuilding, setSelBuilding] = useState(null);
  const [floors,      setFloors]      = useState([]);
  const [rooms,       setRooms]       = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [roomModal,   setRoomModal]   = useState(null);
  const [viewMode,    setViewMode]    = useState(() => localStorage.getItem("bld_view_mode") || "grid");

  const changeViewMode = (mode) => {
    setViewMode(mode);
    localStorage.setItem("bld_view_mode", mode);
  };

  // Load buildings list or building details based on URL
  useEffect(() => {
    if (!bid) {
      setLoading(true);
      api.get("/building")
        .then(r => { setBuildings(r.data); setLoading(false); })
        .catch(() => { toast.error("Failed to load buildings"); setLoading(false); });
    } else {
      setLoading(true);
      Promise.all([api.get("/building"), api.get(`/building/${bid}`)])
        .then(([bl, bd]) => {
          setBuildings(bl.data);
          setSelBuilding(bd.data);
          setFloors(bd.data.floors || []);
        })
        .catch(() => toast.error("Failed to load floors"))
        .finally(() => setLoading(false));
    }
  }, [bid]);

  // Load rooms when floor changes
  useEffect(() => {
    if (!bid || !floorNum) return;
    setLoading(true);
    api.get(`/building/${bid}/floor/${floorNum}`)
      .then(r => setRooms(r.data))
      .catch(() => toast.error("Failed to load rooms"))
      .finally(() => setLoading(false));
  }, [bid, floorNum]);

  const goToBuildings = () => navigate('/building');
  const goToFloors    = () => navigate(`/building?bid=${bid}`);
  const openBuilding  = (b) => navigate(`/building?bid=${b.building_id}`);
  const openFloor     = (fn) => navigate(`/building?bid=${bid}&floor=${fn}`);

  const updateRoom = async (roomId, status, note) => {
    try {
      await api.patch(`/building/room/${roomId}`, { status, note });
      toast.success("Room updated");
      setRoomModal(null);
      reloadRooms();
    } catch { toast.error("Failed to update room"); }
  };

  const assignEmployee = async (roomId, employeeId) => {
    try {
      await api.post("/building/assign-room", { room_id: roomId, employee_id: employeeId });
      toast.success("Room assigned");
      const r = await api.get(`/building/${bid}/floor/${floorNum}`);
      setRooms(r.data);
      const updated = r.data.find(rm => rm.room_id === roomId);
      if (updated) setRoomModal(updated);
    } catch (e) { toast.error(e?.response?.data?.message || "Failed to assign room"); }
  };

  const assignEmployees = async (roomId, employeeIds) => {
    try {
      await Promise.all(
        employeeIds.map(eid => api.post("/building/assign-room", { room_id: roomId, employee_id: eid }))
      );
      toast.success(`Added ${employeeIds.length} resident${employeeIds.length > 1 ? "s" : ""}`);
      const r = await api.get(`/building/${bid}/floor/${floorNum}`);
      setRooms(r.data);
      const updated = r.data.find(rm => rm.room_id === roomId);
      if (updated) setRoomModal(updated);
    } catch (e) { toast.error(e?.response?.data?.message || "Failed to assign room"); }
  };

  const unassignEmployee = async (roomId, empId) => {
    try {
      await api.delete(`/building/unassign-room/${empId}`);
      toast.success("Moved out of room");
      const r = await api.get(`/building/${bid}/floor/${floorNum}`);
      setRooms(r.data);
      const updated = r.data.find(rm => rm.room_id === roomId);
      if (updated) setRoomModal(updated);
    } catch { toast.error("Failed to move out"); }
  };

  const reloadRooms = async () => {
    const r = await api.get(`/building/${bid}/floor/${floorNum}`);
    setRooms(r.data);
  };

  const bPalIdx = selBuilding ? buildings.findIndex(b => b.building_id === selBuilding.building_id) : -1;
  const bPal = PALETTES[Math.max(0, bPalIdx) % PALETTES.length];

  if (loading) return <div className="bld-loading"><span>{t("loading")}</span></div>;

  return (
    <div className="bld-page">

      {/* ══════════ VIEW: BUILDINGS ══════════ */}
      {view === "buildings" && (
        <>
          <div className="bld-hd bld-hd-row">
            <div>
              <h1 className="bld-title">{t("bld_title")}</h1>
              <p className="bld-sub">{t("bld_sub").replace("{n}", buildings.length)}</p>
            </div>
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

          {viewMode === "list" ? (
            <div className="bld-table-wrap">
              <table className="bld-table">
                <thead>
                  <tr>
                    {["#", t("building_name"), t("building_type"), t("floors"), t("total_rooms"), t("available"), t("occupied"), t("total_occupants"), t("occupancy")].map(h => (
                      <th key={h}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {buildings.length === 0 ? (
                    <tr><td colSpan="9" className="bld-table-empty">{t("no_data")}</td></tr>
                  ) : buildings.map((b, idx) => {
                    const pal      = PALETTES[idx % PALETTES.length];
                    const total    = b.total_rooms     || 0;
                    const avail    = b.available_rooms || 0;
                    const hasOccupants = (b.occupied_rooms || 0) + (b.partial_rooms || 0);
                    const totalCap = b.total_capacity   || 0;
                    const totalOcc = b.total_occupants  || 0;
                    const pct      = totalCap > 0 ? Math.round(totalOcc / totalCap * 100) : 0;
                    const isOffice = b.building_type === "Office";
                    return (
                      <tr key={b.building_id} className="bld-table-row" onClick={() => openBuilding(b)}>
                        <td className="bld-td-num">{idx + 1}</td>
                        <td className="bld-td-name">
                          <span className="bld-td-icon" style={{ background: pal.icon, color: pal.text }}>
                            {isOffice ? <IconOffice /> : <IconDorm />}
                          </span>
                          {b.building_name}
                        </td>
                        <td>
                          <span className="bld-type-badge" style={{ background: pal.icon, color: pal.text }}>
                            {isOffice ? t("bld_office") : t("bld_dormitory")}
                          </span>
                        </td>
                        <td>{b.total_floors || 0}</td>
                        <td>{isOffice ? "–" : total}</td>
                        <td style={{ color: "#059669", fontWeight: 600 }}>{isOffice ? "–" : avail}</td>
                        <td style={{ color: pal.bar, fontWeight: 600 }}>{isOffice ? "–" : hasOccupants}</td>
                        <td style={{ color: "#374151", fontWeight: 600 }}>{isOffice ? "–" : totalOcc}</td>
                        <td>
                          {!isOffice && totalCap > 0 ? (
                            <div className="bld-occ-wrap-table">
                              <div className="bld-occ-bar-table">
                                <div className="bld-occ-fill-table" style={{ width: `${pct}%`, background: pal.bar }} />
                              </div>
                              <span className="bld-occ-pct-table">{pct}%</span>
                            </div>
                          ) : (
                            <span style={{ color: "#9ca3af" }}>–</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
          <div className="bld-grid">
            {buildings.map((b, idx) => {
              const pal      = PALETTES[idx % PALETTES.length];
              const total    = b.total_rooms    || 0;
              const avail    = b.available_rooms || 0;
              const hasOccupants = (b.occupied_rooms || 0) + (b.partial_rooms || 0);
              const totalCap = b.total_capacity || 0;
              const totalOcc = b.total_occupants || 0;
              const pct      = totalCap > 0 ? Math.round(totalOcc / totalCap * 100) : 0;
              const isOffice = b.building_type === "Office";
              return (
                <div key={b.building_id} className="bld-card" onClick={() => openBuilding(b)}>
                  <div className="bld-card-strip" style={{background: pal.bar}} />
                  <div className="bld-card-inner">
                    <div className="bld-card-top">
                      <div className="bld-card-icon" style={{background: pal.icon, color: pal.text}}>
                        {isOffice ? <IconOffice /> : <IconDorm />}
                      </div>
                      <div className="bld-card-info">
                        <div className="bld-card-name">{b.building_name}</div>
                        <span className="bld-badge" style={{background: pal.icon, color: pal.text}}>
                          {isOffice ? t("bld_office") : t("bld_dormitory")}
                        </span>
                      </div>
                      <span className="bld-arrow">›</span>
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
                        <div className="bld-occ-bar">
                          <div className="bld-occ-fill" style={{width:`${pct}%`, background: pal.bar}}/>
                        </div>
                        <div className="bld-occ-meta">
                          <span className="bld-occ-pct">{pct}% {t("bld_usage")}</span>
                          <span className="bld-occ-cnt">{totalOcc} / {totalCap} {t("bld_people")}</span>
                        </div>
                      </div>
                    )}
                    {isOffice && (
                      <p className="bld-office-note">{t("bld_office_note").replace("{n}", b.total_floors)}</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          )}
        </>
      )}

      {/* ══════════ VIEW: FLOORS ══════════ */}
      {view === "floors" && selBuilding && (
        <>
          <div className="bld-hd">
            <div className="bld-bc">
              <span className="bld-bc-link" onClick={goToBuildings}>Buildings</span>
              <span className="bld-bc-sep">›</span>
              <span className="bld-bc-cur">{selBuilding.building_name}</span>
            </div>
            <div className="bld-hd-row" style={{marginBottom: 0}}>
              <div>
                <h1 className="bld-title" style={{color: bPal.bar}}>{selBuilding.building_name}</h1>
                <p className="bld-sub">
                  {selBuilding.building_type === "Office" ? t("bld_office_bld") : t("bld_dormitory")}
                  {" · "}{selBuilding.total_floors} {t("bld_floors")}
                </p>
              </div>
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
          <div className="bld-floors">
            {Array.from({length: selBuilding.total_floors}, (_, i) => i + 1).map(fn => {
              const fd       = floors.find(f => parseInt(f.floor_number) === fn);
              const isLobby  = fn === 1;
              const isOffice = selBuilding.building_type === "Office";
              const clickable = !isLobby && !isOffice;
              return (
                <div
                  key={fn}
                  className={`bld-floor-row ${isLobby ? "fr-lobby" : isOffice ? "fr-office" : "fr-rooms"}`}
                  onClick={() => clickable && openFloor(fn)}
                  style={{cursor: clickable ? "pointer" : "default"}}
                >
                  <div className="bld-floor-badge">{t("bld_floor_n").replace("{n}", fn)}</div>
                  <div className="bld-floor-info">
                    <div className="bld-floor-label">
                      {isOffice ? t("bld_office") : isLobby ? t("bld_lobby") : t("bld_dorm_rooms").replace("{n}", fd?.total_rooms ?? "…")}
                    </div>
                    {clickable && fd && (
                      <div className="bld-floor-chips">
                        <span className="fchip fchip-avail">{fd.available} {t("bld_avail_rooms")}</span>
                        <span className="fchip fchip-occ">{fd.total_occupants} {t("bld_people")}</span>
                        {parseInt(fd.maintenance) > 0 &&
                          <span className="fchip fchip-maint">{fd.maintenance} {t("bld_maint_short")}</span>}
                      </div>
                    )}
                  </div>
                  {clickable && <span className="bld-arrow">›</span>}
                </div>
              );
            })}
          </div>
          ) : (
          <div className="bld-floors-grid">
            {Array.from({length: selBuilding.total_floors}, (_, i) => i + 1).map(fn => {
              const fd       = floors.find(f => parseInt(f.floor_number) === fn);
              const isLobby  = fn === 1;
              const isOffice = selBuilding.building_type === "Office";
              const clickable = !isLobby && !isOffice;
              return (
                <div
                  key={fn}
                  className={`bld-floor-card ${isLobby ? "fr-lobby" : isOffice ? "fr-office" : "fr-rooms"}`}
                  onClick={() => clickable && openFloor(fn)}
                >
                  <div className="bld-floor-card-badge">{fn}</div>
                  <div className="bld-floor-card-label">
                    {isOffice ? t("bld_office") : isLobby ? t("bld_lobby") : t("bld_dorm_rooms").replace("{n}", fd?.total_rooms ?? "…")}
                  </div>
                  {clickable && fd && (
                    <div className="bld-floor-card-chips">
                      <span className="fchip fchip-avail">{fd.available} {t("bld_avail_rooms")}</span>
                      <span className="fchip fchip-occ">{fd.total_occupants} {t("bld_people")}</span>
                      {parseInt(fd.maintenance) > 0 &&
                        <span className="fchip fchip-maint">{fd.maintenance} {t("bld_maint_short")}</span>}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          )}
        </>
      )}

      {/* ══════════ VIEW: ROOMS ══════════ */}
      {view === "rooms" && selBuilding && (
        <>
          <div className="bld-hd">
            <div className="bld-bc">
              <span className="bld-bc-link" onClick={goToBuildings}>Buildings</span>
              <span className="bld-bc-sep">›</span>
              <span className="bld-bc-link" onClick={goToFloors}>{selBuilding.building_name}</span>
              <span className="bld-bc-sep">›</span>
              <span className="bld-bc-cur">{t("bld_floor_n").replace("{n}", floorNum)}</span>
            </div>
            <div>
              <h1 className="bld-title">{t("bld_floor_n_of_bld").replace("{bld}", selBuilding.building_name).replace("{n}", floorNum)}</h1>
              <p className="bld-sub">{t("bld_click_change")}</p>
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
              {t("bld_total_rooms").replace("{n}", rooms.length)}
              {" · "}{t("bld_available")} {rooms.filter(r => (r.status !== "Maintenance" && (r.occupant_count||0) === 0)).length}
              {rooms.filter(r => r.status !== "Maintenance" && (r.occupant_count||0) > 0 && (r.occupant_count||0) < (r.capacity||2)).length > 0 &&
                ` · ${t("bld_partial")} ${rooms.filter(r => r.status !== "Maintenance" && (r.occupant_count||0) > 0 && (r.occupant_count||0) < (r.capacity||2)).length}`}
              {" · "}{t("bld_occupied")} {rooms.filter(r => r.status !== "Maintenance" && (r.occupant_count||0) >= (r.capacity||2)).length}
            </span>
          </div>

          <div className="bld-rooms-grid">
            {rooms.map(room => {
              const effectiveStatus = room.status === "Maintenance" ? "Maintenance"
                : (room.occupant_count || 0) === 0 ? "Available"
                : (room.occupant_count || 0) >= (room.capacity || 2) ? "Occupied" : "Partial";
              const sc = STATUS[effectiveStatus] || STATUS.Available;
              return (
                <div
                  key={room.room_id}
                  className="bld-room"
                  style={{background: sc.bg, borderColor: sc.color + "66"}}
                  onClick={() => setRoomModal(room)}
                >
                  <div className="bld-room-num" style={{color: sc.color}}>{room.room_number}</div>
                  <div className="bld-room-cap" style={{color: sc.color + "bb"}}>
                    {room.occupant_count || 0}/{room.capacity || 2} {t("bld_people")}
                  </div>
                  <div className="bld-room-st" style={{color: sc.color}}>{sc.label}</div>
                </div>
              );
            })}
          </div>
        </>
      )}

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
