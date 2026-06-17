import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "../../api";
import BasicInfoTab  from "./tabs/BasicInfoTab";
import ProfileTab    from "./tabs/ProfileTab";
import DocumentsTab  from "./tabs/DocumentsTab";
import PermitsTab    from "./tabs/PermitsTab";
import TimelineTab   from "./tabs/TimelineTab";
import "./employee-detail.css";

const TABS = ["Basic Info", "Profile", "Documents", "Permits", "Timeline", "Employee Cards"];

function IconEdit() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
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
      <div className="ed-breadcrumb">
        <span className="ed-bc-link" onClick={() => navigate("/employees")}>Employees</span>
        <span className="ed-bc-sep">›</span>
        <span className="ed-bc-link">Employee Detail</span>
        <span className="ed-bc-sep">›</span>
        <span className="ed-bc-cur">{fullName}</span>
      </div>

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

      {tab === "Basic Info"  && <BasicInfoTab  emp={emp} />}
      {tab === "Profile"     && <ProfileTab    emp={emp} onPhotoUpdate={newPhoto => setEmp(e => ({ ...e, photo: newPhoto }))} empId={id} />}
      {tab === "Documents"   && <div className="ed-card"><DocumentsTab empId={id} /></div>}
      {tab === "Permits"     && <div className="ed-card"><PermitsTab   empId={id} /></div>}
      {tab === "Timeline"    && <div className="ed-card"><TimelineTab  empId={id} /></div>}
    </div>
  );
}
