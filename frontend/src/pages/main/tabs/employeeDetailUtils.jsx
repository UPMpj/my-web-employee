import { useLanguage } from "../../../context/LanguageContext";

export const DOC_TYPES    = ["Passport","Work Permit","Visa","ID Card","Contract","Certificate","Other"];
export const PERMIT_TYPES = ["Work Permit","Business Visa","Tourist Visa","Non-Immigrant Visa","Residence Permit","Other"];
export const PERMIT_STATUS = ["Valid","Expired","Pending","Revoked"];

export const STATUS_STYLE = {
  "Active":   { bg: "#d1fae5", color: "#065f46" },
  "On Leave": { bg: "#fef3c7", color: "#92400e" },
  "Inactive": { bg: "#f3f4f6", color: "#374151" },
  "Resigned": { bg: "#fee2e2", color: "#991b1b" },
};

export function fmt(d) {
  if (!d) return "–";
  return new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

export function fmtDateTime(d) {
  if (!d) return "–";
  return new Date(d).toLocaleString("en-GB", {
    day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

export function daysLeft(dateStr) {
  if (!dateStr) return null;
  return Math.ceil((new Date(dateStr) - new Date()) / 86400000);
}

export function isImage(path) {
  if (!path) return false;
  return /\.(jpg|jpeg|png|gif|webp)$/i.test(path);
}

export function ExpiryBadge({ date }) {
  const { t } = useLanguage();
  if (!date) return <span className="ed-val">–</span>;
  const d = daysLeft(date);
  let cls = "ed-exp-ok", label = fmt(date);
  if (d < 0)        { cls = "ed-exp-expired"; label = `${fmt(date)} ${t("exp_expired")}`; }
  else if (d <= 30) { cls = "ed-exp-warn30";  label = `${fmt(date)} ${t("exp_days_left").replace("{d}", d)}`; }
  else if (d <= 90) { cls = "ed-exp-warn90";  label = `${fmt(date)} ${t("exp_days_left").replace("{d}", d)}`; }
  return <span className={`ed-exp-badge ${cls}`}>{label}</span>;
}
