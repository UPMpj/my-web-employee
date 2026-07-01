import { useEffect, useState } from "react";
import { api } from "../../api";
import { useLanguage } from "../../context/LanguageContext";
import { useLogoUpload } from "../../hooks/useLogoUpload";
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
        about_contact:      r.data.about_contact      || DEFAULTS.about_contact,
      });
    }).catch(() => {});
  }, []);

  return (
    <div className="ab-page">

      {/* ── Hero ── */}
      <div className="ab-hero">
        <div className="ab-hero-glow" />
        <div className="ab-hero-logo">
          <img src={logoSrc || "/IMG_2041.png"} alt="logo" />
        </div>
        <div className="ab-hero-text">
          <p className="ab-hero-label">Customer &amp; Company Management System</p>
          <h1 className="ab-hero-name">{sysName}</h1>
          <p className="ab-hero-desc">
            ລະບົບຈັດການພະນັກງານ ແລະ ບໍລິສັດ — ຈັດການຂໍ້ມູນ, ເອກະສານ ແລະ ສິດທິການເຂົ້າເຖິງຢ່າງປອດໄພ
          </p>
          <div className="ab-hero-badge">
            <span className="ab-hero-badge-dot" />
            Production · v1.0.0
          </div>
        </div>
      </div>

      {/* ── Info Cards ── */}
      <div className="ab-grid">

        {/* Company */}
        <div className="ab-card ab-card--purple">
          <div className="ab-icard-icon purple">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="22" height="22">
              <rect x="2" y="7" width="20" height="14" rx="2"/>
              <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>
            </svg>
          </div>
          <p className="ab-icard-label">{t("about_company_title") || "ບໍລິສັດ"}</p>
          <p className="ab-icard-val">{info.about_company_name}</p>
        </div>

        {/* Email */}
        <div className="ab-card ab-card--blue">
          <div className="ab-icard-icon blue">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="22" height="22">
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
              <polyline points="22,6 12,13 2,6"/>
            </svg>
          </div>
          <p className="ab-icard-label">{t("about_email") || "ອີເມວ"}</p>
          <a className="ab-icard-val ab-icard-link" href={`mailto:${info.about_email}`}>
            {info.about_email}
          </a>
        </div>

        {/* Contact */}
        <div className="ab-card ab-card--green">
          <div className="ab-icard-icon green">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="22" height="22">
              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.42 2 2 0 0 1 3.6 1.24h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.96a16 16 0 0 0 6.29 6.29l.54-.54a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 21.73 17z"/>
            </svg>
          </div>
          <p className="ab-icard-label">{t("about_contact") || "ຕິດຕໍ່"}</p>
          <p className="ab-icard-val">{info.about_contact}</p>
        </div>

      </div>
    </div>
  );
}
