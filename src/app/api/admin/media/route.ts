import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { Photo } from "@/models/Photo";
import { User } from "@/models/User";
import { requireAdmin } from "@/lib/admin";

/** Recent uploads across the site — admin overview. */
export async function GET(req: NextRequest) {
  const gate = await requireAdmin(req);
  if (!gate.ok) return gate.response;

  await connectDB();
  const photos = await Photo.find().sort({ createdAt: -1 }).limit(150).lean();
  const uploaderIds = [...new Set(photos.map((p) => p.uploadedBy.toString()))];
  const uploaders = await User.find({ _id: { $in: uploaderIds } }).select("name").lean();
  const nameById = new Map(uploaders.map((u) => [u._id.toString(), u.name]));

  return NextResponse.json({
    photos: photos.map((p) => ({
      id: p._id.toString(),
      publicPath: p.publicPath,
      caption: p.caption,
      galleryType: p.galleryType,
      category: p.category,
      ownerUserId: p.ownerUserId ? p.ownerUserId.toString() : null,
      uploadedBy: p.uploadedBy.toString(),
      uploaderName: nameById.get(p.uploadedBy.toString()),
      albumId: p.albumId ? p.albumId.toString() : null,
      mediaType: p.mediaType ?? "image",
      mimeType: p.mimeType ?? "",
      originalFilename: p.originalFilename ?? "",
      createdAt: p.createdAt.toISOString(),
    })),
  });
}
