import { useCurrentUser } from "../../hooks/useCurrentUser";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api, API_BASE, photoUrl as getPhotoUrl } from "../../api";
import toast from "react-hot-toast";
import ConfirmModal from "../../components/ConfirmModal";
import "../../components/ConfirmModal.css";
import SkeletonLoader from "../../components/SkeletonLoader";
import "./company-profile.css";
import { useLanguage } from "../../context/LanguageContext";

function fmt(d) {
  if (!d) return "–";
  const date = new Date(d);
  return date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
    + " at " + date.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}
function fmtDate(d) {
  if (!d) return "–";
  return new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function IconUser() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z"/>
    </svg>
  );
}
function IconEye() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
      <circle cx="12" cy="12" r="3"/>
    </svg>
  );
}
function IconDoc() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
      <polyline points="14 2 14 8 20 8"/>
    </svg>
  );
}
function IconEdit() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
    </svg>
  );
}
function IconTrash() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="3 6 5 6 21 6"/>
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
      <path d="M10 11v6M14 11v6"/>
      <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
    </svg>
  );
}

export default function CompanyProfile() {
  const navigate = useNavigate();
  const { id }   = useParams();
  const user     = useCurrentUser();
  const { t }    = useLanguage();
  const isSuperAdmin  = user.role === "Super Admin";
  const canEditEmp    = user.role === "Super Admin" || user.role === "Company Admin";

  const [company,  setCompany]  = useState(null);
  const [stats,    setStats]    = useState({ total: 0, active: 0, resigned: 0, new_hires: 0 });
  const [users,    setUsers]    = useState([]);
  const [toggling, setToggling]   = useState(false);
  const [confirmEmpId, setConfirmEmpId] = useState(null);
  const [confirmToggle, setConfirmToggle] = useState(false);

  /* delete employee */
  const removeEmployee = async (empId) => {
    try {
      await api.delete(`/employees/${empId}`);
      setUsers(u => u.filter(e => e.employee_id !== empId));
      setStats(s => ({ ...s, total: s.total - 1 }));
      toast.success("ລຶບພະນັກງານສຳເລັດ");
    } catch (err) {
      toast.error(err?.response?.data?.message || "ລຶບບໍ່ສຳເລັດ");
    } finally {
      setConfirmEmpId(null);
    }
  };

  /* edit modal */
  const [showEdit,  setShowEdit]  = useState(false);
  const [editForm,  setEditForm]  = useState({ companies_name: "", status: "Active" });
  const [editError, setEditError] = useState("");
  const [saving,    setSaving]    = useState(false);

  useEffect(() => {
    api.get(`/company/${id}`).then(r => setCompany(r.data)).catch(() => navigate("/companies"));
    api.get(`/company/${id}/stats`).then(r => setStats(r.data)).catch(() => {});
    api.get(`/company/${id}/users`).then(r => setUsers(r.data)).catch(() => {});
  }, [id]);

  const openEdit = () => {
    setEditForm({ companies_name: company.companies_name, status: company.status || "Active" });
    setEditError("");
    setShowEdit(true);
  };

  const saveEdit = async () => {
    if (!editForm.companies_name.trim()) { setEditError("ກະລຸນາໃສ່ຊື່ບໍລິສັດ"); return; }
    setSaving(true);
    try {
      const res = await api.put(`/company/${id}`, editForm);
      setCompany(c => ({ ...c, ...res.data }));
      setShowEdit(false);
      toast.success("ອັບເດດ company ສຳເລັດ");
    } catch (err) {
      setEditError(err?.response?.data?.message || "ບັນທຶກບໍ່ສຳເລັດ");
    }
    setSaving(false);
  };

  const doToggleStatus = async () => {
    if (!company) return;
    const next = company.status === "Active" ? "Inactive" : "Active";
    setToggling(true);
    setConfirmToggle(false);
    try {
      await api.patch(`/company/${id}/status`, { status: next });
      setCompany(c => ({ ...c, status: next }));
      toast.success(`Company ${next === "Active" ? "activated" : "deactivated"} ສຳເລັດ`);
    } catch {
      toast.error("ບໍ່ສາມາດປ່ຽນ status ໄດ້");
    }
    setToggling(false);
  };

  if (!company) return <div className="cp-page"><SkeletonLoader variant="detail" /></div>;

  return (
    <div className="cp-page">

      {/* Title + Breadcrumb */}
      <h1 className="cp-page-title">Company Profile</h1>
      <div className="cp-breadcrumb">
        <span className="cp-bc-link" onClick={() => navigate("/companies")}>{t("nav_companies")}</span>
        <span className="cp-bc-sep"> / </span>
        <span className="cp-bc-cur">{company.companies_name}</span>
      </div>

      {/* ===== COMPANY CARD ===== */}
      <div className="cp-card">
        <div className="cp-card-top">
          <div>
            <h2 className="cp-company-name">{company.companies_name}</h2>
            <p className="cp-company-id">Company ID : {company.company_id}</p>
          </div>
          <div className="cp-top-btns">
            {isSuperAdmin && (
              <>
                <button className="cp-btn-edit" onClick={openEdit}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                  </svg>
                  {t("edit")}
                </button>
                <button
                  className={`cp-btn-deactivate ${company.status !== "Active" ? "cp-btn-activate" : ""}`}
                  onClick={() => setConfirmToggle(true)}
                  disabled={toggling}
                >
                  🔒 {company.status === "Active" ? "Deactivate" : "Activate"}
                </button>
              </>
            )}
          </div>
        </div>

        {/* Owner / Creator info */}
        <div className="cp-info-box">
          <div className="cp-owner-row">
            <span className="cp-avatar"><IconUser /></span>
            <div>
              <div className="cp-owner-name">{company.created_by_name || "–"}</div>
              <div className="cp-owner-email">{company.created_by_email || "–"}</div>
            </div>
          </div>
          <div className="cp-meta-row">
            <span>Created By: <strong>{company.created_by_name || "–"}</strong></span>
            <span>Created At: <strong>{fmt(company.created_at)}</strong></span>
          </div>
        </div>
      </div>

      {/* ===== SUMMARY ===== */}
      <div className="cp-card">
        <h3 className="cp-section-title">Summary</h3>
        <div className="cp-stats-grid">
          {[
            { label: "Total Employees",     value: stats.total     || 0 },
            { label: "Active Employees",    value: stats.active    || 0 },
            { label: "Resigned",            value: stats.resigned  || 0 },
            { label: "New Hires ( This month )", value: stats.new_hires || 0 },
          ].map(s => (
            <div className="cp-stat-box" key={s.label}>
              <div className="cp-stat-num">{s.value}</div>
              <div className="cp-stat-label">{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ===== COMPANY EMPLOYEES ===== */}
      <div className="cp-card">
        <h3 className="cp-section-title">Company Employees ({users.length})</h3>
        <table className="cp-table">
          <thead>
            <tr>
              <th>{t("name")}</th>
              <th>{t("employee_code")}</th>
              <th>Email</th>
              <th>{t("position")}</th>
              <th>{t("status")}</th>
              <th>{t("hire_date")}</th>
              <th>{t("col_actions")}</th>
            </tr>
          </thead>
          <tbody>
            {users.length === 0 ? (
              <tr><td colSpan="7" className="cp-no-data">{t("no_employees")}</td></tr>
            ) : users.map(u => (
              <tr key={u.employee_id}>
                <td>
                  <div className="cp-user-name-cell">
                    <span className="cp-user-avatar">
                      {u.photo
                        ? <img src={getPhotoUrl(u.photo)} alt="" style={{width:"100%",height:"100%",objectFit:"cover",borderRadius:"50%"}}/>
                        : <IconUser />
                      }
                    </span>
                    {u.firstname} {u.lastname}
                  </div>
                </td>
                <td className="cp-muted">{u.employee_code || "–"}</td>
                <td className="cp-muted">{u.email || "–"}</td>
                <td>{u.position || "–"}</td>
                <td>
                  <span className={`cp-status-badge ${
                    u.status === "Active"   ? "cp-status-active"   :
                    u.status === "Resigned" ? "cp-status-resigned"  :
                    u.status === "On Leave" ? "cp-status-leave"     : "cp-status-inactive"
                  }`}>
                    {u.status || "–"}
                  </span>
                </td>
                <td className="cp-muted">{fmtDate(u.hired_at)}</td>
                <td>
                  <div className="cp-action-btns">
                    <button className="cp-btn-icon" title="View" aria-label="View employee"
                      onClick={() => navigate(`/employees/${u.employee_id}`)}>
                      <IconEye />
                    </button>
                    {canEditEmp && (
                      <button className="cp-btn-icon cp-btn-icon-edit" title="Edit" aria-label="Edit employee"
                        onClick={() => navigate(`/employees/edit/${u.employee_id}`)}>
                        <IconEdit />
                      </button>
                    )}
                    {isSuperAdmin && (
                      <button className="cp-btn-icon cp-btn-icon-delete" title="Delete" aria-label="Delete employee"
                        onClick={() => setConfirmEmpId(u.employee_id)}>
                        <IconTrash />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ===== CONFIRM DELETE EMPLOYEE ===== */}
      {confirmEmpId && (
        <ConfirmModal
          message={t("confirm_delete_emp")}
          subMessage={t("delete_info")}
          confirmLabel={t("delete")}
          onConfirm={() => removeEmployee(confirmEmpId)}
          onCancel={() => setConfirmEmpId(null)}
        />
      )}

      {/* ===== CONFIRM TOGGLE STATUS ===== */}
      {confirmToggle && company && (
        <ConfirmModal
          message={`${company.status === "Active" ? "Deactivate" : "Activate"} company ນີ້?`}
          subMessage={company.status === "Active" ? "Company ຈະຖືກປິດໃຊ້ງານ" : "Company ຈະຖືກເປີດໃຊ້ງານ"}
          confirmLabel={company.status === "Active" ? "Deactivate" : "Activate"}
          danger={company.status === "Active"}
          onConfirm={doToggleStatus}
          onCancel={() => setConfirmToggle(false)}
        />
      )}

      {/* ===== EDIT MODAL ===== */}
      {showEdit && (
        <div className="cp-modal-overlay" onClick={() => setShowEdit(false)}>
          <div className="cp-modal" onClick={e => e.stopPropagation()}>

            {/* header */}
            <div className="cp-modal-header">
              <h2 className="cp-modal-title">Edit Company</h2>
              <button className="cp-modal-close" onClick={() => setShowEdit(false)}>&#x2715;</button>
            </div>
            <p className="cp-modal-sub">Modify the information below to update this Company</p>

            {/* body */}
            <div className="cp-modal-body">
              <div className="cp-mfield">
                <label className="cp-mlabel">{t("company_name")} <span className="cp-mreq">*</span></label>
                <input
                  className="cp-minput"
                  value={editForm.companies_name}
                  onChange={e => setEditForm(f => ({ ...f, companies_name: e.target.value }))}
                />
              </div>

              <div className="cp-mfield">
                <label className="cp-mlabel">{t("status")}</label>
                <div className="cp-mstatus-wrap">
                  <span className={`cp-mdot ${editForm.status === "Active" ? "cp-mdot-active" : editForm.status === "Inactive" ? "cp-mdot-inactive" : "cp-mdot-pending"}`} />
                  <select
                    className="cp-mselect"
                    value={editForm.status}
                    onChange={e => setEditForm(f => ({ ...f, status: e.target.value }))}
                  >
                    <option value="Active">{t("active")}</option>
                    <option value="Inactive">Inactive</option>
                    <option value="pending">Pending</option>
                  </select>
                </div>
              </div>

              {editError && <p className="cp-merror">{editError}</p>}
            </div>

            {/* footer */}
            <div className="cp-modal-footer">
              <button className="cp-mbtn-cancel" onClick={() => setShowEdit(false)}>{t("cancel")}</button>
              <button className="cp-mbtn-save" onClick={saveEdit} disabled={saving}>
                {saving ? t("saving") : t("save_changes")}
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
