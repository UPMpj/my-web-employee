import { v2 as cloudinary } from "cloudinary";
import { Readable } from "stream";
import fs from "fs";
import path from "path";
import crypto from "crypto";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const isCloudinaryConfigured =
  !!process.env.CLOUDINARY_CLOUD_NAME &&
  process.env.CLOUDINARY_CLOUD_NAME !== "your_cloud_name" &&
  !!process.env.CLOUDINARY_API_KEY &&
  !!process.env.CLOUDINARY_API_SECRET &&
  process.env.CLOUDINARY_API_SECRET !== "PASTE_YOUR_SECRET_HERE";

/* ── Local fallback: save buffer to uploads/ and return URL path ── */
function saveLocal(buffer: Buffer, folder = "employees"): string {
  const uploadsDir = path.join(__dirname, "../uploads", folder);
  if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
  const ext  = detectExt(buffer);
  const name = `${Date.now()}_${crypto.randomBytes(4).toString("hex")}${ext}`;
  fs.writeFileSync(path.join(uploadsDir, name), buffer);
  return `/uploads/${folder}/${name}`;
}

function detectExt(buf: Buffer): string {
  if (buf[0] === 0xff && buf[1] === 0xd8) return ".jpg";
  if (buf[0] === 0x89 && buf[1] === 0x50) return ".png";
  if (buf[0] === 0x47 && buf[1] === 0x49) return ".gif";
  if (buf[0] === 0x52 && buf[1] === 0x49 && buf[8] === 0x57) return ".webp";
  return ".jpg";
}

export async function uploadToCloudinary(buffer: Buffer, folder = "employees"): Promise<string> {
  if (!isCloudinaryConfigured) return saveLocal(buffer, folder);

  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder, resource_type: "image", transformation: [{ width: 800, crop: "limit" }] },
      (err, result) => {
        if (err || !result) return reject(err || new Error("Upload failed"));
        resolve(result.secure_url);
      }
    );
    Readable.from(buffer).pipe(stream);
  });
}

/* For PDFs, Word docs, etc. — resource_type "auto" detects the format */
export async function uploadFileToCloudinary(buffer: Buffer, folder = "documents"): Promise<string> {
  if (!isCloudinaryConfigured) return saveLocal(buffer, folder);

  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder, resource_type: "auto" },
      (err, result) => {
        if (err || !result) return reject(err || new Error("Upload failed"));
        resolve(result.secure_url);
      }
    );
    Readable.from(buffer).pipe(stream);
  });
}

/* Backups contain sensitive data (password_hash etc.) — upload as a "private" Cloudinary
   asset so the file is never reachable via a guessable public URL. Returns the public_id,
   not a URL; use getBackupDownloadUrl() to mint a short-lived signed link on demand. */
export async function uploadBackupToCloudinary(buffer: Buffer, folder = "backups"): Promise<string> {
  if (!isCloudinaryConfigured) return saveLocal(buffer, folder);

  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder, resource_type: "raw", type: "private" },
      (err, result) => {
        if (err || !result) return reject(err || new Error("Upload failed"));
        resolve(result.public_id);
      }
    );
    Readable.from(buffer).pipe(stream);
  });
}

export function getBackupDownloadUrl(publicId: string): string {
  return cloudinary.utils.private_download_url(publicId, "zip", {
    resource_type: "raw",
    type: "private",
  });
}

/* Delete a file — local or Cloudinary */
export async function deleteFileFromCloudinary(url: string): Promise<void> {
  if (!url) return;
  if (!url.startsWith("http")) {
    /* local file */
    try {
      const filePath = path.join(__dirname, "../", url);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    } catch {}
    return;
  }
  try {
    const parts = url.split("/");
    const uploadIdx = parts.indexOf("upload");
    if (uploadIdx === -1) return;
    let startIdx = uploadIdx + 1;
    if (parts[startIdx]?.match(/^v\d+$/)) startIdx++;
    const publicId = parts.slice(startIdx).join("/").replace(/\.[^.]+$/, "");
    const resourceType = url.includes("/raw/") ? "raw" : url.includes("/video/") ? "video" : "image";
    await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
  } catch {}
}

export async function deleteFromCloudinary(url: string): Promise<void> {
  if (!url) return;
  if (!url.startsWith("http")) {
    try {
      const filePath = path.join(__dirname, "../", url);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    } catch {}
    return;
  }
  try {
    const parts = url.split("/");
    const folder = parts[parts.length - 2];
    const filename = parts[parts.length - 1].replace(/\.[^.]+$/, "");
    await cloudinary.uploader.destroy(`${folder}/${filename}`);
  } catch {}
}
