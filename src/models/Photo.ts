import mongoose, { Schema, model, models } from "mongoose";

export type GalleryType = "personal" | "family";

/** Categories for the shared family gallery (tags in addition to folders) */
export type FamilyCategory = "Events" | "Trips" | "Childhood" | "General";

export type MediaType = "image" | "video" | "file";

export interface IPhoto {
  _id: mongoose.Types.ObjectId;
  /** Public URL path, e.g. /uploads/media/abc.mp4 */
  publicPath: string;
  caption: string;
  galleryType: GalleryType;
  category: FamilyCategory;
  ownerUserId: mongoose.Types.ObjectId | null;
  uploadedBy: mongoose.Types.ObjectId;
  /** Optional custom folder (album) */
  albumId: mongoose.Types.ObjectId | null;
  mediaType: MediaType;
  mimeType: string;
  originalFilename: string;
  createdAt: Date;
  updatedAt: Date;
}

const PhotoSchema = new Schema<IPhoto>(
  {
    publicPath: { type: String, required: true },
    caption: { type: String, default: "" },
    galleryType: { type: String, enum: ["personal", "family"], required: true },
    category: {
      type: String,
      enum: ["Events", "Trips", "Childhood", "General"],
      default: "General",
    },
    ownerUserId: { type: Schema.Types.ObjectId, ref: "User", default: null },
    uploadedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    albumId: { type: Schema.Types.ObjectId, ref: "Album", default: null },
    mediaType: { type: String, enum: ["image", "video", "file"], default: "image" },
    mimeType: { type: String, default: "application/octet-stream" },
    originalFilename: { type: String, default: "" },
  },
  { timestamps: true }
);

PhotoSchema.index({ galleryType: 1, ownerUserId: 1 });
PhotoSchema.index({ albumId: 1 });
PhotoSchema.index({ createdAt: -1 });

export const Photo = models.Photo ?? model<IPhoto>("Photo", PhotoSchema);
