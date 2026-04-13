import { NextRequest, NextResponse } from "next/server";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import { connectDB } from "@/lib/mongodb";
import { User } from "@/models/User";
import { requireAdmin } from "@/lib/admin";

const ALLOWED = new Map([
  ["image/jpeg", ".jpg"],
  ["image/png", ".png"],
  ["image/webp", ".webp"],
  ["image/gif", ".gif"],
]);

const MAX_BYTES = 5 * 1024 * 1024;

/** Admin-only: upload a profile image file for any member. */
export async function POST(req: NextRequest, ctx: { params: Promise<{ userId: string }> }) {
  const gate = await requireAdmin(req);
  if (!gate.ok) return gate.response;

  const { userId } = await ctx.params;
  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof Blob)) {
    return NextResponse.json({ error: "file required" }, { status: 400 });
  }

  const mime = file.type || "application/octet-stream";
  const ext = ALLOWED.get(mime);
  if (!ext) {
    return NextResponse.json({ error: "Use JPEG, PNG, WebP, or GIF" }, { status: 400 });
  }

  const buf = Buffer.from(await file.arrayBuffer());
  if (buf.length > MAX_BYTES) {
    return NextResponse.json({ error: "Image too large (max 5 MB)" }, { status: 400 });
  }

  await connectDB();
  const target = await User.findById(userId);
  if (!target) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const id = randomUUID();
  const filename = `${id}${ext}`;
  const dir = path.join(process.cwd(), "public", "uploads", "avatars");
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, filename), buf);

  const publicPath = `/uploads/avatars/${filename}`;
  target.avatarUrl = publicPath;
  await target.save();

  return NextResponse.json({
    user: {
      id: target._id.toString(),
      name: target.name,
      email: target.email,
      avatarUrl: target.avatarUrl,
      displayRole: target.displayRole ?? "",
      isAdmin: target.isAdmin,
      sortIndex: target.sortIndex,
    },
  });
}
