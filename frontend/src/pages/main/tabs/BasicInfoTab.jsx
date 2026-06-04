import { fmt, STATUS_STYLE } from "./employeeDetailUtils";

export default function BasicInfoTab({ emp }) {
  const sc = STATUS_STYLE[emp.status] || STATUS_STYLE["Inactive"];
  return (
    <div className="ed-card">
      <h2 className="ed-section-title">Basic Information</h2>
      <table className="ed-info-table">
        <tbody>
          <tr>
            <td className="ed-lbl">Employee Code</td>
            <td className="ed-val ed-bold">{emp.employee_code || "–"}</td>
            <td className="ed-lbl">Status</td>
            <td className="ed-val">
              <span className="ed-status-chip" style={{ background: sc.bg, color: sc.color }}>
                {emp.status || "–"}
              </span>
            </td>
          </tr>
          <tr>
            <td className="ed-lbl">First Name</td>
            <td className="ed-val ed-bold">{emp.firstname}</td>
            <td className="ed-lbl">Last Name</td>
            <td className="ed-val ed-bold">{emp.lastname}</td>
          </tr>
          <tr>
            <td className="ed-lbl">Gender</td>
            <td className="ed-val">{emp.gender || "–"}</td>
            <td className="ed-lbl">Date of Birth</td>
            <td className="ed-val">{fmt(emp.date_of_birth)}</td>
          </tr>
          <tr>
            <td className="ed-lbl">Nationality</td>
            <td className="ed-val">{emp.nationality || "–"}</td>
            <td className="ed-lbl">Employee Type</td>
            <td className="ed-val">
              {emp.employee_type ? <span className="ed-type-chip">{emp.employee_type}</span> : "–"}
            </td>
          </tr>
          <tr>
            <td className="ed-lbl">Position</td>
            <td className="ed-val ed-bold">{emp.position || "–"}</td>
            <td className="ed-lbl">Company</td>
            <td className="ed-val ed-bold">{emp.companies_name || "–"}</td>
          </tr>
          <tr>
            <td className="ed-lbl">Email</td>
            <td className="ed-val">
              {emp.email ? <a href={`mailto:${emp.email}`} className="ed-link">{emp.email}</a> : "–"}
            </td>
            <td className="ed-lbl">Phone</td>
            <td className="ed-val">{emp.contact_no || "–"}</td>
          </tr>
          <tr>
            <td className="ed-lbl">Hire Date</td>
            <td className="ed-val">{fmt(emp.hired_at)}</td>
            <td className="ed-lbl">Resigned Date</td>
            <td className="ed-val">{emp.resigned_at ? fmt(emp.resigned_at) : "–"}</td>
          </tr>
          {emp.resigned_reason && (
            <tr>
              <td className="ed-lbl">Resigned Reason</td>
              <td className="ed-val" colSpan="3">{emp.resigned_reason}</td>
            </tr>
          )}
          <tr>
            <td className="ed-lbl">Created At</td>
            <td className="ed-val">{fmt(emp.created_at)}</td>
            <td className="ed-lbl">Updated At</td>
            <td className="ed-val">{fmt(emp.updated_at)}</td>
          </tr>
          {emp.notes && (
            <tr>
              <td className="ed-lbl">Notes</td>
              <td className="ed-val ed-notes" colSpan="3">{emp.notes}</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
