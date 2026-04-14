import { NextRequest, NextResponse } from "next/server";
import { COOKIE_NAME, verifySessionToken } from "@/lib/auth";
import { isCloudinaryEnabled } from "@/lib/cloudinary";

/** Signed-in storage status for upload UX warnings. */
export async function GET(req: NextRequest) {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  const session = token ? await verifySessionToken(token) : null;
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const cloudinaryEnabled = isCloudinaryEnabled();
  return NextResponse.json({
    storage: {
      mode: cloudinaryEnabled ? "cloudinary" : "local-fallback",
      cloudinaryEnabled,
      notes: cloudinaryEnabled
        ? "Uploads use Cloudinary."
        : "Cloudinary is not configured. Large files may fail on some deployments.",
    },
  });
}
