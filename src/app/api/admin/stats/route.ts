import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { requireAdmin } from "@/lib/admin";
import { User } from "@/models/User";
import { Photo } from "@/models/Photo";
import { Album } from "@/models/Album";
import { ChatMessage } from "@/models/ChatMessage";

export async function GET(req: NextRequest) {
  const gate = await requireAdmin(req);
  if (!gate.ok) return gate.response;

  await connectDB();
  const start = new Date();
  start.setUTCHours(0, 0, 0, 0);

  const [memberCount, photoCount, albumCount, messagesToday, adminCount] = await Promise.all([
    User.countDocuments(),
    Photo.countDocuments(),
    Album.countDocuments(),
    ChatMessage.countDocuments({ createdAt: { $gte: start } }),
    User.countDocuments({ isAdmin: true }),
  ]);

  return NextResponse.json({
    stats: {
      memberCount,
      photoCount,
      albumCount,
      messagesToday,
      adminCount,
    },
  });
}
