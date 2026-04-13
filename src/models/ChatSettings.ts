import { Schema, model, models } from "mongoose";

const GLOBAL_ID = "global";

export interface IChatSettings {
  _id: string;
  familyChatEnabled: boolean;
  directMessagesEnabled: boolean;
  updatedAt: Date;
}

const ChatSettingsSchema = new Schema<IChatSettings>(
  {
    _id: { type: String, default: GLOBAL_ID },
    familyChatEnabled: { type: Boolean, default: true },
    directMessagesEnabled: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export const ChatSettings =
  models.ChatSettings ?? model<IChatSettings>("ChatSettings", ChatSettingsSchema);

export async function getOrCreateChatSettings(): Promise<IChatSettings> {
  const doc = await ChatSettings.findByIdAndUpdate(
    GLOBAL_ID,
    {
      $setOnInsert: {
        _id: GLOBAL_ID,
        familyChatEnabled: true,
        directMessagesEnabled: true,
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  ).lean();
  return doc as IChatSettings;
}
