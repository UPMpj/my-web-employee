import { pool } from "../db";

/* derive a short prefix from company name — same logic as GET /employees/next-code */
export function companyPrefix(name: string): string {
  const words = (name || "").trim().split(/\s+/).filter(Boolean);
  if (!words.length) return "EMP";
  if (words.length === 1 && words[0].length <= 6) return words[0].toUpperCase();
  return words.map((w: string) => w[0].toUpperCase()).join("").slice(0, 4) || "EMP";
}

export async function syncImportedRoom(roomId: number) {
  const cap = await pool.query(`SELECT capacity FROM rooms WHERE room_id=$1`, [roomId]);
  if (cap.rows.length === 0) return;
  const occ = await pool.query(
    `SELECT COUNT(*) FROM employees WHERE room_id=$1 AND deleted_at IS NULL AND status!='Resigned'`,
    [roomId]
  );
  const count = parseInt(occ.rows[0].count);
  const capacity = cap.rows[0].capacity;
  const status = count === 0 ? "Available" : count >= capacity ? "Occupied" : "Partial";
  await pool.query(`UPDATE rooms SET status=$1, updated_at=NOW() WHERE room_id=$2`, [status, roomId]);
}

export async function commitRows(
  client: any,
  rows: any[],
  company_id: number,
  userId: number | null
): Promise<{ inserted: number; skipped: number; errors: string[]; roomIds: number[] }> {
  let inserted = 0;
  const auditEntries: { employee_id: number; after_data: object }[] = [];
  let skipped  = 0;
  const errors: string[] = [];
  const assignedRoomIds = new Set<number>();

  /* fetch company name once for prefix generation */
  const compRes = await client.query(
    `SELECT companies_name FROM companies WHERE company_id=$1`, [company_id]
  );
  const prefix = companyPrefix(compRes.rows[0]?.companies_name || "");

  for (const r of rows) {
    if (!r.firstname) {
      skipped++;
      errors.push(`Row ${r.row}: ບໍ່ມີ First Name`);
      continue;
    }
    try {
      await client.query("SAVEPOINT row_sp");

      /* ── Check for existing employee (prevent duplicates) ── */
      let employee_id: number | null = null;

      /* 1. Check by employee_code first (most reliable) */
      if (r.employee_code) {
        const existRes = await client.query(
          `SELECT employee_id, photo FROM employees
           WHERE company_id=$1 AND employee_code=$2 AND deleted_at IS NULL LIMIT 1`,
          [company_id, r.employee_code]
        );
        if (existRes.rows.length > 0) {
          const existId = existRes.rows[0].employee_id;
          if (r.photo && !existRes.rows[0].photo) {
            await client.query(
              `UPDATE employees SET photo=$1 WHERE employee_id=$2`,
              [r.photo, existId]
            );
          }
          await client.query("RELEASE SAVEPOINT row_sp");
          skipped++;
          continue;
        }
      }

      /* 2. Always check by firstname + lastname within the same company */
      {
        const existRes = await client.query(
          `SELECT employee_id FROM employees
           WHERE company_id=$1
             AND LOWER(TRIM(firstname))=LOWER(TRIM($2))
             AND LOWER(TRIM(COALESCE(lastname,'')))=LOWER(TRIM($3))
             AND deleted_at IS NULL LIMIT 1`,
          [company_id, r.firstname, r.lastname || ""]
        );
        if (existRes.rows.length > 0) {
          await client.query("RELEASE SAVEPOINT row_sp");
          skipped++;
          errors.push(`Row ${r.row}: ພະນັກງານ "${r.firstname} ${r.lastname || ""}".ມີໃນລະບົບແລ້ວ — ຂ້າມ`);
          continue;
        }
      }

      /* ── Auto-generate employee_code if blank ── */
      let employee_code: string | null = r.employee_code || null;
      if (!employee_code) {
        /* ຊອກ codes ທີ່ຂຶ້ນຕົ້ນດ້ວຍ prefix ຂອງ company ນີ້
           (ລວມ rows ທີ່ insert ໄປແລ້ວໃນ transaction ດຽວກັນ) */
        const codeRes = await client.query(
          `SELECT employee_code FROM employees
           WHERE company_id=$1 AND employee_code ILIKE $2 AND deleted_at IS NULL`,
          [company_id, `${prefix}%`]
        );
        const nums: number[] = codeRes.rows
          .map((row: any) => {
            const stripped = (row.employee_code as string)
              .replace(new RegExp(`^${prefix}[-_]?`, "i"), "");
            const n = parseInt(stripped, 10);
            return isNaN(n) ? 0 : n;
          })
          .filter((n: number) => n > 0);
        const nextNum = nums.length > 0 ? Math.max(...nums) + 1 : 1;
        employee_code = `${prefix}-${String(nextNum).padStart(3, "0")}`;
      }

      let room_id: number | null = null;
      if (r.dorm_building && r.dorm_floor && r.dorm_room) {
        const roomRes = await client.query(
          `SELECT r.room_id FROM rooms r
           JOIN buildings b ON b.building_id = r.building_id
           WHERE b.building_name ILIKE $1 AND r.floor_number=$2::int AND r.room_number=$3 LIMIT 1`,
          [r.dorm_building, r.dorm_floor, r.dorm_room]
        );
        if (roomRes.rows.length > 0) room_id = roomRes.rows[0].room_id;
      }
      if (room_id) assignedRoomIds.add(room_id);

      const empRes = await client.query(
        `INSERT INTO employees
           (company_id, employee_code, firstname, lastname, gender, date_of_birth,
            nationality, email, contact_no, position, employee_type,
            hired_at, status, resigned_at,
            province, district, village,
            dormitory, room_no, office_building, room_id, photo)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22)
         RETURNING employee_id`,
        [
          company_id,       employee_code,             r.firstname,
          r.lastname        || null,            r.gender          || null,
          r.date_of_birth   || null,            r.nationality     || "Laos",
          r.email           || null,            r.contact_no      || null,
          r.position        || null,            r.employee_type   || "Full-time",
          r.hired_at        || null,            r.status          || "Active",
          r.resigned_at     || null,            r.province        || null,
          r.district        || null,            r.village         || null,
          r.dorm_building   || null,            r.dorm_room       || null,
          r.office_building || null,            room_id,
          r.photo           || null,
        ]
      );

      employee_id = empRes.rows[0].employee_id as number;

      if (r.province || r.district || r.village || r.dorm_building || r.dorm_room || r.office_building) {
        await client.query(
          `INSERT INTO employee_profile
             (employee_id, village, district, province, dormitory_no, room_no,
              office_building, office_floor, office_room_no)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
           ON CONFLICT (employee_id) DO UPDATE SET
             village=EXCLUDED.village, district=EXCLUDED.district,
             province=EXCLUDED.province, dormitory_no=EXCLUDED.dormitory_no,
             room_no=EXCLUDED.room_no, office_building=EXCLUDED.office_building,
             office_floor=EXCLUDED.office_floor, office_room_no=EXCLUDED.office_room_no,
             updated_at=CURRENT_TIMESTAMP`,
          [
            employee_id,
            r.village || null, r.district || null, r.province || null,
            r.dorm_building || null, r.dorm_room || null,
            r.office_building || null, r.office_floor || null, r.office_room || null,
          ]
        );
      }

      // Collect for batch audit log insert after the loop
      auditEntries.push({
        employee_id: employee_id!,
        after_data: {
          employee_code, firstname: r.firstname, lastname: r.lastname,
          position: r.position, employee_type: r.employee_type, hired_at: r.hired_at,
        },
      });

      if (r.doc_type) {
        await client.query(
          `INSERT INTO employee_documents
             (employee_id, doc_type, doc_name, file_path, expires_at, notes, uploaded_by)
           VALUES ($1,$2,$3,$4,$5,$6,$7)`,
          [employee_id, r.doc_type, r.doc_number || r.doc_type,
           r.doc_image || null, r.doc_expiry || null, r.doc_description || null, userId]
        );
      }

      if (r.permit_type) {
        await client.query(
          `INSERT INTO employee_permits
             (employee_id, permit_type, permit_number, issued_date, expires_at,
              status, file_path, notes, created_by)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
          [employee_id, r.permit_type, r.permit_number || null,
           r.permit_issued_date || null, r.permit_expiry || null,
           r.permit_status || "Valid", r.permit_image || null,
           r.permit_note || null, userId]
        );
      }

      await client.query("RELEASE SAVEPOINT row_sp");
      inserted++;
    } catch (e: any) {
      await client.query("ROLLBACK TO SAVEPOINT row_sp");
      skipped++;
      errors.push(`Row ${r.row}: ${e.message}`);
    }
  }

  // Batch insert all audit log entries in one query
  if (auditEntries.length > 0 && userId) {
    const empIds   = auditEntries.map(e => e.employee_id);
    const jsonData = auditEntries.map(e => JSON.stringify(e.after_data));
    await client.query(
      `INSERT INTO audit_log (company_id, user_id, action, entity_type, entity_id, after_data)
       SELECT $1, $2, 'IMPORT', 'employee', unnest($3::int[]), unnest($4::jsonb[])`,
      [company_id, userId, empIds, jsonData]
    ).catch(() => {});
  }

  return { inserted, skipped, errors, roomIds: Array.from(assignedRoomIds) };
}
