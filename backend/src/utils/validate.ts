/** Returns true if val is a safe positive integer (rejects floats, negatives, NaN). */
export function isPositiveInt(val: unknown): boolean {
  const n = Number(val);
  return Number.isInteger(n) && n > 0;
}

/** Returns true if val is a valid YYYY-MM-DD date string. */
export function isValidDate(val: unknown): boolean {
  if (typeof val !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(val)) return false;
  const d = new Date(val);
  return !isNaN(d.getTime());
}

/** Returns true if val is a valid CSS hex color (#rgb or #rrggbb). */
export function isHexColor(val: unknown): boolean {
  return typeof val === "string" && /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(val);
}

/** Returns true if val is one of the allowed string values. */
export function isEnum(val: unknown, allowed: string[]): boolean {
  return typeof val === "string" && allowed.includes(val);
}

/** Returns trimmed string or null if empty/missing. */
export function trimOrNull(val: unknown): string | null {
  if (typeof val !== "string") return null;
  const t = val.trim();
  return t.length > 0 ? t : null;
}
