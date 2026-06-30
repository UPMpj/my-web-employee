import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api, API_BASE, photoUrl as getPhotoUrl } from "../../api";
import { useCurrentUser } from "../../hooks/useCurrentUser";
import { useLanguage } from "../../context/LanguageContext";
import toast from "react-hot-toast";
import "./add-employee.css";

const EMPTY = {
  firstname: "", lastname: "", employee_code: "", email: "",
  contact_no: "", gender: "", company_id: "", nationality: "",
  position: "", hired_at: new Date().toISOString().slice(0, 10),
  status: "Active", notes: "", employee_type: "",
  province: "", district: "", village: "",
  dormitory: "", room_no: "", office_building: "", room_id: "",
  office_floor: "", office_room_no: "",
};

export default function AddEmployee() {
  const navigate    = useNavigate();
  const { id }      = useParams();
  const isEdit      = Boolean(id);
  const currentUser = useCurrentUser();
  const { t }       = useLanguage();

  const [form, setForm]         = useState(EMPTY);
  const [companies, setCompanies] = useState([]);
  const [photo, setPhoto]       = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [error, setError]       = useState("");
  const [saving, setSaving]     = useState(false);
  /* dormitory building / room selectors */
  const [buildings,   setBuildings]   = useState([]);
  const [selBldId,    setSelBldId]    = useState("");
  const [selFloor,    setSelFloor]    = useState("");
  const [floorRooms,  setFloorRooms]  = useState([]);
  /* office building / room selectors */
  const [selOfficeBldId,   setSelOfficeBldId]   = useState("");
  const [selOfficeFloor,   setSelOfficeFloor]   = useState("");
  const [officeFloorRooms, setOfficeFloorRooms] = useState([]);

  /* ---- load companies + buildings ---- */
  useEffect(() => {
    if (!currentUser.user_id) return;
    const endpoint = currentUser.role === "Super Admin"
      ? "/company/all"
      : `/company/my/${currentUser.user_id}`;
    api.get(endpoint).then(r => setCompanies(r.data)).catch(() => {});
    api.get("/building").then(r => setBuildings(r.data)).catch(() => {});
  }, [currentUser.user_id]);

  /* ---- load dormitory rooms when building+floor selected ---- */
  useEffect(() => {
    if (!selBldId || !selFloor) { setFloorRooms([]); return; }
    api.get(`/building/${selBldId}/floor/${selFloor}`)
      .then(r => setFloorRooms(r.data))
      .catch(() => setFloorRooms([]));
  }, [selBldId, selFloor]);

  /* ---- load office rooms when office building+floor selected ---- */
  useEffect(() => {
    if (!selOfficeBldId || !selOfficeFloor) { setOfficeFloorRooms([]); return; }
    api.get(`/building/${selOfficeBldId}/floor/${selOfficeFloor}`)
      .then(r => setOfficeFloorRooms(r.data))
      .catch(() => setOfficeFloorRooms([]));
  }, [selOfficeBldId, selOfficeFloor]);

  /* ---- load employee if edit ---- */
  useEffect(() => {
    if (!isEdit) return;
    api.get(`/employees/${id}`)
      .then(r => {
        const e = r.data;
        setForm({
          firstname:     e.firstname     || "",
          lastname:      e.lastname      || "",
          employee_code: e.employee_code || "",
          email:         e.email         || "",
          contact_no:    e.contact_no    || "",
          gender:        e.gender        || "",
          company_id:    e.company_id    || "",
          nationality:   e.nationality   || "",
          position:      e.position      || "",
          hired_at:      e.hired_at ? e.hired_at.slice(0, 10) : "",
          status:        e.status        || "Active",
          notes:           e.notes           || "",
          employee_type:   e.employee_type   || "",
          province:        e.province        || "",
          district:        e.district        || "",
          village:         e.village         || "",
          dormitory:       e.dormitory       || "",
          room_no:         e.room_no         || "",
          office_building: e.office_building || "",
          room_id:         e.room_id         || "",
          office_floor:    e.office_floor    || "",
          office_room_no:  e.office_room_no  || "",
        });
        /* pre-select dormitory building/floor if room assigned */
        if (e.room_id) {
          api.get(`/building/room-lookup/${e.room_id}`)
            .then(lr => {
              setSelBldId(String(lr.data.building_id));
              setSelFloor(String(lr.data.floor_number));
            })
            .catch(() => {});
        }
        /* pre-select office building/floor if office_room_no assigned */
        if (e.office_building) {
          api.get("/building").then(r => {
            const bld = r.data.find(b => b.building_name === e.office_building && b.building_type === "Office");
            if (!bld) return;
            setSelOfficeBldId(String(bld.building_id));
            if (e.office_floor) setSelOfficeFloor(String(e.office_floor));
          }).catch(() => {});
        }
        if (e.photo) setPhotoPreview(getPhotoUrl(e.photo));
      })
      .catch(() => navigate("/employees"));
  }, [id]);

  /* ---- auto-generate code ---- */
  const autoCode = async () => {
    if (!form.company_id) {
      toast.error(t("err_sel_co_first"));
      return;
    }
    try {
      const res = await api.get("/employees/next-code", {
        params: { company_id: form.company_id },
      });
      setForm(f => ({ ...f, employee_code: res.data.code }));
    } catch {
      toast.error(t("err_code_fetch"));
    }
  };

  /* ---- photo ---- */
  const handlePhoto = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setPhoto(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  /* ---- save ---- */
  const save = async () => {
    setError("");
    if (!form.firstname.trim()) { setError(t("err_firstname")); return; }
    if (!form.lastname.trim())  { setError(t("err_lastname"));  return; }
    if (!form.company_id)       { setError(t("err_sel_company"));  return; }
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      setError(t("err_email_fmt")); return;
    }

    setSaving(true);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => fd.append(k, v ?? ""));
      if (photo) fd.append("photo", photo);

      const cfg = { headers: { "Content-Type": "multipart/form-data" } };
      if (isEdit) {
        const res = await api.put(`/employees/${id}`, fd, cfg);
        if (res.data?.pending) {
          toast.success("ສ້ອງຂໍ approval ຈາກ Super Admin (ຕຳແໜ່ງ/ສະຖານະ/ບໍລິສັດ ປ່ຽນແປງ)", { duration: 5000 });
        } else {
          toast.success(t("emp_updated"));
        }
      } else {
        await api.post("/employees", fd, cfg);
        toast.success(t("emp_added"));
      }
      navigate("/employees");
    } catch (err) {
      setError(err?.response?.data?.message || t("save_failed_msg"));
    }
    setSaving(false);
  };

  const f = (key) => ({
    value: form[key],
    onChange: e => setForm(p => ({ ...p, [key]: e.target.value })),
  });

  return (
    <div className="ae-page">

      {/* breadcrumb */}
      <div className="ae-breadcrumb">
        <span className="bc-link" onClick={() => navigate("/employees")}>{t("nav_employees")}</span>
        <span className="bc-sep">›</span>
        <span className="bc-cur">{isEdit ? t("ae_edit_title") : t("add_employee")}</span>
      </div>

      <h1 className="ae-title">{isEdit ? t("ae_edit_title") : t("add_employee")}</h1>
      <p className="ae-sub">{isEdit ? t("ae_edit_sub") : t("ae_add_sub")}</p>

      {/* ===== BASIC INFORMATION ===== */}
      <div className="ae-card">
        <h2 className="ae-section-title">{t("section_basic_info")}</h2>

        <div className="ae-basic-grid">
          {/* Photo */}
          <div className="ae-photo-col">
            <div className="ae-avatar">
              {photoPreview
                ? <img src={photoPreview} alt="preview" />
                : <svg viewBox="0 0 24 24" fill="none" stroke="#adb5bd" strokeWidth="1.2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
              }
            </div>
            <label className="ae-upload-btn">
              <input type="file" accept="image/*" hidden onChange={handlePhoto} />
              &#128279; {t("upload_photo")}
            </label>
          </div>

          {/* Fields grid */}
          <div className="ae-fields">
            {/* row 1 */}
            <div className="ae-field-group">
              <label>{t("first_name")} <span className="req">*</span>
                <input placeholder="First name" {...f("firstname")} />
              </label>
              <label>{t("last_name")} <span className="req">*</span>
                <input placeholder="Last name" {...f("lastname")} />
              </label>
            </div>

            {/* row 2 */}
            <div className="ae-field-group">
              <label>{t("employee_code")}
                <div className="ae-code-wrap">
                  <input placeholder={t("auto_generate")} {...f("employee_code")} />
                  <button type="button" className="ae-auto-btn" onClick={autoCode}>{t("auto_generate")}</button>
                </div>
              </label>
              <label>Email <span className="req">*</span>
                <input type="email" placeholder="email@example.com" {...f("email")} />
              </label>
            </div>

            {/* row 3 */}
            <div className="ae-field-group ae-field-group-3">
              <label>Phone <span className="req">*</span>
                <div className="ae-phone-wrap">
                  <span className="ae-phone-flag">🇱🇦 +856</span>
                  <input placeholder="20 xxxx xxxx" {...f("contact_no")} />
                </div>
              </label>
              <label>{t("gender")}
                <select {...f("gender")}>
                  <option value="">{t("select_gender")}</option>
                  <option value="Male">{t("male")}</option>
                  <option value="Female">{t("female")}</option>
                  <option value="Other">{t("opt_other")}</option>
                </select>
              </label>
              <label>{t("company")} <span className="req">*</span>
                <select {...f("company_id")}>
                  <option value="">{t("select_company")}</option>
                  {companies.map(c => (
                    <option key={c.company_id} value={c.company_id}>{c.companies_name}</option>
                  ))}
                </select>
              </label>
            </div>

            {/* row 4 */}
            <div className="ae-field-group ae-field-group-4">
              <label>{t("position")}
                <input placeholder="Position" {...f("position")} />
              </label>
              <label>{t("nationality")}
                <input placeholder="Nationality" {...f("nationality")} />
              </label>
              <label>{t("hire_date")}
                <input type="date" {...f("hired_at")} />
              </label>
              <label>{t("status")} <span className="req">*</span>
                <select {...f("status")}>
                  <option value="Active">{t("active")}</option>
                  <option value="On Leave">{t("on_leave")}</option>
                  <option value="Inactive">{t("opt_inactive")}</option>
                  <option value="Resigned">{t("resigned")}</option>
                </select>
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* ===== ADDITIONAL INFORMATION ===== */}
      <div className="ae-card">
        <h2 className="ae-section-title">{t("section_additional")}</h2>
        <div className="ae-field-group">
          <label>{t("pf_emp_type")}
            <select {...f("employee_type")}>
              <option value="">{t("select_emp_type")}</option>
              <option value="Full-time">{t("opt_fulltime")}</option>
              <option value="Part-time">{t("opt_parttime")}</option>
              <option value="Contract">{t("opt_contract")}</option>
              <option value="Intern">{t("opt_intern")}</option>
            </select>
          </label>
          <label>{t("notes")}
            <textarea placeholder={t("notes_long_ph")} rows={3} {...f("notes")} />
          </label>
        </div>
      </div>

      {/* ===== ADDRESS / PROFILE INFO ===== */}
      <div className="ae-card">
        <h2 className="ae-section-title">{t("section_address")}</h2>
        <div className="ae-field-group ae-field-group-3">
          <label>{t("province")}
            <input placeholder={t("province")} {...f("province")} />
          </label>
          <label>{t("district")}
            <input placeholder={t("district")} {...f("district")} />
          </label>
          <label>{t("village")}
            <input placeholder={t("village")} {...f("village")} />
          </label>
        </div>

        {/* ── Office Location ── */}
        <div className="ae-subsection-label">{t("office_loc_lbl")}</div>
        <div className="ae-field-group ae-field-group-3">
          <label>{t("office_bld_lbl")}
            <select
              value={selOfficeBldId}
              onChange={e => {
                const bid = e.target.value;
                setSelOfficeBldId(bid);
                setSelOfficeFloor("");
                setOfficeFloorRooms([]);
                const bld = buildings.find(b => String(b.building_id) === bid);
                setForm(p => ({
                  ...p,
                  office_building: bid ? (bld?.building_name || "") : "",
                  office_floor: "",
                  office_room_no: "",
                }));
              }}
            >
              <option value="">{t("sel_office_bld")}</option>
              {buildings.filter(b => b.building_type === "Office").map(b => (
                <option key={b.building_id} value={b.building_id}>{b.building_name}</option>
              ))}
            </select>
          </label>

          <label>{t("office_floor_lbl")}
            <select
              value={selOfficeFloor}
              disabled={!selOfficeBldId}
              onChange={e => {
                setSelOfficeFloor(e.target.value);
                setForm(p => ({ ...p, office_floor: e.target.value, office_room_no: "" }));
              }}
            >
              <option value="">{t("sel_floor_opt")}</option>
              {selOfficeBldId && (() => {
                const bld = buildings.find(b => String(b.building_id) === selOfficeBldId);
                if (!bld) return null;
                return Array.from({ length: bld.total_floors }, (_, i) => i + 1).map(fn => (
                  <option key={fn} value={fn}>{t("floor_n").replace("{n}", fn)}</option>
                ));
              })()}
            </select>
          </label>

          <label>{t("office_room_lbl")}
            <select
              value={form.office_room_no}
              disabled={!selOfficeFloor}
              onChange={e => {
                setForm(p => ({ ...p, office_room_no: e.target.value }));
              }}
            >
              <option value="">{t("sel_room_opt")}</option>
              {officeFloorRooms.map(rm => (
                <option key={rm.room_id} value={rm.room_number}>
                  {t("room_lbl")} {rm.room_number}
                  {rm.capacity ? ` — ${rm.occupant_count || 0}/${rm.capacity}` : ""}
                </option>
              ))}
            </select>
          </label>
        </div>

        {/* ── Dormitory / Room Assignment ── */}
        <div className="ae-subsection-label" style={{ marginTop: 20 }}>{t("dormitory_lbl")}</div>
        <div className="ae-field-group ae-field-group-3" style={{ marginTop: 4 }}>
          <label>{t("dorm_bld_lbl")}
            <select
              value={selBldId}
              onChange={e => {
                const bid = e.target.value;
                setSelBldId(bid);
                setSelFloor("");
                setFloorRooms([]);
                const bld = buildings.find(b => String(b.building_id) === bid);
                setForm(p => ({
                  ...p,
                  room_id: "",
                  dormitory: bid ? (bld?.building_name || "") : "",
                  room_no: "",
                }));
              }}
            >
              <option value="">{t("not_assigned_opt")}</option>
              {buildings.filter(b => b.building_type !== "Office").map(b => (
                <option key={b.building_id} value={b.building_id}>{b.building_name}</option>
              ))}
            </select>
          </label>

          <label>{t("floor_lbl")}
            <select
              value={selFloor}
              disabled={!selBldId}
              onChange={e => {
                setSelFloor(e.target.value);
                setForm(p => ({ ...p, room_id: "", room_no: "" }));
              }}
            >
              <option value="">{t("sel_floor_opt")}</option>
              {selBldId && (() => {
                const bld = buildings.find(b => String(b.building_id) === selBldId);
                if (!bld) return null;
                return Array.from({ length: bld.total_floors }, (_, i) => i + 1).map(fn => (
                  <option key={fn} value={fn}>{t("floor_n").replace("{n}", fn)}</option>
                ));
              })()}
            </select>
          </label>

          <label>{t("room_lbl")}
            <select
              value={form.room_id}
              disabled={!selFloor}
              onChange={e => {
                const rid = e.target.value;
                const rm  = floorRooms.find(r => String(r.room_id) === rid);
                const bld = buildings.find(b => String(b.building_id) === selBldId);
                setForm(p => ({
                  ...p,
                  room_id:   rid,
                  room_no:   rm?.room_number  || "",
                  dormitory: bld?.building_name || "",
                }));
              }}
            >
              <option value="">{t("sel_room_opt")}</option>
              {floorRooms.map(rm => (
                <option key={rm.room_id} value={rm.room_id}
                  disabled={rm.occupant_count >= rm.capacity && String(rm.room_id) !== String(form.room_id)}>
                  {t("room_lbl")} {rm.room_number} — {rm.occupant_count || 0}/{rm.capacity}
                  {rm.occupant_count >= rm.capacity && String(rm.room_id) !== String(form.room_id) ? ` ${t("room_full_tag")}` : ""}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      {/* ===== FOOTER ===== */}
      {error && <p className="ae-error">{error}</p>}
      <div className="ae-footer">
        <button className="ae-cancel" onClick={() => navigate("/employees")}>{t("cancel")}</button>
        <button className="ae-submit" onClick={save} disabled={saving}>
          {saving ? t("saving") : isEdit ? t("update_employee") : t("add_employee")}
        </button>
      </div>

    </div>
  );
}
