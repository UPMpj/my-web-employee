import { useState } from "react";
import "./user-manual.css";
import { useLanguage } from "../../context/LanguageContext";

const SECTIONS_LO = [
  {
    id: "login", icon: "🔐", title: "1. ເຂົ້າສູ່ລະບົບ",
    content: [
      { type: "step", text: "ເປີດ browser ໄປທີ່ URL ຂອງລະບົບ" },
      { type: "step", text: 'ໃສ່ Email ແລະ Password → ກົດ "Login"' },
      { type: "step", text: "ຖ້າລືມລະຫັດ → ກົດ \"Forgot Password\" → ໃສ່ email → ກວດ inbox" },
      { type: "note",  text: "ລະຫັດຕ້ອງຢ່າງໜ້ອຍ 8 ຕົວ, ມີຕົວພິມໃຫຍ່, ຕົວເລກ ແລະ ຕົວພິເສດ" },
    ]
  },
  {
    id: "dashboard", icon: "📊", title: "2. Dashboard",
    content: [
      { type: "text",  text: "ໜ້າ Dashboard ສະແດງຂໍ້ມູນສະຫຼຸບລະບົບທັງໝົດ:" },
      { type: "list",  items: ["ຈຳນວນພະນັກງານທັງໝົດ", "ສະຖິຕິຕາມບໍລິສັດ", "ກຣາບ trend ພະນັກງານ", "Activity log ລ່າສຸດ", "ສະຖານະ Building"] },
    ]
  },
  {
    id: "companies", icon: "🏢", title: "3. ຈັດການບໍລິສັດ",
    content: [
      { type: "text",  text: "ໄປທີ່ Companies ໃນ menu ຊ້າຍ" },
      { type: "step",  text: "ເພີ່ມ: ກົດ \"+ Add Company\" → ຕື່ມຂໍ້ມູນ → Save" },
      { type: "step",  text: "ແກ້ໄຂ: ກົດ icon ✏️ ຂ້າງຊື່ບໍລິສັດ" },
      { type: "step",  text: "ລຶບ: ກົດ icon 🗑️ (ຈະເຕືອນຢືນຢັນກ່ອນ)" },
      { type: "step",  text: "ເບິ່ງລາຍລະອຽດ: ກົດຊື່ບໍລິສັດ → Company Profile" },
    ]
  },
  {
    id: "employees", icon: "👤", title: "4. ຈັດການພະນັກງານ",
    content: [
      { type: "text",  text: "ໄປທີ່ Employees ໃນ menu ຊ້າຍ" },
      { type: "step",  text: "ເພີ່ມ: ກົດ \"+ Add Employee\" → ຕື່ມຂໍ້ມູນຄົບ → Save" },
      { type: "step",  text: "ຊອກຫາ: ພິມຊື່ / code ໃນຊ່ອງ search (date filter ຈະ clear ອັດຕະໂນມັດ)" },
      { type: "step",  text: "Filter: ເລືອກ ບໍລິສັດ / ສະຖານະ / ເພດ / ວັນທີ" },
      { type: "step",  text: "ແກ້ໄຂ: ກົດ icon ✏️ → ແກ້ → Save" },
      { type: "step",  text: "ລຶບຫຼາຍຄົນ: tick checkbox → ກົດ Bulk Delete" },
      { type: "note",  text: "ການ search ດ້ວຍ text box ຈະ reset date filter ໂດຍອັດຕະໂນມັດ" },
    ]
  },
  {
    id: "employee-detail", icon: "📋", title: "5. ລາຍລະອຽດພະນັກງານ",
    content: [
      { type: "text",  text: "ກົດຊື່ພະນັກງານ ຫຼື icon 👁️ ເພື່ອເຂົ້າໜ້າລາຍລະອຽດ. ມີ 5 tabs:" },
      { type: "list",  items: [
        "Basic Info: ຂໍ້ມູນພື້ນຖານ (ຊື່, ຕຳແໜ່ງ, ບໍລິສັດ, ສະຖານະ)",
        "Profile: ຮູບໜ້າ, ຂໍ້ມູນສ່ວນຕົວ, ທີ່ຢູ່",
        "Documents: ອັບໂຫລດ/ເບິ່ງເອກະສານ",
        "Permits: ວີຊ່າ, ໃບອະນຸຍາດເຮັດວຽກ (ຕິດຕາມວັນໝົດອາຍຸ)",
        "Timeline: ປະຫວັດການປ່ຽນຕຳແໜ່ງ/ສະຖານະ",
      ]},
    ]
  },
  {
    id: "bulk-photo", icon: "🖼️", title: "6. Upload ຮູບພ້ອມກັນ",
    content: [
      { type: "text",  text: "ໄປທີ່ \"Upload ຮູບພ້ອມກັນ\" ໃນ menu (Super Admin ເທົ່ານັ້ນ)" },
      { type: "step",  text: "ຕັ້ງຊື່ໄຟລ໌ຮູບໃຫ້ກົງກັບ Employee Code: ຕົວຢ່າງ JOJO-019.jpg" },
      { type: "step",  text: "ລາກ & ວາງ ຮູບທັງໝົດ ຫຼື ກົດເລືອກ" },
      { type: "step",  text: "ກົດ \"Upload X ຮູບ\" → ລໍຖ້າ" },
      { type: "step",  text: "ເບິ່ງຜົນ: ✅ ສຳເລັດ / ❌ ບໍ່ພົບ Code" },
      { type: "note",  text: "ຊື່ໄຟລ໌ case-insensitive: jojo-019.jpg ແລະ JOJO-019.jpg ໃຊ້ໄດ້ທັງຄູ່" },
    ]
  },
  {
    id: "idcard", icon: "🪪", title: "7. ບັດພະນັກງານ (ID Cards)",
    content: [
      { type: "text",  text: "ໄປທີ່ ID Cards ໃນ menu" },
      { type: "step",  text: "Upload ຮູບ: ກົດກ່ອງຮູບໃນບັດ → ເລືອກຮູບ (ຕ້ອງ upload ກ່ອນ Print)" },
      { type: "step",  text: "ອອກບັດ: ກົດ \"Issue Card\" ໃຕ້ບັດ (ສຳລັບຄົນທີ່ຍັງບໍ່ມີບັດ)" },
      { type: "step",  text: "Print: ກົດ \"Print Card\" → print dialog ຈະເປີດ" },
      { type: "step",  text: "Print ຫຼາຍໃບ: ກົດ \"Select Multi\" → tick ພະນັກງານ → Print Selected" },
      { type: "step",  text: "ຮັບຄືນ: ກົດ \"Receive Card\" ສຳລັບພະນັກງານທີ່ resign ແລ້ວ" },
      { type: "note",  text: "ຮູບໃນ print ຈະຂຶ້ນກໍຕໍ່ເມື່ອ upload ຮູບໄວ້ກ່ອນ" },
    ]
  },
  {
    id: "card-request", icon: "📝", title: "8. ຄຳຮ້ອງຂໍບັດ",
    content: [
      { type: "text",  text: "Company Admin ສາມາດຮ້ອງຂໍບັດໃຫ້ພະນັກງານ:" },
      { type: "step",  text: "ID Cards → Card Request → ຕື່ມຟອມ → ເລືອກພະນັກງານ" },
      { type: "step",  text: "Super Admin ຈະ approve/reject ຈາກ menu Card Requests" },
      { type: "list",  items: ["Pending → Approved → Issued → Printed (workflow)"] },
    ]
  },
  {
    id: "building", icon: "🏠", title: "9. Building & ຫໍພັກ",
    content: [
      { type: "text",  text: "ໄປທີ່ Building ໃນ menu" },
      { type: "step",  text: "ເພີ່ມ building → ເພີ່ມ floor → ເພີ່ມ room" },
      { type: "step",  text: "ມອບໝາຍຫ້ອງ: ຄົ້ນຫາພະນັກງານ → Assign Room" },
      { type: "note",  text: "ແຕ່ລະຫ້ອງຮັບໄດ້ສູງສຸດ 4 ຄົນ" },
    ]
  },
  {
    id: "import", icon: "📥", title: "10. ນຳເຂົ້າຂໍ້ມູນ (Import)",
    content: [
      { type: "step",  text: "ໄປທີ່ Import Data → ດາວໂຫລດ Template Excel" },
      { type: "step",  text: "ຕື່ມຂໍ້ມູນໃນ Excel → save" },
      { type: "step",  text: "Upload ໄຟລ໌ → Preview → Submit" },
      { type: "step",  text: "Super Admin approve batch → ຂໍ້ມູນຈຶ່ງຖືກ import ຈິງ" },
      { type: "note",  text: "ລະບົບຈະ detect ຂໍ້ມູນຊ້ຳ (duplicate) ໃຫ້ອັດຕະໂນມັດ" },
    ]
  },
  {
    id: "reports", icon: "📊", title: "11. ລາຍງານ (Reports)",
    content: [
      { type: "step",  text: "ໄປທີ່ Reports → ເລືອກ Column ທີ່ຕ້ອງການ" },
      { type: "step",  text: "Filter ຂໍ້ມູນ → Export Excel ຫຼື PDF" },
    ]
  },
  {
    id: "roles", icon: "👥", title: "12. ສິດຜູ້ໃຊ້",
    content: [
      { type: "list",  items: [
        "Super Admin: ສິດເຕັມ — ຈັດການທຸກຢ່າງ",
        "Company Admin: ຈັດການພະນັກງານ ແລະ ຂໍ້ມູນຂອງບໍລິສັດຕົນ",
      ]},
      { type: "step",  text: "ເພີ່ມ User: System Users → + Add User → ເລືອກ role ແລະ company" },
    ]
  },
  {
    id: "settings", icon: "⚙️", title: "13. ຕັ້ງຄ່າ",
    content: [
      { type: "list",  items: [
        "ປ່ຽນລະຫັດຜ່ານ",
        "ແກ້ໄຂຂໍ້ມູນ profile",
        "Super Admin: ປ່ຽນຊື່ລະບົບ ແລະ Logo",
      ]},
    ]
  },
];

const SECTIONS_EN = [
  {
    id: "login", icon: "🔐", title: "1. Login",
    content: [
      { type: "step", text: "Open your browser and go to the system URL" },
      { type: "step", text: 'Enter your Email and Password → click "Login"' },
      { type: "step", text: 'Forgot password → click "Forgot Password" → enter email → check inbox' },
      { type: "note", text: "Password must be at least 8 characters, include uppercase letters, numbers, and special characters" },
    ]
  },
  {
    id: "dashboard", icon: "📊", title: "2. Dashboard",
    content: [
      { type: "text", text: "The Dashboard shows a summary of the entire system:" },
      { type: "list", items: ["Total number of employees", "Statistics by company", "Employee trend graph", "Latest activity log", "Building status"] },
    ]
  },
  {
    id: "companies", icon: "🏢", title: "3. Company Management",
    content: [
      { type: "text", text: "Go to Companies in the left menu" },
      { type: "step", text: 'Add: click "+ Add Company" → fill in details → Save' },
      { type: "step", text: "Edit: click the ✏️ icon next to the company name" },
      { type: "step", text: "Delete: click the 🗑️ icon (confirmation prompt will appear)" },
      { type: "step", text: "View details: click the company name → Company Profile" },
    ]
  },
  {
    id: "employees", icon: "👤", title: "4. Employee Management",
    content: [
      { type: "text", text: "Go to Employees in the left menu" },
      { type: "step", text: 'Add: click "+ Add Employee" → fill in all details → Save' },
      { type: "step", text: "Search: type a name or code in the search box (date filter will clear automatically)" },
      { type: "step", text: "Filter: select Company / Status / Gender / Date" },
      { type: "step", text: "Edit: click the ✏️ icon → edit → Save" },
      { type: "step", text: "Bulk delete: tick checkboxes → click Bulk Delete" },
      { type: "note", text: "Searching via text box will automatically reset the date filter" },
    ]
  },
  {
    id: "employee-detail", icon: "📋", title: "5. Employee Details",
    content: [
      { type: "text", text: "Click an employee name or the 👁️ icon to open the detail page. There are 5 tabs:" },
      { type: "list", items: [
        "Basic Info: core details (name, position, company, status)",
        "Profile: photo, personal info, address",
        "Documents: upload/view documents",
        "Permits: visa, work permit (tracks expiry dates)",
        "Timeline: history of position/status changes",
      ]},
    ]
  },
  {
    id: "bulk-photo", icon: "🖼️", title: "6. Bulk Photo Upload",
    content: [
      { type: "text", text: 'Go to "Bulk Photo Upload" in the menu (Super Admin only)' },
      { type: "step", text: "Name each photo file to match the Employee Code, e.g. JOJO-019.jpg" },
      { type: "step", text: "Drag & drop all photos or click to select" },
      { type: "step", text: 'Click "Upload X photos" → wait for completion' },
      { type: "step", text: "Review results: ✅ Success / ❌ Code not found" },
      { type: "note", text: "File names are case-insensitive: jojo-019.jpg and JOJO-019.jpg both work" },
    ]
  },
  {
    id: "idcard", icon: "🪪", title: "7. Employee ID Cards",
    content: [
      { type: "text", text: "Go to ID Cards in the menu" },
      { type: "step", text: "Upload photo: click the photo area on the card → select photo (must upload before printing)" },
      { type: "step", text: 'Issue card: click "Issue Card" below the card (for employees without a card)' },
      { type: "step", text: 'Print: click "Print Card" → print dialog will open' },
      { type: "step", text: 'Print multiple: click "Select Multi" → tick employees → Print Selected' },
      { type: "step", text: 'Receive back: click "Receive Card" for resigned employees' },
      { type: "note", text: "The photo will only appear in print if it was uploaded beforehand" },
    ]
  },
  {
    id: "card-request", icon: "📝", title: "8. Card Requests",
    content: [
      { type: "text", text: "Company Admin can request cards for employees:" },
      { type: "step", text: "ID Cards → Card Request → fill in form → select employees" },
      { type: "step", text: "Super Admin will approve/reject from the Card Requests menu" },
      { type: "list", items: ["Pending → Approved → Issued → Printed (workflow)"] },
    ]
  },
  {
    id: "building", icon: "🏠", title: "9. Building & Dormitory",
    content: [
      { type: "text", text: "Go to Building in the menu" },
      { type: "step", text: "Add building → add floor → add room" },
      { type: "step", text: "Assign room: search for an employee → Assign Room" },
      { type: "note", text: "Each room can hold a maximum of 4 people" },
    ]
  },
  {
    id: "import", icon: "📥", title: "10. Import Data",
    content: [
      { type: "step", text: "Go to Import Data → Download Excel Template" },
      { type: "step", text: "Fill in data in Excel → save" },
      { type: "step", text: "Upload file → Preview → Submit" },
      { type: "step", text: "Super Admin approves the batch → data is then actually imported" },
      { type: "note", text: "The system will automatically detect duplicate entries" },
    ]
  },
  {
    id: "reports", icon: "📊", title: "11. Reports",
    content: [
      { type: "step", text: "Go to Reports → select the columns you need" },
      { type: "step", text: "Filter data → Export Excel or PDF" },
    ]
  },
  {
    id: "roles", icon: "👥", title: "12. User Roles",
    content: [
      { type: "list", items: [
        "Super Admin: full access — manages everything",
        "Company Admin: manages employees and data for their own company",
      ]},
      { type: "step", text: "Add User: System Users → + Add User → select role and company" },
    ]
  },
  {
    id: "settings", icon: "⚙️", title: "13. Settings",
    content: [
      { type: "list", items: [
        "Change password",
        "Edit profile information",
        "Super Admin: change system name and logo",
      ]},
    ]
  },
];

function RenderContent({ items }) {
  return items.map((item, i) => {
    if (item.type === "text")  return <p key={i} className="um-text">{item.text}</p>;
    if (item.type === "step")  return <div key={i} className="um-step"><span className="um-step-dot">▸</span>{item.text}</div>;
    if (item.type === "note")  return <div key={i} className="um-note">💡 {item.text}</div>;
    if (item.type === "list")  return <ul key={i} className="um-list">{item.items.map((t,j) => <li key={j}>{t}</li>)}</ul>;
    return null;
  });
}

export default function UserManual() {
  const [open, setOpen] = useState(null);
  const { lang } = useLanguage();
  const toggle = (id) => setOpen(open === id ? null : id);

  const SECTIONS = lang === "en" ? SECTIONS_EN : SECTIONS_LO;
  const title = lang === "en" ? "📖 CCMS User Manual" : "📖 ຄູ່ມືການໃຊ້ລະບົບ CCMS";
  const subtitle = lang === "en"
    ? "Construction Company Management System — User Guide"
    : "Construction Company Management System — ຄູ່ມືສຳລັບຜູ້ໃຊ້ງານ";
  const tocLabel = lang === "en" ? "Table of Contents" : "ສາລະບານ";
  const footerText = lang === "en"
    ? "CCMS — Employee Management System v1.0"
    : "ລະບົບ CCMS — Employee Management System v1.0";

  return (
    <div className="um-page">
      <div className="um-header">
        <h1 className="um-title">{title}</h1>
        <p className="um-sub">{subtitle}</p>
      </div>

      <div className="um-toc">
        <div className="um-toc-title">{tocLabel}</div>
        <div className="um-toc-grid">
          {SECTIONS.map(s => (
            <a key={s.id} href={`#${s.id}`} className="um-toc-item" onClick={e => { e.preventDefault(); toggle(s.id); }}>
              <span>{s.icon}</span> {s.title}
            </a>
          ))}
        </div>
      </div>

      <div className="um-sections">
        {SECTIONS.map(s => (
          <div key={s.id} id={s.id} className="um-section">
            <button className={`um-section-header${open === s.id ? " um-sh-open" : ""}`} onClick={() => toggle(s.id)}>
              <span className="um-sh-icon">{s.icon}</span>
              <span className="um-sh-title">{s.title}</span>
              <span className="um-sh-arrow">{open === s.id ? "▲" : "▼"}</span>
            </button>
            {open === s.id && (
              <div className="um-section-body">
                <RenderContent items={s.content} />
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="um-footer">
        {footerText}
      </div>
    </div>
  );
}
