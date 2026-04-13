import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

/**
 * Protects authenticated sections. JWT is verified here so deep links cannot bypass the shell.
 * Uses the same secret as API route signing (`JWT_SECRET`).
 */
export async function middleware(request: NextRequest) {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    console.warn("JWT_SECRET is not set — protected routes will redirect to login.");
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const token = request.cookies.get("fg_session")?.value;
  if (!token) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  try {
    await jwtVerify(token, new TextEncoder().encode(secret));
    return NextResponse.next();
  } catch {
    const res = NextResponse.redirect(new URL("/login", request.url));
    res.cookies.set("fg_session", "", { path: "/", maxAge: 0 });
    return res;
  }
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/profile/:path*",
    "/family/:path*",
    "/chat",
    "/chat/:path*",
    "/admin",
    "/admin/:path*",
  ],
};
