import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { Photo } from "@/models/Photo";
import { User } from "@/models/User";
import { COOKIE_NAME, verifySessionToken } from "@/lib/auth";
import type { MediaType } from "@/models/Photo";

/**
 * Photos uploaded on this calendar day in any year ("on this day" memories).
 * Uses UTC month/day so results are stable regardless of client timezone.
 */
export async function GET(req: NextRequest) {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  const session = token ? await verifySessionToken(token) : null;
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const month = now.getUTCMonth() + 1;
  const day = now.getUTCDate();

  await connectDB();
  const rows = await Photo.find({
    $expr: {
      $and: [
        { $eq: [{ $month: "$createdAt" }, month] },
        { $eq: [{ $dayOfMonth: "$createdAt" }, day] },
      ],
    },
  })
    .sort({ createdAt: -1 })
    .limit(24)
    .lean();

  const uploaderIds = [...new Set(rows.map((p) => p.uploadedBy.toString()))];
  const uploaders = await User.find({ _id: { $in: uploaderIds } }).select("name").lean();
  const nameById = new Map(uploaders.map((u) => [u._id.toString(), u.name]));

  const photos = rows.map((p) => ({
    id: p._id.toString(),
    publicPath: p.publicPath,
    caption: p.caption,
    galleryType: p.galleryType,
    category: p.category,
    ownerUserId: p.ownerUserId ? p.ownerUserId.toString() : null,
    uploadedBy: p.uploadedBy.toString(),
    albumId: p.albumId ? p.albumId.toString() : null,
    mediaType: (p.mediaType as MediaType) || "image",
    mimeType: p.mimeType || "",
    originalFilename: p.originalFilename || "",
    createdAt: p.createdAt.toISOString(),
    uploaderName: nameById.get(p.uploadedBy.toString()),
  }));

  return NextResponse.json({
    photos,
    monthDayLabel: now.toLocaleDateString("en-US", { month: "long", day: "numeric", timeZone: "UTC" }),
  });
}
