import { NextRequest, NextResponse } from "next/server";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import { connectDB } from "@/lib/mongodb";
import { Photo } from "@/models/Photo";
import { Album } from "@/models/Album";
import { User } from "@/models/User";
import { COOKIE_NAME, verifySessionToken } from "@/lib/auth";
import type { FamilyCategory, MediaType } from "@/models/Photo";
import { FAMILY_CATEGORIES } from "@/utils/constants";
import { sendPushToAll } from "@/lib/web-push";

type MimeRule = { mediaType: MediaType; ext: string; maxBytes: number };

const MIME_RULES = new Map<string, MimeRule>([
  ["image/jpeg", { mediaType: "image", ext: ".jpg", maxBytes: 20 * 1024 * 1024 }],
  ["image/png", { mediaType: "image", ext: ".png", maxBytes: 20 * 1024 * 1024 }],
  ["image/webp", { mediaType: "image", ext: ".webp", maxBytes: 20 * 1024 * 1024 }],
  ["image/gif", { mediaType: "image", ext: ".gif", maxBytes: 25 * 1024 * 1024 }],
  ["video/mp4", { mediaType: "video", ext: ".mp4", maxBytes: 120 * 1024 * 1024 }],
  ["video/webm", { mediaType: "video", ext: ".webm", maxBytes: 120 * 1024 * 1024 }],
  ["video/quicktime", { mediaType: "video", ext: ".mov", maxBytes: 120 * 1024 * 1024 }],
  ["application/pdf", { mediaType: "file", ext: ".pdf", maxBytes: 40 * 1024 * 1024 }],
]);
const MAX_INLINE_BYTES = 4 * 1024 * 1024;

function isFamilyCategory(c: string): c is FamilyCategory {
  return (FAMILY_CATEGORIES as readonly string[]).includes(c);
}

function mapPhoto(p: {
  _id: { toString: () => string };
  publicPath: string;
  caption: string;
  galleryType: string;
  category: string;
  ownerUserId: { toString: () => string } | null | undefined;
  uploadedBy: { toString: () => string };
  albumId?: { toString: () => string } | null;
  mediaType?: string;
  mimeType?: string;
  originalFilename?: string;
  createdAt: Date;
}): {
  id: string;
  publicPath: string;
  caption: string;
  galleryType: string;
  category: string;
  ownerUserId: string | null;
  uploadedBy: string;
  albumId: string | null;
  mediaType: MediaType;
  mimeType: string;
  originalFilename: string;
  createdAt: string;
} {
  return {
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
  };
}

/** List media with optional search, filters, and album folder. */
export async function GET(req: NextRequest) {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  const session = token ? await verifySessionToken(token) : null;
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const galleryType = searchParams.get("galleryType") as "personal" | "family" | null;
  const ownerId = searchParams.get("ownerUserId");
  const category = searchParams.get("category");
  const uploadedBy = searchParams.get("uploadedBy");
  const albumParam = searchParams.get("albumId");
  const q = searchParams.get("q")?.trim();

  await connectDB();

  const filter: Record<string, unknown> = {};

  if (galleryType === "personal") {
    filter.galleryType = "personal";
    if (ownerId) filter.ownerUserId = ownerId;
  } else if (galleryType === "family") {
    filter.galleryType = "family";
    if (category && isFamilyCategory(category)) filter.category = category;
    if (uploadedBy) filter.uploadedBy = uploadedBy;
  } else {
    return NextResponse.json({ error: "galleryType=personal|family required" }, { status: 400 });
  }

  if (albumParam === "none") {
    filter.albumId = null;
  } else if (albumParam) {
    filter.albumId = albumParam;
  }

  if (q) {
    filter.$or = [
      { caption: { $regex: q, $options: "i" } },
      { publicPath: { $regex: q, $options: "i" } },
      { originalFilename: { $regex: q, $options: "i" } },
    ];
  }

  const photos = await Photo.find(filter).sort({ createdAt: -1 }).limit(200).lean();
  const uploaderIds = [...new Set(photos.map((p) => p.uploadedBy.toString()))];
  const uploaders = await User.find({ _id: { $in: uploaderIds } })
    .select("name")
    .lean();
  const nameById = new Map(uploaders.map((u) => [u._id.toString(), u.name]));

  return NextResponse.json({
    photos: photos.map((p) => ({
      ...mapPhoto(p),
      uploaderName: nameById.get(p.uploadedBy.toString()),
    })),
  });
}

/** Multipart upload: images, short videos, or PDFs into personal or family galleries / folders. */
export async function POST(req: NextRequest) {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  const session = token ? await verifySessionToken(token) : null;
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof Blob)) {
    return NextResponse.json({ error: "file required" }, { status: 400 });
  }

  const galleryType = String(form.get("galleryType") ?? "");
  if (galleryType !== "personal" && galleryType !== "family") {
    return NextResponse.json({ error: "galleryType personal|family" }, { status: 400 });
  }

  const caption = String(form.get("caption") ?? "").slice(0, 2000);
  let category: FamilyCategory = "General";
  const catRaw = String(form.get("category") ?? "General");
  if (isFamilyCategory(catRaw)) category = catRaw;

  await connectDB();
  const me = await User.findById(session.sub).lean();
  const isAdmin = !!me?.isAdmin;

  let ownerUserId: string | null = session.sub;
  if (galleryType === "personal") {
    const requestedOwner = form.get("ownerUserId");
    const oid = requestedOwner ? String(requestedOwner) : session.sub;
    if (!isAdmin && oid !== session.sub) {
      return NextResponse.json({ error: "You can only upload to your own gallery" }, { status: 403 });
    }
    if (isAdmin && oid !== session.sub) {
      const exists = await User.exists({ _id: oid });
      if (!exists) {
        return NextResponse.json({ error: "Member not found for personal gallery" }, { status: 400 });
      }
    }
    ownerUserId = oid;
  } else {
    ownerUserId = null;
  }

  const albumIdRaw = form.get("albumId");
  const albumIdStr = albumIdRaw ? String(albumIdRaw) : "";
  let albumObjectId: import("mongoose").Types.ObjectId | null = null;
  if (albumIdStr) {
    const album = await Album.findById(albumIdStr);
    if (!album) {
      return NextResponse.json({ error: "Album not found" }, { status: 400 });
    }
    if (galleryType === "family" && album.scope !== "family") {
      return NextResponse.json({ error: "That folder is not a family album" }, { status: 400 });
    }
    if (galleryType === "personal") {
      if (album.scope !== "personal" || album.ownerUserId?.toString() !== ownerUserId) {
        return NextResponse.json({ error: "That folder does not belong to this gallery" }, { status: 400 });
      }
    }
    albumObjectId = album._id;
  }

  const mime = file.type || "application/octet-stream";
  const rule = MIME_RULES.get(mime);
  if (!rule) {
    return NextResponse.json(
      { error: "Unsupported type. Use image, MP4/WebM/MOV video, or PDF." },
      { status: 400 }
    );
  }

  const buf = Buffer.from(await file.arrayBuffer());
  if (buf.length > rule.maxBytes) {
    return NextResponse.json({ error: "File too large for this type" }, { status: 400 });
  }

  const id = randomUUID();
  const filename = `${id}${rule.ext}`;
  const uploadDir = path.join(process.cwd(), "public", "uploads", "media");
  let publicPath: string;
  try {
    await mkdir(uploadDir, { recursive: true });
    const fsPath = path.join(uploadDir, filename);
    await writeFile(fsPath, buf);
    publicPath = `/uploads/media/${filename}`;
  } catch {
    // Vercel runtime file system is read-only; keep smaller assets inline in MongoDB.
    if (buf.length > MAX_INLINE_BYTES) {
      return NextResponse.json(
        {
          error:
            "Upload failed on this deployment for larger files. Please upload up to 4 MB or configure cloud storage (S3/Cloudinary).",
        },
        { status: 413 }
      );
    }
    publicPath = `data:${mime};base64,${buf.toString("base64")}`;
  }
  const origName =
    typeof (file as File).name === "string" ? String((file as File).name).slice(0, 500) : "";

  const doc = await Photo.create({
    publicPath,
    caption,
    galleryType,
    category: galleryType === "family" ? category : "General",
    ownerUserId: galleryType === "personal" ? ownerUserId : null,
    uploadedBy: session.sub,
    albumId: albumObjectId,
    mediaType: rule.mediaType,
    mimeType: mime,
    originalFilename: origName,
  });

  const uploaderName = me?.name ?? "A family member";
  const target =
    galleryType === "family"
      ? "family gallery"
      : isAdmin && ownerUserId && ownerUserId !== session.sub
        ? "a member gallery"
        : "their gallery";
  void sendPushToAll(
    {
      title: "New upload",
      body: `${uploaderName} uploaded to ${target}`,
      url: galleryType === "family" ? "/family" : `/profile/${ownerUserId ?? session.sub}`,
    },
    { excludeUserId: session.sub }
  );

  return NextResponse.json({
    photo: {
      ...mapPhoto(doc),
      uploaderName: undefined,
    },
  });
}
