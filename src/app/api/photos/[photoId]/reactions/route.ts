import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { COOKIE_NAME, verifySessionToken } from "@/lib/auth";
import { Photo } from "@/models/Photo";
import { PhotoReaction } from "@/models/PhotoReaction";
import { User } from "@/models/User";
import { sendPushToUsers } from "@/lib/web-push";

export const dynamic = "force-dynamic";

const ALLOWED = new Set(["👍", "❤️", "😂", "😮", "😢", "🔥"]);

function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

async function readSummary(photoId: string, currentUserId: string) {
  const rows = await PhotoReaction.find({ photoId }).lean();
  const summary: Record<string, number> = {};
  const mine: Record<string, boolean> = {};
  for (const r of rows) {
    summary[r.emoji] = (summary[r.emoji] ?? 0) + 1;
    if (r.userId.toString() === currentUserId) {
      mine[r.emoji] = true;
    }
  }
  return { summary, mine };
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
  return NextResponse.json(await readSummary(photoId, session.sub));
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ photoId: string }> }) {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  const session = token ? await verifySessionToken(token) : null;
  if (!session) return unauthorized();

  const { photoId } = await ctx.params;
  const body = await req.json().catch(() => ({}));
  const emoji = typeof body.emoji === "string" ? body.emoji.trim() : "";
  if (!ALLOWED.has(emoji)) {
    return NextResponse.json({ error: "Unsupported reaction" }, { status: 400 });
  }

  await connectDB();
  const photo = await Photo.findById(photoId).select("_id uploadedBy").lean();
  if (!photo) {
    return NextResponse.json({ error: "Photo not found" }, { status: 404 });
  }

  const existing = await PhotoReaction.findOne({ photoId, userId: session.sub, emoji });
  let added = false;
  if (existing) {
    await PhotoReaction.deleteOne({ _id: existing._id });
  } else {
    added = true;
    await PhotoReaction.create({ photoId, userId: session.sub, emoji });
  }

  if (added) {
    const ownerId = photo.uploadedBy.toString();
    if (ownerId !== session.sub) {
      const me = await User.findById(session.sub).select("name").lean();
      void sendPushToUsers(
        {
          title: "New reaction",
          body: `${me?.name ?? "A member"} reacted ${emoji} to your upload`,
          url: "/family",
        },
        [ownerId]
      );
    }
  }

  return NextResponse.json(await readSummary(photoId, session.sub));
}
