import { useEffect, useRef, useState } from "react";
import { api, API_BASE } from "../../api";
import toast from "react-hot-toast";
import ConfirmModal from "../../components/ConfirmModal";
import "../../components/ConfirmModal.css";
import "./idcard.css";

/* ── small helpers ── */
const fmt = (d) => d ? new Date(d).toLocaleDateString("en-GB", { day:"2-digit", month:"short", year:"numeric" }) : "–";
const initials = (f, l) => `${f?.[0] || ""}${l?.[0] || ""}`.toUpperCase();

/* ── Single ID-Card visual ── */
function IDCard({ emp }) {
  const photoUrl = emp.photo ? `${API_BASE}${emp.photo}` : null;
  const hasCard  = !!emp.card_id;

  return (
    <div className="idc-card">
      {/* header strip */}
      <div className="idc-header">
        <div className="idc-company-logo">
          {(emp.companies_name || "C")[0].toUpperCase()}
        </div>
        <div className="idc-company-name">{emp.companies_name || "Company"}</div>
        <div className={`idc-status-pill ${hasCard ? (emp.card_status === "Active" ? "pill-active" : "pill-inactive") : "pill-none"}`}>
          {hasCard ? emp.card_status : "No Card"}
        </div>
      </div>

      {/* photo */}
      <div className="idc-photo-wrap">
        {photoUrl
          ? <img src={photoUrl} alt="photo" className="idc-photo" />
          : <div className="idc-avatar">{initials(emp.firstname, emp.lastname)}</div>
        }
      </div>

      {/* info */}
      <div className="idc-name">{emp.firstname} {emp.lastname}</div>
      <div className="idc-position">{emp.position || "–"}</div>

      <div className="idc-meta">
        <div className="idc-meta-row">
          <span className="idc-meta-label">Employee Code</span>
          <span className="idc-meta-value">{emp.employee_code || "–"}</span>
        </div>
        {hasCard && (
          <>
            <div className="idc-meta-row">
              <span className="idc-meta-label">Card No.</span>
              <span className="idc-meta-value">{emp.card_no}</span>
            </div>
            <div className="idc-meta-row">
              <span className="idc-meta-label">Issued</span>
              <span className="idc-meta-value">{fmt(emp.issued_at)}</span>
            </div>
            {emp.printed_at && (
              <div className="idc-meta-row">
                <span className="idc-meta-label">Printed</span>
                <span className="idc-meta-value">{fmt(emp.printed_at)}</span>
              </div>
            )}
          </>
        )}
      </div>

      {/* barcode-like strip */}
      {hasCard && (
        <div className="idc-barcode">
          {[...Array(18)].map((_, i) => (
            <div key={i} className="idc-bar" style={{ width: i % 3 === 0 ? 3 : 1.5 }} />
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Print modal / window ── */
function printCard(emp) {
  const photoUrl = emp.photo ? `${API_BASE}${emp.photo}` : null;
  const initStr  = initials(emp.firstname, emp.lastname);
  const html = `<!DOCTYPE html><html><head><title>ID Card – ${emp.firstname} ${emp.lastname}</title>
<style>
  body { margin:0; display:flex; align-items:center; justify-content:center; min-height:100vh; background:#f0f0f0; font-family:'Segoe UI',sans-serif; }
  .card { width:320px; background:#fff; border-radius:16px; overflow:hidden; box-shadow:0 4px 24px rgba(0,0,0,.15); }
  .hdr  { background:linear-gradient(135deg,#2f4aad,#1e3a8a); padding:20px 16px 14px; display:flex; align-items:center; gap:12px; }
  .hdr-logo { width:38px; height:38px; border-radius:50%; background:rgba(255,255,255,.2); display:flex; align-items:center; justify-content:center; color:#fff; font-weight:700; font-size:16px; flex-shrink:0; }
  .hdr-name { color:#fff; font-size:13px; font-weight:600; }
  .photo-wrap { display:flex; justify-content:center; margin:-22px 0 0; position:relative; z-index:1; }
  .photo-wrap img,.avatar { width:72px; height:72px; border-radius:50%; border:3px solid #fff; object-fit:cover; }
  .avatar { background:#2f4aad; display:flex; align-items:center; justify-content:center; color:#fff; font-size:26px; font-weight:700; }
  .body { padding:12px 20px 16px; text-align:center; }
  .emp-name { font-size:16px; font-weight:700; color:#1a1a2e; margin:8px 0 2px; }
  .position { font-size:12px; color:#6b7280; margin:0 0 12px; }
  .meta { background:#f8f9fa; border-radius:8px; padding:10px 14px; text-align:left; font-size:11px; }
  .meta-row { display:flex; justify-content:space-between; margin:3px 0; }
  .ml { color:#9ca3af; }
  .mv { font-weight:600; color:#374151; }
  .bars { display:flex; align-items:center; gap:2px; justify-content:center; padding:10px 0 4px; }
  .bar  { height:28px; background:#374151; border-radius:1px; }
  @media print { body { background:#fff; } .card { box-shadow:none; } }
</style></head><body>
<div class="card">
  <div class="hdr">
    <div class="hdr-logo">${(emp.companies_name || "C")[0].toUpperCase()}</div>
    <div class="hdr-name">${emp.companies_name || ""}</div>
  </div>
  <div class="photo-wrap">
    ${photoUrl
      ? `<img src="${photoUrl}" />`
      : `<div class="avatar">${initStr}</div>`}
  </div>
  <div class="body">
    <div class="emp-name">${emp.firstname} ${emp.lastname}</div>
    <div class="position">${emp.position || ""}</div>
    <div class="meta">
      <div class="meta-row"><span class="ml">Employee Code</span><span class="mv">${emp.employee_code || "–"}</span></div>
      <div class="meta-row"><span class="ml">Card No.</span><span class="mv">${emp.card_no || "–"}</span></div>
      <div class="meta-row"><span class="ml">Issued</span><span class="mv">${fmt(emp.issued_at)}</span></div>
    </div>
    <div class="bars">
      ${[...Array(18)].map((_, i) => `<div class="bar" style="width:${i % 3 === 0 ? 3 : 1.5}px"></div>`).join("")}
    </div>
  </div>
</div>
<script>window.onload=()=>{window.print();window.onafterprint=()=>window.close();}</script>
</body></html>`;

  const w = window.open("", "_blank", "width=400,height=600");
  if (w) { w.document.write(html); w.document.close(); }
}

/* ══════════════════════════════════════════════════════ */
export default function IdCard() {
  const [employees,  setEmployees]  = useState([]);
  const [companies,  setCompanies]  = useState([]);
  const [loading,    setLoading]    = useState(false);
  const [search,     setSearch]     = useState("");
  const [company,    setCompany]    = useState("all");
  const [page,       setPage]       = useState(1);
  const [total,      setTotal]      = useState(0);
  const [issuing,    setIssuing]    = useState(null);
  const [confirmDel, setConfirmDel] = useState(null);
  const LIMIT = 12;

  const userStr  = localStorage.getItem("user");
  const userRole = userStr ? JSON.parse(userStr).role : "";
  const userId   = userStr ? JSON.parse(userStr).user_id : null;

  /* ---- load companies ---- */
  useEffect(() => {
    const endpoint = userRole === "Super Admin" ? "/company/all" : `/company/my/${userId}`;
    api.get(endpoint).then(r => setCompanies(r.data)).catch(() => {});
  }, []);

  /* ---- load employees with card status ---- */
  const load = async (p = page) => {
    setLoading(true);
    try {
      const r = await api.get("/idcard", {
        params: { page: p, limit: LIMIT, search, company_id: company },
      });
      setEmployees(r.data.data);
      setTotal(r.data.total);
    } catch {
      toast.error("ໂຫຼດຂໍ້ມູນ ID Card ບໍ່ໄດ້");
    }
    setLoading(false);
  };

  useEffect(() => { load(page); }, [page]);

  const doSearch = () => { setPage(1); load(1); };

  /* ---- issue card ---- */
  const issue = async (empId) => {
    setIssuing(empId);
    try {
      await api.post(`/idcard/${empId}/issue`);
      toast.success("ສ້າງ Card ສຳເລັດ");
      load(page);
    } catch (err) {
      toast.error(err?.response?.data?.message || "ສ້າງ Card ບໍ່ໄດ້");
    }
    setIssuing(null);
  };

  /* ---- delete card ---- */
  const deleteCard = async (empId) => {
    try {
      await api.delete(`/idcard/${empId}/card`);
      toast.success("ລຶບ Card ສຳເລັດ");
      load(page);
    } catch (err) {
      toast.error(err?.response?.data?.message || "ລຶບ Card ບໍ່ໄດ້");
    }
    setConfirmDel(null);
  };

  /* ---- print ---- */
  const handlePrint = async (emp) => {
    printCard(emp);
    try {
      await api.patch(`/idcard/${emp.employee_id}/printed`);
    } catch {}
    load(page);
  };

  /* ---- stats ---- */
  const totalCards   = employees.filter(e => e.card_id).length;
  const noCard       = employees.filter(e => !e.card_id).length;
  const printedCards = employees.filter(e => e.printed_at).length;

  const totalPages = Math.ceil(total / LIMIT);

  return (
    <div className="idc-page">

      {/* ── Header ── */}
      <div className="idc-topbar">
        <div>
          <h1 className="idc-title">ID Cards</h1>
          <p className="idc-sub">ຈັດການ ID Card ຂອງພະນັກງານ</p>
        </div>
      </div>

      {/* ── Filters ── */}
      <div className="idc-filters">
        <input
          className="idc-search"
          placeholder="ຄົ້ນຫາຊື່, ລະຫັດ, ຕຳແໜ່ງ..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          onKeyDown={e => e.key === "Enter" && doSearch()}
        />
        <select
          className="idc-select"
          value={company}
          onChange={e => { setCompany(e.target.value); setPage(1); setTimeout(() => load(1), 0); }}
        >
          <option value="all">All Companies</option>
          {companies.map(c => (
            <option key={c.company_id} value={c.company_id}>{c.companies_name}</option>
          ))}
        </select>
        <button className="idc-search-btn" onClick={doSearch}>ຄົ້ນຫາ</button>
      </div>

      {/* ── Stats strip ── */}
      <div className="idc-stats">
        {[
          { label: "ທັງໝົດ",      value: employees.length, color: "#2f4aad" },
          { label: "ມີ Card",     value: totalCards,        color: "#059669" },
          { label: "ບໍ່ມີ Card",  value: noCard,            color: "#dc2626" },
          { label: "ພິມແລ້ວ",    value: printedCards,      color: "#7c3aed" },
        ].map(s => (
          <div key={s.label} className="idc-stat-box">
            <div className="idc-stat-val" style={{ color: s.color }}>{s.value}</div>
            <div className="idc-stat-lbl">{s.label}</div>
          </div>
        ))}
      </div>

      {/* ── Grid ── */}
      {loading ? (
        <div className="idc-loading">Loading...</div>
      ) : employees.length === 0 ? (
        <div className="idc-empty">ບໍ່ມີຂໍ້ມູນ</div>
      ) : (
        <div className="idc-grid">
          {employees.map(emp => (
            <div key={emp.employee_id} className="idc-item">
              <IDCard emp={emp} />
              <div className="idc-actions">
                {!emp.card_id ? (
                  <button
                    className="idc-btn idc-btn-issue"
                    disabled={issuing === emp.employee_id}
                    onClick={() => issue(emp.employee_id)}
                  >
                    {issuing === emp.employee_id ? "ກຳລັງສ້າງ..." : "+ ສ້າງ Card"}
                  </button>
                ) : (
                  <div className="idc-action-row">
                    <button
                      className="idc-btn idc-btn-print"
                      onClick={() => handlePrint(emp)}
                    >
                      🖨 ພິມ Card
                    </button>
                    <button
                      className="idc-btn idc-btn-delete"
                      onClick={() => setConfirmDel(emp.employee_id)}
                      title="ລຶບ Card"
                    >
                      🗑
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Pagination ── */}
      {confirmDel && (
        <ConfirmModal
          message="ລຶບ ID Card ນີ້ແທ້ບໍ?"
          subMessage="Card ຈະຖືກລຶບ ແລະ ພະນັກງານຈະກັບໄປ 'ບໍ່ມີ Card'"
          confirmLabel="ລຶບ Card"
          danger={true}
          onConfirm={() => deleteCard(confirmDel)}
          onCancel={() => setConfirmDel(null)}
        />
      )}

      {totalPages > 1 && (
        <div className="idc-pagination">
          <button
            className="idc-pg-btn"
            disabled={page <= 1}
            onClick={() => setPage(p => p - 1)}
          >
            ← ກ່ອນ
          </button>
          <span className="idc-pg-info">ໜ້າ {page} / {totalPages} ({total} ລາຍການ)</span>
          <button
            className="idc-pg-btn"
            disabled={page >= totalPages}
            onClick={() => setPage(p => p + 1)}
          >
            ຕໍ່ໄປ →
          </button>
        </div>
      )}
    </div>
  );
}
