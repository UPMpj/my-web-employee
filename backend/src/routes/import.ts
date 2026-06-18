import { Router } from "express";
import multer from "multer";
import * as XLSX from "xlsx";
import { pool } from "../db";
import { auth } from "../middleware/auth";
import { validateUpload } from "../utils/validateFile";
import { processXlsxPreview } from "../utils/importPreview";
import { commitRows, syncImportedRoom } from "../utils/importCommit";

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ext = file.originalname.split(".").pop()?.toLowerCase();
    const ok = ["xlsx", "xls", "csv"].includes(ext ?? "");
    if (ok) cb(null, true);
    else cb(new Error("Only .xlsx, .xls or .csv files are allowed") as any, false);
  },
});

/* ── POST /api/import/template ── Super Admin uploads custom template ── */
router.post("/template", auth, upload.single("template"), async (req: any, res) => {
  if (req.user.role !== "Super Admin") return res.status(403).json({ message: "Super Admin only" });
  if (!req.file) return res.status(400).json({ message: "ກະລຸນາ upload ໄຟລ໌ .xlsx" });
  const ext = req.file.originalname.split(".").pop()?.toLowerCase();
  if (ext !== "xlsx" && ext !== "xls") return res.status(400).json({ message: "ຕ້ອງເປັນໄຟລ໌ Excel (.xlsx/.xls)" });
  const fileErr = validateUpload(req.file.buffer, "spreadsheet");
  if (fileErr) return res.status(400).json({ message: fileErr });
  try {
    const base64 = req.file.buffer.toString("base64");
    await pool.query(
      `INSERT INTO app_settings (key, value, updated_at) VALUES ('import_template', $1, NOW())
       ON CONFLICT (key) DO UPDATE SET value=$1, updated_at=NOW()`,
      [base64]
    );
    res.json({ ok: true });
  } catch (err) {
    console.error("UPLOAD TEMPLATE ERROR", err);
    res.status(500).json({ message: "server error" });
  }
});

/* ── GET /api/import/template ── */
router.get("/template", auth, async (_req, res) => {
  /* serve custom template if uploaded */
  try {
    const r = await pool.query(`SELECT value FROM app_settings WHERE key='import_template'`);
    if (r.rows.length > 0 && r.rows[0].value) {
      const buf = Buffer.from(r.rows[0].value, "base64");
      res.setHeader("Content-Disposition", 'attachment; filename="employee_import_template.xlsx"');
      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      return res.send(buf);
    }
  } catch { /* fall through to generated template */ }

  /* fallback: generate template
     Headers are English-only (ASCII) so Excel cannot mangle them on open/save.
     Lao translations are in the "Reference" sheet. */
  const headers = [
    "Employee Code","First Name","Last Name","Gender","Date of Birth",
    "Nationality","Position","Employee Type","Email","Phone",
    "Hire Date","Status","Resigned Date","Province","District","Village",
    "Dorm Building","Dorm Floor","Dorm Room",
    "Office Building","Office Floor","Office Room",
    "Profile Photo",
    "Doc Type","Doc Number","Doc Expiry","Doc Description","Doc Image",
    "Permit Type","Permit Number","Permit Status","Permit Issue Date",
    "Permit Expiry","Permit Note","Permit Image",
  ];
  const examples = [
    [
      "EMP001","ສົມສີ","ສີທາ","Male","1995-04-15",
      "Laos","Engineer","Full-time","somsi@example.com","020 55 123456",
      "2022-01-01","Active","","ວຽງຈັນ","ຈັນທະບູລີ","ໂນນສະຫວ່າງ",
      "ຕຶກທີ 2","2","201",
      "ຕຶກ A","4","403",
      "",
      "Passport","LA1234567","2028-01-01","ສຳເນົາໜ້າຂໍ້ມູນ","",
      "Work Permit","WP2024001","Valid","2024-01-01","2026-01-01","","",
    ],
    [
      "EMP002","ນາງ ມາລີ","ພົມມະ","Female","1998-07-20",
      "Laos","Accountant","Full-time","mali@example.com","020 77 654321",
      "2023-03-01","Active","","ວຽງຈັນ","ສີໂຄດຕະບອງ","ບ້ານດົງ",
      "ຕຶກທີ 3","3","305",
      "ຕຶກ B","2","201",
      "",
      "Passport","LA9876543","2027-06-15","","",
      "","","","","","","",
    ],
    [
      "EMP003","ທອງຄຳ","ລາດທາວົງ","Male","1993-11-08",
      "Laos","Supervisor","Full-time","","020 99 777888",
      "2021-06-01","Resigned","2024-03-31","ຫຼວງພະບາງ","ໄຊ","ບ້ານວັງທອງ",
      "ຕຶກທີ 4","3","310",
      "","","",
      "",
      "National ID","NID0099001","2030-01-01","","",
      "","","","","","","",
    ],
  ];

  const ws = XLSX.utils.aoa_to_sheet([headers, ...examples]);
  ws["!cols"] = headers.map(() => ({ wch: 20 }));

  /* Reference sheet: Lao translations so users know what each column means */
  const refRows: string[][] = [
    ["English Column (ຊ Header)", "ຄຳແປລາວ", "ໝາຍເຫດ"],
    ["Employee Code",   "ລະຫັດພະນັກງານ",          "ຕົວຢ່າງ: EMP001"],
    ["First Name",      "ຊ",                   "ຈຳເປັນ *"],
    ["Last Name",       "ນາມສະກຸນ",               ""],
    ["Gender",          "ເພດ",                    "Male / Female"],
    ["Date of Birth",   "ວັນເດືອນປີເກີດ",           "YYYY-MM-DD"],
    ["Nationality",     "ສັນຊາດ",                  "ຕົວຢ່າງ: Laos"],
    ["Position",        "ຕຳແໜ່ງ",                  ""],
    ["Employee Type",   "ປະເພດພະນັກງານ",            "Full-time / Part-time"],
    ["Email",           "ອີເມລ",                   ""],
    ["Phone",           "ເບີໂທລະສັບ",               ""],
    ["Hire Date",       "ວັນທີເຂົ້າການ",             "YYYY-MM-DD"],
    ["Status",          "ສະຖານະ",                  "Active / Resigned"],
    ["Resigned Date",   "ວັນທີລາອອກ",              "YYYY-MM-DD (ຖ້າ Resigned)"],
    ["Province",        "ແຂວງ",                   ""],
    ["District",        "ເມືອງ",                   ""],
    ["Village",         "ບ້ານ",                   ""],
    ["Dorm Building",   "ຕຶກ/ອາຄານ (ທີ່ຢູ່)",       "ຊ Building ທີ່ຢູ່ອາໄສ"],
    ["Dorm Floor",      "ຊັ້ນ (ທີ່ຢູ່)",             "ຕົວເລກ"],
    ["Dorm Room",       "ຫ້ອງ (ທີ່ຢູ່)",             "ຕົວເລກ"],
    ["Office Building", "ຕຶກ Office",              "ຊ Building ທີ່ເຮັດວຽກ"],
    ["Office Floor",    "ຊັ້ນ Office",              "ຕົວເລກ"],
    ["Office Room",     "ຫ້ອງ Office",              "ຕົວເລກ"],
    ["Profile Photo",   "ຮູບໂປຣຟາຍ",               "URL ຫຼື path"],
    ["Doc Type",        "ປະເພດເອກະສານ",             "Passport / National ID"],
    ["Doc Number",      "ເລກທີ/ຊ",               "ເລກທີ ຫຼື ຊ ເອກະສານ"],
    ["Doc Expiry",      "ວັນໝົດອາຍຸ (ເອກະສານ)",      "YYYY-MM-DD"],
    ["Doc Description", "ລາຍລະອຽດ",               ""],
    ["Doc Image",       "ຮູບພາບເອກະສານ",            "URL ຫຼື path"],
    ["Permit Type",     "ປະເພດໃບອະນຸຍາດ",           "Work Permit / Business Visa"],
    ["Permit Number",   "ເລກທີໃບອະນຸຍາດ",           ""],
    ["Permit Status",   "ສະຖານະໃບອະນຸຍາດ",          "Valid / Expired"],
    ["Permit Issue Date","ວັນທີອອກ",                "YYYY-MM-DD"],
    ["Permit Expiry",   "ວັນໝົດອາຍຸໃບອະນຸຍາດ",       "YYYY-MM-DD"],
    ["Permit Note",     "ໝາຍເຫດ",                  ""],
    ["Permit Image",    "ຮູບໃບອານຸຍາດ",             "URL ຫຼື path"],
  ];
  const wsRef = XLSX.utils.aoa_to_sheet(refRows);
  wsRef["!cols"] = [{ wch: 22 }, { wch: 28 }, { wch: 30 }];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Employees");
  XLSX.utils.book_append_sheet(wb, wsRef, "Reference (ຄຳແປ)");
  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
  res.setHeader("Content-Disposition", 'attachment; filename="employee_import_template.xlsx"');
  res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  res.send(buf);
});

/* ── POST /api/import/preview ── */
router.post("/preview", auth, upload.single("file"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: "ບໍ່ມີໄຟລ໌" });
    const ext = req.file.originalname.split(".").pop()?.toLowerCase();
    if (ext !== "csv") {
      const fileErr = validateUpload(req.file.buffer, "spreadsheet");
      if (fileErr) return res.status(400).json({ message: fileErr });
    }
    res.json(await processXlsxPreview(req.file.buffer));
  } catch (err: any) {
    console.error("IMPORT PREVIEW ERROR", err);
    res.status(400).json({ message: err.message || "ໄຟລ໌ບໍ່ຖືກຕ້ອງ" });
  }
});

/* ── POST /api/import/from-gsheets — import from a public Google Sheet URL ── */
router.post("/from-gsheets", auth, async (req: any, res) => {
  const { url } = req.body;
  const match = (url || "").match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (!match) return res.status(400).json({ message: "URL Google Sheets ບໍ່ຖືກຕ້ອງ" });

  const sheetId   = match[1];
  const exportUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=xlsx`;

  try {
    const resp = await fetch(exportUrl, { redirect: "follow" });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const buffer = Buffer.from(await resp.arrayBuffer());
    res.json(await processXlsxPreview(buffer));
  } catch (err: any) {
    console.error("GSHEETS IMPORT ERROR", err);
    res.status(400).json({ message: "ດຶງຂໍ້ມູນ Google Sheets ບໍ່ໄດ້ — ກວດສອບວ່າ Sheet ຕັ້ງ 'Anyone with the link can view'" });
  }
});

/* ── POST /api/import/check-duplicates — check which rows already exist ── */
router.post("/check-duplicates", auth, async (req: any, res) => {
  try {
    const { rows, company_id } = req.body;
    if (!rows?.length || !company_id) return res.json({ duplicates: {} });

    const duplicates: Record<number, string> = {};

    /* Batch check by employee_code */
    const codeEntries = rows
      .map((r: any, i: number) => ({ i, code: String(r.employee_code || "").trim() }))
      .filter((x: any) => x.code);

    if (codeEntries.length > 0) {
      const codeVals = codeEntries.map((x: any) => x.code);
      const result = await pool.query(
        `SELECT employee_code FROM employees
         WHERE company_id=$1 AND employee_code = ANY($2::text[]) AND deleted_at IS NULL`,
        [company_id, codeVals]
      );
      const existingCodes = new Set(result.rows.map((r: any) => r.employee_code));
      for (const { i, code } of codeEntries) {
        if (existingCodes.has(code)) duplicates[i] = `Code "${code}" ມີໃນລະບົບແລ້ວ`;
      }
    }

    /* Check firstname+lastname for rows not yet flagged */
    for (let i = 0; i < rows.length; i++) {
      if (duplicates[i]) continue;
      const r = rows[i];
      if (!r.firstname) continue;
      const chk = await pool.query(
        `SELECT 1 FROM employees
         WHERE company_id=$1
           AND LOWER(TRIM(firstname))=LOWER(TRIM($2))
           AND LOWER(TRIM(COALESCE(lastname,'')))=LOWER(TRIM($3))
           AND deleted_at IS NULL LIMIT 1`,
        [company_id, r.firstname, r.lastname || ""]
      );
      if (chk.rows.length > 0) {
        duplicates[i] = `"${r.firstname} ${r.lastname || ""}" ມີໃນລະບົບແລ້ວ`;
      }
    }

    res.json({ duplicates });
  } catch (err) {
    console.error("CHECK DUPLICATES ERROR", err);
    res.status(500).json({ message: "server error" });
  }
});

/* ── POST /api/import/commit ── */
router.post("/commit", auth, async (req: any, res) => {
  const { rows, company_id } = req.body as { rows: any[]; company_id: number };
  if (!rows || rows.length === 0) return res.status(400).json({ message: "ບໍ່ມີຂໍ້ມູນ" });
  if (!company_id) return res.status(400).json({ message: "ກະລຸນາລະບຸ company_id" });

  if (req.user.role !== "Super Admin") {
    const access = await pool.query(
      `SELECT 1 FROM user_companies WHERE user_id=$1 AND company_id=$2`,
      [req.user.user_id, company_id]
    );
    if (access.rows.length === 0)
      return res.status(403).json({ message: "ບໍ່ມີສິດ import ໃສ່ company ນີ້" });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await commitRows(client, rows, company_id, req.user?.user_id ?? null);
    await client.query("COMMIT");
    /* sync room statuses for any rooms that received new employees */
    if (result.roomIds.length > 0) {
      Promise.all(result.roomIds.map(id => syncImportedRoom(id))).catch(() => {});
    }
    res.json({ inserted: result.inserted, skipped: result.skipped, errors: result.errors.slice(0, 50) });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("IMPORT COMMIT ERROR", err);
    res.status(500).json({ message: "server error" });
  } finally {
    client.release();
  }
});

/* ══════════════════════════════════════════════════════
   APPROVAL WORKFLOW
   ══════════════════════════════════════════════════════ */

/* auto-create import_batches table */
pool.query(`
  CREATE TABLE IF NOT EXISTS import_batches (
    batch_id      SERIAL PRIMARY KEY,
    company_id    INT NOT NULL,
    submitted_by  INT REFERENCES users(user_id),
    submitted_at  TIMESTAMP DEFAULT NOW(),
    status        VARCHAR(20) DEFAULT 'pending',
    rows_json     JSONB NOT NULL,
    total_rows    INT DEFAULT 0,
    valid_rows    INT DEFAULT 0,
    filename      VARCHAR(255),
    approved_by   INT REFERENCES users(user_id),
    approved_at   TIMESTAMP,
    reject_reason TEXT
  )
`).catch(() => {});

/* POST /api/import/submit  — Company Admin submits for approval */
router.post("/submit", auth, async (req: any, res) => {
  try {
    const { rows, company_id, filename } = req.body;
    if (!rows || rows.length === 0) return res.status(400).json({ message: "ບໍ່ມີຂໍ້ມູນ" });
    if (!company_id) return res.status(400).json({ message: "ກະລຸນາເລືອກ Company" });

    const valid = rows.filter((r: any) => !r.error);
    const result = await pool.query(
      `INSERT INTO import_batches
         (company_id, submitted_by, rows_json, total_rows, valid_rows, filename)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING batch_id`,
      [company_id, req.user.user_id, JSON.stringify(rows), rows.length, valid.length, filename || null]
    );
    res.json({ batch_id: result.rows[0].batch_id, message: "ສົ່ງສຳເລັດ — ລໍຖ້າ Super Admin ອະນຸມັດ" });
  } catch (err) {
    console.error("IMPORT SUBMIT ERROR", err);
    res.status(500).json({ message: "server error" });
  }
});

/* GET /api/import/batches  — Super Admin sees all batches */
router.get("/batches", auth, async (req: any, res) => {
  try {
    if (req.user.role !== "Super Admin") return res.status(403).json({ message: "ບໍ່ມີສິດ" });
    const result = await pool.query(
      `SELECT b.batch_id, b.company_id, b.status, b.total_rows, b.valid_rows,
              b.filename, b.submitted_at, b.approved_at, b.reject_reason,
              u.fullname AS submitted_by_name,
              a.fullname AS approved_by_name,
              c.companies_name
       FROM import_batches b
       LEFT JOIN users u ON u.user_id = b.submitted_by
       LEFT JOIN users a ON a.user_id = b.approved_by
       LEFT JOIN companies c ON c.company_id = b.company_id
       ORDER BY b.submitted_at DESC`
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ message: "server error" });
  }
});

/* GET /api/import/batches/:id  — batch detail (rows preview) */
router.get("/batches/:id", auth, async (req: any, res) => {
  try {
    if (req.user.role !== "Super Admin") return res.status(403).json({ message: "ບໍ່ມີສິດ" });
    const result = await pool.query(
      `SELECT b.*, u.fullname AS submitted_by_name, c.companies_name
       FROM import_batches b
       LEFT JOIN users u ON u.user_id = b.submitted_by
       LEFT JOIN companies c ON c.company_id = b.company_id
       WHERE b.batch_id = $1`, [req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ message: "ບໍ່ພົບ" });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ message: "server error" });
  }
});

/* POST /api/import/batches/:id/approve  — Super Admin approves → commit */
router.post("/batches/:id/approve", auth, async (req: any, res) => {
  if (req.user.role !== "Super Admin") return res.status(403).json({ message: "ບໍ່ມີສິດ" });

  const batchRes = await pool.query(
    `SELECT * FROM import_batches WHERE batch_id=$1`, [req.params.id]
  );
  if (batchRes.rows.length === 0) return res.status(404).json({ message: "ບໍ່ພົບ" });
  const batch = batchRes.rows[0];
  if (batch.status !== "pending") return res.status(400).json({ message: "Batch ນີ້ຖືກດຳເນີນການແລ້ວ" });

  const rows: any[] = (batch.rows_json as any[]).filter((r: any) => !r.error);
  const userId: number = req.user.user_id;

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await commitRows(client, rows, batch.company_id, userId);
    await client.query(
      `UPDATE import_batches SET status='approved', approved_by=$1, approved_at=NOW() WHERE batch_id=$2`,
      [userId, req.params.id]
    );
    await client.query("COMMIT");

    if (batch.submitted_by) {
      const companyRes = await pool.query(
        `SELECT companies_name FROM companies WHERE company_id=$1`, [batch.company_id]
      ).catch(() => ({ rows: [] as any[] }));
      const companyName = companyRes.rows[0]?.companies_name || "";
      pool.query(
        `INSERT INTO notifications (from_user_id, to_user_id, message, entity_type, entity_id, is_read_by_target)
         VALUES ($1,$2,$3,'import_batch',$4,false)`,
        [userId, batch.submitted_by, `APPROVED|${companyName}|${result.inserted}|${result.skipped}`, req.params.id]
      ).catch(() => {});
    }

    res.json({ ...result, errors: result.errors.slice(0, 50) });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("IMPORT APPROVE ERROR", err);
    res.status(500).json({ message: "server error" });
  } finally {
    client.release();
  }
});

/* POST /api/import/batches/:id/reject  — Super Admin rejects */
router.post("/batches/:id/reject", auth, async (req: any, res) => {
  try {
    if (req.user.role !== "Super Admin") return res.status(403).json({ message: "ບໍ່ມີສິດ" });
    const { reason } = req.body;

    /* get batch info before update */
    const batchRes = await pool.query(
      `SELECT submitted_by, valid_rows FROM import_batches WHERE batch_id=$1 AND status='pending'`,
      [req.params.id]
    );
    if (batchRes.rows.length === 0) return res.status(404).json({ message: "ບໍ່ພົບ ຫຼື ຖືກດຳເນີນການແລ້ວ" });
    const batch = batchRes.rows[0];

    await pool.query(
      `UPDATE import_batches SET status='rejected', approved_by=$1, approved_at=NOW(), reject_reason=$2
       WHERE batch_id=$3`,
      [req.user.user_id, reason || null, req.params.id]
    );

    /* Notify Company Admin who submitted */
    if (batch.submitted_by) {
      const msg = `REJECTED|${reason || "ຂໍ້ມູນບໍ່ຖືກຕ້ອງ"}|${batch.valid_rows}`;
      await pool.query(
        `INSERT INTO notifications (from_user_id, to_user_id, message, entity_type, entity_id, is_read_by_target)
         VALUES ($1, $2, $3, 'import_batch', $4, false)`,
        [req.user.user_id, batch.submitted_by, msg, req.params.id]
      ).catch(() => {});
    }

    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ message: "server error" });
  }
});

/* GET /api/import/my-batches  — Company Admin sees own submissions */
router.get("/my-batches", auth, async (req: any, res) => {
  try {
    const result = await pool.query(
      `SELECT b.batch_id, b.status, b.total_rows, b.valid_rows, b.filename,
              b.submitted_at, b.approved_at, b.reject_reason,
              a.fullname AS approved_by_name, c.companies_name
       FROM import_batches b
       LEFT JOIN users a ON a.user_id = b.approved_by
       LEFT JOIN companies c ON c.company_id = b.company_id
       WHERE b.submitted_by = $1
       ORDER BY b.submitted_at DESC LIMIT 20`,
      [req.user.user_id]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ message: "server error" });
  }
});

export default router;
