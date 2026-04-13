import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { User } from "@/models/User";
import { Photo } from "@/models/Photo";
import { Album } from "@/models/Album";
import { ChatMessage } from "@/models/ChatMessage";
import { requireAdmin } from "@/lib/admin";
import { hashPassword } from "@/lib/auth";

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ userId: string }> }) {
  const gate = await requireAdmin(req);
  if (!gate.ok) return gate.response;

  const { userId } = await ctx.params;
  const body = await req.json();

  await connectDB();
  const user = await User.findById(userId);
  if (!user) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (body.name !== undefined) user.name = String(body.name).trim();
  if (body.email !== undefined) {
    const email = String(body.email).toLowerCase().trim();
    const taken = await User.findOne({ email, _id: { $ne: user._id } });
    if (taken) {
      return NextResponse.json({ error: "Email already in use" }, { status: 409 });
    }
    user.email = email;
  }
  if (body.displayRole !== undefined) user.displayRole = String(body.displayRole).trim();
  if (body.avatarUrl !== undefined) user.avatarUrl = String(body.avatarUrl).trim();
  if (body.sortIndex !== undefined) {
    const n = Number(body.sortIndex);
    if (Number.isFinite(n)) user.sortIndex = n;
  }
  if (body.password !== undefined && String(body.password).length > 0) {
    user.passwordHash = await hashPassword(String(body.password));
  }
  if (body.isAdmin !== undefined) {
    const nextAdmin = Boolean(body.isAdmin);
    if (user._id.toString() === gate.ctx.session.sub && !nextAdmin) {
      return NextResponse.json({ error: "You cannot remove your own admin access" }, { status: 400 });
    }
    user.isAdmin = nextAdmin;
  }

  await user.save();
  return NextResponse.json({
    user: {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      avatarUrl: user.avatarUrl,
      displayRole: user.displayRole,
      isAdmin: user.isAdmin,
      sortIndex: user.sortIndex,
    },
  });
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ userId: string }> }) {
  const gate = await requireAdmin(req);
  if (!gate.ok) return gate.response;

  const { userId } = await ctx.params;
  if (userId === gate.ctx.session.sub) {
    return NextResponse.json({ error: "You cannot delete your own account" }, { status: 400 });
  }

  await connectDB();
  const user = await User.findById(userId);
  if (!user) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const uid = user._id.toString();
  await Photo.deleteMany({ $or: [{ ownerUserId: user._id }, { uploadedBy: user._id }] });
  await Album.deleteMany({ $or: [{ ownerUserId: user._id }, { createdBy: user._id }] });
  await ChatMessage.deleteMany({
    $or: [{ senderId: user._id }, { dmKey: { $regex: `(^|:)${uid}(:|$)` } }],
  });
  await User.deleteOne({ _id: user._id });
  return NextResponse.json({ ok: true });
}
