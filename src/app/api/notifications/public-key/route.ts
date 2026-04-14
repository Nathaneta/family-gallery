import { NextRequest, NextResponse } from "next/server";
import { COOKIE_NAME, verifySessionToken } from "@/lib/auth";
import { hasWebPushEnv } from "@/lib/web-push";

export async function GET(req: NextRequest) {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  const session = token ? await verifySessionToken(token) : null;
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const publicKey = process.env.VAPID_PUBLIC_KEY;
  if (!hasWebPushEnv() || !publicKey) {
    return NextResponse.json({ enabled: false, publicKey: null });
  }

  return NextResponse.json({ enabled: true, publicKey });
}
