/* derive a short prefix from company name — only used when a company has no
   existing employee_code at all yet (nothing established to continue) */
export function companyPrefix(name: string): string {
  const words = (name || "").trim().split(/\s+/).filter(Boolean);
  if (!words.length) return "EMP";
  if (words.length === 1 && words[0].length <= 6) return words[0].toUpperCase();
  return words.map((w: string) => w[0].toUpperCase()).join("").slice(0, 4) || "EMP";
}

/* next sequential employee_code for a company, continuing whichever
   prefix+number style that company's own employees already use most —
   e.g. if it already has UDM001..UDM034, the next one is UDM035, even
   though the name-derived prefix for "UDM Company" would be "UC" */
export async function nextEmployeeCode(client: any, companyId: number | string): Promise<string> {
  const codeRes = await client.query(
    `SELECT employee_code FROM employees
     WHERE company_id=$1 AND deleted_at IS NULL AND employee_code IS NOT NULL`,
    [companyId]
  );

  /* group existing codes by their leading (non-numeric-suffix) prefix */
  const groups = new Map<string, number[]>();
  for (const { employee_code } of codeRes.rows as { employee_code: string }[]) {
    const m = employee_code.match(/^(.*?)(\d+)$/);
    if (!m) continue;
    const [, prefix, digits] = m;
    if (!groups.has(prefix)) groups.set(prefix, []);
    groups.get(prefix)!.push(parseInt(digits, 10));
  }

  /* continue whichever prefix group is used by the most existing employees */
  let bestPrefix = "";
  let bestNums: number[] = [];
  for (const [prefix, nums] of groups) {
    if (nums.length > bestNums.length) { bestPrefix = prefix; bestNums = nums; }
  }

  if (bestNums.length > 0) {
    const nextNum = Math.max(...bestNums) + 1;
    return `${bestPrefix}${String(nextNum).padStart(3, "0")}`;
  }

  /* no existing codes for this company yet — derive a fresh prefix from its name */
  const compRes = await client.query(
    `SELECT companies_name FROM companies WHERE company_id=$1`, [companyId]
  );
  const prefix = companyPrefix(compRes.rows[0]?.companies_name || "");
  return `${prefix}001`;
}
