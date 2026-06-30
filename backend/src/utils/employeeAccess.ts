import { pool } from "../db";

/**
 * Returns true if the user is allowed to read/write data for this employee.
 * Super Admin can always access any employee.
 * All other roles must have the employee's company in their user_companies assignment.
 */
export async function canAccessEmployee(
  userRole: string,
  userId: number,
  employeeId: string | number
): Promise<boolean> {
  if (userRole === "Super Admin") return true;
  const r = await pool.query(
    `SELECT 1
     FROM employees e
     JOIN user_companies uc ON uc.company_id = e.company_id
     WHERE e.employee_id = $1 AND uc.user_id = $2 AND e.deleted_at IS NULL`,
    [employeeId, userId]
  );
  return r.rows.length > 0;
}
