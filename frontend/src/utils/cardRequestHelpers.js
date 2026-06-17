export const AVATAR_COLORS = ["#2f4aad", "#059669", "#7c3aed", "#db2777", "#d97706", "#0891b2"];

export function companyAvatarColor(id) {
  return AVATAR_COLORS[(id || 0) % AVATAR_COLORS.length];
}
export function companyInitials(name) {
  const words = (name || "").trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "–";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}
export function requestNo(b) {
  const year = new Date(b.created_at).getFullYear();
  return `CR-${year}-${String(b.batch_id).padStart(5, "0")}`;
}
export function fmtDate(d) {
  return d ? new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "–";
}
export function fmtDateTime(d) {
  return d
    ? new Date(d).toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }).replace(",", "")
    : null;
}

export const STATUS_META = {
  pending:  { bg: "#fef3c7", color: "#92400e" },
  approved: { bg: "#dcfce7", color: "#065f46" },
  issued:   { bg: "#dbeafe", color: "#1d4ed8" },
  printed:  { bg: "#cffafe", color: "#0e7490" },
  rejected: { bg: "#fee2e2", color: "#991b1b" },
};

export function displayStatus(b) {
  if (b.status === "approved") {
    if (b.all_issued && b.all_printed) return "printed";
    if (b.all_issued)                  return "issued";
  }
  return b.status;
}
