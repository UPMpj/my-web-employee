import { pool } from "../db";

const MANAGER_RE = /\b(manager|director|head|chief|president|ceo|supervisor|lead|vp|vice|executive|officer)\b/i;

export async function issueCardForEmployee(employeeId: number, issuedBy: number) {
  const existing = await pool.query(
    `SELECT card_id FROM employee_card WHERE employee_id=$1`, [employeeId]
  );
  if (existing.rows.length > 0) return existing.rows[0];

  const emp = await pool.query(
    `SELECT e.employee_code, e.position, e.company_id,
            COALESCE(c.card_color, '#1a3a6b')         AS staff_color,
            COALESCE(c.manager_card_color, '#7f1d1d') AS manager_color
     FROM employees e
     LEFT JOIN companies c ON c.company_id = e.company_id
     WHERE e.employee_id=$1`, [employeeId]
  );
  if (emp.rows.length === 0) throw new Error("Employee not found");

  const { company_id, position, staff_color, manager_color } = emp.rows[0];
  const card_color = MANAGER_RE.test(position || "") ? manager_color : staff_color;
  const year   = new Date().getFullYear();
  const seq    = Date.now().toString().slice(-5);
  const cardNo = `C-${year}-${seq}`;

  const result = await pool.query(
    `INSERT INTO employee_card (employee_id, company_id, card_no, status, issued_at, issued_by, card_color)
     VALUES ($1, $2, $3, 'Active', NOW(), $4, $5)
     RETURNING *`,
    [employeeId, company_id, cardNo, issuedBy, card_color]
  );
  return result.rows[0];
}
