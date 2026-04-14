import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { COOKIE_NAME, verifySessionToken } from "@/lib/auth";
import { Photo } from "@/models/Photo";
import { PhotoComment } from "@/models/PhotoComment";
import { User } from "@/models/User";
import { sendPushToUsers } from "@/lib/web-push";

export const dynamic = "force-dynamic";

function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

export async function GET(req: NextRequest, ctx: { params: Promise<{ photoId: string }> }) {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  const session = token ? await verifySessionToken(token) : null;
  if (!session) return unauthorized();

  const { photoId } = await ctx.params;
  await connectDB();

  const photo = await Photo.findById(photoId).select("_id").lean();
  if (!photo) {
    return NextResponse.json({ error: "Photo not found" }, { status: 404 });
  }

  const rows = await PhotoComment.find({ photoId }).sort({ createdAt: 1 }).limit(200).lean();
  const userIds = [...new Set(rows.map((x) => x.userId.toString()))];
  const users = await User.find({ _id: { $in: userIds } }).select("name").lean();
  const names = new Map(users.map((u) => [u._id.toString(), u.name]));

  return NextResponse.json({
    comments: rows.map((r) => ({
      id: r._id.toString(),
      userId: r.userId.toString(),
      userName: names.get(r.userId.toString()) ?? "Member",
      body: r.body,
      createdAt: r.createdAt.toISOString(),
      mine: r.userId.toString() === session.sub,
    })),
  });
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ photoId: string }> }) {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  const session = token ? await verifySessionToken(token) : null;
  if (!session) return unauthorized();

  const { photoId } = await ctx.params;
  const body = await req.json().catch(() => ({}));
  const text = typeof body.body === "string" ? body.body.trim() : "";
  if (!text || text.length > 1200) {
    return NextResponse.json({ error: "Comment text required (max 1200)" }, { status: 400 });
  }

  await connectDB();
  const photo = await Photo.findById(photoId).select("_id uploadedBy").lean();
  if (!photo) {
    return NextResponse.json({ error: "Photo not found" }, { status: 404 });
  }

  const me = await User.findById(session.sub).select("name").lean();
  const doc = await PhotoComment.create({ photoId, userId: session.sub, body: text });

  const ownerId = photo.uploadedBy.toString();
  if (ownerId !== session.sub) {
    void sendPushToUsers(
      {
        title: "New comment",
        body: `${me?.name ?? "A member"} commented on your upload`,
        url: "/family",
      },
      [ownerId]
    );
  }

  return NextResponse.json({
    comment: {
      id: doc._id.toString(),
      userId: session.sub,
      userName: me?.name ?? "You",
      body: doc.body,
      createdAt: doc.createdAt.toISOString(),
      mine: true,
    },
  });
}
