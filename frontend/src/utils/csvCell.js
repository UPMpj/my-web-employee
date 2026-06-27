/* Excel/Sheets treats a CSV cell starting with =, +, -, or @ as a formula —
   a stray character in a name/note field could otherwise run arbitrary
   formulas (CSV/"formula" injection) for whoever opens the export. Prefixing
   with a single quote is the standard mitigation (OWASP CSV Injection):
   it forces the cell to be read as text instead of a formula. */
const FORMULA_PREFIX = /^[=+\-@]/;

export function csvCell(value) {
  let str = String(value ?? "");
  if (FORMULA_PREFIX.test(str)) str = "'" + str;
  return `"${str.replace(/"/g, '""')}"`;
}
