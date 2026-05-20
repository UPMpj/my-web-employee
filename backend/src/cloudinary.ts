import { v2 as cloudinary } from "cloudinary";
import { Readable } from "stream";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function uploadToCloudinary(buffer: Buffer, folder = "employees"): Promise<string> {
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

export async function deleteFromCloudinary(url: string): Promise<void> {
  try {
    const parts = url.split("/");
    const folder = parts[parts.length - 2];
    const filename = parts[parts.length - 1].replace(/\.[^.]+$/, "");
    await cloudinary.uploader.destroy(`${folder}/${filename}`);
  } catch {}
}
