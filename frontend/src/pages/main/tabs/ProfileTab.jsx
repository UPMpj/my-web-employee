import { fmt, STATUS_STYLE } from "./employeeDetailUtils";
import { photoUrl as getPhotoUrl } from "../../../api";

export default function ProfileTab({ emp }) {
  const sc = STATUS_STYLE[emp.status] || STATUS_STYLE["Inactive"];
  return (
    <div className="ed-card">
      <div className="ed-profile-wrap">
        <div className="ed-profile-card">
          <div className="ed-profile-avatar">
            {emp.photo
              ? <img src={getPhotoUrl(emp.photo)} alt="profile" />
              : <svg viewBox="0 0 24 24" fill="none" stroke="#adb5bd" strokeWidth="1.2">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                  <circle cx="12" cy="7" r="4"/>
                </svg>
            }
          </div>
          <div className="ed-profile-name">{emp.firstname} {emp.lastname}</div>
          <div className="ed-profile-pos">{emp.position || "–"}</div>
          <div className="ed-profile-meta">
            <span>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="2" y="5" width="20" height="14" rx="2"/><path d="M16 3v4M8 3v4M2 9h20"/>
              </svg>
              {emp.employee_code || "–"}
            </span>
            <span>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>
              </svg>
              {emp.companies_name || "–"}
            </span>
            <span>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2A19.79 19.79 0 0 1 11.82 18.1 19.45 19.45 0 0 1 6 12.28 19.79 19.79 0 0 1 3.12 3.18 2 2 0 0 1 5.11 1h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L9.91 8.09a16 16 0 0 0 6 6l.46-.46a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 23 16"/>
              </svg>
              {emp.contact_no || "–"}
            </span>
            {emp.email && (
              <span>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                  <polyline points="22,6 12,13 2,6"/>
                </svg>
                {emp.email}
              </span>
            )}
          </div>
          <span className="ed-badge ed-status-chip" style={{ background: sc.bg, color: sc.color }}>
            {emp.status}
          </span>
        </div>

        <div className="ed-profile-table-wrap">
          <table className="ed-info-table">
            <thead>
              <tr><th className="ed-th">Field</th><th className="ed-th">Value</th></tr>
            </thead>
            <tbody>
              <tr className="ed-section-row"><td colSpan="2" className="ed-group-label">📍 ທີ່ຢູ່</td></tr>
              {[
                ["ແຂວງ (Province)", emp.province],
                ["ເມືອງ (District)", emp.district],
                ["ບ້ານ (Village)",   emp.village],
              ].map(([label, value]) => (
                <tr key={label}>
                  <td className="ed-lbl">{label}</td>
                  <td className="ed-val">{value || "–"}</td>
                </tr>
              ))}

              <tr className="ed-section-row"><td colSpan="2" className="ed-group-label">💼 ການຈ້າງງານ</td></tr>
              {[
                ["ວັນທີເຂົ້າວຽກ",  fmt(emp.hired_at)],
                ["ປະເພດພະນັກງານ",  emp.employee_type],
                ["ຕຳແໜ່ງ",         emp.position],
                ["ສະຖານະ",         emp.status],
              ].map(([label, value]) => (
                <tr key={label}>
                  <td className="ed-lbl">{label}</td>
                  <td className="ed-val">{value || "–"}</td>
                </tr>
              ))}

              <tr className="ed-section-row"><td colSpan="2" className="ed-group-label">🏢 ທີ່ຕັ້ງ Office</td></tr>
              <tr>
                <td className="ed-lbl">ຕືກ Office</td>
                <td className="ed-val">
                  {emp.office_building ? <span className="ed-room-tag ed-tag-office">{emp.office_building}</span> : "–"}
                </td>
              </tr>
              <tr>
                <td className="ed-lbl">ຊັ້ນ Office</td>
                <td className="ed-val">
                  {emp.office_floor ? <span className="ed-room-tag ed-tag-floor">{emp.office_floor}</span> : "–"}
                </td>
              </tr>
              <tr>
                <td className="ed-lbl">ຫ້ອງ Office</td>
                <td className="ed-val">
                  {emp.office_room_no ? <span className="ed-room-tag ed-tag-room">ຫ້ອງ {emp.office_room_no}</span> : "–"}
                </td>
              </tr>

              {(emp.linked_building || emp.dormitory) && (
                <>
                  <tr className="ed-section-row"><td colSpan="2" className="ed-group-label">🛏️ ທີ່ພັກ (Dormitory)</td></tr>
                  <tr>
                    <td className="ed-lbl">ຕືກທີ່ພັກ</td>
                    <td className="ed-val">
                      {emp.linked_building
                        ? <span className="ed-room-tag ed-tag-bld">{emp.linked_building}</span>
                        : emp.dormitory
                          ? <span className="ed-room-tag ed-tag-bld">{emp.dormitory}</span>
                          : "–"}
                    </td>
                  </tr>
                  <tr>
                    <td className="ed-lbl">ຊັ້ນ</td>
                    <td className="ed-val">
                      {emp.linked_floor ? <span className="ed-room-tag ed-tag-floor">ຊັ້ນ {emp.linked_floor}</span> : "–"}
                    </td>
                  </tr>
                  <tr>
                    <td className="ed-lbl">ຫ້ອງ</td>
                    <td className="ed-val">
                      {emp.linked_room_number
                        ? <span className="ed-room-tag ed-tag-room">ຫ້ອງ {emp.linked_room_number}</span>
                        : emp.room_no || "–"}
                    </td>
                  </tr>
                </>
              )}

              {emp.notes && (
                <>
                  <tr className="ed-section-row"><td colSpan="2" className="ed-group-label">📝 ໝາຍເຫດ</td></tr>
                  <tr><td colSpan="2" className="ed-val ed-notes">{emp.notes}</td></tr>
                </>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
