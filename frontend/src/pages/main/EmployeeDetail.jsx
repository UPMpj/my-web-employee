import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api, API_BASE } from "../../api";
import "./employee-detail.css";

const TABS = ["Basic Info", "Profile", "Documents", "Permits", "Employee Cards"];

function fmt(d) {
  if (!d) return "–";
  return new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

const STATUS_CLS = {
  "Active":   "edb-active",
  "On Leave": "edb-leave",
  "Inactive": "edb-inactive",
  "Resigned": "edb-resigned",
};

function IconEdit() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
    </svg>
  );
}

function IconCheck() {
  return (
    <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="#fff" strokeWidth="2">
      <polyline points="1.5,5 4,7.5 8.5,2.5"/>
    </svg>
  );
}

export default function EmployeeDetail() {
  const navigate = useNavigate();
  const { id }   = useParams();
  const [emp, setEmp] = useState(null);
  const [tab, setTab] = useState("Basic Info");

  useEffect(() => {
    api.get(`/employees/${id}`)
      .then(r => setEmp(r.data))
      .catch(() => navigate("/employees"));
  }, [id]);

  if (!emp) return <div style={{ padding: 40 }}>Loading...</div>;

  const fullName = `${emp.firstname} ${emp.lastname}`;

  return (
    <div className="ed-page">

      {/* Breadcrumb */}
      <div className="ed-breadcrumb">
        <span className="ed-bc-link" onClick={() => navigate("/employees")}>Employees</span>
        <span className="ed-bc-sep">›</span>
        <span className="ed-bc-link">Employee Detail</span>
        <span className="ed-bc-sep">›</span>
        <span className="ed-bc-cur">{fullName}</span>
      </div>

      {/* Header */}
      <div className="ed-header">
        <div>
          <h1 className="ed-title">
            Employee Detail <span className="ed-title-arrow">›</span>{" "}
            <span className="ed-title-name">{fullName}</span>
          </h1>
          <p className="ed-sub">Manage and organize all employees.</p>
        </div>
        <div className="ed-header-btns">
          <button className="ed-back-btn" onClick={() => navigate("/employees")}>‹ Back</button>
          <button className="ed-edit-btn" onClick={() => navigate(`/employees/edit/${id}`)}>
            <IconEdit /> Edit
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="ed-tabs">
        {TABS.map(t => (
          <button
            key={t}
            className={`ed-tab ${tab === t ? "ed-tab-active" : ""}`}
            onClick={() => t === "Employee Cards" ? navigate(`/employees/${id}/card`) : setTab(t)}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Card */}
      <div className="ed-card">
        {tab === "Profile" ? (
          <div className="ed-profile-wrap">
            {/* Left card */}
            <div className="ed-profile-card">
              <div className="ed-profile-avatar">
                {emp.photo
                  ? <img src={`${API_BASE}${emp.photo}`} alt="profile" />
                  : <svg viewBox="0 0 24 24" fill="none" stroke="#adb5bd" strokeWidth="1.2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                }
              </div>
              <div className="ed-profile-name">{emp.firstname} {emp.lastname}</div>
              <div className="ed-profile-meta">
                <span>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M16 3v4M8 3v4M2 9h20"/></svg>
                  {emp.employee_code || "–"}
                </span>
                <span>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                  {emp.companies_name || "–"}
                </span>
              </div>
              <span className={`ed-badge ${STATUS_CLS[emp.status] || "edb-inactive"}`}>
                {emp.status}
                {emp.status === "Active" && (
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                )}
              </span>
            </div>

            {/* Right table */}
            <div className="ed-profile-table-wrap">
              <table className="ed-info-table">
                <thead>
                  <tr>
                    <th className="ed-th">Field</th>
                    <th className="ed-th">Value</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ["Province",        emp.province],
                    ["District",        emp.district],
                    ["Village",         emp.village],
                    ["Company",         emp.companies_name],
                    ["Hire Date",       fmt(emp.hired_at)],
                  ].map(([label, value]) => (
                    <tr key={label}>
                      <td className="ed-lbl">{label}</td>
                      <td className="ed-val">{value || "–"}</td>
                    </tr>
                  ))}

                  {/* ── Building / Room ── */}
                  <tr>
                    <td className="ed-lbl">ຕືກ (Building)</td>
                    <td className="ed-val">
                      {emp.linked_building
                        ? <span className="ed-room-tag ed-tag-bld">{emp.linked_building}</span>
                        : emp.office_building
                          ? <span className="ed-room-tag ed-tag-office">{emp.office_building}</span>
                          : "–"}
                    </td>
                  </tr>
                  <tr>
                    <td className="ed-lbl">ຊັ້ນ (Floor)</td>
                    <td className="ed-val">
                      {emp.linked_floor
                        ? <span className="ed-room-tag ed-tag-floor">ຊັ້ນ {emp.linked_floor}</span>
                        : "–"}
                    </td>
                  </tr>
                  <tr>
                    <td className="ed-lbl">ຫ້ອງ (Room No.)</td>
                    <td className="ed-val">
                      {emp.linked_room_number
                        ? <span className="ed-room-tag ed-tag-room">ຫ້ອງ {emp.linked_room_number}</span>
                        : emp.room_no
                          ? emp.room_no
                          : "–"}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        ) : tab === "Basic Info" ? (
          <>
            <h2 className="ed-section-title">Basic Info</h2>
            <table className="ed-info-table">
              <tbody>
                <tr>
                  <td className="ed-lbl">Employee Code</td>
                  <td className="ed-val">{emp.employee_code || "–"}</td>
                  <td className="ed-lbl">Date of Birth</td>
                  <td className="ed-val">{fmt(emp.date_of_birth)}</td>
                </tr>
                <tr>
                  <td className="ed-lbl">First Name</td>
                  <td className="ed-val ed-bold">{emp.firstname}</td>
                  <td className="ed-lbl">Nationality</td>
                  <td className="ed-val">{emp.nationality || "–"}</td>
                </tr>
                <tr>
                  <td className="ed-lbl">Last Name</td>
                  <td className="ed-val ed-bold">{emp.lastname}</td>
                  <td className="ed-lbl">Position</td>
                  <td className="ed-val ed-bold">{emp.position || "–"}</td>
                </tr>
                <tr>
                  <td className="ed-lbl">Gender</td>
                  <td className="ed-val">{emp.gender || "–"}</td>
                  <td className="ed-lbl">Company</td>
                  <td className="ed-val ed-bold">{emp.companies_name || "–"}</td>
                </tr>
                <tr>
                  <td className="ed-lbl">Date of Birth</td>
                  <td className="ed-val">{fmt(emp.date_of_birth)}</td>
                  <td className="ed-lbl">Hire Date</td>
                  <td className="ed-val">{fmt(emp.hired_at)}</td>
                </tr>
                <tr>
                  <td className="ed-lbl">Nationality</td>
                  <td className="ed-val">{emp.nationality || "–"}</td>
                  <td className="ed-lbl">Resigned Date</td>
                  <td className="ed-val">–</td>
                </tr>
                <tr>
                  <td className="ed-lbl">Position</td>
                  <td className="ed-val ed-bold">{emp.position || "–"}</td>
                  <td className="ed-lbl">Status</td>
                  <td className="ed-val">
                    <div className="ed-status-row">
                      <span className="ed-green-dot"><IconCheck /></span>
                      {fmt(emp.hired_at)}
                    </div>
                  </td>
                </tr>
                <tr>
                  <td className="ed-lbl">Company</td>
                  <td className="ed-val ed-bold">{emp.companies_name || "–"}</td>
                  <td className="ed-lbl">Created At</td>
                  <td className="ed-val">{fmt(emp.created_at)}</td>
                </tr>
                <tr>
                  <td className="ed-lbl">Hire Date</td>
                  <td className="ed-val">{fmt(emp.hired_at)}</td>
                  <td className="ed-lbl">Updated At</td>
                  <td className="ed-val">{fmt(emp.updated_at)}</td>
                </tr>
                <tr>
                  <td className="ed-lbl">Resigned Date</td>
                  <td className="ed-val">
                    <span className={`ed-badge ${STATUS_CLS[emp.status] || "edb-inactive"}`}>
                      {emp.status}
                    </span>
                  </td>
                  <td></td>
                  <td></td>
                </tr>
              </tbody>
            </table>
          </>
        ) : (
          <div className="ed-empty-tab">{tab} — Coming soon</div>
        )}
      </div>

    </div>
  );
}
