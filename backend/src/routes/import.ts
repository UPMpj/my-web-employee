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
  "employee code": "employee_code",  "employee_code": "employee_code",  "code": "employee_code",
  "ລະຫັດພະນັກງານ": "employee_code",

  /* First Name → ຊື່ແທ້ */
  "ຊື່ແທ້": "firstname",  "ຊ": "firstname",
  "first name": "firstname",  "firstname": "firstname",

  /* Last Name → ນາມສະກຸນ */
  "ນາມສະກຸນ": "lastname",
  "last name": "lastname",  "lastname": "lastname",  "surname": "lastname",

  /* Gender → ເພດ */
  "ເພດ": "gender",  "gender": "gender",

  /* Date of Birth → ວັນເດືອນປີເກີດ */
  "ວັນເດືອນປີເກີດ": "date_of_birth",
  "date of birth": "date_of_birth",  "date_of_birth": "date_of_birth",  "dob": "date_of_birth",

  /* Nationality → ສັນຊາດ */
  "ສັນຊາດ": "nationality",  "nationality": "nationality",

  /* Position → ຕຳແໜ່ງ */
  "ຕຳແໜ່ງ": "position",  "position": "position",

  /* Employee Type → ປະເພດພະນັກງານ */
  "ປະເພດພະນັກງານ": "employee_type",  "ປະເພດ": "employee_type",
  "employee type": "employee_type",   "employee_type": "employee_type",

  /* Email → ອີເມລ */
  "ອີເມລ": "email",  "email": "email",

  /* Phone → ເບີໂທລະສັບ */
  "ເບີໂທລະສັບ": "contact_no",  "ໂທລະສັບ": "contact_no",
  "phone": "contact_no",        "contact_no": "contact_no",  "tel": "contact_no",

  /* Hire Date → ວັນທີເຂົ້າການ */
  "ວັນທີເຂົ້າການ": "hired_at",  "ວັນທີ່ຈ້າງ": "hired_at",
  "hire date": "hired_at",      "hired_at": "hired_at",  "start date": "hired_at",

  /* Status → ສະຖານະ (ການເຮັດວຽກ) */
  "ສະຖານະ (ການເຮັດວຽກ)": "status",  "ສະຖານະ": "status",  "status": "status",

  /* Resigned Date → ວັນທີລາອອກ */
  "ວັນທີລາອອກ": "resigned_at",  "ວັນທີ່ລາອອກ": "resigned_at",
  "resigned date": "resigned_at", "resigned_at": "resigned_at",

  /* Province → ແຂວງ */
  "ແຂວງ": "province",  "province": "province",

  /* District → ເມືອງ */
  "ເມືອງ": "district",  "district": "district",

  /* Village → ບ້ານ */
  "ບ້ານ": "village",  "village": "village",

  /* Dorm Building — all 3 common Lao vowel spellings: ຕຶກ / ຕືກ / ຕິກ */
  "ອາຄານ": "dorm_building",    "building": "dorm_building",    "dorm building": "dorm_building",
  "ຕຶກ": "dorm_building",       "ຕືກ": "dorm_building",         "ຕິກ": "dorm_building",
  "ຕຶກທີ່ຢູ່": "dorm_building",  "ຕືກທີ່ຢູ່": "dorm_building",   "ຕິກທີ່ຢູ່": "dorm_building",
  "ອາຄານທີ່ຢູ່": "dorm_building",

  /* Dorm Floor */
  "ຊັ້ນ": "dorm_floor",         "floor": "dorm_floor",          "dorm floor": "dorm_floor",
  "ຊັ້ນທີ່ຢູ່": "dorm_floor",

  /* Dorm Room */
  "ຫ້ອງ": "dorm_room",          "room": "dorm_room",            "room no": "dorm_room",
  "ຫ້ອງທີ່ຢູ່": "dorm_room",     "dorm room": "dorm_room",

  /* Office Building — all 3 vowel variants */
  "ຕຶກ office": "office_building",  "ຕືກ office": "office_building",  "ຕິກ office": "office_building",
  "ອາຄານ office": "office_building", "office building": "office_building", "office_building": "office_building",
  "ຕຶກ(office)": "office_building",  "ຕຶກ (office)": "office_building",
  "ຕືກ(office)": "office_building",  "ຕືກ (office)": "office_building",
  "ຕິກ(office)": "office_building",  "ຕິກ (office)": "office_building",

  /* Office Floor */
  "ຊັ້ນ office": "office_floor",     "ຊັ້ນ (office)": "office_floor",
  "office floor": "office_floor",    "office_floor": "office_floor",

  /* Office Room */
  "ຫ້ອງ office": "office_room",      "ຫ້ອງ (office)": "office_room",
  "office room": "office_room",      "office_room": "office_room",

  /* Profile Photo → ຮູບໂປຣຟາຍ */
  "ຮູບໂປຣຟາຍ": "photo",  "profile photo": "photo",  "photo": "photo",

  /* Documents */
  "ປະເພດເອກະສານ": "doc_type",          "doc type": "doc_type",          "doc_type": "doc_type",
  "ປະເພດ ເອກະສານ": "doc_type",
  "ເລກທີເອກະສານ": "doc_number",         "doc number": "doc_number",       "doc_number": "doc_number",
  "ເລກທີ ເອກະສານ": "doc_number",        "ເລກທີ": "doc_number",
  "ເລກທີ່": "doc_number",               "ເລກເອກະສານ": "doc_number",
  "ຊື່ເອກະສານ": "doc_number",
  "doc name": "doc_number",             "document name": "doc_number",
  "ວັນໝົດອາຍຸເອກະສານ": "doc_expiry",    "doc expiry": "doc_expiry",       "doc_expiry": "doc_expiry",
  "ວັນໝົດອາຍຸ ເອກະສານ": "doc_expiry",   "ວັນໝົດເອກະສານ": "doc_expiry",
  "ລາຍລະອຽດເອກະສານ": "doc_description", "doc description": "doc_description", "doc_description": "doc_description",
  "ລາຍລະອຽດ ເອກະສານ": "doc_description", "ລາຍລະ": "doc_description",      "ລາຍລະອຽດ": "doc_description",
  "ໝາຍເຫດເອກະສານ": "doc_description",   "ໝາຍ ເຫດ ເອກະສານ": "doc_description",
  "ຮູບພາບເອກະສານ": "doc_image",         "doc image": "doc_image",         "doc_image": "doc_image",
  "ຮູບ ພາບ ເອກະສານ": "doc_image",        "ຮູບພາບ ເອກະສານ": "doc_image",

  /* Permits */
  "ປະເພດໃບອະນຸຍາດ": "permit_type",          "permit type": "permit_type",          "permit_type": "permit_type",
  "ປະເພດ ໃບອະນຸຍາດ": "permit_type",
  "ເລກທີໃບອະນຸຍາດ": "permit_number",         "permit number": "permit_number",       "permit_number": "permit_number",
  "ເລກທີ ໃບອະນຸຍາດ": "permit_number",
  "ສະຖານະໃບອະນຸຍາດ": "permit_status",        "permit status": "permit_status",       "permit_status": "permit_status",
  "ສະຖານະ ໃບອະນຸຍາດ": "permit_status",
  "ວັນທີອອກໃບອະນຸຍາດ": "permit_issued_date",  "permit issue date": "permit_issued_date", "permit_issued_date": "permit_issued_date",
  "ວັນທີ ອອກ ໃບອະນຸຍາດ": "permit_issued_date", "ວັນທີອອກ ໃບອະນຸຍາດ": "permit_issued_date",
  "ວັນໝົດອາຍຸໃບອະນຸຍາດ": "permit_expiry",     "permit expiry": "permit_expiry",       "permit_expiry": "permit_expiry",
  "ວັນໝົດອາຍຸ ໃບອະນຸຍາດ": "permit_expiry",
  "ໝາຍເຫດໃບອະນຸຍາດ": "permit_note",           "permit note": "permit_note",           "permit_note": "permit_note",
  "ໝາຍເຫດ ໃບອະນຸຍາດ": "permit_note",
  "ຮູບໃບອານຸຍາດ": "permit_image",             "permit image": "permit_image",         "permit_image": "permit_image",
  "ຮູບໃບອະນຸຍາດ": "permit_image",             "ຮູບ ໃບ ອານຸຍາດ": "permit_image",       "ຮູບ ໃບອານຸຍາດ": "permit_image",
};

/* Canonical display name for each internal key (used in suggestions) */
const CANONICAL_NAMES: Record<string, string> = {
  employee_code:      "Employee Code",
  firstname:          "ຊື່ແທ້",
  lastname:           "ນາມສະກຸນ",
  gender:             "ເພດ",
  date_of_birth:      "ວັນເດືອນປີເກີດ",
  nationality:        "ສັນຊາດ",
  position:           "ຕຳແໜ່ງ",
  employee_type:      "ປະເພດພະນັກງານ",
  email:              "ອີເມລ",
  contact_no:         "ເບີໂທລະສັບ",
  hired_at:           "ວັນທີເຂົ້າການ",
  status:             "ສະຖານະ (ການເຮັດວຽກ)",
  resigned_at:        "ວັນທີລາອອກ",
  province:           "ແຂວງ",
  district:           "ເມືອງ",
  village:            "ບ້ານ",
  dorm_building:      "ອາຄານ",
  office_building:    "ຕືກ Office",
  office_floor:       "ຊັ້ນ Office",
  office_room:        "ຫ້ອງ Office",
  dorm_floor:         "ຊັ້ນ",
  dorm_room:          "ຫ້ອງ",
  photo:              "ຮູບໂປຣຟາຍ",
  doc_type:           "ປະເພດເອກະສານ",
  doc_number:         "ເລກທີເອກະສານ",
  doc_expiry:         "ວັນໝົດອາຍຸເອກະສານ",
  doc_description:    "ລາຍລະອຽດເອກະສານ",
  doc_image:          "ຮູບພາບເອກະສານ",
  permit_type:        "ປະເພດໃບອະນຸຍາດ",
  permit_number:      "ເລກທີໃບອະນຸຍາດ",
  permit_status:      "ສະຖານະໃບອະນຸຍາດ",
  permit_issued_date: "ວັນທີອອກໃບອະນຸຍາດ",
  permit_expiry:      "ວັນໝົດອາຍຸໃບອະນຸຍາດ",
  permit_note:        "ໝາຍເຫດໃບອະນຸຍາດ",
  permit_image:       "ຮູບໃບອະນຸຍາດ",
};

/* Convert Thai Unicode codepoints (U+0E01–U+0E5B) to their Lao equivalents
   by adding offset +0x80.  This handles Excel files created with Thai input
   methods — the characters look identical but differ at the byte level. */
function thaiToLao(s: string): string {
  return s.replace(/[ก-๛]/g, ch => {
    const lao = ch.charCodeAt(0) + 0x80;
    return lao >= 0x0E81 && lao <= 0x0EFF ? String.fromCharCode(lao) : ch;
  });
}

/* Strip BOM and normalize whitespace from a string */
function cleanKey(k: string): string {
  return thaiToLao(
    String(k)
      .replace(/^﻿/, "")        // strip BOM
      .normalize("NFC")              // normalize Unicode combining sequences
      .replace(/\s+/g, " ")
      .trim()
      .toLowerCase()
  );
}

/* Strip ALL Lao diacritics (vowels + tone marks) for fuzzy matching.
   Handles different combining-mark orderings that NFC cannot unify. */
function stripLaoVowels(s: string): string {
  // EB1=ັ  EB4-EBC=ິີຶື຺ຸູົຼ  EC8-ECD=່້໊໋໌ໍ
  return s.replace(/[ັິ-ຼ່-ໍ]/g, "");
}

/* Pre-build a cleaned alias map so Lao/Unicode chars match regardless of source */
const CLEANED_ALIASES: Record<string, string> = {};
for (const [alias, internal] of Object.entries(COL_ALIASES)) {
  CLEANED_ALIASES[cleanKey(alias)] = internal;
}

/* Fallback: stripped-vowel map so ຕຶກ / ຕືກ / ຕິກ all resolve to the same key */
const STRIPPED_ALIASES: Record<string, string> = {};
for (const [ck, internal] of Object.entries(CLEANED_ALIASES)) {
  const sk = stripLaoVowels(ck);
  if (!(sk in STRIPPED_ALIASES)) STRIPPED_ALIASES[sk] = internal;
}

/* Bigram similarity — works for both Latin and Lao text */
function bigramSimilarity(a: string, b: string): number {
  if (a === b) return 1;
  if (a.length < 2 || b.length < 2) return a === b ? 1 : 0;

  const bg = (s: string) => {
    const r: string[] = [];
    for (let i = 0; i < s.length - 1; i++) r.push(s.slice(i, i + 2));
    return r;
  };
  const aBg = bg(a);
  const bMap = new Map<string, number>();
  for (const g of bg(b)) bMap.set(g, (bMap.get(g) || 0) + 1);

  let hits = 0;
  for (const g of aBg) {
    const n = bMap.get(g) || 0;
    if (n > 0) { hits++; bMap.set(g, n - 1); }
  }
  return (2 * hits) / (aBg.length + bg(b).length);
}

/* For an unrecognized raw header, return the canonical display name of the
   closest matching known column, or null if no confident match found. */
function suggestColumn(rawHeader: string): string | null {
  const ck = cleanKey(rawHeader);
  if (ck in CLEANED_ALIASES) return null; // already matched

  let bestInternal = "";
  let bestScore    = 0;

  for (const [alias, internal] of Object.entries(CLEANED_ALIASES)) {
    let score = bigramSimilarity(ck, alias);

    // Substring containment gives a strong boost
    if (alias.length > 1 && ck.includes(alias)) score = Math.max(score, 0.75);
    if (ck.length   > 1 && alias.includes(ck))  score = Math.max(score, 0.65);

    if (score > bestScore) { bestScore = score; bestInternal = internal; }
  }

  if (bestScore < 0.35) return null;
  return CANONICAL_NAMES[bestInternal] || null;
}

function normalizeRow(r: Record<string, any>): Record<string, any> {
  const out: Record<string, any> = {};

  const cleaned: Record<string, any> = {};
  for (const [k, v] of Object.entries(r)) {
    const ck = cleanKey(k);
    cleaned[ck] = v;
    out[k] = v;
  }

  /* Map via cleaned aliases — exact match first, stripped-vowel fallback second */
  for (const [ck, internalKey] of Object.entries(CLEANED_ALIASES)) {
    if (ck in cleaned) out[internalKey] = cleaned[ck];
  }
  for (const [rawCk] of Object.entries(cleaned)) {
    if (!(rawCk in CLEANED_ALIASES)) {
      const sk = stripLaoVowels(rawCk);
      if (sk in STRIPPED_ALIASES) out[STRIPPED_ALIASES[sk]] = cleaned[rawCk];
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

/* ── POST /api/import/template ── Super Admin uploads custom template ── */
router.post("/template", auth, upload.single("template"), async (req: any, res) => {
  if (req.user.role !== "Super Admin") return res.status(403).json({ message: "Super Admin only" });
  if (!req.file) return res.status(400).json({ message: "ກະລຸນາ upload ໄຟລ໌ .xlsx" });
  const ext = req.file.originalname.split(".").pop()?.toLowerCase();
  if (ext !== "xlsx" && ext !== "xls") return res.status(400).json({ message: "ຕ້ອງເປັນໄຟລ໌ Excel (.xlsx/.xls)" });
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
    permit_image:       str(r.permit_image),
    error: errors.join(", "),
  };
}

/* ── POST /api/import/preview ── */
router.post("/preview", auth, upload.single("file"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: "ບໍ່ມີໄຟລ໌" });
    const wb = XLSX.read(req.file.buffer, { type: "buffer", cellDates: true });
    const ws = wb.Sheets[wb.SheetNames[0]];

    /* Get all rows as raw arrays so we can locate the header row ourselves */
    const allArrays = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" }) as any[][];
    if (allArrays.length === 0) return res.status(400).json({ message: "ໄຟລ໌ຫວ່າງ — ບໍ່ມີຂໍ້ມູນ" });

    /* Scan first 15 rows for the best header row (most cells matching aliases).
       This handles files with title/blank rows above the actual header. */
    let headerRowIdx = -1;
    let bestCount = 0;
    for (let i = 0; i < Math.min(15, allArrays.length); i++) {
      const count = (allArrays[i] as any[]).filter((c: any) => {
        const ck = cleanKey(String(c));
        return (ck in CLEANED_ALIASES) || (stripLaoVowels(ck) in STRIPPED_ALIASES);
      }).length;
      if (count > bestCount) { bestCount = count; headerRowIdx = i; }
    }

    /* Require at least 2 alias matches to be confident it is a header row */
    const headerFound = headerRowIdx >= 0 && bestCount >= 2;
    let rawHeaders: string[];
    let dataRows: Record<string, any>[];
    let noHeader = false;

    if (headerFound) {
      rawHeaders = (allArrays[headerRowIdx] as any[]).map((c: any) => String(c));
      const arrays = allArrays
        .slice(headerRowIdx + 1)
        .filter((row: any[]) => row.some((c: any) => String(c ?? "").trim() !== ""));
      dataRows = arrays.map((rowArr: any[]) => {
        const obj: Record<string, any> = {};
        rawHeaders.forEach((h, i) => { obj[h] = rowArr[i] ?? ""; });
        return obj;
      });
    } else {
      /* No recognizable header row — still parse (all rows will fail validation)
         so the user can see what the system found in the file */
      noHeader = true;
      rawHeaders = (allArrays[0] as any[]).map((c: any) => String(c));
      const arrays = allArrays.filter((row: any[]) =>
        row.some((c: any) => String(c ?? "").trim() !== "")
      );
      dataRows = arrays.map((rowArr: any[]) => {
        const obj: Record<string, any> = {};
        rawHeaders.forEach((h, i) => { obj[h] = rowArr[i] ?? ""; });
        return obj;
      });
    }

    if (dataRows.length === 0) return res.status(400).json({ message: "ໄຟລ໌ຫວ່າງ — ບໍ່ມີຂໍ້ມູນ" });

    /* Build column detection map — exact first, stripped-vowel fallback second */
    const detectedMap: Record<string, string> = {};
    for (const h of rawHeaders) {
      const ck = cleanKey(h);
      if (ck in CLEANED_ALIASES) {
        detectedMap[h] = CLEANED_ALIASES[ck];
      } else {
        const sk = stripLaoVowels(ck);
        if (sk in STRIPPED_ALIASES) detectedMap[h] = STRIPPED_ALIASES[sk];
      }
    }
    const detectedKeys = Object.values(detectedMap);
    const hasfirstname = detectedKeys.includes("firstname");

    /* Build suggestions for unrecognized columns */
    const columnSuggestions: Record<string, string> = {};
    for (const h of rawHeaders) {
      if (!(h in detectedMap)) {
        const suggestion = suggestColumn(h);
        if (suggestion) columnSuggestions[h] = suggestion;
      }
    }

    const parsed  = dataRows.map((r, i) => parseRow(r, i));
    const valid   = parsed.filter(r => !r.error).length;
    const invalid = parsed.filter(r => r.error).length;

    res.json({
      total: parsed.length, valid, invalid, rows: parsed,
      columns_found:      rawHeaders,
      columns_mapped:     detectedMap,
      column_suggestions: columnSuggestions,
      has_firstname:      hasfirstname,
      no_header:          noHeader,
      header_row_at:      headerFound ? headerRowIdx + 1 : null,
    });
  } catch (err) {
    console.error("IMPORT PREVIEW ERROR", err);
    res.status(400).json({ message: "ໄຟລ໌ບໍ່ຖືກຕ້ອງ" });
  }
});

/* ── Shared: insert one batch of rows using the provided DB client.
   Each row is wrapped in a SAVEPOINT so a bad row rolls back only itself. ── */
async function commitRows(
  client: any,
  rows: any[],
  company_id: number,
  userId: number | null
): Promise<{ inserted: number; skipped: number; errors: string[] }> {
  let inserted = 0;
  let skipped  = 0;
  const errors: string[] = [];

  for (const r of rows) {
    if (!r.firstname) {
      skipped++;
      errors.push(`Row ${r.row}: ບໍ່ມີ First Name`);
      continue;
    }
    try {
      await client.query("SAVEPOINT row_sp");

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

      const empRes = await client.query(
        `INSERT INTO employees
           (company_id, employee_code, firstname, lastname, gender, date_of_birth,
            nationality, email, contact_no, position, employee_type,
            hired_at, status, resigned_at,
            province, district, village,
            dormitory, room_no, office_building, room_id, photo)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22)
         ON CONFLICT DO NOTHING RETURNING employee_id`,
        [
          company_id,       r.employee_code   || null, r.firstname,
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

      if (!empRes.rows.length) {
        await client.query("RELEASE SAVEPOINT row_sp");
        skipped++;
        continue;
      }
      const employee_id = empRes.rows[0].employee_id;

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

      await client.query(
        `INSERT INTO audit_log (company_id, user_id, action, entity_type, entity_id, after_data)
         VALUES ($1,$2,'IMPORT','employee',$3,$4::jsonb)`,
        [company_id, userId, employee_id, JSON.stringify({
          employee_code: r.employee_code, firstname: r.firstname,
          lastname: r.lastname,           position:  r.position,
          employee_type: r.employee_type, hired_at:  r.hired_at,
        })]
      );

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

  return { inserted, skipped, errors };
}

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
    res.json({ ...result, errors: result.errors.slice(0, 50) });
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
