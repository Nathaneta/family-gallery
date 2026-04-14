import mongoose, { Schema, model, models } from "mongoose";

export interface IPhotoComment {
  _id: mongoose.Types.ObjectId;
  photoId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  body: string;
  createdAt: Date;
  updatedAt: Date;
}

const PhotoCommentSchema = new Schema<IPhotoComment>(
  {
    photoId: { type: Schema.Types.ObjectId, ref: "Photo", required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    body: { type: String, required: true, trim: true, maxlength: 1200 },
  },
  { timestamps: true }
);

PhotoCommentSchema.index({ photoId: 1, createdAt: -1 });

export const PhotoComment =
  models.PhotoComment ?? model<IPhotoComment>("PhotoComment", PhotoCommentSchema);
