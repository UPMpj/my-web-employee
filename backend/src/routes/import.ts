import { Router } from "express";
import multer from "multer";
import * as XLSX from "xlsx";
import { pool } from "../db";
import { auth } from "../middleware/auth";

const router  = Router();
const upload  = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } });

/* ── GET /api/import/template — download Excel template ── */
router.get("/template", auth, (_req, res) => {
  const headers = [
    "employee_code","firstname","lastname","gender","date_of_birth",
    "nationality","email","contact_no","position","employee_type",
    "hired_at","status","province","district","village","notes"
  ];
  const examples = [
    ["EMP001","ສົມສີ","ສີທາ","Male","1995-04-15","Laos","somsi@example.com","020 55 123456","Engineer","Full-time","2022-01-01","Active","ວຽງຈັນ","ຈັນທະບູລີ","ໂນນສະຫວ່າງ",""],
    ["EMP002","ນາງ ມາລີ","ພົມມະ","Female","1998-07-20","Laos","mali@example.com","020 77 654321","Accountant","Full-time","2023-03-01","Active","ວຽງຈັນ","ສີໂຄດຕະບອງ","ບ້ານດົງ",""],
    ["EMP003","ທອງຄຳ","ລາດທາວົງ","Male","2000-01-10","Laos","","020 99 111222","Worker","Part-time","2024-01-15","Active","ຫຼວງພະບາງ","ໄຊ","ບ້ານວັງທອງ",""],
  ];
  const ws = XLSX.utils.aoa_to_sheet([headers, ...examples]);
  ws["!cols"] = headers.map(() => ({ wch: 22 }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Employees");
  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
  res.setHeader("Content-Disposition", 'attachment; filename="employee_import_template.xlsx"');
  res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  res.send(buf);
});

function parseRow(r: Record<string, any>, i: number) {
  const firstname = String(r.firstname || "").trim();
  const lastname  = String(r.lastname  || "").trim();
  const gender    = String(r.gender    || "").trim();

  let dob = "";
  if (r.date_of_birth) {
    dob = r.date_of_birth instanceof Date
      ? r.date_of_birth.toISOString().slice(0, 10)
      : String(r.date_of_birth).trim();
  }
  let hired = "";
  if (r.hired_at) {
    hired = r.hired_at instanceof Date
      ? r.hired_at.toISOString().slice(0, 10)
      : String(r.hired_at).trim();
  }

  const errors: string[] = [];
  if (!firstname) errors.push("ຕ້ອງໃສ່ First Name");
  if (gender && !["Male","Female","male","female","ຊາຍ","ຍິງ"].includes(gender))
    errors.push(`Gender "${gender}" ບໍ່ຖືກຕ້ອງ`);

  return {
    row:           i + 2,
    employee_code: String(r.employee_code || "").trim(),
    firstname,
    lastname,
    gender,
    date_of_birth: dob,
    nationality:   String(r.nationality   || "Laos").trim(),
    email:         String(r.email         || "").trim(),
    contact_no:    String(r.contact_no    || "").trim(),
    position:      String(r.position      || "").trim(),
    employee_type: String(r.employee_type || "Full-time").trim(),
    hired_at:      hired,
    status:        String(r.status        || "Active").trim(),
    province:      String(r.province      || "").trim(),
    district:      String(r.district      || "").trim(),
    village:       String(r.village       || "").trim(),
    notes:         String(r.notes         || "").trim(),
    error:         errors.join(", "),
  };
}

/* ── POST /api/import/preview — parse file, return ALL rows without saving ── */
router.post("/preview", auth, upload.single("file"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: "ບໍ່ມີໄຟລ໌" });
    const wb   = XLSX.read(req.file.buffer, { type: "buffer", cellDates: true });
    const ws   = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(ws, { defval: "" }) as Record<string, any>[];

    const parsed = rows.map((r, i) => parseRow(r, i));
    const valid   = parsed.filter(r => !r.error).length;
    const invalid = parsed.filter(r => r.error).length;

    res.json({ total: parsed.length, valid, invalid, rows: parsed });
  } catch (err) {
    console.log("IMPORT PREVIEW ERROR", err);
    res.status(400).json({ message: "ໄຟລ໌ບໍ່ຖືກຕ້ອງ" });
  }
});

/* ── POST /api/import/commit — batch insert, returns progress-friendly result ── */
router.post("/commit", auth, async (req: any, res) => {
  try {
    const { rows, company_id } = req.body as { rows: any[]; company_id: number };
    if (!rows || rows.length === 0) return res.status(400).json({ message: "ບໍ່ມີຂໍ້ມູນ" });

    let inserted = 0;
    let skipped  = 0;
    const errors: string[] = [];

    /* batch in groups of 100 for consistent performance */
    const BATCH = 100;
    for (let b = 0; b < rows.length; b += BATCH) {
      const chunk = rows.slice(b, b + BATCH);
      for (const r of chunk) {
        if (!r.firstname) { skipped++; errors.push(`Row ${r.row}: ບໍ່ມີ First Name`); continue; }
        try {
          const result = await pool.query(
            `INSERT INTO employees
               (company_id, employee_code, firstname, lastname, gender, date_of_birth,
                nationality, email, contact_no, position, employee_type,
                hired_at, status, province, district, village, notes)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
             ON CONFLICT DO NOTHING`,
            [
              company_id,
              r.employee_code  || null,
              r.firstname,
              r.lastname       || null,
              r.gender         || null,
              r.date_of_birth  || null,
              r.nationality    || "Laos",
              r.email          || null,
              r.contact_no     || null,
              r.position       || null,
              r.employee_type  || "Full-time",
              r.hired_at       || null,
              r.status         || "Active",
              r.province       || null,
              r.district       || null,
              r.village        || null,
              r.notes          || null,
            ]
          );
          if (result.rowCount && result.rowCount > 0) inserted++;
          else { skipped++; }
        } catch (e: any) {
          skipped++;
          errors.push(`Row ${r.row}: ${e.message}`);
        }
      }
    }

    res.json({ inserted, skipped, errors: errors.slice(0, 50) });
  } catch (err) {
    console.log("IMPORT COMMIT ERROR", err);
    res.status(500).json({ message: "server error" });
  }
});

export default router;
