type AlbumAccessShape = {
  scope: "family" | "personal";
  ownerUserId: { toString: () => string } | string | null | undefined;
  visibility?: "all" | "restricted" | null;
  allowedUserIds?: Array<{ toString: () => string } | string> | null;
};

export function canAccessAlbum(album: AlbumAccessShape, viewerUserId: string): boolean {
  if (album.scope === "personal") {
    const ownerId = album.ownerUserId ? album.ownerUserId.toString() : "";
    if (ownerId === viewerUserId) return true;
  }

  const visibility = album.visibility ?? "all";
  if (visibility !== "restricted") return true;

  const allowed = (album.allowedUserIds ?? []).map((x) => x.toString());
  if (album.ownerUserId && album.ownerUserId.toString() === viewerUserId) return true;
  return allowed.includes(viewerUserId);
}
