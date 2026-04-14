import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { User } from "@/models/User";
import { COOKIE_NAME, verifySessionToken } from "@/lib/auth";

/** All family members (for dashboard cards). Requires login. */
export async function GET(req: NextRequest) {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  const session = token ? await verifySessionToken(token) : null;
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectDB();
  const users = await User.find()
    .select("name email avatarUrl displayRole sortIndex")
    .sort({ sortIndex: 1, name: 1 })
    .lean();
  return NextResponse.json({
    users: users.map((u) => ({
      id: u._id.toString(),
      name: u.name,
      email: u.email,
      avatarUrl: u.avatarUrl,
      displayRole: u.displayRole ?? "",
    })),
  });
}
