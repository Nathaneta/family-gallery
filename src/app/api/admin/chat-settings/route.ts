import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { requireAdmin } from "@/lib/admin";
import { ChatSettings, getOrCreateChatSettings } from "@/models/ChatSettings";
import { jsonError } from "@/lib/http";
import { writeAdminAudit } from "@/lib/admin-audit";

export async function PATCH(req: NextRequest) {
  const gate = await requireAdmin(req);
  if (!gate.ok) return gate.response;

  const body = await req.json().catch(() => ({}));
  const patch: Record<string, boolean> = {};
  if (body.familyChatEnabled !== undefined) patch.familyChatEnabled = Boolean(body.familyChatEnabled);
  if (body.directMessagesEnabled !== undefined) {
    patch.directMessagesEnabled = Boolean(body.directMessagesEnabled);
  }
  if (Object.keys(patch).length === 0) {
    return jsonError("Send familyChatEnabled and/or directMessagesEnabled", 400);
  }

  await connectDB();
  await getOrCreateChatSettings();
  await ChatSettings.updateOne({ _id: "global" }, { $set: patch });

  const s = await getOrCreateChatSettings();
  await writeAdminAudit({
    adminUserId: gate.ctx.session.sub,
    action: "admin.chat.settings.patch",
    targetType: "chat",
    targetId: "global",
    details: `family=${s.familyChatEnabled} dm=${s.directMessagesEnabled}`,
  });
  return NextResponse.json({
    settings: {
      familyChatEnabled: s.familyChatEnabled,
      directMessagesEnabled: s.directMessagesEnabled,
    },
  });
}
