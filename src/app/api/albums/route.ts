import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { Album } from "@/models/Album";
import { COOKIE_NAME, verifySessionToken } from "@/lib/auth";

/** List folders the signed-in family member can use when uploading or filtering. */
export async function GET(req: NextRequest) {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  const session = token ? await verifySessionToken(token) : null;
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const scope = searchParams.get("scope") as "family" | "personal" | null;
  const ownerUserId = searchParams.get("ownerUserId");

  await connectDB();

  if (scope === "family") {
    const albums = await Album.find({ scope: "family" }).sort({ name: 1 }).lean();
    return NextResponse.json({
      albums: albums.map((a) => ({
        id: a._id.toString(),
        name: a.name,
        description: a.description,
        scope: a.scope,
        ownerUserId: a.ownerUserId ? a.ownerUserId.toString() : null,
      })),
    });
  }

  if (scope === "personal" && ownerUserId) {
    const albums = await Album.find({ scope: "personal", ownerUserId }).sort({ name: 1 }).lean();
    return NextResponse.json({
      albums: albums.map((a) => ({
        id: a._id.toString(),
        name: a.name,
        description: a.description,
        scope: a.scope,
        ownerUserId: a.ownerUserId ? a.ownerUserId.toString() : null,
      })),
    });
  }

  return NextResponse.json({ error: "Use scope=family or scope=personal&ownerUserId=" }, { status: 400 });
}
