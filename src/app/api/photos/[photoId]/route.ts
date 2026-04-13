import { NextRequest, NextResponse } from "next/server";
import { unlink } from "fs/promises";
import path from "path";
import mongoose from "mongoose";
import { connectDB } from "@/lib/mongodb";
import { Photo } from "@/models/Photo";
import { Album } from "@/models/Album";
import { User } from "@/models/User";
import { COOKIE_NAME, verifySessionToken } from "@/lib/auth";
import type { FamilyCategory } from "@/models/Photo";
import { FAMILY_CATEGORIES } from "@/utils/constants";

function isFamilyCategory(c: string): c is FamilyCategory {
  return (FAMILY_CATEGORIES as readonly string[]).includes(c);
}

async function resolvePublicFile(publicPath: string): Promise<string | null> {
  if (!publicPath.startsWith("/uploads/")) return null;
  const rel = publicPath.replace(/^\//, "");
  return path.join(process.cwd(), "public", rel);
}

async function albumMatchesPhoto(
  photo: { galleryType: string; ownerUserId: { toString: () => string } | null | undefined },
  albumId: string | null
): Promise<boolean> {
  if (albumId === null) return true;
  const album = await Album.findById(albumId);
  if (!album) return false;
  if (photo.galleryType === "family") return album.scope === "family";
  const owner = photo.ownerUserId?.toString() ?? "";
  return album.scope === "personal" && album.ownerUserId?.toString() === owner;
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ photoId: string }> }) {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  const session = token ? await verifySessionToken(token) : null;
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { photoId } = await ctx.params;
  const body = await req.json().catch(() => ({}));
  await connectDB();

  const photo = await Photo.findById(photoId);
  if (!photo) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const user = await User.findById(session.sub);
  const isAdmin = !!user?.isAdmin;
  const isUploader = photo.uploadedBy.toString() === session.sub;
  if (!isAdmin && !isUploader) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (body.caption !== undefined) {
    photo.caption = String(body.caption).slice(0, 2000);
  }

  if (body.category !== undefined && photo.galleryType === "family") {
    const c = String(body.category);
    if (isFamilyCategory(c)) photo.category = c;
  }

  if (body.albumId !== undefined) {
    const raw = body.albumId;
    const nextAlbum: string | null =
      raw === null || raw === "" ? null : String(raw);
    if (!(await albumMatchesPhoto(photo, nextAlbum))) {
      return NextResponse.json(
        { error: "That folder does not belong to this gallery." },
        { status: 400 }
      );
    }
    photo.albumId = nextAlbum ? new mongoose.Types.ObjectId(nextAlbum) : null;
  }

  await photo.save();

  return NextResponse.json({
    photo: {
      id: photo._id.toString(),
      publicPath: photo.publicPath,
      caption: photo.caption,
      galleryType: photo.galleryType,
      category: photo.category,
      ownerUserId: photo.ownerUserId ? photo.ownerUserId.toString() : null,
      uploadedBy: photo.uploadedBy.toString(),
      albumId: photo.albumId ? photo.albumId.toString() : null,
      mediaType: photo.mediaType,
      mimeType: photo.mimeType,
      originalFilename: photo.originalFilename,
      createdAt: photo.createdAt.toISOString(),
    },
  });
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ photoId: string }> }) {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  const session = token ? await verifySessionToken(token) : null;
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { photoId } = await ctx.params;
  await connectDB();
  const photo = await Photo.findById(photoId);
  if (!photo) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const user = await User.findById(session.sub);
  const isAdmin = !!user?.isAdmin;
  const isUploader = photo.uploadedBy.toString() === session.sub;
  if (!isAdmin && !isUploader) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const fsPath = await resolvePublicFile(photo.publicPath);
  await Photo.deleteOne({ _id: photo._id });
  if (fsPath) {
    try {
      await unlink(fsPath);
    } catch {
      /* file may already be missing */
    }
  }

  return NextResponse.json({ ok: true });
}
