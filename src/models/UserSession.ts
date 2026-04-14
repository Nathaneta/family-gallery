import mongoose, { Schema, model, models } from "mongoose";

export interface IUserSession {
  _id: mongoose.Types.ObjectId;
  sid: string;
  userId: mongoose.Types.ObjectId;
  userAgent: string;
  ip: string;
  lastSeenAt: Date;
  revokedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const UserSessionSchema = new Schema<IUserSession>(
  {
    sid: { type: String, required: true, unique: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    userAgent: { type: String, default: "" },
    ip: { type: String, default: "" },
    lastSeenAt: { type: Date, default: Date.now },
    revokedAt: { type: Date, default: null, index: true },
  },
  { timestamps: true }
);

UserSessionSchema.index({ userId: 1, revokedAt: 1, lastSeenAt: -1 });

export const UserSession = models.UserSession ?? model<IUserSession>("UserSession", UserSessionSchema);
