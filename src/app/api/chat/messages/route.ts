import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { User } from "@/models/User";
import { ChatMessage } from "@/models/ChatMessage";
import { COOKIE_NAME, verifySessionToken } from "@/lib/auth";
import { getOrCreateChatSettings } from "@/models/ChatSettings";
import { dmKeyFor } from "@/lib/dm-key";
import { jsonError } from "@/lib/http";

/** Per-user data; never cache (proxies/CDN/browser could serve one member's payload to others). */
export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "private, no-store, max-age=0, must-revalidate" } as const;

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

  const body = await req.json().catch(() => ({}));
  const channel = body.channel === "dm" ? "dm" : body.channel === "family" ? "family" : null;
  const text = typeof body.body === "string" ? body.body.trim() : "";
  if (!channel) {
    return jsonError("channel family|dm required", 400);
  }
  if (!text || text.length > 4000) {
    return jsonError("Message body required (max 4000 chars)", 400);
  }

  const settings = await getOrCreateChatSettings();

  if (channel === "family") {
    if (!familyChatAllowed(settings)) {
      return jsonError("Family chat is turned off", 403);
    }
    const doc = await ChatMessage.create({
      channel: "family",
      dmKey: null,
      senderId: session.sub,
      body: text,
    });
    const u = await User.findById(session.sub).select("name").lean();
    const names = new Map([[session.sub, u?.name ?? "You"]]);
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
  });
  const users = await User.find({ _id: { $in: [session.sub, peerId] } })
    .select("name")
    .lean();
  const names = new Map(users.map((x) => [x._id.toString(), x.name]));
  return noStoreJson({
    message: mapMessage(doc.toObject(), names),
  });
}
