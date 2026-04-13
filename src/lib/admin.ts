import { NextRequest, NextResponse } from "next/server";
import type { HydratedDocument } from "mongoose";
import { connectDB } from "@/lib/mongodb";
import { User } from "@/models/User";
import type { IUser } from "@/models/User";
import { COOKIE_NAME, verifySessionToken } from "@/lib/auth";

export type AdminContext = {
  session: { sub: string; email: string };
  user: HydratedDocument<IUser>;
};

/**
 * Returns the signed-in admin user, or an HTTP error response for the route handler to return.
 */
export async function requireAdmin(
  req: NextRequest
): Promise<{ ok: true; ctx: AdminContext } | { ok: false; response: NextResponse }> {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  const session = token ? await verifySessionToken(token) : null;
  if (!session) {
    return { ok: false, response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  await connectDB();
  const user = await User.findById(session.sub);
  if (!user || !user.isAdmin) {
    return { ok: false, response: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }

  return { ok: true, ctx: { session, user } };
}
