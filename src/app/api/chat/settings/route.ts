import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { COOKIE_NAME, verifySessionToken } from "@/lib/auth";
import { getOrCreateChatSettings } from "@/models/ChatSettings";

export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "private, no-store, max-age=0, must-revalidate" } as const;

export async function GET(req: NextRequest) {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  const session = token ? await verifySessionToken(token) : null;
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectDB();
  const s = await getOrCreateChatSettings();
  return NextResponse.json(
    {
      settings: {
        familyChatEnabled: s.familyChatEnabled !== false,
        directMessagesEnabled: s.directMessagesEnabled !== false,
      },
    },
    { headers: NO_STORE }
  );
}
