import { Router } from "express";
import multer from "multer";
import * as XLSX from "xlsx";
import { pool } from "../db";
import { auth } from "../middleware/auth";

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } });

/* ── All column aliases → internal key (lowercase for matching) ── */
const COL_ALIASES: Record<string, string> = {
  /* Employee Code */
  "employee code": "employee_code",  "employee_code": "employee_code",  "emp code": "employee_code",
  "code": "employee_code",           "empcode": "employee_code",

  /* First Name */
  "first name": "firstname",  "firstname": "firstname",  "first_name": "firstname",
  "ຊື່": "firstname",

  /* Last Name */
  "last name": "lastname",  "lastname": "lastname",  "last_name": "lastname",
  "ນາມສະກຸນ": "lastname",  "surname": "lastname",

  /* Gender */
  "gender": "gender",  "ເພດ": "gender",  "sex": "gender",

  /* Date of Birth */
  "date of birth": "date_of_birth",  "date_of_birth": "date_of_birth",
  "dob": "date_of_birth",            "birth date": "date_of_birth",
  "birthday": "date_of_birth",       "ວັນເດືອນປີເກີດ": "date_of_birth",

  /* Nationality */
  "nationality": "nationality",  "ສັນຊາດ": "nationality",

  /* Position */
  "position": "position",  "ຕຳແໜ່ງ": "position",  "job title": "position",

  /* Employee Type */
  "employee type": "employee_type",  "employee_type": "employee_type",
  "emp type": "employee_type",       "type": "employee_type",
  "ປະເພດ": "employee_type",

  /* Email */
  "email": "email",  "e-mail": "email",  "ອີເມລ": "email",

  /* Phone */
  "phone": "contact_no",      "phone number": "contact_no",  "contact_no": "contact_no",
  "contact no": "contact_no", "mobile": "contact_no",        "tel": "contact_no",
  "ໂທລະສັບ": "contact_no",

  /* Hire Date */
  "hire date": "hired_at",  "hired_at": "hired_at",  "start date": "hired_at",
  "hired date": "hired_at", "ວັນທີ່ຈ້າງ": "hired_at", "hired at": "hired_at",

  /* Status */
  "status": "status",  "ສະຖານະ": "status",

  /* Resigned Date */
  "resigned date": "resigned_at",  "resigned_at": "resigned_at",
  "resign date": "resigned_at",    "ວັນທີ່ລາອອກ": "resigned_at",

  /* Province */
  "province": "province",  "ແຂວງ": "province",

  /* District */
  "district": "district",  "ເມືອງ": "district",

  /* Village */
  "village": "village",  "ບ້ານ": "village",

  /* Dormitory building/floor/room (lowercase in template) */
  "building": "dorm_building",  "dorm building": "dorm_building",
  "ຕືກ": "dorm_building",       "dormitory": "dorm_building",

  "floor": "dorm_floor",  "dorm floor": "dorm_floor",  "ຊັ້ນ": "dorm_floor",

  "room": "dorm_room",  "dorm room": "dorm_room",  "ຫ້ອງ": "dorm_room",  "room no": "dorm_room",

  /* Office building/floor/room (uppercase in template) — detect by context via position */
  "office building": "office_building",  "office_building": "office_building",

  /* Profile Photo */
  "profile photo": "photo",  "photo": "photo",  "profile_photo": "photo",
  "image": "photo",          "picture": "photo",

  /* Documents */
  "doc type": "doc_type",          "doc_type": "doc_type",    "document type": "doc_type",
  "doc number": "doc_number",      "doc_number": "doc_number","document number": "doc_number",
  "doc no": "doc_number",          "doc num": "doc_number",
  "doc expiry": "doc_expiry",      "doc_expiry": "doc_expiry","document expiry": "doc_expiry",
  "doc expiry date": "doc_expiry", "doc expires": "doc_expiry",
  "doc description": "doc_description",  "doc_description": "doc_description",
  "doc desc": "doc_description",
  "doc image": "doc_image",        "doc_image": "doc_image",  "document image": "doc_image",
  "doc file": "doc_image",

  /* Permits */
  "permit type": "permit_type",          "permit_type": "permit_type",
  "permit number": "permit_number",      "permit_number": "permit_number",  "permit no": "permit_number",
  "permit status": "permit_status",      "permit_status": "permit_status",
  "permit issue date": "permit_issued_date",  "permit_issue_date": "permit_issued_date",
  "permit issued date": "permit_issued_date", "permit issued": "permit_issued_date",
  "permit issue": "permit_issued_date",
  "permit expiry": "permit_expiry",      "permit_expiry": "permit_expiry",
  "permit expiry date": "permit_expiry", "permit expires": "permit_expiry",
  "permit note": "permit_note",          "permit_note": "permit_note",  "permit notes": "permit_note",
};

/* Strip BOM and normalize whitespace from a string */
function cleanKey(k: string): string {
  return k.replace(/^﻿/, "").replace(/\s+/g, " ").trim().toLowerCase();
}

function normalizeRow(r: Record<string, any>): Record<string, any> {
  const out: Record<string, any> = {};

  /* Build a lookup from cleaned key → original value */
  const cleaned: Record<string, any> = {};
  for (const [k, v] of Object.entries(r)) {
    cleaned[cleanKey(k)] = v;
    out[k] = v; // keep original keys too (snake_case fallback)
  }

  /* Map via aliases */
  for (const [alias, internalKey] of Object.entries(COL_ALIASES)) {
    if (alias in cleaned) out[internalKey] = cleaned[alias];
  }

  /* Special: handle duplicate "building/Building" and "floor/Floor" and "room/Room"
     Template has: lowercase = dormitory, uppercase = office
     Since both map to same alias after toLowerCase, we need positional logic.
     Re-scan original keys preserving case for Building/Floor/Room disambiguation. */
  let seenBuilding = false, seenFloor = false, seenRoom = false;
  for (const [k, v] of Object.entries(r)) {
    const clean = cleanKey(k);
    if (clean === "building") {
      if (!seenBuilding) { out.dorm_building = v; seenBuilding = true; }
      else               { out.office_building = v; }
    }
    if (clean === "floor") {
      if (!seenFloor) { out.dorm_floor = v; seenFloor = true; }
      else            { out.office_floor = v; }
    }
    if (clean === "room") {
      if (!seenRoom) { out.dorm_room = v; seenRoom = true; }
      else           { out.office_room = v; }
    }
  }

  return out;
}

function parseDate(val: any): string {
  if (!val) return "";
  if (val instanceof Date) return val.toISOString().slice(0, 10);
  const s = String(val).trim();
  if (!s) return "";
  const d = new Date(s);
  return isNaN(d.getTime()) ? s : d.toISOString().slice(0, 10);
}

function str(v: any): string { return String(v ?? "").trim(); }

/* ── GET /api/import/template ── */
router.get("/template", auth, (_req, res) => {
  const headers = [
    "Employee Code","First Name","Last Name","Gender","Date of Birth",
    "Nationality","Position","Employee Type","Email","Phone",
    "Hire Date","Status","Resigned Date","Province","District","Village",
    "building","floor","room",
    "Building","Floor","Room",
    "Profile Photo",
    "Doc Type","Doc Number","Doc Expiry","Doc Description","Doc Image",
    "Permit Type","Permit Number","Permit Status","Permit Issue Date","Permit Expiry","Permit Note",
  ];
  const examples = [
    [
      "EMP001","ສົມສີ","ສີທາ","Male","1995-04-15",
      "Laos","Engineer","Full-time","somsi@example.com","020 55 123456",
      "2022-01-01","Active","","ວຽງຈັນ","ຈັນທະບູລີ","ໂນນສະຫວ່າງ",
      "ຕືກທີ 2","2","201","ຕືກທີ 1","5","501",
      "",
      "Passport","LA1234567","2028-01-01","Passport page 1 scan","",
      "Work Permit","WP2024001","Valid","2024-01-01","2026-01-01","",
    ],
    [
      "EMP002","ນາງ ມາລີ","ພົມມະ","Female","1998-07-20",
      "Laos","Accountant","Full-time","mali@example.com","020 77 654321",
      "2023-03-01","Active","","ວຽງຈັນ","ສີໂຄດຕະບອງ","ບ້ານດົງ",
      "ຕືກທີ 3","3","305","","","",
      "",
      "Passport","LA9876543","2027-06-15","","",
      "","","","","","",
    ],
  ];

  const ws = XLSX.utils.aoa_to_sheet([headers, ...examples]);
  ws["!cols"] = headers.map(() => ({ wch: 20 }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Employees");
  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
  res.setHeader("Content-Disposition", 'attachment; filename="employee_import_template.xlsx"');
  res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  res.send(buf);
});

/* ── parse a single Excel row ── */
function parseRow(rawRow: Record<string, any>, i: number) {
  const r = normalizeRow(rawRow);

  const firstname = str(r.firstname);
  const gender    = str(r.gender);

  const errors: string[] = [];
  if (!firstname) errors.push("ຕ້ອງໃສ່ First Name");
  if (gender && !["Male","Female","male","female","ຊາຍ","ຍິງ"].includes(gender))
    errors.push(`Gender "${gender}" ບໍ່ຖືກຕ້ອງ`);

  return {
    row:               i + 2,
    employee_code:     str(r.employee_code),
    firstname,
    lastname:          str(r.lastname),
    gender,
    date_of_birth:     parseDate(r.date_of_birth),
    nationality:       str(r.nationality)    || "Laos",
    email:             str(r.email),
    contact_no:        str(r.contact_no),
    position:          str(r.position),
    employee_type:     str(r.employee_type)  || "Full-time",
    hired_at:          parseDate(r.hired_at),
    status:            str(r.status)         || "Active",
    resigned_at:       parseDate(r.resigned_at),
    province:          str(r.province),
    district:          str(r.district),
    village:           str(r.village),
    /* dormitory room lookup */
    dorm_building:     str(r.dorm_building),
    dorm_floor:        str(r.dorm_floor),
    dorm_room:         str(r.dorm_room),
    /* office */
    office_building:   str(r.office_building),
    office_floor:      str(r.office_floor),
    office_room:       str(r.office_room),
    /* photo */
    photo:             str(r.photo),
    /* documents */
    doc_type:          str(r.doc_type),
    doc_number:        str(r.doc_number),
    doc_expiry:        parseDate(r.doc_expiry),
    doc_description:   str(r.doc_description),
    doc_image:         str(r.doc_image),
    /* permits */
    permit_type:        str(r.permit_type),
    permit_number:      str(r.permit_number),
    permit_status:      str(r.permit_status) || "Valid",
    permit_issued_date: parseDate(r.permit_issued_date),
    permit_expiry:      parseDate(r.permit_expiry),
    permit_note:        str(r.permit_note),
    error: errors.join(", "),
  };
}

/* ── POST /api/import/preview ── */
router.post("/preview", auth, upload.single("file"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: "ບໍ່ມີໄຟລ໌" });
    const wb   = XLSX.read(req.file.buffer, { type: "buffer", cellDates: true });
    const ws   = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(ws, { defval: "" }) as Record<string, any>[];

    /* Log actual column headers for debugging */
    if (rows.length > 0) {
      const headers = Object.keys(rows[0]);
      console.log("IMPORT HEADERS:", JSON.stringify(headers));
      console.log("IMPORT FIRST ROW:", JSON.stringify(rows[0]));
    }

    const parsed  = rows.map((r, i) => parseRow(r, i));
    const valid   = parsed.filter(r => !r.error).length;
    const invalid = parsed.filter(r => r.error).length;

    res.json({ total: parsed.length, valid, invalid, rows: parsed });
  } catch (err) {
    console.log("IMPORT PREVIEW ERROR", err);
    res.status(400).json({ message: "ໄຟລ໌ບໍ່ຖືກຕ້ອງ" });
  }
});

/* ── POST /api/import/commit ── */
router.post("/commit", auth, async (req: any, res) => {
  try {
    const { rows, company_id } = req.body as { rows: any[]; company_id: number };
    if (!rows || rows.length === 0) return res.status(400).json({ message: "ບໍ່ມີຂໍ້ມູນ" });

    let inserted = 0;
    let skipped  = 0;
    const errors: string[] = [];
    const userId = req.user?.user_id ?? null;

    for (const r of rows) {
      if (!r.firstname) { skipped++; errors.push(`Row ${r.row}: ບໍ່ມີ First Name`); continue; }
      try {
        /* ── 1. Resolve dormitory room_id ── */
        let room_id: number | null = null;
        if (r.dorm_building && r.dorm_floor && r.dorm_room) {
          const roomRes = await pool.query(
            `SELECT r.room_id FROM rooms r
             JOIN buildings b ON b.building_id = r.building_id
             WHERE b.building_name ILIKE $1
               AND r.floor_number = $2::int
               AND r.room_number  = $3
             LIMIT 1`,
            [r.dorm_building, r.dorm_floor, r.dorm_room]
          );
          if (roomRes.rows.length > 0) room_id = roomRes.rows[0].room_id;
        }

        /* ── 2. Insert employee ── */
        const empRes = await pool.query(
          `INSERT INTO employees
             (company_id, employee_code, firstname, lastname, gender, date_of_birth,
              nationality, email, contact_no, position, employee_type,
              hired_at, status, resigned_at,
              province, district, village,
              dormitory, room_no, office_building, room_id, photo)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22)
           ON CONFLICT DO NOTHING
           RETURNING employee_id`,
          [
            company_id,
            r.employee_code   || null,
            r.firstname,
            r.lastname        || null,
            r.gender          || null,
            r.date_of_birth   || null,
            r.nationality     || "Laos",
            r.email           || null,
            r.contact_no      || null,
            r.position        || null,
            r.employee_type   || "Full-time",
            r.hired_at        || null,
            r.status          || "Active",
            r.resigned_at     || null,
            r.province        || null,
            r.district        || null,
            r.village         || null,
            r.dorm_building   || null,
            r.dorm_room       || null,
            r.office_building || null,
            room_id,
            r.photo           || null,
          ]
        );

        if (!empRes.rows.length) { skipped++; continue; }
        const employee_id = empRes.rows[0].employee_id;
        inserted++;

        /* ── 3. Insert / upsert employee_profile ── */
        if (r.province || r.district || r.village || r.dorm_building || r.dorm_room || r.office_building) {
          await pool.query(
            `INSERT INTO employee_profile
               (employee_id, village, district, province, dormitory_no, room_no,
                office_building, office_floor, office_room_no)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
             ON CONFLICT (employee_id) DO UPDATE SET
               village          = EXCLUDED.village,
               district         = EXCLUDED.district,
               province         = EXCLUDED.province,
               dormitory_no     = EXCLUDED.dormitory_no,
               room_no          = EXCLUDED.room_no,
               office_building  = EXCLUDED.office_building,
               office_floor     = EXCLUDED.office_floor,
               office_room_no   = EXCLUDED.office_room_no,
               updated_at       = CURRENT_TIMESTAMP`,
            [
              employee_id,
              r.village         || null,
              r.district        || null,
              r.province        || null,
              r.dorm_building   || null,
              r.dorm_room       || null,
              r.office_building || null,
              r.office_floor    || null,
              r.office_room     || null,
            ]
          ).catch((e: any) => errors.push(`Row ${r.row} profile: ${e.message}`));
        }

        /* ── 4. Audit log ── */
        await pool.query(
          `INSERT INTO audit_log (company_id, user_id, action, entity_type, entity_id, after_data)
           VALUES ($1,$2,'IMPORT','employee',$3,$4::jsonb)`,
          [
            company_id,
            userId,
            employee_id,
            JSON.stringify({
              employee_code: r.employee_code,
              firstname:     r.firstname,
              lastname:      r.lastname,
              position:      r.position,
              employee_type: r.employee_type,
              hired_at:      r.hired_at,
            }),
          ]
        ).catch(() => {});

        /* ── 6. Insert document (if Doc Type provided) ── */
        if (r.doc_type) {
          await pool.query(
            `INSERT INTO employee_documents
               (employee_id, doc_type, doc_name, file_path, expires_at, notes, uploaded_by)
             VALUES ($1,$2,$3,$4,$5,$6,$7)`,
            [
              employee_id,
              r.doc_type,
              r.doc_number      || r.doc_type,
              r.doc_image       || null,
              r.doc_expiry      || null,
              r.doc_description || null,
              userId,
            ]
          ).catch((e: any) => errors.push(`Row ${r.row} doc: ${e.message}`));
        }

        /* ── 7. Insert permit (if Permit Type provided) ── */
        if (r.permit_type) {
          await pool.query(
            `INSERT INTO employee_permits
               (employee_id, permit_type, permit_number, issued_date, expires_at, status, notes, created_by)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
            [
              employee_id,
              r.permit_type,
              r.permit_number      || null,
              r.permit_issued_date || null,
              r.permit_expiry      || null,
              r.permit_status      || "Valid",
              r.permit_note        || null,
              userId,
            ]
          ).catch((e: any) => errors.push(`Row ${r.row} permit: ${e.message}`));
        }

      } catch (e: any) {
        skipped++;
        errors.push(`Row ${r.row}: ${e.message}`);
      }
    }

    res.json({ inserted, skipped, errors: errors.slice(0, 50) });
  } catch (err) {
    console.log("IMPORT COMMIT ERROR", err);
    res.status(500).json({ message: "server error" });
  }
});

export default router;
