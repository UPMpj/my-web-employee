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

const TECH_STACK = [
  { label: "React",       color: "#61dafb" },
  { label: "Node.js",     color: "#68a063" },
  { label: "PostgreSQL",  color: "#336791" },
  { label: "TypeScript",  color: "#3178c6" },
  { label: "Cloudinary",  color: "#3448c5" },
  { label: "Render",      color: "#46e3b7" },
];

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

      {/* ── Grid ── */}
      <div className="ab-grid">

        {/* Developer / Company card */}
        <div className="ab-card">
          <div className="ab-card-header">
            <div className="ab-card-icon purple">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="20" height="20">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                <circle cx="9" cy="7" r="4"/>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
              </svg>
            </div>
            <div>
              <p className="ab-card-title">{t("about_company_title")}</p>
              <p className="ab-card-sub">Developer &amp; contact info</p>
            </div>
          </div>

          <div className="ab-company-chip">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
              <rect x="2" y="7" width="20" height="14" rx="2"/>
              <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>
            </svg>
            {info.about_company_name}
          </div>

          <div className="ab-divider" />

          <div className="ab-info-list">
            <div className="ab-info-item">
              <div className="ab-info-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="16" height="16">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                  <polyline points="22,6 12,13 2,6"/>
                </svg>
              </div>
              <div className="ab-info-content">
                <p className="ab-info-key">{t("about_email")}</p>
                <p className="ab-info-val">
                  <a href={`mailto:${info.about_email}`}>{info.about_email}</a>
                </p>
              </div>
            </div>

            <div className="ab-info-item">
              <div className="ab-info-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="16" height="16">
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.42 2 2 0 0 1 3.6 1.24h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.96a16 16 0 0 0 6.29 6.29l.54-.54a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 21.73 17z"/>
                </svg>
              </div>
              <div className="ab-info-content">
                <p className="ab-info-key">{t("about_contact")}</p>
                <p className="ab-info-val">{info.about_contact}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Tech stack card */}
        <div className="ab-card">
          <div className="ab-card-header">
            <div className="ab-card-icon blue">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="20" height="20">
                <polyline points="16 18 22 12 16 6"/>
                <polyline points="8 6 2 12 8 18"/>
              </svg>
            </div>
            <div>
              <p className="ab-card-title">Tech Stack</p>
              <p className="ab-card-sub">ເທັກໂນໂລຊີທີ່ໃຊ້ Build ລະບົບນີ້</p>
            </div>
          </div>

          <div className="ab-divider" />

          <div className="ab-tech-list">
            {TECH_STACK.map(({ label, color }) => (
              <span key={label} className="ab-tech-tag">
                <span className="ab-tech-tag-dot" style={{ background: color }} />
                {label}
              </span>
            ))}
          </div>

          <div className="ab-divider" />

          <div className="ab-info-list">
            <div className="ab-info-item">
              <div className="ab-info-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="16" height="16">
                  <circle cx="12" cy="12" r="10"/>
                  <line x1="2" y1="12" x2="22" y2="12"/>
                  <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
                </svg>
              </div>
              <div className="ab-info-content">
                <p className="ab-info-key">Deployed on</p>
                <p className="ab-info-val">Render · Supabase PostgreSQL · Cloudinary</p>
              </div>
            </div>

            <div className="ab-info-item">
              <div className="ab-info-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="16" height="16">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                </svg>
              </div>
              <div className="ab-info-content">
                <p className="ab-info-key">Security</p>
                <p className="ab-info-val">JWT · bcrypt · 2FA TOTP · RBAC</p>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
