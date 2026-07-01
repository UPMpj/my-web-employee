import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api, photoUrl as getPhotoUrl } from "../../api";
import { useLanguage } from "../../context/LanguageContext";
import { STATUS_STYLE } from "./tabs/employeeDetailUtils";
import BasicInfoTab  from "./tabs/BasicInfoTab";
import ProfileTab    from "./tabs/ProfileTab";
import DocumentsTab  from "./tabs/DocumentsTab";
import PermitsTab    from "./tabs/PermitsTab";
import TimelineTab   from "./tabs/TimelineTab";
import SkeletonLoader from "../../components/SkeletonLoader";
import "./employee-detail.css";

function IconAvatarPlaceholder() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="#adb5bd" strokeWidth="1.4">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
      <circle cx="12" cy="7" r="4"/>
    </svg>
  );
}

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
  const { t }    = useLanguage();
  const [emp, setEmp] = useState(null);
  const [tabIdx, setTabIdx] = useState(0);

  const TAB_LABELS = [
    t("tab_basic_info"),
    t("tab_profile"),
    t("tab_documents"),
    t("tab_permits"),
    t("tab_timeline"),
    t("tab_emp_cards"),
  ];

  useEffect(() => {
    api.get(`/employees/${id}`)
      .then(r => setEmp(r.data))
      .catch(() => navigate("/employees"));
  }, [id]);

  if (!emp) return <div className="ed-page"><SkeletonLoader variant="detail" /></div>;

  const fullName = `${emp.firstname} ${emp.lastname}`;
  const sc = STATUS_STYLE[emp.status] || STATUS_STYLE["Inactive"];

  return (
    <div className="ed-page">
      <div className="ed-breadcrumb">
        <span className="ed-bc-link" onClick={() => navigate("/employees")}>{t("nav_employees")}</span>
        <span className="ed-bc-sep">›</span>
        <span className="ed-bc-cur">{fullName}</span>
      </div>

      <div className="ed-header">
        <div className="ed-header-id">
          <div className="ed-header-avatar">
            {emp.photo
              ? <img src={getPhotoUrl(emp.photo)} alt="" />
              : <IconAvatarPlaceholder />}
          </div>
          <div>
            <div className="ed-title-row">
              <h1 className="ed-title">{fullName}</h1>
              <span className="ed-badge ed-status-chip" style={{ background: sc.bg, color: sc.color }}>
                {emp.status || "–"}
              </span>
            </div>
            <p className="ed-sub">
              {[emp.position, emp.companies_name, emp.employee_code].filter(Boolean).join(" · ") || t("ed_sub")}
            </p>
          </div>
        </div>
        <div className="ed-header-btns">
          <button className="ed-back-btn" onClick={() => navigate("/employees")}>{t("back")}</button>
          <button className="ed-edit-btn" onClick={() => navigate(`/employees/edit/${id}`)}>
            <IconEdit /> {t("edit")}
          </button>
        </div>
      </div>

      <div className="ed-tabs">
        {TAB_LABELS.map((label, idx) => (
          <button
            key={idx}
            className={`ed-tab ${tabIdx === idx ? "ed-tab-active" : ""}`}
            onClick={() => idx === 5 ? navigate(`/employees/${id}/card`) : setTabIdx(idx)}
          >
            {label}
          </button>
        ))}
      </div>

      {tabIdx === 0 && <BasicInfoTab  emp={emp} />}
      {tabIdx === 1 && <ProfileTab    emp={emp} onPhotoUpdate={newPhoto => setEmp(e => ({ ...e, photo: newPhoto }))} empId={id} />}
      {tabIdx === 2 && <div className="ed-card"><DocumentsTab empId={id} /></div>}
      {tabIdx === 3 && <div className="ed-card"><PermitsTab   empId={id} /></div>}
      {tabIdx === 4 && <div className="ed-card"><TimelineTab  empId={id} /></div>}
    </div>
  );
}
