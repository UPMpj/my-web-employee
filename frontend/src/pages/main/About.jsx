import { useEffect, useState } from "react";
import { api } from "../../api";
import { useLanguage } from "../../context/LanguageContext";
import { useLogoUpload } from "../../hooks/useLogoUpload";
import "./settings.css";
import "./about.css";

const DEFAULTS = {
  about_company_name: "UPM",
  about_email: "united.upm.procurement@gmail.com",
  about_contact: "Mesay 78915225 · Panoy 57199366",
};

export default function About() {
  const { t } = useLanguage();
  const { logoSrc } = useLogoUpload();
  const [sysName] = useState(localStorage.getItem("sys_name") || "CCMS");
  const [info, setInfo] = useState(DEFAULTS);

  useEffect(() => {
    api.get("/settings/features").then(r => {
      setInfo({
        about_company_name: r.data.about_company_name || DEFAULTS.about_company_name,
        about_email:        r.data.about_email        || DEFAULTS.about_email,
        about_contact:      r.data.about_contact       || DEFAULTS.about_contact,
      });
    }).catch(() => {});
  }, []);

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
            <span className="ab-info-label">{info.about_company_name}</span>
          </div>
          <div className="ab-info-row">
            <span className="ab-info-key">{t("about_email")}</span>
            <a className="ab-info-value" href={`mailto:${info.about_email}`}>
              {info.about_email}
            </a>
          </div>
          <div className="ab-info-row">
            <span className="ab-info-key">{t("about_contact")}</span>
            <span className="ab-info-value">{info.about_contact}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
