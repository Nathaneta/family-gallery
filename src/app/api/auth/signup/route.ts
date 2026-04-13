import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { User } from "@/models/User";
import { COOKIE_NAME, hashPassword, signSessionToken } from "@/lib/auth";

/**
 * Signup is gated by FAMILY_INVITE_CODE so the gallery stays private.
 * Seeded accounts are the primary path; this is for adding a new device or member.
 */
export async function POST(req: Request) {
  try {
    const invite = process.env.FAMILY_INVITE_CODE;
    if (!invite) {
      return NextResponse.json(
        { error: "Signup is disabled. Use seeded family accounts or set FAMILY_INVITE_CODE." },
        { status: 403 }
      );
    }

    const body = await req.json();
    if (body.inviteCode !== invite) {
      return NextResponse.json({ error: "Invalid invite code" }, { status: 403 });
    }

    const email = String(body.email ?? "").toLowerCase().trim();
    const password = String(body.password ?? "");
    const name = String(body.name ?? "").trim();
    const avatarUrl = String(body.avatarUrl ?? "").trim() || defaultAvatar(name);

    if (!email || !password || !name) {
      return NextResponse.json({ error: "Name, email, and password required" }, { status: 400 });
    }

    await connectDB();
    const exists = await User.findOne({ email });
    if (exists) {
      return NextResponse.json({ error: "Email already registered" }, { status: 409 });
    }

    const passwordHash = await hashPassword(password);
    const displayRole = String(body.displayRole ?? "").trim();
    const user = await User.create({
      email,
      passwordHash,
      name,
      avatarUrl,
      displayRole,
      isAdmin: false,
      sortIndex: 99,
    });

    const token = await signSessionToken({ sub: user._id.toString(), email: user.email });
    const res = NextResponse.json({
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        avatarUrl: user.avatarUrl,
        displayRole: user.displayRole,
        isAdmin: user.isAdmin,
      },
    });

    res.cookies.set(COOKIE_NAME, token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 14,
    });

    return res;
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

function defaultAvatar(name: string) {
  const q = encodeURIComponent(name || "Member");
  return `https://ui-avatars.com/api/?name=${q}&background=6366f1&color=fff&size=256`;
}
