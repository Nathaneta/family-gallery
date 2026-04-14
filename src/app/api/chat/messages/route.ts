import { NextRequest, NextResponse } from "next/server";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import { connectDB } from "@/lib/mongodb";
import { User } from "@/models/User";
import { ChatMessage } from "@/models/ChatMessage";
import { COOKIE_NAME, verifySessionToken } from "@/lib/auth";
import { getOrCreateChatSettings } from "@/models/ChatSettings";
import { dmKeyFor } from "@/lib/dm-key";
import { jsonError } from "@/lib/http";
import { sendPushToAll, sendPushToUsers } from "@/lib/web-push";
import { isCloudinaryEnabled, toDataUrl, uploadBufferToCloudinary } from "@/lib/cloudinary";

/** Per-user data; never cache (proxies/CDN/browser could serve one member's payload to others). */
export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "private, no-store, max-age=0, must-revalidate" } as const;
const MAX_INLINE_BYTES = 4 * 1024 * 1024;
const CHAT_MIME_RULES = new Map<string, { type: "image" | "file"; ext: string; maxBytes: number }>([
  ["image/jpeg", { type: "image", ext: ".jpg", maxBytes: 15 * 1024 * 1024 }],
  ["image/png", { type: "image", ext: ".png", maxBytes: 15 * 1024 * 1024 }],
  ["image/webp", { type: "image", ext: ".webp", maxBytes: 15 * 1024 * 1024 }],
  ["image/gif", { type: "image", ext: ".gif", maxBytes: 20 * 1024 * 1024 }],
  ["application/pdf", { type: "file", ext: ".pdf", maxBytes: 25 * 1024 * 1024 }],
]);

function noStoreJson(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: NO_STORE });
}

function familyChatAllowed(settings: { familyChatEnabled?: boolean | null }) {
  return settings.familyChatEnabled !== false;
}

function dmChatAllowed(settings: { directMessagesEnabled?: boolean | null }) {
  return settings.directMessagesEnabled !== false;
}

function mapMessage(
  m: {
    _id: { toString: () => string };
    channel: string;
    dmKey: string | null;
    senderId: { toString: () => string };
    body: string;
    attachmentUrl?: string | null;
    attachmentType?: "image" | "file" | null;
    attachmentName?: string | null;
    attachmentMimeType?: string | null;
    seenBy?: { toString: () => string }[];
    editedAt?: Date | null;
    createdAt: Date;
  },
  names: Map<string, string>
) {
  return {
    id: m._id.toString(),
    channel: m.channel,
    dmKey: m.dmKey,
    senderId: m.senderId.toString(),
    senderName: names.get(m.senderId.toString()) ?? "Member",
    body: m.body,
    attachmentUrl: m.attachmentUrl ?? null,
    attachmentType: m.attachmentType ?? null,
    attachmentName: m.attachmentName ?? null,
    attachmentMimeType: m.attachmentMimeType ?? null,
    seenBy: (m.seenBy ?? []).map((x) => x.toString()),
    editedAt: m.editedAt ? m.editedAt.toISOString() : null,
    createdAt: m.createdAt.toISOString(),
  };
}

export async function GET(req: NextRequest) {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  const session = token ? await verifySessionToken(token) : null;
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const channel = searchParams.get("channel");
  const peerId = searchParams.get("peerId")?.trim();

  try {
    await connectDB();
  } catch {
    return NextResponse.json({ error: "Database unavailable" }, { status: 503 });
  }
  const settings = await getOrCreateChatSettings();

  if (channel === "family") {
    if (!familyChatAllowed(settings)) {
      return jsonError("Family chat is turned off", 403);
    }
    const rows = await ChatMessage.find({ channel: "family" })
      .sort({ createdAt: -1 })
      .limit(150)
      .lean();
    rows.reverse();
    const ids = [...new Set(rows.map((r) => r.senderId.toString()))];
    const users = await User.find({ _id: { $in: ids } })
      .select("name")
      .lean();
    const names = new Map(users.map((u) => [u._id.toString(), u.name]));
    return noStoreJson({ messages: rows.map((r) => mapMessage(r, names)) });
  }

  if (channel === "dm") {
    if (!dmChatAllowed(settings)) {
      return jsonError("Direct messages are turned off", 403);
    }
    if (!peerId || peerId === session.sub) {
      return jsonError("peerId required (another member)", 400);
    }
    const peer = await User.findById(peerId).select("_id").lean();
    if (!peer) {
      return jsonError("Member not found", 404);
    }
    const key = dmKeyFor(session.sub, peerId);
    await ChatMessage.updateMany(
      {
        channel: "dm",
        dmKey: key,
        senderId: { $ne: session.sub },
        seenBy: { $ne: session.sub },
      },
      { $addToSet: { seenBy: session.sub } }
    );
    const rows = await ChatMessage.find({ channel: "dm", dmKey: key })
      .sort({ createdAt: -1 })
      .limit(200)
      .lean();
    rows.reverse();
    const ids = [...new Set(rows.map((r) => r.senderId.toString()))];
    const users = await User.find({ _id: { $in: ids } })
      .select("name")
      .lean();
    const names = new Map(users.map((u) => [u._id.toString(), u.name]));
    return noStoreJson({ messages: rows.map((r) => mapMessage(r, names)) });
  }

  return jsonError("channel=family|dm required", 400);
}

export async function POST(req: NextRequest) {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  const session = token ? await verifySessionToken(token) : null;
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await connectDB();
  } catch {
    return NextResponse.json({ error: "Database unavailable" }, { status: 503 });
  }

  const contentType = req.headers.get("content-type") || "";
  const isMultipart = contentType.includes("multipart/form-data");
  let body: Record<string, unknown> = {};
  let file: File | null = null;
  if (isMultipart) {
    const form = await req.formData();
    body = {
      channel: String(form.get("channel") ?? ""),
      body: String(form.get("body") ?? ""),
      peerUserId: String(form.get("peerUserId") ?? ""),
    };
    const f = form.get("file");
    if (f instanceof File) file = f;
  } else {
    body = await req.json().catch(() => ({}));
  }
  const channel = body.channel === "dm" ? "dm" : body.channel === "family" ? "family" : null;
  const text = typeof body.body === "string" ? body.body.trim() : "";
  if (!channel) {
    return jsonError("channel family|dm required", 400);
  }
  if (text.length > 4000) {
    return jsonError("Message body max 4000 chars", 400);
  }
  if (!text && !file) {
    return jsonError("Message text or attachment required", 400);
  }

  const settings = await getOrCreateChatSettings();

  let attachmentUrl: string | null = null;
  let attachmentType: "image" | "file" | null = null;
  let attachmentName: string | null = null;
  let attachmentMimeType: string | null = null;
  if (file) {
    const mime = file.type || "application/octet-stream";
    const rule = CHAT_MIME_RULES.get(mime);
    if (!rule) return jsonError("Attachment type not supported (images or PDF only)", 400);
    const buf = Buffer.from(await file.arrayBuffer());
    if (buf.length > rule.maxBytes) return jsonError("Attachment too large", 400);
    const id = randomUUID();
    const filename = `${id}${rule.ext}`;
    if (isCloudinaryEnabled()) {
      attachmentUrl = await uploadBufferToCloudinary(buf, mime, {
        folder: "family-gallery/chat",
        resourceType: rule.type === "image" ? "image" : "raw",
        publicId: id,
      });
    }
    if (!attachmentUrl) {
      const uploadDir = path.join(process.cwd(), "public", "uploads", "chat");
      try {
        await mkdir(uploadDir, { recursive: true });
        await writeFile(path.join(uploadDir, filename), buf);
        attachmentUrl = `/uploads/chat/${filename}`;
      } catch {
        if (buf.length > MAX_INLINE_BYTES) {
          return jsonError("Attachment failed on this deployment for larger files. Configure Cloudinary.", 413);
        }
        attachmentUrl = toDataUrl(mime, buf);
      }
    }
    attachmentType = rule.type;
    attachmentMimeType = mime;
    attachmentName = file.name ? String(file.name).slice(0, 300) : filename;
  }

  if (channel === "family") {
    if (!familyChatAllowed(settings)) {
      return jsonError("Family chat is turned off", 403);
    }
    const doc = await ChatMessage.create({
      channel: "family",
      dmKey: null,
      senderId: session.sub,
      body: text,
      attachmentUrl,
      attachmentType,
      attachmentName,
      attachmentMimeType,
      seenBy: [session.sub],
    });
    const u = await User.findById(session.sub).select("name").lean();
    const names = new Map([[session.sub, u?.name ?? "You"]]);
    void sendPushToAll(
      {
        title: "Family chat",
        body: `${u?.name ?? "A member"}: ${text.slice(0, 80)}`,
        url: "/chat",
      },
      { excludeUserId: session.sub }
    );
    return noStoreJson({
      message: mapMessage(doc.toObject(), names),
    });
  }

  if (!dmChatAllowed(settings)) {
    return jsonError("Direct messages are turned off", 403);
  }
  const peerId = String(body.peerUserId ?? "").trim();
  if (!peerId || peerId === session.sub) {
    return jsonError("peerUserId required", 400);
  }
  const peer = await User.findById(peerId).select("_id").lean();
  if (!peer) {
    return jsonError("Member not found", 404);
  }
  const key = dmKeyFor(session.sub, peerId);
  const doc = await ChatMessage.create({
    channel: "dm",
    dmKey: key,
    senderId: session.sub,
    body: text,
    attachmentUrl,
    attachmentType,
    attachmentName,
    attachmentMimeType,
    seenBy: [session.sub],
  });
  const users = await User.find({ _id: { $in: [session.sub, peerId] } })
    .select("name")
    .lean();
  const names = new Map(users.map((x) => [x._id.toString(), x.name]));
  const senderName = names.get(session.sub) ?? "A member";
  void sendPushToUsers(
    {
      title: "New direct message",
      body: `${senderName}: ${text.slice(0, 80)}`,
      url: "/chat",
    },
    [peerId]
  );
  return noStoreJson({
    message: mapMessage(doc.toObject(), names),
  });
}

export async function PATCH(req: NextRequest) {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  const session = token ? await verifySessionToken(token) : null;
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    await connectDB();
  } catch {
    return NextResponse.json({ error: "Database unavailable" }, { status: 503 });
  }

  const body = await req.json().catch(() => ({}));
  const id = String(body.id ?? "").trim();
  const text = typeof body.body === "string" ? body.body.trim() : "";
  if (!id) return jsonError("id required", 400);
  if (!text || text.length > 4000) return jsonError("Message body required (max 4000 chars)", 400);

  const doc = await ChatMessage.findById(id);
  if (!doc) return jsonError("Message not found", 404);
  if (doc.senderId.toString() !== session.sub) return jsonError("You can only edit your own message", 403);

  doc.body = text;
  doc.editedAt = new Date();
  await doc.save();

  const u = await User.findById(doc.senderId).select("name").lean();
  const names = new Map([[doc.senderId.toString(), u?.name ?? "Member"]]);
  return noStoreJson({ message: mapMessage(doc.toObject(), names) });
}

export async function DELETE(req: NextRequest) {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  const session = token ? await verifySessionToken(token) : null;
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    await connectDB();
  } catch {
    return NextResponse.json({ error: "Database unavailable" }, { status: 503 });
  }

  const body = await req.json().catch(() => ({}));
  const id = String(body.id ?? "").trim();
  if (!id) return jsonError("id required", 400);

  const doc = await ChatMessage.findById(id).select("senderId").lean();
  if (!doc) return jsonError("Message not found", 404);
  if (doc.senderId.toString() !== session.sub) return jsonError("You can only delete your own message", 403);

  await ChatMessage.deleteOne({ _id: id });
  return noStoreJson({ ok: true });
}
