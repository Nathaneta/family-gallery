import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { User } from "@/models/User";
import { COOKIE_NAME, startUserSession, verifyPassword } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const email = String(body.email ?? "").toLowerCase().trim();
    const password = String(body.password ?? "");

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password required" }, { status: 400 });
    }

    await connectDB();
    const user = await User.findOne({ email });
    if (!user) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    }
    const hash = user.passwordHash;
    if (!hash || typeof hash !== "string") {
      return NextResponse.json(
        {
          error:
            "This account has no password on file. Run `npm run seed` (or ask an admin to reset the account).",
        },
        { status: 401 }
      );
    }
    if (!(await verifyPassword(password, hash))) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    }

    const { token } = await startUserSession(
      { id: user._id.toString(), email: user.email },
      {
        userAgent: req.headers.get("user-agent") ?? "",
      }
    );
    const res = NextResponse.json({
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        avatarUrl: user.avatarUrl,
        displayRole: user.displayRole ?? "",
        isAdmin: !!user.isAdmin,
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
    console.error("[auth/login]", e);
    const msg = e instanceof Error ? e.message : String(e);

    if (msg.includes("JWT_SECRET")) {
      return NextResponse.json(
        { error: "Server misconfiguration: add JWT_SECRET to .env.local (see .env.example)." },
        { status: 500 }
      );
    }
    if (
      msg.includes("MONGODB_URI") ||
      msg.includes("ECONNREFUSED") ||
      msg.includes("ENOTFOUND") ||
      msg.includes("querySrv") ||
      msg.toLowerCase().includes("mongodb")
    ) {
      return NextResponse.json(
        {
          error:
            "Cannot connect to MongoDB. Start MongoDB (or fix MONGODB_URI in .env.local), then try again.",
        },
        { status: 503 }
      );
    }

    return NextResponse.json(
      { error: "Server error. Check the terminal running `npm run dev` for details." },
      { status: 500 }
    );
  }
}
