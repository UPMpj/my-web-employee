import { useNavigate } from "react-router-dom";
import { fmt, STATUS_STYLE } from "./employeeDetailUtils";
import { useLanguage } from "../../../context/LanguageContext";
import { IDCard } from "../IdCard";
import "../idcard.css";

const CARD_STATUS_STYLE = {
  "Active":   { bg: "#d1fae5", color: "#065f46" },
  "Returned": { bg: "#fef3c7", color: "#92400e" },
  "Revoked":  { bg: "#fee2e2", color: "#991b1b" },
};

export default function ProfileTab({ emp, empId, onPhotoUpdate }) {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const sc = STATUS_STYLE[emp.status] || STATUS_STYLE["Inactive"];
  const csc = CARD_STATUS_STYLE[emp.card_status] || { bg: "#f3f4f6", color: "#374151" };

  /* IDCard (Access Card design) expects unprefixed issued_at/valid_until —
     the rest of its fields already line up with what /employees/:id returns. */
  const cardEmp = { ...emp, issued_at: emp.card_issued_at, valid_until: emp.card_valid_until };

  return (
    <div className="ed-card">
      <div className="ed-profile-wrap">
        <div className="ed-profile-card">
          <div className="ed-profile-idcard-wrap">
            <IDCard emp={cardEmp} onPhotoUpdate={(_empId, newPhoto) => onPhotoUpdate?.(newPhoto)} />
          </div>
          <div className="ed-profile-meta">
            <span>{emp.position || "–"}</span>
            {emp.contact_no && <span>📞 {emp.contact_no}</span>}
            {emp.email && <span>✉️ {emp.email}</span>}
          </div>
          <span className="ed-badge ed-status-chip" style={{ background: sc.bg, color: sc.color }}>
            {emp.status}
          </span>
        </div>

        <div className="ed-profile-table-wrap">
          <table className="ed-info-table">
            <thead>
              <tr><th className="ed-th">{t("pf_field_col")}</th><th className="ed-th">{t("pf_value_col")}</th></tr>
            </thead>
            <tbody>
              <tr className="ed-section-row"><td colSpan="2" className="ed-group-label">{t("pf_address")}</td></tr>
              {[
                [t("pf_province"), emp.province],
                [t("pf_district"), emp.district],
                [t("pf_village"),  emp.village],
              ].map(([label, value]) => (
                <tr key={label}>
                  <td className="ed-lbl">{label}</td>
                  <td className="ed-val">{value || "–"}</td>
                </tr>
              ))}

              <tr className="ed-section-row"><td colSpan="2" className="ed-group-label">{t("pf_employment")}</td></tr>
              {[
                [t("pf_hire_date"),  fmt(emp.hired_at)],
                [t("pf_emp_type"),   emp.employee_type],
                [t("position"),      emp.position],
                [t("status"),        emp.status],
              ].map(([label, value]) => (
                <tr key={label}>
                  <td className="ed-lbl">{label}</td>
                  <td className="ed-val">{value || "–"}</td>
                </tr>
              ))}

              <tr className="ed-section-row">
                <td colSpan="2" className="ed-group-label">
                  {t("pf_access_card")}
                  <span className="ed-group-link" onClick={() => navigate(`/employees/${empId}/card`)}>
                    {t("idc_view_card")} ›
                  </span>
                </td>
              </tr>
              <tr>
                <td className="ed-lbl">{t("ecd_card_no")}</td>
                <td className="ed-val">{emp.card_id ? (emp.card_no || "–") : "–"}</td>
              </tr>
              <tr>
                <td className="ed-lbl">{t("status")}</td>
                <td className="ed-val">
                  <span className="ed-badge ed-status-chip" style={{ background: csc.bg, color: csc.color }}>
                    {emp.card_id ? emp.card_status : t("ecd_no_card")}
                  </span>
                </td>
              </tr>
              {emp.card_id && (
                <>
                  <tr>
                    <td className="ed-lbl">{t("ecd_issued_at")}</td>
                    <td className="ed-val">{fmt(emp.card_issued_at)}</td>
                  </tr>
                  <tr>
                    <td className="ed-lbl">{t("pf_valid_until")}</td>
                    <td className="ed-val">{fmt(emp.card_valid_until)}</td>
                  </tr>
                  {emp.card_returned_at && (
                    <tr>
                      <td className="ed-lbl">{t("ecd_returned_at")}</td>
                      <td className="ed-val">{fmt(emp.card_returned_at)}</td>
                    </tr>
                  )}
                </>
              )}

              <tr className="ed-section-row"><td colSpan="2" className="ed-group-label">{t("pf_office_loc")}</td></tr>
              <tr>
                <td className="ed-lbl">{t("office_bld_lbl")}</td>
                <td className="ed-val">
                  {emp.office_building ? <span className="ed-room-tag ed-tag-office">{emp.office_building}</span> : "–"}
                </td>
              </tr>
              <tr>
                <td className="ed-lbl">{t("office_floor_lbl")}</td>
                <td className="ed-val">
                  {emp.office_floor ? <span className="ed-room-tag ed-tag-floor">{emp.office_floor}</span> : "–"}
                </td>
              </tr>
              <tr>
                <td className="ed-lbl">{t("office_room_lbl")}</td>
                <td className="ed-val">
                  {emp.office_room_no ? <span className="ed-room-tag ed-tag-room">{t("room_lbl")} {emp.office_room_no}</span> : "–"}
                </td>
              </tr>

              {(emp.linked_building || emp.dormitory) && (
                <>
                  <tr className="ed-section-row"><td colSpan="2" className="ed-group-label">{t("pf_dormitory")}</td></tr>
                  <tr>
                    <td className="ed-lbl">{t("dorm_bld_lbl")}</td>
                    <td className="ed-val">
                      {emp.linked_building
                        ? <span className="ed-room-tag ed-tag-bld">{emp.linked_building}</span>
                        : emp.dormitory
                          ? <span className="ed-room-tag ed-tag-bld">{emp.dormitory}</span>
                          : "–"}
                    </td>
                  </tr>
                  <tr>
                    <td className="ed-lbl">{t("floor_lbl")}</td>
                    <td className="ed-val">
                      {emp.linked_floor ? <span className="ed-room-tag ed-tag-floor">{t("floor_lbl")} {emp.linked_floor}</span> : "–"}
                    </td>
                  </tr>
                  <tr>
                    <td className="ed-lbl">{t("room_lbl")}</td>
                    <td className="ed-val">
                      {emp.linked_room_number
                        ? <span className="ed-room-tag ed-tag-room">{t("room_lbl")} {emp.linked_room_number}</span>
                        : emp.room_no || "–"}
                    </td>
                  </tr>
                </>
              )}

              {emp.notes && (
                <>
                  <tr className="ed-section-row"><td colSpan="2" className="ed-group-label">{t("pf_notes_sec")}</td></tr>
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
