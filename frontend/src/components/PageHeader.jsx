import { useLocation, Link } from "react-router-dom";
import { useLanguage } from "../context/LanguageContext";
import "./PageHeader.css";

export const ROUTE_LABELS = {
  companies:          { en: "Companies",          lo: "ບໍລິສັດ" },
  employees:          { en: "Employees",          lo: "ພະນັກງານ" },
  add:                { en: "Add Employee",       lo: "ເພີ່ມພະນັກງານ" },
  edit:               { en: "Edit",               lo: "ແກ້ໄຂ" },
  card:               { en: "ID Card",            lo: "ບັດ" },
  "tap-in-out":       { en: "Tap In / Out",       lo: "ສະແກນເຂົ້າ-ອອກ" },
  idcard:             { en: "ID Cards",           lo: "ບັດປະຈຳຕົວ" },
  request:            { en: "Request Card",       lo: "ຂໍອອກບັດ" },
  preview:            { en: "Preview",            lo: "ສະແດງຕົວຢ່າງ" },
  success:            { en: "Success",            lo: "ສຳເລັດ" },
  requests:           { en: "Card Requests",      lo: "ຄຳຂໍບັດ" },
  building:           { en: "Buildings",          lo: "ອາຄານ" },
  reports:            { en: "Reports",            lo: "ລາຍງານ" },
  import:             { en: "Import Employees",   lo: "ນຳເຂົ້າພະນັກງານ" },
  "import-approval":  { en: "Import Approval",    lo: "ອະນຸມັດການນຳເຂົ້າ" },
  "bulk-photo":       { en: "Bulk Photo Upload",  lo: "ອັບໂຫຼດຮູບ" },
  settings:           { en: "Settings",           lo: "ການຕັ້ງຄ່າ" },
  users:              { en: "User Management",    lo: "ຈັດການຜູ້ໃຊ້" },
  audit:              { en: "Audit Log",          lo: "ບັນທຶກກິດຈະກຳ" },
  "user-manual":      { en: "User Manual",        lo: "ຄູ່ມືການໃຊ້" },
  about:              { en: "About",              lo: "ກ່ຽວກັບ" },
};

const SKIP_PATHS = new Set(["/", "/dashboard"]);

const IconHome = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 9.5L12 3l9 6.5V20a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9.5z"/>
    <path d="M9 21V12h6v9"/>
  </svg>
);

const IconChevron = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <polyline points="9 18 15 12 9 6"/>
  </svg>
);

export default function PageHeader() {
  const { pathname } = useLocation();
  const { lang } = useLanguage();

  if (SKIP_PATHS.has(pathname)) return null;

  const segments = pathname.split("/").filter(Boolean);

  const crumbs = [{ label: lang === "lo" ? "ໜ້າຫຼັກ" : "Home", path: "/", isHome: true }];
  let buildPath = "";

  for (const seg of segments) {
    buildPath += "/" + seg;
    const isId = /^\d+$/.test(seg);
    const info = ROUTE_LABELS[seg];
    const label = isId
      ? `#${seg}`
      : info
        ? (lang === "lo" ? info.lo : info.en)
        : seg;
    crumbs.push({ label, path: buildPath });
  }

  const pageTitle = crumbs[crumbs.length - 1]?.label ?? "";

  return (
    <div className="ph-wrap">
      <div className="ph-deco-circle ph-deco-1" />
      <div className="ph-deco-circle ph-deco-2" />

      <nav className="ph-breadcrumb" aria-label="breadcrumb">
        {crumbs.map((c, i) => {
          const isLast = i === crumbs.length - 1;
          return (
            <span key={c.path} className="ph-crumb-item">
              {i > 0 && (
                <span className="ph-crumb-sep">
                  <IconChevron />
                </span>
              )}
              {isLast ? (
                <span className="ph-crumb-current">
                  {c.isHome ? <IconHome /> : null}
                  {c.label}
                </span>
              ) : (
                <Link to={c.path} className="ph-crumb-link">
                  {c.isHome ? <IconHome /> : null}
                  {c.isHome ? null : c.label}
                </Link>
              )}
            </span>
          );
        })}
      </nav>

      <h1 className="ph-title">{pageTitle}</h1>
    </div>
  );
}
