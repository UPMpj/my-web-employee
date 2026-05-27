import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api, API_BASE, photoUrl as getPhotoUrl } from "../../api";
import toast from "react-hot-toast";
import "./add-employee.css";

const EMPTY = {
  firstname: "", lastname: "", employee_code: "", email: "",
  contact_no: "", gender: "", company_id: "", nationality: "",
  position: "", hired_at: new Date().toISOString().slice(0, 10),
  status: "Active", notes: "", employee_type: "",
  province: "", district: "", village: "", dormitory: "", room_no: "", office_building: "", room_id: "",
};

export default function AddEmployee() {
  const navigate    = useNavigate();
  const { id }      = useParams();
  const isEdit      = Boolean(id);

  const [form, setForm]         = useState(EMPTY);
  const [companies, setCompanies] = useState([]);
  const [photo, setPhoto]       = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [error, setError]       = useState("");
  const [saving, setSaving]     = useState(false);
  /* building / room selectors */
  const [buildings, setBuildings] = useState([]);
  const [selBldId,  setSelBldId]  = useState("");
  const [selFloor,  setSelFloor]  = useState("");
  const [floorRooms, setFloorRooms] = useState([]);

  /* ---- load companies + buildings ---- */
  useEffect(() => {
    const userStr = localStorage.getItem("user");
    if (!userStr) return;
    const user = JSON.parse(userStr);
    const endpoint = user.role === "Super Admin"
      ? "/company/all"
      : `/company/my/${user.user_id}`;
    api.get(endpoint).then(r => setCompanies(r.data)).catch(() => {});
    api.get("/building").then(r => setBuildings(r.data)).catch(() => {});
  }, []);

  /* ---- load rooms when building+floor selected ---- */
  useEffect(() => {
    if (!selBldId || !selFloor) { setFloorRooms([]); return; }
    api.get(`/building/${selBldId}/floor/${selFloor}`)
      .then(r => setFloorRooms(r.data))
      .catch(() => setFloorRooms([]));
  }, [selBldId, selFloor]);

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
        });
        /* pre-select building/floor if room assigned */
        if (e.room_id) {
          api.get(`/building/room-lookup/${e.room_id}`)
            .then(lr => {
              setSelBldId(String(lr.data.building_id));
              setSelFloor(String(lr.data.floor_number));
            })
            .catch(() => {});
        } else if (e.office_building) {
          /* pre-select office building by name */
          api.get("/building").then(r => {
            const bld = r.data.find(b => b.building_name === e.office_building);
            if (bld) setSelBldId(String(bld.building_id));
          }).catch(() => {});
        }
        if (e.photo) setPhotoPreview(getPhotoUrl(e.photo));
      })
      .catch(() => navigate("/employees"));
  }, [id]);

  /* ---- auto-generate code ---- */
  const autoCode = () => {
    const comp = companies.find(c => c.company_id == form.company_id);
    const prefix = comp
      ? comp.companies_name.split(/\s+/).map(w => w[0].toUpperCase()).join("").slice(0, 3)
      : "EMP";
    const num = String(Math.floor(Math.random() * 900) + 100);
    setForm(f => ({ ...f, employee_code: prefix + num }));
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
    if (!form.firstname.trim()) { setError("ກະລຸນາໃສ່ First Name"); return; }
    if (!form.lastname.trim())  { setError("ກະລຸນາໃສ່ Last Name");  return; }
    if (!form.company_id)       { setError("ກະລຸນາເລືອກ Company");  return; }
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      setError("ຮູບແບບ Email ບໍ່ຖືກຕ້ອງ"); return;
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
          toast.success("ສົ່ງຄຳຂໍແກ້ໄຂໄປຍັງ Super Admin ແລ້ວ — ລໍຖ້າການອະນຸຍາດ", { duration: 4000 });
        } else {
          toast.success("ອັບເດດພະນັກງານສຳເລັດ");
        }
      } else {
        await api.post("/employees", fd, cfg);
        toast.success("ເພີ່ມພະນັກງານສຳເລັດ");
      }
      navigate("/employees");
    } catch (err) {
      setError(err?.response?.data?.message || "ບັນທຶກບໍ່ສຳເລັດ");
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
        <span className="bc-link" onClick={() => navigate("/employees")}>Employees</span>
        <span className="bc-sep">›</span>
        <span className="bc-cur">{isEdit ? "Edit Employee" : "Add Employee"}</span>
      </div>

      <h1 className="ae-title">{isEdit ? "Edit Employee" : "Add Employee"}</h1>
      <p className="ae-sub">Fill out the details to {isEdit ? "update the" : "add a new"} employee.</p>

      {/* ===== BASIC INFORMATION ===== */}
      <div className="ae-card">
        <h2 className="ae-section-title">Basic Information</h2>

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
              &#128279; Upload Photo
            </label>
          </div>

          {/* Fields grid */}
          <div className="ae-fields">
            {/* row 1 */}
            <div className="ae-field-group">
              <label>First Name <span className="req">*</span>
                <input placeholder="First name" {...f("firstname")} />
              </label>
              <label>Last Name <span className="req">*</span>
                <input placeholder="Last name" {...f("lastname")} />
              </label>
            </div>

            {/* row 2 */}
            <div className="ae-field-group">
              <label>Employee Code
                <div className="ae-code-wrap">
                  <input placeholder="Auto-generate" {...f("employee_code")} />
                  <button type="button" className="ae-auto-btn" onClick={autoCode}>Auto-generate</button>
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
              <label>Gender
                <select {...f("gender")}>
                  <option value="">Select Gender</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </label>
              <label>Company <span className="req">*</span>
                <select {...f("company_id")}>
                  <option value="">Select Company</option>
                  {companies.map(c => (
                    <option key={c.company_id} value={c.company_id}>{c.companies_name}</option>
                  ))}
                </select>
              </label>
            </div>

            {/* row 4 */}
            <div className="ae-field-group ae-field-group-4">
              <label>Position
                <input placeholder="Position" {...f("position")} />
              </label>
              <label>Nationality
                <input placeholder="Nationality" {...f("nationality")} />
              </label>
              <label>Hire Date
                <input type="date" {...f("hired_at")} />
              </label>
              <label>Status <span className="req">*</span>
                <select {...f("status")}>
                  <option value="Active">Active</option>
                  <option value="On Leave">On Leave</option>
                  <option value="Inactive">Inactive</option>
                  <option value="Resigned">Resigned</option>
                </select>
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* ===== ADDITIONAL INFORMATION ===== */}
      <div className="ae-card">
        <h2 className="ae-section-title">Additional Information</h2>
        <div className="ae-field-group">
          <label>Employee Type
            <select {...f("employee_type")}>
              <option value="">Select Employee Type</option>
              <option value="Full-time">Full-time</option>
              <option value="Part-time">Part-time</option>
              <option value="Contract">Contract</option>
              <option value="Intern">Intern</option>
            </select>
          </label>
          <label>Notes
            <textarea placeholder="Enter any additional notes here..." rows={3} {...f("notes")} />
          </label>
        </div>
      </div>

      {/* ===== ADDRESS / PROFILE INFO ===== */}
      <div className="ae-card">
        <h2 className="ae-section-title">Address / Profile Info</h2>
        <div className="ae-field-group ae-field-group-3">
          <label>Province
            <input placeholder="Province" {...f("province")} />
          </label>
          <label>District
            <input placeholder="District" {...f("district")} />
          </label>
          <label>Village
            <input placeholder="Village" {...f("village")} />
          </label>
        </div>
        {/* Building / Room Assignment */}
        <div className="ae-field-group ae-field-group-3" style={{ marginTop: 16 }}>
          <label>ຕືກ (Building)
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
                  office_building: bid ? (bld?.building_name || "") : "",
                }));
              }}
            >
              <option value="">-- ບໍ່ໄດ້ກຳນົດ --</option>
              {buildings.map(b => (
                <option key={b.building_id} value={b.building_id}>
                  {b.building_name} ({b.building_type === "Office" ? "Office" : "ຫ້ອງນອນ"})
                </option>
              ))}
            </select>
          </label>

          <label>ຊັ້ນ (Floor)
            <select
              value={selFloor}
              disabled={!selBldId}
              onChange={e => {
                setSelFloor(e.target.value);
                setForm(p => ({ ...p, room_id: "", room_no: "" }));
              }}
            >
              <option value="">-- ເລືອກຊັ້ນ --</option>
              {selBldId && (() => {
                const bld = buildings.find(b => String(b.building_id) === selBldId);
                if (!bld) return null;
                return Array.from({length: bld.total_floors}, (_, i) => i + 1).map(fn => (
                  <option key={fn} value={fn}>ຊັ້ນ {fn}</option>
                ));
              })()}
            </select>
          </label>

          <label>ຫ້ອງ (Room)
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
              <option value="">-- ເລືອກຫ້ອງ --</option>
              {floorRooms.map(rm => (
                <option key={rm.room_id} value={rm.room_id}
                  disabled={rm.occupant_count >= rm.capacity && String(rm.room_id) !== String(form.room_id)}>
                  ຫ້ອງ {rm.room_number} — {rm.occupant_count || 0}/{rm.capacity} ຄົນ
                  {rm.occupant_count >= rm.capacity && String(rm.room_id) !== String(form.room_id) ? " (ເຕັມ)" : ""}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      {/* ===== FOOTER ===== */}
      {error && <p className="ae-error">{error}</p>}
      <div className="ae-footer">
        <button className="ae-cancel" onClick={() => navigate("/employees")}>Cancel</button>
        <button className="ae-submit" onClick={save} disabled={saving}>
          {saving ? "Saving..." : isEdit ? "Update Employee" : "Add Employee"}
        </button>
      </div>

    </div>
  );
}
