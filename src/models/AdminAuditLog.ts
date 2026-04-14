import mongoose, { Schema, model, models } from "mongoose";

export interface IAdminAuditLog {
  _id: mongoose.Types.ObjectId;
  adminUserId: mongoose.Types.ObjectId;
  action: string;
  targetType: "user" | "album" | "photo" | "chat" | "system";
  targetId: string | null;
  details: string;
  createdAt: Date;
  updatedAt: Date;
}

const AdminAuditLogSchema = new Schema<IAdminAuditLog>(
  {
    adminUserId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    action: { type: String, required: true, trim: true, maxlength: 120 },
    targetType: {
      type: String,
      enum: ["user", "album", "photo", "chat", "system"],
      required: true,
      index: true,
    },
    targetId: { type: String, default: null },
    details: { type: String, default: "", maxlength: 2000 },
  },
  { timestamps: true }
);

AdminAuditLogSchema.index({ createdAt: -1 });

export const AdminAuditLog =
  models.AdminAuditLog ?? model<IAdminAuditLog>("AdminAuditLog", AdminAuditLogSchema);
