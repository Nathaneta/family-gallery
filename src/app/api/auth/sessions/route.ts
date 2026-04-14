import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { COOKIE_NAME, revokeSessionBySid, verifySessionToken } from "@/lib/auth";
import { UserSession } from "@/models/UserSession";

function getCookieToken(req: NextRequest) {
  return req.cookies.get(COOKIE_NAME)?.value;
}

export async function GET(req: NextRequest) {
  const token = getCookieToken(req);
  const session = token ? await verifySessionToken(token) : null;
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectDB();
  const rows = await UserSession.find({ userId: session.sub, revokedAt: null })
    .sort({ lastSeenAt: -1 })
    .lean();
  return NextResponse.json({
    sessions: rows.map((r) => ({
      sid: r.sid,
      userAgent: r.userAgent,
      ip: r.ip,
      lastSeenAt: r.lastSeenAt.toISOString(),
      createdAt: r.createdAt.toISOString(),
      current: r.sid === session.sid,
    })),
  });
}

export async function DELETE(req: NextRequest) {
  const token = getCookieToken(req);
  const session = token ? await verifySessionToken(token) : null;
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const sid = body.sid ? String(body.sid) : "";
  const revokeOthers = body.revokeOthers === true;

  await connectDB();
  if (revokeOthers) {
    await UserSession.updateMany(
      { userId: session.sub, sid: { $ne: session.sid }, revokedAt: null },
      { $set: { revokedAt: new Date() } }
    );
    return NextResponse.json({ ok: true });
  }

  if (!sid) {
    return NextResponse.json({ error: "sid required" }, { status: 400 });
  }
  if (sid === session.sid) {
    return NextResponse.json({ error: "Use logout to end current session" }, { status: 400 });
  }
  await revokeSessionBySid(sid);
  return NextResponse.json({ ok: true });
}
