import { NextResponse } from "next/server";
import { COOKIE_NAME, revokeSessionBySid, verifySessionToken } from "@/lib/auth";

export async function POST(req: Request) {
  const cookieHeader = req.headers.get("cookie") ?? "";
  const token = cookieHeader
    .split(";")
    .map((p) => p.trim())
    .find((x) => x.startsWith(`${COOKIE_NAME}=`))
    ?.slice(COOKIE_NAME.length + 1);
  if (token) {
    const s = await verifySessionToken(token);
    if (s?.sid) {
      await revokeSessionBySid(s.sid);
    }
  }
  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE_NAME, "", { httpOnly: true, path: "/", maxAge: 0 });
  return res;
}
