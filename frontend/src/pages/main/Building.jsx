import { useState, useEffect } from "react";
import { api } from "../../api";
import toast from "react-hot-toast";
import "./building.css";

const STATUS = {
  Available:   { bg: "#d1fae5", color: "#065f46", label: "ວ່າງ" },
  Occupied:    { bg: "#dbeafe", color: "#1e40af", label: "ມີຄົນ" },
  Maintenance: { bg: "#fef3c7", color: "#92400e", label: "ສ້ອມແປງ" },
};
const STATUS_KEYS = ["Available", "Occupied", "Maintenance"];

/* ── Icons ── */
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

export default function Building() {
  const [view,        setView]        = useState("buildings"); // buildings | floors | rooms
  const [buildings,   setBuildings]   = useState([]);
  const [selBuilding, setSelBuilding] = useState(null);
  const [floors,      setFloors]      = useState([]);
  const [rooms,       setRooms]       = useState([]);
  const [selFloor,    setSelFloor]    = useState(null);
  const [loading,     setLoading]     = useState(true);
  const [roomModal,   setRoomModal]   = useState(null);

  /* load all buildings */
  const loadBuildings = async () => {
    setLoading(true);
    try {
      const r = await api.get("/building");
      setBuildings(r.data);
    } catch { toast.error("ໂຫຼດຂໍ້ມູນຕືກບໍ່ໄດ້"); }
    finally { setLoading(false); }
  };
  useEffect(() => { loadBuildings(); }, []);

  /* open building → floors */
  const openBuilding = async (b) => {
    setLoading(true);
    try {
      const r = await api.get(`/building/${b.building_id}`);
      setSelBuilding(r.data);
      setFloors(r.data.floors || []);
      setView("floors");
    } catch { toast.error("ໂຫຼດຊັ້ນບໍ່ໄດ້"); }
    finally { setLoading(false); }
  };

  /* open floor → rooms */
  const openFloor = async (floorNum) => {
    setLoading(true);
    try {
      const r = await api.get(`/building/${selBuilding.building_id}/floor/${floorNum}`);
      setRooms(r.data);
      setSelFloor(floorNum);
      setView("rooms");
    } catch { toast.error("ໂຫຼດຫ້ອງບໍ່ໄດ້"); }
    finally { setLoading(false); }
  };

  /* update room status */
  const updateRoom = async (roomId, status, note) => {
    try {
      await api.patch(`/building/room/${roomId}`, { status, note });
      toast.success("ອັບເດດຫ້ອງສຳເລັດ");
      setRoomModal(null);
      reloadRooms();
    } catch { toast.error("ອັບເດດຫ້ອງບໍ່ໄດ້"); }
  };

  /* assign employee to room */
  const assignEmployee = async (roomId, employeeId) => {
    try {
      await api.post("/building/assign-room", { room_id: roomId, employee_id: employeeId });
      toast.success("ກຳນົດຫ້ອງສຳເລັດ");
      const r = await api.get(`/building/${selBuilding.building_id}/floor/${selFloor}`);
      setRooms(r.data);
      const updated = r.data.find(rm => rm.room_id === roomId);
      if (updated) setRoomModal(updated);
    } catch (e) { toast.error(e?.response?.data?.message || "ກຳນົດຫ້ອງບໍ່ໄດ້"); }
  };

  /* unassign employee */
  const unassignEmployee = async (roomId, empId) => {
    try {
      await api.delete(`/building/unassign-room/${empId}`);
      toast.success("ຍ້າຍອອກຈາກຫ້ອງແລ້ວ");
      const r = await api.get(`/building/${selBuilding.building_id}/floor/${selFloor}`);
      setRooms(r.data);
      const updated = r.data.find(rm => rm.room_id === roomId);
      if (updated) setRoomModal(updated);
    } catch { toast.error("ຍ້າຍອອກບໍ່ໄດ້"); }
  };

  const reloadRooms = async () => {
    const r = await api.get(`/building/${selBuilding.building_id}/floor/${selFloor}`);
    setRooms(r.data);
  };

  if (loading) return <div className="bld-loading"><span>ກຳລັງໂຫຼດ...</span></div>;

  return (
    <div className="bld-page">

      {/* ══════════ VIEW: BUILDINGS ══════════ */}
      {view === "buildings" && (
        <>
          <div className="bld-hd">
            <h1 className="bld-title">Building Management</h1>
            <p className="bld-sub">ຈັດການຂໍ້ມູນອາຄານ ທັງໝົດ 6 ຕືກ</p>
          </div>

          <div className="bld-grid">
            {buildings.map(b => {
              const total    = b.total_rooms    || 0;
              const occupied = b.occupied_rooms || 0;
              const avail    = b.available_rooms || 0;
              const maint    = b.maintenance_rooms || 0;
              const pct      = total > 0 ? Math.round(occupied / total * 100) : 0;
              const isOffice = b.building_type === "Office";
              return (
                <div key={b.building_id} className="bld-card" onClick={() => openBuilding(b)}>
                  <div className={`bld-card-icon ${isOffice ? "ci-office" : "ci-dorm"}`}>
                    {isOffice ? <IconOffice /> : <IconDorm />}
                  </div>
                  <div className="bld-card-body">
                    <div className="bld-card-name">{b.building_name}</div>
                    <span className={`bld-badge ${isOffice ? "bdg-office" : "bdg-dorm"}`}>
                      {isOffice ? "Office" : "ຫ້ອງນອນ"}
                    </span>
                    <div className="bld-card-stats">
                      <div className="bld-stat">
                        <span className="bld-sn">{b.total_floors}</span>
                        <span className="bld-sl">ຊັ້ນ</span>
                      </div>
                      {!isOffice && (<>
                        <div className="bld-stat">
                          <span className="bld-sn">{total}</span>
                          <span className="bld-sl">ທັງໝົດ</span>
                        </div>
                        <div className="bld-stat">
                          <span className="bld-sn" style={{color:"#10b981"}}>{avail}</span>
                          <span className="bld-sl">ວ່າງ</span>
                        </div>
                        <div className="bld-stat">
                          <span className="bld-sn" style={{color:"#3b82f6"}}>{occupied}</span>
                          <span className="bld-sl">ມີຄົນ</span>
                        </div>
                        {maint > 0 && (
                          <div className="bld-stat">
                            <span className="bld-sn" style={{color:"#f59e0b"}}>{maint}</span>
                            <span className="bld-sl">ສ້ອມ</span>
                          </div>
                        )}
                      </>)}
                    </div>
                    {!isOffice && total > 0 && (
                      <div className="bld-occ-wrap">
                        <div className="bld-occ-bar">
                          <div className="bld-occ-fill" style={{width:`${pct}%`}}/>
                        </div>
                        <span className="bld-occ-pct">{pct}% ມີຄົນ</span>
                      </div>
                    )}
                    {isOffice && (
                      <p className="bld-office-note">ອາຄານ Office ທັງ {b.total_floors} ຊັ້ນ</p>
                    )}
                  </div>
                  <span className="bld-arrow">›</span>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* ══════════ VIEW: FLOORS ══════════ */}
      {view === "floors" && selBuilding && (
        <>
          <div className="bld-hd">
            <div className="bld-bc">
              <span className="bld-bc-link" onClick={() => setView("buildings")}>Buildings</span>
              <span className="bld-bc-sep">›</span>
              <span className="bld-bc-cur">{selBuilding.building_name}</span>
            </div>
            <div style={{display:"flex", alignItems:"center", justifyContent:"space-between"}}>
              <div>
                <h1 className="bld-title">{selBuilding.building_name}</h1>
                <p className="bld-sub">
                  {selBuilding.building_type === "Office" ? "ອາຄານ Office" : "ອາຄານຫ້ອງນອນ"}
                  {" · "}{selBuilding.total_floors} ຊັ້ນ
                </p>
              </div>
              <button className="bld-back-btn" onClick={() => setView("buildings")}>‹ ກັບຄືນ</button>
            </div>
          </div>

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
                  <div className="bld-floor-badge">ຊັ້ນ {fn}</div>
                  <div className="bld-floor-info">
                    <div className="bld-floor-label">
                      {isOffice ? "Office" : isLobby ? "Lobby / ພື້ນທີ່ສ່ວນກາງ" : "ຫ້ອງນອນ (21 ຫ້ອງ)"}
                    </div>
                    {clickable && fd && (
                      <div className="bld-floor-chips">
                        <span className="fchip fchip-avail">{fd.available} ວ່າງ</span>
                        <span className="fchip fchip-occ">{fd.occupied} ມີຄົນ</span>
                        {parseInt(fd.maintenance) > 0 &&
                          <span className="fchip fchip-maint">{fd.maintenance} ສ້ອມ</span>}
                      </div>
                    )}
                  </div>
                  {clickable && <span className="bld-arrow">›</span>}
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* ══════════ VIEW: ROOMS ══════════ */}
      {view === "rooms" && selBuilding && (
        <>
          <div className="bld-hd">
            <div className="bld-bc">
              <span className="bld-bc-link" onClick={() => setView("buildings")}>Buildings</span>
              <span className="bld-bc-sep">›</span>
              <span className="bld-bc-link" onClick={() => setView("floors")}>{selBuilding.building_name}</span>
              <span className="bld-bc-sep">›</span>
              <span className="bld-bc-cur">ຊັ້ນ {selFloor}</span>
            </div>
            <div style={{display:"flex", alignItems:"center", justifyContent:"space-between"}}>
              <div>
                <h1 className="bld-title">{selBuilding.building_name} — ຊັ້ນ {selFloor}</h1>
                <p className="bld-sub">ກົດຫ້ອງ ເພື່ອປ່ຽນສະຖານະ</p>
              </div>
              <button className="bld-back-btn" onClick={() => setView("floors")}>‹ ກັບຄືນ</button>
            </div>
          </div>

          {/* legend */}
          <div className="bld-legend">
            {STATUS_KEYS.map(s => (
              <span key={s} className="bld-leg-item">
                <span className="bld-leg-dot" style={{background: STATUS[s].bg, border: `2px solid ${STATUS[s].color}`}}/>
                {STATUS[s].label}
              </span>
            ))}
            <span style={{marginLeft:"auto", fontSize:13, color:"#6b7280"}}>
              ທັງໝົດ {rooms.length} ຫ້ອງ
              {" · "}ວ່າງ {rooms.filter(r=>r.status==="Available").length}
              {" · "}ມີຄົນ {rooms.filter(r=>r.status==="Occupied").length}
            </span>
          </div>

          {/* rooms grid 7 × 3 */}
          <div className="bld-rooms-grid">
            {rooms.map(room => {
              const sc = STATUS[room.status] || STATUS.Available;
              return (
                <div
                  key={room.room_id}
                  className="bld-room"
                  style={{background: sc.bg, borderColor: sc.color + "66"}}
                  onClick={() => setRoomModal(room)}
                >
                  <div className="bld-room-num" style={{color: sc.color}}>{room.room_number}</div>
                  <div className="bld-room-cap" style={{color: sc.color + "bb"}}>
                    {room.occupant_count || 0}/{room.capacity || 2} ຄົນ
                  </div>
                  <div className="bld-room-st" style={{color: sc.color}}>{sc.label}</div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* ══════════ ROOM MODAL ══════════ */}
      {roomModal && (
        <RoomModal
          room={roomModal}
          onClose={() => setRoomModal(null)}
          onSave={(status, note) => updateRoom(roomModal.room_id, status, note)}
          onAssign={(empId) => assignEmployee(roomModal.room_id, empId)}
          onUnassign={(empId) => unassignEmployee(roomModal.room_id, empId)}
        />
      )}
    </div>
  );
}

/* ── Room modal with occupants ── */
function RoomModal({ room, onClose, onSave, onAssign, onUnassign }) {
  const [status,    setStatus]    = useState(room.status);
  const [note,      setNote]      = useState(room.note || "");
  const [showTab,   setShowTab]   = useState("occupants"); // occupants | status
  const [unassigned,  setUnassigned]  = useState([]);
  const [selEmp,      setSelEmp]      = useState("");
  const [search,      setSearch]      = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [loadingEmp,  setLoadingEmp]  = useState(false);

  const occupants = room.occupants || [];
  const isFull    = occupants.length >= (room.capacity || 2);

  useEffect(() => {
    if (showTab !== "occupants") return;
    setLoadingEmp(true);
    api.get("/building/unassigned-employees")
      .then(r => setUnassigned(r.data))
      .catch(() => {})
      .finally(() => setLoadingEmp(false));
  }, [showTab, room]);

  return (
    <div className="bld-overlay" onClick={onClose}>
      <div className="bld-modal" onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="bld-modal-hd">
          <div>
            <h3 className="bld-modal-title">ຫ້ອງ {room.room_number}</h3>
            <p className="bld-modal-sub">ຮອງຮັບ {room.capacity || 2} ຄົນ · ມີ {occupants.length} ຄົນ</p>
          </div>
          <button className="bld-modal-x" onClick={onClose}>✕</button>
        </div>

        {/* Tabs */}
        <div className="bld-modal-tabs">
          <button className={`bld-modal-tab ${showTab==="occupants"?"tab-active":""}`} onClick={()=>setShowTab("occupants")}>
            ຜູ້ພັກອາໄສ ({occupants.length})
          </button>
          <button className={`bld-modal-tab ${showTab==="status"?"tab-active":""}`} onClick={()=>setShowTab("status")}>
            ສະຖານະ
          </button>
        </div>

        {/* ── Tab: Occupants ── */}
        {showTab === "occupants" && (
          <div>
            {/* current occupants */}
            {occupants.length === 0 ? (
              <p className="bld-no-occ">ຍັງບໍ່ມີຜູ້ພັກ</p>
            ) : (
              <div className="bld-occ-list">
                {occupants.map(emp => (
                  <div key={emp.employee_id} className="bld-occ-row">
                    <div className="bld-occ-avatar">
                      {(emp.firstname?.[0] || "?").toUpperCase()}
                    </div>
                    <div className="bld-occ-info">
                      <div className="bld-occ-name">{emp.firstname} {emp.lastname}</div>
                      <div className="bld-occ-code">{emp.employee_code} · {emp.position || "–"}</div>
                    </div>
                    <button className="bld-occ-remove" onClick={() => onUnassign(emp.employee_id)} title="ຍ້າຍອອກ">✕</button>
                  </div>
                ))}
              </div>
            )}

            {/* assign new employee — searchable picker */}
            {!isFull && (
              <div className="bld-assign-wrap">
                <p className="bld-assign-label">ເພີ້ມຜູ້ພັກ</p>

                {/* selected preview */}
                {selEmp ? (
                  <div className="bld-sel-preview">
                    <div className="bld-occ-avatar" style={{width:30,height:30,fontSize:13}}>
                      {(unassigned.find(e=>String(e.employee_id)===selEmp)?.firstname?.[0]||"?").toUpperCase()}
                    </div>
                    <div className="bld-occ-info" style={{flex:1}}>
                      {(() => {
                        const e = unassigned.find(x => String(x.employee_id) === selEmp);
                        return e ? <><span className="bld-occ-name">{e.firstname} {e.lastname}</span> <span className="bld-occ-code">{e.employee_code}</span></> : null;
                      })()}
                    </div>
                    <button className="bld-sel-clear" onClick={() => { setSelEmp(""); setSearch(""); }}>✕</button>
                  </div>
                ) : (
                  <div className="bld-search-wrap" style={{position:"relative"}}>
                    <input
                      className="bld-search-input"
                      placeholder="🔍 ຄົ້ນຫາຊື່ / ລະຫັດ..."
                      value={search}
                      onChange={e => { setSearch(e.target.value); setShowDropdown(true); }}
                      onFocus={() => setShowDropdown(true)}
                      disabled={loadingEmp}
                    />
                    {showDropdown && (
                      <div className="bld-search-dropdown">
                        {loadingEmp && <div className="bld-search-item bld-search-hint">ກຳລັງໂຫຼດ...</div>}
                        {!loadingEmp && unassigned
                          .filter(e => {
                            const q = search.toLowerCase();
                            return !q
                              || `${e.firstname} ${e.lastname}`.toLowerCase().includes(q)
                              || (e.employee_code || "").toLowerCase().includes(q)
                              || (e.position || "").toLowerCase().includes(q);
                          })
                          .slice(0, 8)
                          .map(e => (
                            <div
                              key={e.employee_id}
                              className="bld-search-item"
                              onMouseDown={() => {
                                setSelEmp(String(e.employee_id));
                                setSearch("");
                                setShowDropdown(false);
                              }}
                            >
                              <div className="bld-occ-avatar" style={{width:30,height:30,fontSize:12,flexShrink:0}}>
                                {(e.firstname?.[0]||"?").toUpperCase()}
                              </div>
                              <div>
                                <div className="bld-occ-name">{e.firstname} {e.lastname}</div>
                                <div className="bld-occ-code">{e.employee_code} · {e.position || "–"}</div>
                              </div>
                            </div>
                          ))
                        }
                        {!loadingEmp && unassigned.filter(e => {
                          const q = search.toLowerCase();
                          return !q || `${e.firstname} ${e.lastname}`.toLowerCase().includes(q)
                            || (e.employee_code||"").toLowerCase().includes(q);
                        }).length === 0 && (
                          <div className="bld-search-item bld-search-hint">ບໍ່ພົບ Employee</div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                <button
                  className="bld-assign-btn"
                  style={{width:"100%", marginTop:10}}
                  disabled={!selEmp}
                  onClick={() => {
                    onAssign(parseInt(selEmp));
                    setSelEmp(""); setSearch(""); setShowDropdown(false);
                  }}
                >
                  + ເພີ້ມເຂົ້າຫ້ອງ
                </button>
              </div>
            )}
            {isFull && <p className="bld-room-full">ຫ້ອງເຕັມແລ້ວ ({room.capacity} ຄົນ)</p>}
          </div>
        )}

        {/* ── Tab: Status ── */}
        {showTab === "status" && (
          <div>
            <label className="bld-modal-lbl">ສະຖານະ</label>
            <div className="bld-st-btns">
              {STATUS_KEYS.map(s => (
                <button
                  key={s}
                  className={`bld-st-btn ${status===s?"st-sel":""}`}
                  style={status===s ? {background:STATUS[s].bg, color:STATUS[s].color, borderColor:STATUS[s].color} : {}}
                  onClick={() => setStatus(s)}
                >{STATUS[s].label}</button>
              ))}
            </div>
            <label className="bld-modal-lbl">ໝາຍເຫດ</label>
            <textarea
              className="bld-modal-ta"
              rows={3}
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="ໝາຍເຫດ..."
            />
            <div className="bld-modal-footer">
              <button className="bld-modal-cancel" onClick={onClose}>ຍົກເລີກ</button>
              <button className="bld-modal-save" onClick={() => onSave(status, note)}>ບັນທຶກ</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
