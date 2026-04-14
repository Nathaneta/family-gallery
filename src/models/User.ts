import mongoose, { Schema, model, models } from "mongoose";

/**
 * Family member account. Passwords are stored hashed (bcrypt) — never plain text.
 * `isAdmin` unlocks the /admin dashboard (Natan is seeded as admin).
 */
export interface IUser {
  _id: mongoose.Types.ObjectId;
  email: string;
  passwordHash: string;
  name: string;
  avatarUrl: string;
  /** Shown on cards, e.g. Father, Mother, Sister */
  displayRole: string;
  isAdmin: boolean;
  chatMutedUntil: Date | null;
  chatBannedAt: Date | null;
  chatBanReason: string;
  /** Lower numbers appear first on the dashboard */
  sortIndex: number;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    name: { type: String, required: true, trim: true },
    avatarUrl: { type: String, required: true },
    displayRole: { type: String, default: "" },
    isAdmin: { type: Boolean, default: false },
    chatMutedUntil: { type: Date, default: null },
    chatBannedAt: { type: Date, default: null },
    chatBanReason: { type: String, default: "" },
    sortIndex: { type: Number, default: 99 },
  },
  { timestamps: true }
);

UserSchema.index({ sortIndex: 1, name: 1 });

export const User = models.User ?? model<IUser>("User", UserSchema);
