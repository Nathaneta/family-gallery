import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { connectDB } from "@/lib/mongodb";
import { AdminAuditLog } from "@/models/AdminAuditLog";
import { User } from "@/models/User";

export async function GET(req: NextRequest) {
  const gate = await requireAdmin(req);
  if (!gate.ok) return gate.response;

  await connectDB();
  const rows = await AdminAuditLog.find().sort({ createdAt: -1 }).limit(60).lean();
  const adminIds = [...new Set(rows.map((r) => r.adminUserId.toString()))];
  const admins = await User.find({ _id: { $in: adminIds } }).select("name").lean();
  const nameById = new Map(admins.map((u) => [u._id.toString(), u.name]));

  return NextResponse.json({
    logs: rows.map((r) => ({
      id: r._id.toString(),
      adminUserId: r.adminUserId.toString(),
      adminName: nameById.get(r.adminUserId.toString()) ?? "Admin",
      action: r.action,
      targetType: r.targetType,
      targetId: r.targetId ?? null,
      details: r.details ?? "",
      createdAt: r.createdAt instanceof Date ? r.createdAt.toISOString() : String(r.createdAt),
    })),
  });
}
