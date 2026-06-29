import { useState } from "react";
import { useLanguage } from "../../context/LanguageContext";
import { useLogoUpload } from "../../hooks/useLogoUpload";
import "./settings.css";
import "./about.css";

const CONTACTS = [
  { name: "Mesay", phone: "78915225" },
  { name: "Panoy",  phone: "57199366" },
];

export default function About() {
  const { t } = useLanguage();
  const { logoSrc } = useLogoUpload();
  const [sysName] = useState(localStorage.getItem("sys_name") || "CCMS");

  return (
    <div className="st-page">
      <div className="st-header">
        <h1 className="st-title">{t("nav_about")}</h1>
        <p className="st-sub">{t("about_sub")}</p>
      </div>

      <div className="ab-cards">
        <div className="st-card">
          <h2 className="st-card-title">{t("about_system_title")}</h2>
          <div className="ab-system-row">
            <div className="ab-logo">
              <img src={logoSrc || "/IMG_2041.png"} alt="logo" />
            </div>
            <div className="ab-system-name">{sysName}</div>
          </div>
        </div>

        <div className="st-card">
          <h2 className="st-card-title">{t("about_company_title")}</h2>
          <div className="ab-info-row">
            <span className="ab-info-label">UPM</span>
          </div>
          <div className="ab-info-row">
            <span className="ab-info-key">{t("about_email")}</span>
            <a className="ab-info-value" href="mailto:united.upm.procurement@gmail.com">
              united.upm.procurement@gmail.com
            </a>
          </div>
          <div className="ab-info-row">
            <span className="ab-info-key">{t("about_contact")}</span>
            <span className="ab-info-value">
              {CONTACTS.map(c => `${c.name} ${c.phone}`).join("  ·  ")}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
