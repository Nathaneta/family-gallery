import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Protect authenticated app sections.
 * We only check cookie presence here to keep proxy runtime lightweight.
 * API routes still perform full JWT verification server-side.
 */
export function proxy(request: NextRequest) {
  const token = request.cookies.get("fg_session")?.value;
  if (!token) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  return NextResponse.next();
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
