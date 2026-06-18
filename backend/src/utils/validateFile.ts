/**
 * Magic-byte validation for uploaded files.
 * Checks actual file content, not just the browser-supplied MIME header.
 */

const SIGNATURES = {
  jpeg: [0xff, 0xd8, 0xff],
  png:  [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a],
  gif:  [0x47, 0x49, 0x46, 0x38],
  pdf:  [0x25, 0x50, 0x44, 0x46],           // %PDF
  xlsx: [0x50, 0x4b, 0x03, 0x04],           // PK (ZIP-based Office)
  xls:  [0xd0, 0xcf, 0x11, 0xe0],           // Compound Document
};

function matchesSig(buf: Buffer, sig: number[]): boolean {
  if (buf.length < sig.length) return false;
  return sig.every((byte, i) => buf[i] === byte);
}

function isWebP(buf: Buffer): boolean {
  // RIFF....WEBP
  return (
    buf.length >= 12 &&
    matchesSig(buf, [0x52, 0x49, 0x46, 0x46]) &&
    buf[8] === 0x57 && buf[9] === 0x45 && buf[10] === 0x42 && buf[11] === 0x50
  );
}

export function isImageBuffer(buf: Buffer): boolean {
  return (
    matchesSig(buf, SIGNATURES.jpeg) ||
    matchesSig(buf, SIGNATURES.png)  ||
    matchesSig(buf, SIGNATURES.gif)  ||
    isWebP(buf)
  );
}

export function isPdfBuffer(buf: Buffer): boolean {
  return matchesSig(buf, SIGNATURES.pdf);
}

export function isImageOrPdfBuffer(buf: Buffer): boolean {
  return isImageBuffer(buf) || isPdfBuffer(buf);
}

export function isSpreadsheetBuffer(buf: Buffer): boolean {
  return matchesSig(buf, SIGNATURES.xlsx) || matchesSig(buf, SIGNATURES.xls);
}

/** Returns a descriptive error string, or null if valid. */
export function validateUpload(
  buf: Buffer,
  allow: "image" | "image_or_pdf" | "spreadsheet"
): string | null {
  if (!buf || buf.length === 0) return "Empty file";
  switch (allow) {
    case "image":
      return isImageBuffer(buf) ? null : "Only image files are allowed (JPEG, PNG, WebP, GIF)";
    case "image_or_pdf":
      return isImageOrPdfBuffer(buf) ? null : "Only image or PDF files are allowed";
    case "spreadsheet":
      return isSpreadsheetBuffer(buf) ? null : "Only Excel files are allowed (.xlsx, .xls)";
  }
}
