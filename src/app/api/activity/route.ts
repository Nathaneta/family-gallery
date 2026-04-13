import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { Photo } from "@/models/Photo";
import { User } from "@/models/User";
import { COOKIE_NAME, verifySessionToken } from "@/lib/auth";

/**
 * Recent uploads across the family — shown as lightweight "notifications" on the dashboard.
 */
export async function GET(req: NextRequest) {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  const session = token ? await verifySessionToken(token) : null;
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectDB();
  const recent = await Photo.find().sort({ createdAt: -1 }).limit(12).lean();
  const uploaderIds = [...new Set(recent.map((p) => p.uploadedBy.toString()))];
  const uploaders = await User.find({ _id: { $in: uploaderIds } }).select("name").lean();
  const nameById = new Map(uploaders.map((u) => [u._id.toString(), u.name]));

  const items = recent.map((p) => {
    const name = nameById.get(p.uploadedBy.toString()) ?? "Someone";
    const isFamily = p.galleryType === "family";
    const mt = p.mediaType ?? "image";
    const kind =
      mt === "video" ? "a video" : mt === "file" ? "a file" : isFamily ? "a family photo" : "their gallery";
    const label =
      isFamily && mt === "image"
        ? `${name} added a family photo`
        : isFamily
          ? `${name} added ${kind} to the family gallery`
          : `${name} updated their gallery`;
    return {
      id: p._id.toString(),
      message: label,
      createdAt: p.createdAt.toISOString(),
      thumbnailPath: p.publicPath,
      mediaType: mt,
    };
  });

  return NextResponse.json({ items });
}
