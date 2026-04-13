import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { COOKIE_NAME, verifySessionToken } from "@/lib/auth";
import { ChatPresence } from "@/models/ChatPresence";

export const dynamic = "force-dynamic";

const ONLINE_MS = 45_000;
const TYPING_MS = 9_000;
const NO_STORE = { "Cache-Control": "private, no-store, max-age=0, must-revalidate" } as const;

export async function GET(req: NextRequest) {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  const session = token ? await verifySessionToken(token) : null;
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const channel = searchParams.get("channel") === "dm" ? "dm" : "family";
  const peerId = searchParams.get("peerId")?.trim() || "";

  await connectDB();

  const now = Date.now();
  const rows = await ChatPresence.find().lean();
  const presence = Object.fromEntries(
    rows.map((r) => {
      const uid = r.userId.toString();
      const online = now - new Date(r.lastSeenAt).getTime() <= ONLINE_MS;
      const typingFresh = !!r.typingAt && now - new Date(r.typingAt).getTime() <= TYPING_MS;
      const typing =
        typingFresh &&
        (channel === "family"
          ? r.typingChannel === "family"
          : r.typingChannel === "dm" && !!peerId && uid === peerId && r.typingPeerId === session.sub);
      return [
        uid,
        {
          online,
          typing,
          lastSeenAt: r.lastSeenAt instanceof Date ? r.lastSeenAt.toISOString() : null,
        },
      ];
    })
  );

  return NextResponse.json({ presence }, { headers: NO_STORE });
}

export async function POST(req: NextRequest) {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  const session = token ? await verifySessionToken(token) : null;
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const heartbeat = Boolean(body.heartbeat);
  const typing = body.typing === true;
  const channel = body.channel === "dm" ? "dm" : "family";
  const peerUserId = body.peerUserId ? String(body.peerUserId) : null;
  const now = new Date();

  await connectDB();

  const set: Record<string, unknown> = { lastSeenAt: now };
  if (!heartbeat) {
    if (typing) {
      set.typingAt = now;
      set.typingChannel = channel;
      set.typingPeerId = channel === "dm" ? peerUserId : null;
    } else {
      set.typingAt = null;
      set.typingChannel = null;
      set.typingPeerId = null;
    }
  }

  await ChatPresence.updateOne(
    { userId: session.sub },
    { $set: set, $setOnInsert: { userId: session.sub } },
    { upsert: true }
  );

  return NextResponse.json({ ok: true }, { headers: NO_STORE });
}
