/**
 * JSON shapes returned by /api/* — keep stable for a future React Native / Expo client.
 */
export type UserPublic = {
  id: string;
  name: string;
  email: string;
  avatarUrl: string;
  /** e.g. Father, Mother, Sister — shown on dashboard cards */
  displayRole?: string;
  /** Present on /api/auth/me and after login for the signed-in user */
  isAdmin?: boolean;
};

export type PhotoPublic = {
  id: string;
  publicPath: string;
  caption: string;
  galleryType: "personal" | "family";
  category: string;
  ownerUserId: string | null;
  uploadedBy: string;
  uploaderName?: string;
  albumId: string | null;
  mediaType: "image" | "video" | "file";
  mimeType: string;
  originalFilename: string;
  createdAt: string;
};

export type AlbumPublic = {
  id: string;
  name: string;
  description: string;
  scope: "family" | "personal";
  ownerUserId: string | null;
  visibility?: "all" | "restricted";
  allowedUserIds?: string[];
};
