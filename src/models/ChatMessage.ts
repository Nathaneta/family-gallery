import mongoose, { Schema, model, models } from "mongoose";

export type ChatChannel = "family" | "dm";

export interface IChatMessage {
  _id: mongoose.Types.ObjectId;
  channel: ChatChannel;
  /** For `dm` only: sorted `userId:userId` */
  dmKey: string | null;
  senderId: mongoose.Types.ObjectId;
  body: string;
  createdAt: Date;
}

const ChatMessageSchema = new Schema<IChatMessage>(
  {
    channel: { type: String, enum: ["family", "dm"], required: true },
    dmKey: { type: String, default: null, index: true },
    senderId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    body: { type: String, required: true, trim: true, maxlength: 4000 },
  },
  { timestamps: true }
);

ChatMessageSchema.index({ channel: 1, createdAt: -1 });
ChatMessageSchema.index({ channel: 1, dmKey: 1, createdAt: -1 });

export const ChatMessage = models.ChatMessage ?? model<IChatMessage>("ChatMessage", ChatMessageSchema);
