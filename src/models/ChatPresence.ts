import { Schema, model, models } from "mongoose";

type PresenceChannel = "family" | "dm" | null;

export interface IChatPresence {
  userId: Schema.Types.ObjectId;
  lastSeenAt: Date;
  typingAt: Date | null;
  typingChannel: PresenceChannel;
  typingPeerId: string | null;
}

const ChatPresenceSchema = new Schema<IChatPresence>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, unique: true, index: true },
    lastSeenAt: { type: Date, required: true, default: Date.now },
    typingAt: { type: Date, default: null },
    typingChannel: { type: String, enum: ["family", "dm", null], default: null },
    typingPeerId: { type: String, default: null },
  },
  { timestamps: true }
);

export const ChatPresence =
  models.ChatPresence ?? model<IChatPresence>("ChatPresence", ChatPresenceSchema);
