import mongoose, { Schema, model, models } from "mongoose";

export interface IPhotoReport {
  _id: mongoose.Types.ObjectId;
  photoId: mongoose.Types.ObjectId;
  reporterUserId: mongoose.Types.ObjectId;
  reason: string;
  createdAt: Date;
  updatedAt: Date;
}

const PhotoReportSchema = new Schema<IPhotoReport>(
  {
    photoId: { type: Schema.Types.ObjectId, ref: "Photo", required: true, index: true },
    reporterUserId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    reason: { type: String, required: true, trim: true, maxlength: 600 },
  },
  { timestamps: true }
);

PhotoReportSchema.index({ photoId: 1, reporterUserId: 1 }, { unique: true });

export const PhotoReport = models.PhotoReport ?? model<IPhotoReport>("PhotoReport", PhotoReportSchema);
