import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { Album } from "@/models/Album";
import { requireAdmin } from "@/lib/admin";

export async function GET(req: NextRequest) {
  const gate = await requireAdmin(req);
  if (!gate.ok) return gate.response;

  await connectDB();
  const albums = await Album.find().sort({ scope: 1, name: 1 }).lean();
  return NextResponse.json({
    albums: albums.map((a) => ({
      id: a._id.toString(),
      name: a.name,
      description: a.description,
      scope: a.scope,
      ownerUserId: a.ownerUserId ? a.ownerUserId.toString() : null,
      visibility: a.visibility ?? "all",
      allowedUserIds: (a.allowedUserIds ?? []).map((x: { toString: () => string }) => x.toString()),
      createdBy: a.createdBy.toString(),
      createdAt: a.createdAt.toISOString(),
    })),
  });
}

export async function POST(req: NextRequest) {
  const gate = await requireAdmin(req);
  if (!gate.ok) return gate.response;

  const body = await req.json();
  const name = String(body.name ?? "").trim();
  const description = String(body.description ?? "").trim();
  const scope = String(body.scope ?? "") as "family" | "personal";
  const ownerUserId = body.ownerUserId ? String(body.ownerUserId) : null;
  const visibility = body.visibility === "restricted" ? "restricted" : "all";
  const allowedUserIds = Array.isArray(body.allowedUserIds)
    ? body.allowedUserIds.map((x: unknown) => String(x)).filter(Boolean)
    : [];

  if (!name || (scope !== "family" && scope !== "personal")) {
    return NextResponse.json({ error: "name and scope family|personal required" }, { status: 400 });
  }
  if (scope === "personal" && !ownerUserId) {
    return NextResponse.json({ error: "ownerUserId required for personal albums" }, { status: 400 });
  }

  await connectDB();
  const doc = await Album.create({
    name,
    description,
    scope,
    ownerUserId: scope === "personal" ? ownerUserId : null,
    visibility,
    allowedUserIds,
    createdBy: gate.ctx.session.sub,
  });

  return NextResponse.json({
    album: {
      id: doc._id.toString(),
      name: doc.name,
      description: doc.description,
      scope: doc.scope,
      ownerUserId: doc.ownerUserId ? doc.ownerUserId.toString() : null,
      visibility: doc.visibility,
      allowedUserIds: (doc.allowedUserIds ?? []).map((x: { toString: () => string }) => x.toString()),
    },
  });
}
