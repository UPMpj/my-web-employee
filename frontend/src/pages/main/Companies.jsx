import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../../api";
import toast from "react-hot-toast";
import ConfirmModal from "../../components/ConfirmModal";
import "../../components/ConfirmModal.css";
import "./companies.css";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const EMPTY_FORM = { companies_name: "", status: "Active", owner_id: "" };

const STATUS_CLASS = {
  "Active":   "badge-active",
  "Inactive": "badge-inactive",
  "pending":  "badge-pending",
};

function IconEye() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
      <circle cx="12" cy="12" r="3"/>
    </svg>
  );
}
function IconEdit() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
    </svg>
  );
}
function IconTrash() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="3 6 5 6 21 6"/>
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
      <path d="M10 11v6M14 11v6"/>
      <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
    </svg>
  );
}

export default function Companies() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const isSuperAdmin = user?.role === "Super Admin";

  const [companies, setCompanies] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading]     = useState(false);
  const [total, setTotal]         = useState(0);
  const [page, setPage]           = useState(1);
  const limit = 10;

  const [search, setSearch]       = useState("");

  /* modal */
  const [showModal, setShowModal]     = useState(false);
  const [editTarget, setEditTarget]   = useState(null);
  const [form, setForm]               = useState(EMPTY_FORM);
  const [saveError, setSaveError]     = useState("");

  /* view modal */
  const [viewItem, setViewItem]       = useState(null);

  /* confirm delete */
  const [confirmId, setConfirmId]     = useState(null);

  /* export dropdown */
  const [showExport, setShowExport]   = useState(false);
  const exportRef = useRef(null);

  /* close export on outside click */
  useEffect(() => {
    const handler = (e) => {
      if (exportRef.current && !exportRef.current.contains(e.target)) {
        setShowExport(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  /* ---- load ---- */
  useEffect(() => { load(); }, [page, search]);

  /* ---- load all employees for owner dropdown ---- */
  useEffect(() => {
    api.get("/employees", { params: { limit: 999, company_id: "all" } })
      .then(res => setEmployees(res.data.data || []))
      .catch(() => {});
  }, []);

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get("/company", { params: { page, limit, search } });
      setCompanies(res.data.data);
      setTotal(res.data.total);
    } catch {
      setCompanies([]);
    }
    setLoading(false);
  };

  /* ---- modal ---- */
  const openAdd = () => {
    setEditTarget(null);
    setForm(EMPTY_FORM);
    setSaveError("");
    setShowModal(true);
  };

  const openEdit = (c) => {
    setEditTarget(c);
    setForm({ companies_name: c.companies_name, status: c.status || "Active", owner_id: c.owner_id || "" });
    setSaveError("");
    setShowModal(true);
  };

  const save = async () => {
    setSaveError("");
    if (!form.companies_name.trim()) {
      setSaveError("ກະລຸນາໃສ່ຊື່ບໍລິສັດ");
      return;
    }
    try {
      if (editTarget) {
        await api.put(`/company/${editTarget.company_id}`, form);
        toast.success("ອັບເດດ company ສຳເລັດ");
      } else {
        await api.post("/company", form);
        toast.success("ເພີ່ມ company ສຳເລັດ");
      }
      setShowModal(false);
      load();
    } catch (err) {
      setSaveError(err?.response?.data?.message || "ບັນທຶກບໍ່ສຳເລັດ");
    }
  };

  const remove = async (id) => {
    try {
      await api.delete(`/company/${id}`);
      toast.success("ລຶບ company ສຳເລັດ");
      load();
    } catch (err) {
      toast.error(err?.response?.data?.message || "ລຶບບໍ່ສຳເລັດ");
    } finally {
      setConfirmId(null);
    }
  };

  /* ---- export Excel ---- */
  const exportExcel = async () => {
    try {
      const res = await api.get("/company", { params: { page: 1, limit: 9999, search } });
      const rows = (res.data.data || []).map((c, i) => ({
        "ລຳດັບ": i + 1,
        "Company ID": String(c.company_id).padStart(2, "0"),
        "ຊື່ບໍລິສັດ": c.companies_name,
        "ເຈົ້າຂອງ": c.owner_name?.trim() || "-",
        "ສະຖານະ": c.status || "pending",
        "ສ້າງໂດຍ": c.created_by_name || "-",
      }));
      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Companies");
      XLSX.writeFile(wb, "companies.xlsx");
      setShowExport(false);
      toast.success("Export Excel ສຳເລັດ");
    } catch {
      toast.error("Export Excel ບໍ່ສຳເລັດ");
    }
  };

  /* ---- export PDF ---- */
  const exportPDF = async () => {
    try {
      const res = await api.get("/company", { params: { page: 1, limit: 9999, search } });
      const rows = (res.data.data || []).map((c, i) => [
        i + 1,
        String(c.company_id).padStart(2, "0"),
        c.companies_name,
        c.owner_name?.trim() || "-",
        c.status || "pending",
        c.created_by_name || "-",
      ]);
      const doc = new jsPDF({ orientation: "landscape" });
      doc.setFontSize(14);
      doc.text("Companies Report", 14, 15);
      autoTable(doc, {
        startY: 22,
        head: [["#", "ID", "Company Name", "Owner", "Status", "Created By"]],
        body: rows,
        styles: { fontSize: 9 },
      });
      doc.save("companies.pdf");
      setShowExport(false);
      toast.success("Export PDF ສຳເລັດ");
    } catch {
      toast.error("Export PDF ບໍ່ສຳເລັດ");
    }
  };

  const pages = Math.ceil(total / limit);
  const from  = total === 0 ? 0 : (page - 1) * limit + 1;
  const to    = Math.min(page * limit, total);

  return (
    <div className="com-page">

      {/* ===== HEADER ===== */}
      <div className="com-header">
        <div>
          <h1>Companies</h1>
          <p className="com-subtitle">Manage and organize all companies.</p>
        </div>
      </div>

      {/* ===== ACTION BAR ===== */}
      <div className="com-actions">
        <div className="com-search-wrap">
          <span className="search-icon">&#128269;</span>
          <input
            className="com-search"
            placeholder="search..."
            value={search}
            onChange={e => { setPage(1); setSearch(e.target.value); }}
          />
        </div>

        <div className="com-action-right">
          {/* Export dropdown */}
          <div className="export-wrap" ref={exportRef}>
            <button className="btn-export" onClick={() => setShowExport(v => !v)}>
              Export &#8964;
            </button>
            {showExport && (
              <div className="export-menu">
                <button className="export-item" onClick={exportExcel}>
                  <span className="excel-icon">&#9868;</span> Excel
                </button>
                <button className="export-item" onClick={exportPDF}>
                  <span className="pdf-icon">&#128196;</span> PDF
                </button>
              </div>
            )}
          </div>

          <button className="btn-pdf" onClick={exportPDF}>&#128196; PDF</button>

          {isSuperAdmin && (
            <button className="btn-add" onClick={openAdd}>+ Add Companies</button>
          )}
        </div>
      </div>

      {/* ===== SUB BAR ===== */}
      <div className="com-subbar">
        <span className="subbar-search">&#128269; Search Company &#8964;</span>
        <button className="view-all" onClick={() => { setSearch(""); setPage(1); }}>View All</button>
      </div>

      {/* ===== TABLE ===== */}
      {loading ? (
        <div className="com-loading">Loading...</div>
      ) : (
        <>
          <table className="com-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Company Name</th>
                <th>Company</th>
                <th>Status</th>
                <th>Created By</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {companies.length === 0 ? (
                <tr><td colSpan="6" className="no-data">No companies found</td></tr>
              ) : companies.map(c => (
                <tr key={c.company_id}>
                  <td>{String(c.company_id).padStart(2, "0")}</td>
                  <td className="company-name-cell">{c.companies_name}</td>
                  <td className="contact-cell">{c.owner_name?.trim() || "-"}</td>
                  <td>
                    <span className={`badge ${STATUS_CLASS[c.status] || "badge-pending"}`}>
                      {c.status || "pending"}
                    </span>
                  </td>
                  <td className="created-cell">{c.created_by_name || "-"}</td>
                  <td>
                    <div className="action-btns">
                      <button className="btn-icon btn-view"   title="View"   onClick={() => navigate(`/companies/${c.company_id}`)}><IconEye /></button>
                      {isSuperAdmin && (
                        <>
                          <button className="btn-icon btn-edit"   title="Edit"   onClick={() => openEdit(c)}><IconEdit /></button>
                          <button className="btn-icon btn-delete" title="Delete" onClick={() => setConfirmId(c.company_id)}><IconTrash /></button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* ===== PAGINATION ===== */}
          <div className="com-footer">
            <span className="showing">Showing {from} to {to} of {total} Item</span>
            <div className="pager">
              <button disabled={page === 1} onClick={() => setPage(1)}>Prev</button>
              {Array.from({ length: Math.min(pages, 6) }, (_, i) => i + 1).map(n => (
                <button key={n} className={page === n ? "pager-active" : ""} onClick={() => setPage(n)}>
                  {n}
                </button>
              ))}
              {pages > 6 && <span>...</span>}
              <button disabled={page === pages || pages === 0} onClick={() => setPage(pages)}>Next &gt;</button>
            </div>
          </div>
        </>
      )}

      {/* ===== ADD / EDIT MODAL ===== */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="com-modal" onClick={e => e.stopPropagation()}>

            {/* header */}
            <div className="cm-header">
              <h2 className="cm-title">{editTarget ? "Edit Company" : "Add Company"}</h2>
              <button className="cm-close" onClick={() => setShowModal(false)}>&#x2715;</button>
            </div>
            <p className="cm-subtitle">Fill in the details below to {editTarget ? "update the" : "add the new"} Company.</p>

            {/* body */}
            <div className="cm-body">

              {/* Company ID */}
              <div className="cm-field">
                <label className="cm-label">Company_ID</label>
                <input className="cm-input cm-input-disabled" value={editTarget ? String(editTarget.company_id).padStart(2,"0") : "Auto Generated"} disabled />
              </div>

              {/* Company Name */}
              <div className="cm-field">
                <label className="cm-label">Company Name <span className="cm-req">*</span></label>
                <input
                  className="cm-input"
                  placeholder=""
                  value={form.companies_name}
                  onChange={e => setForm({ ...form, companies_name: e.target.value })}
                />
              </div>

              {/* Status */}
              <div className="cm-field">
                <label className="cm-label">Status</label>
                <div className="cm-status-wrap">
                  <span className={`cm-dot cm-dot-${form.status === "Active" ? "active" : form.status === "Inactive" ? "inactive" : "pending"}`} />
                  <select
                    className="cm-select-status"
                    value={form.status}
                    onChange={e => setForm({ ...form, status: e.target.value })}
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                    <option value="pending">Pending</option>
                  </select>
                </div>
              </div>

              {/* Owner */}
              <div className="cm-field">
                <label className="cm-label">Owner</label>
                <select
                  className="cm-input"
                  value={form.owner_id}
                  onChange={e => setForm({ ...form, owner_id: e.target.value })}
                >
                  <option value="">-- None --</option>
                  {employees.map(e => (
                    <option key={e.employee_id} value={e.employee_id}>
                      {e.firstname} {e.lastname}{e.position ? ` (${e.position})` : ""}
                    </option>
                  ))}
                </select>
              </div>

              {/* Created By */}
              <div className="cm-field">
                <label className="cm-label">Created By</label>
                <div className="cm-created-by">
                  <span className="cm-avatar-icon">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z"/></svg>
                  </span>
                  <span className="cm-created-name">{user.fullname || user.username || "Admin"} ({user.role || "Admin"})</span>
                </div>
              </div>

            </div>

            {/* footer */}
            <div className="cm-footer">
              {saveError && <span className="save-error">{saveError}</span>}
              <button className="cm-btn-cancel" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="cm-btn-create" onClick={save}>
                {editTarget ? "Update Company" : "Create Company"}
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ===== CONFIRM DELETE ===== */}
      {confirmId && (
        <ConfirmModal
          message="ລຶບ company ນີ້ແທ້ບໍ?"
          subMessage="ຂໍ້ມູນຈະຖືກລຶບຖາວອນ ແລະ ບໍ່ສາມາດກູ້ຄືນໄດ້"
          confirmLabel="ລຶບ"
          onConfirm={() => remove(confirmId)}
          onCancel={() => setConfirmId(null)}
        />
      )}

      {/* ===== VIEW MODAL ===== */}
      {viewItem && (
        <div className="modal-overlay" onClick={() => setViewItem(null)}>
          <div className="com-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Company Detail</h2>
              <button className="modal-close" onClick={() => setViewItem(null)}>&#x2715;</button>
            </div>
            <div className="modal-body view-body">
              <div className="view-row"><span>ID</span><strong>{viewItem.company_id}</strong></div>
              <div className="view-row"><span>Company Name</span><strong>{viewItem.companies_name}</strong></div>
              <div className="view-row"><span>ເຈົ້າຂອງ</span><strong>{viewItem.owner_name?.trim() || "-"}</strong></div>
              <div className="view-row">
                <span>Status</span>
                <span className={`badge ${STATUS_CLASS[viewItem.status] || "badge-pending"}`}>{viewItem.status || "pending"}</span>
              </div>
              <div className="view-row"><span>Created By</span><strong>{viewItem.created_by_name || "-"}</strong></div>
              <div className="view-row">
                <span>Created At</span>
                <strong>{viewItem.created_at ? new Date(viewItem.created_at).toLocaleDateString() : "-"}</strong>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-save" onClick={() => setViewItem(null)}>Close</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
