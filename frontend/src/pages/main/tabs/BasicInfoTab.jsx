import { fmt, STATUS_STYLE } from "./employeeDetailUtils";
import { useLanguage } from "../../../context/LanguageContext";

export default function BasicInfoTab({ emp }) {
  const { t } = useLanguage();
  const sc = STATUS_STYLE[emp.status] || STATUS_STYLE["Inactive"];
  return (
    <div className="ed-card">
      <h2 className="ed-section-title">{t("section_basic_info")}</h2>
      <table className="ed-info-table">
        <tbody>
          <tr>
            <td className="ed-lbl">{t("employee_code")}</td>
            <td className="ed-val ed-bold">{emp.employee_code || "–"}</td>
            <td className="ed-lbl">{t("status")}</td>
            <td className="ed-val">
              <span className="ed-status-chip" style={{ background: sc.bg, color: sc.color }}>
                {emp.status || "–"}
              </span>
            </td>
          </tr>
          <tr>
            <td className="ed-lbl">{t("first_name")}</td>
            <td className="ed-val ed-bold">{emp.firstname}</td>
            <td className="ed-lbl">{t("last_name")}</td>
            <td className="ed-val ed-bold">{emp.lastname}</td>
          </tr>
          <tr>
            <td className="ed-lbl">{t("gender")}</td>
            <td className="ed-val">{emp.gender || "–"}</td>
            <td className="ed-lbl">{t("lbl_date_of_birth")}</td>
            <td className="ed-val">{fmt(emp.date_of_birth)}</td>
          </tr>
          <tr>
            <td className="ed-lbl">{t("nationality")}</td>
            <td className="ed-val">{emp.nationality || "–"}</td>
            <td className="ed-lbl">{t("pf_emp_type")}</td>
            <td className="ed-val">
              {emp.employee_type ? <span className="ed-type-chip">{emp.employee_type}</span> : "–"}
            </td>
          </tr>
          <tr>
            <td className="ed-lbl">{t("position")}</td>
            <td className="ed-val ed-bold">{emp.position || "–"}</td>
            <td className="ed-lbl">{t("company")}</td>
            <td className="ed-val ed-bold">{emp.companies_name || "–"}</td>
          </tr>
          <tr>
            <td className="ed-lbl">Email</td>
            <td className="ed-val">
              {emp.email ? <a href={`mailto:${emp.email}`} className="ed-link">{emp.email}</a> : "–"}
            </td>
            <td className="ed-lbl">{t("phone")}</td>
            <td className="ed-val">{emp.contact_no || "–"}</td>
          </tr>
          <tr>
            <td className="ed-lbl">{t("hire_date")}</td>
            <td className="ed-val">{fmt(emp.hired_at)}</td>
            <td className="ed-lbl">{t("lbl_resigned_date")}</td>
            <td className="ed-val">{emp.resigned_at ? fmt(emp.resigned_at) : "–"}</td>
          </tr>
          {emp.resigned_reason && (
            <tr>
              <td className="ed-lbl">{t("lbl_resigned_reason")}</td>
              <td className="ed-val" colSpan="3">{emp.resigned_reason}</td>
            </tr>
          )}
          <tr>
            <td className="ed-lbl">{t("lbl_created_at")}</td>
            <td className="ed-val">{fmt(emp.created_at)}</td>
            <td className="ed-lbl">{t("lbl_updated_at")}</td>
            <td className="ed-val">{fmt(emp.updated_at)}</td>
          </tr>
          {emp.notes && (
            <tr>
              <td className="ed-lbl">{t("notes")}</td>
              <td className="ed-val ed-notes" colSpan="3">{emp.notes}</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
