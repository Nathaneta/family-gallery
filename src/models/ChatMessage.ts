import mongoose, { Schema, model, models } from "mongoose";

export type ChatChannel = "family" | "dm";

export interface IChatMessage {
  _id: mongoose.Types.ObjectId;
  channel: ChatChannel;
  /** For `dm` only: sorted `userId:userId` */
  dmKey: string | null;
  senderId: mongoose.Types.ObjectId;
  body: string;
  attachmentUrl: string | null;
  attachmentType: "image" | "file" | null;
  attachmentName: string | null;
  attachmentMimeType: string | null;
  seenBy: mongoose.Types.ObjectId[];
  editedAt: Date | null;
  createdAt: Date;
}

const ChatMessageSchema = new Schema<IChatMessage>(
  {
    channel: { type: String, enum: ["family", "dm"], required: true },
    dmKey: { type: String, default: null, index: true },
    senderId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    body: { type: String, required: true, trim: true, maxlength: 4000 },
    attachmentUrl: { type: String, default: null },
    attachmentType: { type: String, enum: ["image", "file", null], default: null },
    attachmentName: { type: String, default: null },
    attachmentMimeType: { type: String, default: null },
    seenBy: [{ type: Schema.Types.ObjectId, ref: "User", index: true }],
    editedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

ChatMessageSchema.index({ channel: 1, createdAt: -1 });
ChatMessageSchema.index({ channel: 1, dmKey: 1, createdAt: -1 });

export const ChatMessage = models.ChatMessage ?? model<IChatMessage>("ChatMessage", ChatMessageSchema);
