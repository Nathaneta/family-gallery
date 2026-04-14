import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { isCloudinaryEnabled } from "@/lib/cloudinary";

function maskCloudName(name: string) {
  if (name.length <= 4) return `${name.slice(0, 1)}***`;
  return `${name.slice(0, 2)}***${name.slice(-2)}`;
}

/** Admin-only storage info for upload troubleshooting. */
export async function GET(req: NextRequest) {
  const gate = await requireAdmin(req);
  if (!gate.ok) return gate.response;

  const cloudinaryEnabled = isCloudinaryEnabled();
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME || "";

  return NextResponse.json({
    storage: {
      mode: cloudinaryEnabled ? "cloudinary" : "local-fallback",
      cloudinaryEnabled,
      cloudName: cloudName ? maskCloudName(cloudName) : null,
      notes: cloudinaryEnabled
        ? "New uploads are saved to Cloudinary."
        : "Cloudinary env vars missing. Uploads use local disk or data URL fallback.",
    },
  });
}
