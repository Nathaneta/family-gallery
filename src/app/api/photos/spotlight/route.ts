import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { Photo } from "@/models/Photo";
import { COOKIE_NAME, verifySessionToken } from "@/lib/auth";

/** One random image from the family gallery — “spotlight” on the dashboard. */
export async function GET(req: NextRequest) {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  const session = token ? await verifySessionToken(token) : null;
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectDB();
  const [doc] = await Photo.aggregate([
    { $match: { galleryType: "family", mediaType: "image" } },
    { $sample: { size: 1 } },
    { $project: { publicPath: 1, caption: 1, category: 1, createdAt: 1 } },
  ]);

  if (!doc) {
    return NextResponse.json({ photo: null });
  }

  return NextResponse.json({
    photo: {
      publicPath: doc.publicPath,
      caption: doc.caption ?? "",
      category: doc.category ?? "",
      createdAt: doc.createdAt instanceof Date ? doc.createdAt.toISOString() : doc.createdAt,
    },
  });
}
