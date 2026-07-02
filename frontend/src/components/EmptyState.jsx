import "./EmptyState.css";

const ILLUSTRATIONS = {
  search: (
    <svg width="80" height="80" viewBox="0 0 80 80" fill="none">
      <circle cx="34" cy="34" r="22" stroke="#d1d5db" strokeWidth="3" fill="#f9fafb"/>
      <circle cx="34" cy="34" r="14" stroke="#e5e7eb" strokeWidth="2" fill="#fff"/>
      <path d="M22 34h4M34 22v4M46 34h-4M34 46v-4" stroke="#d1d5db" strokeWidth="2" strokeLinecap="round"/>
      <line x1="50" y1="50" x2="62" y2="62" stroke="#9ca3af" strokeWidth="3.5" strokeLinecap="round"/>
      <circle cx="34" cy="34" r="5" fill="#e5e7eb"/>
    </svg>
  ),
  data: (
    <svg width="80" height="80" viewBox="0 0 80 80" fill="none">
      <rect x="10" y="18" width="60" height="48" rx="8" fill="#f3f4f6" stroke="#e5e7eb" strokeWidth="2"/>
      <rect x="10" y="18" width="60" height="14" rx="8" fill="#e5e7eb"/>
      <rect x="10" y="25" width="60" height="7" fill="#e5e7eb"/>
      <rect x="20" y="42" width="20" height="4" rx="2" fill="#d1d5db"/>
      <rect x="20" y="52" width="30" height="4" rx="2" fill="#e5e7eb"/>
      <rect x="44" y="42" width="16" height="4" rx="2" fill="#e5e7eb"/>
      <circle cx="57" cy="58" r="14" fill="#fff" stroke="#e5e7eb" strokeWidth="2"/>
      <path d="M57 52v6l3 3" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  ),
  document: (
    <svg width="80" height="80" viewBox="0 0 80 80" fill="none">
      <rect x="18" y="10" width="38" height="50" rx="6" fill="#f9fafb" stroke="#e5e7eb" strokeWidth="2"/>
      <rect x="24" y="24" width="26" height="3" rx="1.5" fill="#e5e7eb"/>
      <rect x="24" y="32" width="20" height="3" rx="1.5" fill="#e5e7eb"/>
      <rect x="24" y="40" width="16" height="3" rx="1.5" fill="#e5e7eb"/>
      <path d="M42 10l14 14H42V10z" fill="#e5e7eb" stroke="#e5e7eb" strokeWidth="1"/>
      <circle cx="56" cy="58" r="14" fill="#fff" stroke="#e5e7eb" strokeWidth="2"/>
      <path d="M51 58h10M56 53v10" stroke="#d1d5db" strokeWidth="2.5" strokeLinecap="round"/>
    </svg>
  ),
  building: (
    <svg width="80" height="80" viewBox="0 0 80 80" fill="none">
      <rect x="15" y="24" width="30" height="42" rx="3" fill="#f3f4f6" stroke="#e5e7eb" strokeWidth="2"/>
      <rect x="35" y="36" width="22" height="30" rx="3" fill="#f9fafb" stroke="#e5e7eb" strokeWidth="2"/>
      <rect x="21" y="32" width="6" height="6" rx="1" fill="#d1d5db"/>
      <rect x="31" y="32" width="6" height="6" rx="1" fill="#d1d5db"/>
      <rect x="21" y="44" width="6" height="6" rx="1" fill="#d1d5db"/>
      <rect x="31" y="44" width="6" height="6" rx="1" fill="#d1d5db"/>
      <rect x="41" y="44" width="5" height="5" rx="1" fill="#e5e7eb"/>
      <rect x="49" y="44" width="5" height="5" rx="1" fill="#e5e7eb"/>
      <rect x="26" y="54" width="8" height="12" rx="1" fill="#d1d5db"/>
    </svg>
  ),
};

export default function EmptyState({
  title,
  message,
  type = "data",
  action,
  compact = false,
}) {
  return (
    <div className={`es-wrap${compact ? " es-compact" : ""}`}>
      <div className="es-illo">{ILLUSTRATIONS[type] || ILLUSTRATIONS.data}</div>
      <p className="es-title">{title || "ບໍ່ມີຂໍ້ມູນ"}</p>
      {message && <p className="es-msg">{message}</p>}
      {action && <div className="es-action">{action}</div>}
    </div>
  );
}
