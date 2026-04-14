import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { User } from "@/models/User";
import { requireAdmin } from "@/lib/admin";
import { hashPassword } from "@/lib/auth";
import { writeAdminAudit } from "@/lib/admin-audit";

export async function GET(req: NextRequest) {
  const gate = await requireAdmin(req);
  if (!gate.ok) return gate.response;

  await connectDB();
  const users = await User.find().sort({ sortIndex: 1, name: 1 }).lean();
  return NextResponse.json({
    users: users.map((u) => ({
      id: u._id.toString(),
      name: u.name,
      email: u.email,
      avatarUrl: u.avatarUrl,
      displayRole: u.displayRole ?? "",
      isAdmin: !!u.isAdmin,
      chatMutedUntil: u.chatMutedUntil ? new Date(u.chatMutedUntil).toISOString() : null,
      chatBannedAt: u.chatBannedAt ? new Date(u.chatBannedAt).toISOString() : null,
      chatBanReason: u.chatBanReason ?? "",
      sortIndex: u.sortIndex ?? 99,
    })),
  });
}

export async function POST(req: NextRequest) {
  const gate = await requireAdmin(req);
  if (!gate.ok) return gate.response;

  const body = await req.json();
  const email = String(body.email ?? "").toLowerCase().trim();
  const password = String(body.password ?? "");
  const name = String(body.name ?? "").trim();
  const displayRole = String(body.displayRole ?? "").trim();
  const avatarUrl =
    String(body.avatarUrl ?? "").trim() ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(name || "Member")}&background=6366f1&color=fff&size=256`;
  const isAdmin = Boolean(body.isAdmin);
  const sortIndex = Number(body.sortIndex ?? 99);

  if (!email || !password || !name) {
    return NextResponse.json({ error: "name, email, and password required" }, { status: 400 });
  }

  await connectDB();
  const exists = await User.findOne({ email });
  if (exists) {
    return NextResponse.json({ error: "Email already in use" }, { status: 409 });
  }

  const passwordHash = await hashPassword(password);
  const user = await User.create({
    email,
    passwordHash,
    name,
    avatarUrl,
    displayRole,
    isAdmin,
    sortIndex: Number.isFinite(sortIndex) ? sortIndex : 99,
  });
  await writeAdminAudit({
    adminUserId: gate.ctx.session.sub,
    action: "admin.user.create",
    targetType: "user",
    targetId: user._id.toString(),
    details: `Created ${user.email}`,
  });

  return NextResponse.json({
    user: {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      avatarUrl: user.avatarUrl,
      displayRole: user.displayRole,
      isAdmin: user.isAdmin,
      chatMutedUntil: user.chatMutedUntil ? new Date(user.chatMutedUntil).toISOString() : null,
      chatBannedAt: user.chatBannedAt ? new Date(user.chatBannedAt).toISOString() : null,
      chatBanReason: user.chatBanReason ?? "",
      sortIndex: user.sortIndex,
    },
  });
}
