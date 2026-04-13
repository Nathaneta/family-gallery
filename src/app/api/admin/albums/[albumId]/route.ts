import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { Album } from "@/models/Album";
import { Photo } from "@/models/Photo";
import { requireAdmin } from "@/lib/admin";

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ albumId: string }> }) {
  const gate = await requireAdmin(req);
  if (!gate.ok) return gate.response;

  const { albumId } = await ctx.params;
  const body = await req.json();
  const name = body.name !== undefined ? String(body.name).trim() : undefined;
  const description = body.description !== undefined ? String(body.description).trim() : undefined;

  await connectDB();
  const album = await Album.findById(albumId);
  if (!album) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (name !== undefined) album.name = name;
  if (description !== undefined) album.description = description;
  await album.save();

  return NextResponse.json({
    album: {
      id: album._id.toString(),
      name: album.name,
      description: album.description,
      scope: album.scope,
      ownerUserId: album.ownerUserId ? album.ownerUserId.toString() : null,
    },
  });
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ albumId: string }> }) {
  const gate = await requireAdmin(req);
  if (!gate.ok) return gate.response;

  const { albumId } = await ctx.params;
  await connectDB();
  const album = await Album.findById(albumId);
  if (!album) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await Photo.updateMany({ albumId: album._id }, { $set: { albumId: null } });
  await Album.deleteOne({ _id: album._id });
  return NextResponse.json({ ok: true });
}
