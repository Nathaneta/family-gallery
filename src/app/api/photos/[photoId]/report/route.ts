import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { COOKIE_NAME, verifySessionToken } from "@/lib/auth";
import { Photo } from "@/models/Photo";
import { PhotoReport } from "@/models/PhotoReport";
import { User } from "@/models/User";
import { sendPushToUsers } from "@/lib/web-push";

export async function POST(req: NextRequest, ctx: { params: Promise<{ photoId: string }> }) {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  const session = token ? await verifySessionToken(token) : null;
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { photoId } = await ctx.params;
  const body = await req.json().catch(() => ({}));
  const reason = typeof body.reason === "string" ? body.reason.trim().slice(0, 600) : "";
  if (!reason) {
    return NextResponse.json({ error: "Reason required" }, { status: 400 });
  }

  await connectDB();
  const photo = await Photo.findById(photoId).select("_id uploadedBy").lean();
  if (!photo) return NextResponse.json({ error: "Photo not found" }, { status: 404 });

  await PhotoReport.updateOne(
    { photoId, reporterUserId: session.sub },
    { $set: { reason } },
    { upsert: true }
  );

  const admins = await User.find({ isAdmin: true }).select("_id").lean();
  const adminIds = admins.map((a) => a._id.toString()).filter((id) => id !== session.sub);
  if (adminIds.length > 0) {
    void sendPushToUsers(
      {
        title: "Content reported",
        body: "A family member reported a media item for review.",
        url: "/admin",
      },
      adminIds
    );
  }

  return NextResponse.json({ ok: true });
}
