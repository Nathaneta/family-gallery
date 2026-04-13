import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { User } from "@/models/User";
import { COOKIE_NAME, verifySessionToken } from "@/lib/auth";

function isAllowedAvatarUrl(url: string): boolean {
  const u = url.trim();
  if (!u || u.length > 2000) return false;
  if (u.startsWith("/") && !u.startsWith("//")) return u.length >= 2;
  try {
    const parsed = new URL(u);
    return parsed.protocol === "https:" || parsed.protocol === "http:";
  } catch {
    return false;
  }
}

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ userId: string }> }
) {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  const session = token ? await verifySessionToken(token) : null;
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { userId } = await ctx.params;
  await connectDB();
  const user = await User.findById(userId).lean();
  if (!user) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({
    user: {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      avatarUrl: user.avatarUrl,
      displayRole: user.displayRole ?? "",
    },
  });
}

/** Set profile photo URL for yourself, or for any member if you are admin. */
export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ userId: string }> }
) {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  const session = token ? await verifySessionToken(token) : null;
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { userId } = await ctx.params;
  const body = await req.json().catch(() => ({}));
  const avatarUrl =
    body.avatarUrl !== undefined ? String(body.avatarUrl).trim() : undefined;

  if (avatarUrl === undefined) {
    return NextResponse.json({ error: "avatarUrl required" }, { status: 400 });
  }
  if (!isAllowedAvatarUrl(avatarUrl)) {
    return NextResponse.json(
      { error: "Use an http(s) URL or a site path starting with /" },
      { status: 400 }
    );
  }

  await connectDB();
  const actor = await User.findById(session.sub);
  if (!actor) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const isSelf = session.sub === userId;
  if (!isSelf && !actor.isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const target = await User.findById(userId);
  if (!target) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  target.avatarUrl = avatarUrl;
  await target.save();

  return NextResponse.json({
    user: {
      id: target._id.toString(),
      name: target.name,
      email: target.email,
      avatarUrl: target.avatarUrl,
      displayRole: target.displayRole ?? "",
    },
  });
}
