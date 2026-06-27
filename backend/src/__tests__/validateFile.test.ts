/* Unit tests for magic-byte file validation — this is what stops someone renaming
   a malicious file to .jpg/.pdf and slipping past a MIME-header-only check. */
import { isImageBuffer, isPdfBuffer, isSpreadsheetBuffer, validateUpload } from "../utils/validateFile";

const JPEG = Buffer.from([0xff, 0xd8, 0xff, 0x00, 0x00]);
const PNG  = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00]);
const WEBP = Buffer.from([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50]);
const PDF  = Buffer.from("%PDF-1.4 fake");
const XLSX = Buffer.from([0x50, 0x4b, 0x03, 0x04, 0x00, 0x00]); // zip-based
const TEXT_RENAMED_AS_IMAGE = Buffer.from("<script>alert(1)</script>");

describe("magic-byte validation", () => {
  test("ຮັບຮູບ jpeg/png/webp ທີ່ແທ້", () => {
    expect(isImageBuffer(JPEG)).toBe(true);
    expect(isImageBuffer(PNG)).toBe(true);
    expect(isImageBuffer(WEBP)).toBe(true);
  });

  test("ໄຟລ໌ text ປອມເປັນຮູບ (ປ່ຽນແຕ່ນາມສະກຸນ) — ຕ້ອງຖືກປະຕິເສດ", () => {
    expect(isImageBuffer(TEXT_RENAMED_AS_IMAGE)).toBe(false);
  });

  test("ໄຟລ໌ເປົ່າ — ປະຕິເສດ", () => {
    expect(isImageBuffer(Buffer.alloc(0))).toBe(false);
  });

  test("PDF ແທ້ ຖືກຮັບ, ຮູບບໍ່ນັບເປັນ PDF", () => {
    expect(isPdfBuffer(PDF)).toBe(true);
    expect(isPdfBuffer(JPEG)).toBe(false);
  });

  test("xlsx (zip-based) ຖືກຮັບເປັນ spreadsheet, PDF ບໍ່ນັບ", () => {
    expect(isSpreadsheetBuffer(XLSX)).toBe(true);
    expect(isSpreadsheetBuffer(PDF)).toBe(false);
  });

  test("validateUpload: ປະເພດ image ປະຕິເສດໄຟລ໌ປອມ, ຮັບໄຟລ໌ແທ້", () => {
    expect(validateUpload(TEXT_RENAMED_AS_IMAGE, "image")).toMatch(/ອະນຸຍາດ|allow/i);
    expect(validateUpload(JPEG, "image")).toBeNull();
  });

  test("validateUpload: ປະເພດ image_or_pdf ຮັບທັງ 2 ແບບ", () => {
    expect(validateUpload(JPEG, "image_or_pdf")).toBeNull();
    expect(validateUpload(PDF, "image_or_pdf")).toBeNull();
    expect(validateUpload(XLSX, "image_or_pdf")).not.toBeNull();
  });

  test("validateUpload: ປະເພດ spreadsheet ປະຕິເສດ PDF", () => {
    expect(validateUpload(XLSX, "spreadsheet")).toBeNull();
    expect(validateUpload(PDF, "spreadsheet")).not.toBeNull();
  });
});
