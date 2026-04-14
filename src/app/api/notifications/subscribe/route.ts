import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { COOKIE_NAME, verifySessionToken } from "@/lib/auth";
import { PushSubscription } from "@/models/PushSubscription";

type IncomingSub = {
  endpoint?: string;
  keys?: { p256dh?: string; auth?: string };
};

export async function POST(req: NextRequest) {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  const session = token ? await verifySessionToken(token) : null;
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json().catch(() => ({}))) as IncomingSub;
  const endpoint = body.endpoint?.trim();
  const p256dh = body.keys?.p256dh?.trim();
  const auth = body.keys?.auth?.trim();
  if (!endpoint || !p256dh || !auth) {
    return NextResponse.json({ error: "Invalid subscription" }, { status: 400 });
  }

  await connectDB();
  await PushSubscription.updateOne(
    { "subscription.endpoint": endpoint },
    {
      $set: {
        userId: session.sub,
        subscription: { endpoint, keys: { p256dh, auth } },
        userAgent: req.headers.get("user-agent") ?? "",
      },
    },
    { upsert: true }
  );
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  const session = token ? await verifySessionToken(token) : null;
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json().catch(() => ({}))) as IncomingSub;
  const endpoint = body.endpoint?.trim();
  if (!endpoint) {
    return NextResponse.json({ error: "endpoint required" }, { status: 400 });
  }

  await connectDB();
  await PushSubscription.deleteOne({ userId: session.sub, "subscription.endpoint": endpoint });
  return NextResponse.json({ ok: true });
}
