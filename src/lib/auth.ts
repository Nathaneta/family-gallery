import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import { randomUUID } from "crypto";
import { connectDB } from "@/lib/mongodb";
import { UserSession } from "@/models/UserSession";

const COOKIE_NAME = "fg_session";

export { COOKIE_NAME };

export type SessionPayload = {
  sub: string;
  email: string;
  sid: string;
};

function getSecret() {
  const s = process.env.JWT_SECRET;
  if (!s) throw new Error("JWT_SECRET is not set");
  return new TextEncoder().encode(s);
}

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 12);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

export async function signSessionToken(payload: SessionPayload): Promise<string> {
  return new SignJWT({ email: payload.email, sid: payload.sid })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime("14d")
    .sign(getSecret());
}

export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    const sub = payload.sub;
    const email = payload.email as string | undefined;
    const sid = payload.sid as string | undefined;
    if (!sub || !email || !sid) return null;

    await connectDB();
    const session = await UserSession.findOne({ sid, userId: sub, revokedAt: null })
      .select("_id lastSeenAt")
      .lean();
    if (!session) return null;

    const now = Date.now();
    const last = new Date(session.lastSeenAt).getTime();
    if (now - last > 60_000) {
      await UserSession.updateOne({ sid }, { $set: { lastSeenAt: new Date(now) } });
    }
    return { sub, email, sid };
  } catch {
    return null;
  }
}

export async function startUserSession(
  user: { id: string; email: string },
  meta?: { userAgent?: string; ip?: string }
) {
  await connectDB();
  const sid = randomUUID();
  await UserSession.create({
    sid,
    userId: user.id,
    userAgent: meta?.userAgent ?? "",
    ip: meta?.ip ?? "",
    lastSeenAt: new Date(),
    revokedAt: null,
  });
  const token = await signSessionToken({ sub: user.id, email: user.email, sid });
  return { token, sid };
}

export async function revokeSessionBySid(sid: string) {
  await connectDB();
  await UserSession.updateOne({ sid }, { $set: { revokedAt: new Date() } });
}
