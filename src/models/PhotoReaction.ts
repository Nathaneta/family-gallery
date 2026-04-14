import mongoose, { Schema, model, models } from "mongoose";

export interface IPhotoReaction {
  _id: mongoose.Types.ObjectId;
  photoId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  emoji: string;
  createdAt: Date;
  updatedAt: Date;
}

const PhotoReactionSchema = new Schema<IPhotoReaction>(
  {
    photoId: { type: Schema.Types.ObjectId, ref: "Photo", required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    emoji: { type: String, required: true, maxlength: 16 },
  },
  { timestamps: true }
);

PhotoReactionSchema.index({ photoId: 1, emoji: 1, createdAt: -1 });
PhotoReactionSchema.index({ photoId: 1, userId: 1, emoji: 1 }, { unique: true });

export const PhotoReaction =
  models.PhotoReaction ?? model<IPhotoReaction>("PhotoReaction", PhotoReactionSchema);
