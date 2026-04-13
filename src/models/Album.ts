import mongoose, { Schema, model, models } from "mongoose";

/** Custom folder: shared (family) or tied to one member’s personal gallery */
export type AlbumScope = "family" | "personal";

export interface IAlbum {
  _id: mongoose.Types.ObjectId;
  name: string;
  description: string;
  scope: AlbumScope;
  /** When scope is personal, which member’s gallery this folder belongs to */
  ownerUserId: mongoose.Types.ObjectId | null;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const AlbumSchema = new Schema<IAlbum>(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    scope: { type: String, enum: ["family", "personal"], required: true },
    ownerUserId: { type: Schema.Types.ObjectId, ref: "User", default: null },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

AlbumSchema.index({ scope: 1, ownerUserId: 1 });

export const Album = models.Album ?? model<IAlbum>("Album", AlbumSchema);
