import { v2 as cloudinary } from "cloudinary";

let configured = false;

function ensureConfig() {
  if (configured) return;
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  if (!cloudName || !apiKey || !apiSecret) return;
  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
    secure: true,
  });
  configured = true;
}

export function isCloudinaryEnabled() {
  ensureConfig();
  return configured;
}

type UploadOptions = {
  folder: string;
  resourceType: "image" | "video" | "raw" | "auto";
  publicId?: string;
};

export async function uploadBufferToCloudinary(
  buf: Buffer,
  _mimeType: string,
  options: UploadOptions
): Promise<string | null> {
  ensureConfig();
  if (!configured) return null;
  return new Promise<string>((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: options.folder,
        resource_type: options.resourceType,
        public_id: options.publicId,
      },
      (err, result) => {
        if (err || !result?.secure_url) {
          reject(err ?? new Error("Cloudinary upload failed"));
          return;
        }
        resolve(result.secure_url);
      }
    );
    stream.end(buf);
  }).catch(() => null);
}

export function toDataUrl(mimeType: string, buf: Buffer) {
  return `data:${mimeType};base64,${buf.toString("base64")}`;
}
