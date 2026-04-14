import { AdminAuditLog } from "@/models/AdminAuditLog";

type AuditInput = {
  adminUserId: string;
  action: string;
  targetType: "user" | "album" | "photo" | "chat" | "system";
  targetId?: string | null;
  details?: string;
};

export async function writeAdminAudit(input: AuditInput) {
  try {
    await AdminAuditLog.create({
      adminUserId: input.adminUserId,
      action: input.action,
      targetType: input.targetType,
      targetId: input.targetId ?? null,
      details: input.details ?? "",
    });
  } catch {
    // Audit logging should not block user-facing admin actions.
  }
}
