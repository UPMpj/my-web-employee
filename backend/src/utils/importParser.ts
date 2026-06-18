/* ── All column aliases → internal key (lowercase for matching) ── */
export const COL_ALIASES: Record<string, string> = {
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
export const CANONICAL_NAMES: Record<string, string> = {
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
export function thaiToLao(s: string): string {
  return s.replace(/[ก-๛]/g, ch => {
    const lao = ch.charCodeAt(0) + 0x80;
    return lao >= 0x0E81 && lao <= 0x0EFF ? String.fromCharCode(lao) : ch;
  });
}

/* Strip BOM and normalize whitespace from a string */
export function cleanKey(k: string): string {
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
export function stripLaoVowels(s: string): string {
  // EB1=ັ  EB4-EBC=ິີຶື຺ຸູົຼ  EC8-ECD=່້໊໋໌ໍ
  return s.replace(/[ັິ-ຼ່-ໍ]/g, "");
}

/* Pre-build a cleaned alias map so Lao/Unicode chars match regardless of source */
export const CLEANED_ALIASES: Record<string, string> = {};
for (const [alias, internal] of Object.entries(COL_ALIASES)) {
  CLEANED_ALIASES[cleanKey(alias)] = internal;
}

/* Fallback: stripped-vowel map so ຕຶກ / ຕືກ / ຕິກ all resolve to the same key */
export const STRIPPED_ALIASES: Record<string, string> = {};
for (const [ck, internal] of Object.entries(CLEANED_ALIASES)) {
  const sk = stripLaoVowels(ck);
  if (!(sk in STRIPPED_ALIASES)) STRIPPED_ALIASES[sk] = internal;
}

/* Bigram similarity — works for both Latin and Lao text */
export function bigramSimilarity(a: string, b: string): number {
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
export function suggestColumn(rawHeader: string): string | null {
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

export function normalizeRow(r: Record<string, any>): Record<string, any> {
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

export function parseDate(val: any): string {
  if (!val) return "";
  if (val instanceof Date) return val.toISOString().slice(0, 10);
  const s = String(val).trim();
  if (!s) return "";
  const d = new Date(s);
  return isNaN(d.getTime()) ? s : d.toISOString().slice(0, 10);
}

export function str(v: any): string { return String(v ?? "").trim(); }

/* ── parse a single Excel row ── */
export function parseRow(rawRow: Record<string, any>, i: number) {
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
