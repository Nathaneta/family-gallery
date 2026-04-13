"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { PhotoGrid } from "@/components/gallery/PhotoGrid";
import { Lightbox } from "@/components/gallery/Lightbox";
import { UploadModal } from "@/components/gallery/UploadModal";
import { useAuth } from "@/components/providers/AuthProvider";
import type { AlbumPublic, PhotoPublic, UserPublic } from "@/shared/api-types";
import { FAMILY_CATEGORIES } from "@/utils/constants";

export default function FamilyGalleryPage() {
  const { user } = useAuth();
  const [photos, setPhotos] = useState<PhotoPublic[]>([]);
  const [members, setMembers] = useState<UserPublic[]>([]);
  const [selected, setSelected] = useState<PhotoPublic | null>(null);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [q, setQ] = useState("");
  const [category, setCategory] = useState<string>("");
  const [uploader, setUploader] = useState<string>("");
  const [familyAlbums, setFamilyAlbums] = useState<AlbumPublic[]>([]);
  const [albumFilter, setAlbumFilter] = useState<string>("");

  const queryString = useMemo(() => {
    const p = new URLSearchParams();
    p.set("galleryType", "family");
    if (q.trim()) p.set("q", q.trim());
    if (category) p.set("category", category);
    if (uploader) p.set("uploadedBy", uploader);
    if (albumFilter === "none") p.set("albumId", "none");
    else if (albumFilter) p.set("albumId", albumFilter);
    return p.toString();
  }, [q, category, uploader, albumFilter]);

  const load = useCallback(() => {
    fetch(`/api/photos?${queryString}`, { credentials: "include" })
      .then((r) => r.json())
      .then((d) => setPhotos(d.photos ?? []))
      .catch(() => setPhotos([]));
  }, [queryString]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    fetch("/api/users", { credentials: "include" })
      .then((r) => r.json())
      .then((d) => setMembers(d.users ?? []))
      .catch(() => setMembers([]));
  }, []);

  useEffect(() => {
    fetch("/api/albums?scope=family", { credentials: "include" })
      .then((r) => r.json())
      .then((d) => setFamilyAlbums(d.albums ?? []))
      .catch(() => setFamilyAlbums([]));
  }, []);

  return (
    <div>
      <div className="page-intro mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-[var(--accent)]">Shared</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight">Family gallery</h1>
          <p className="mt-1 max-w-xl text-[var(--muted)]">
            Photos, videos, and files everyone can see. Filter by folder, category, or uploader.
          </p>
        </div>
        {user && (
          <button
            type="button"
            onClick={() => setUploadOpen(true)}
            className="rounded-xl bg-[var(--accent)] px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-[var(--accent)]/20 transition hover:opacity-95"
          >
            Add to family album
          </button>
        )}
      </div>

      <div className="mb-6 flex flex-col gap-3 rounded-2xl border border-black/5 bg-[var(--card)] p-4 shadow-sm dark:border-white/10 sm:flex-row sm:flex-wrap sm:items-end">
        <label className="min-w-[180px] flex-1">
          <span className="mb-1 block text-xs font-medium text-[var(--muted)]">Search</span>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Caption or filename…"
            className="w-full rounded-lg border border-black/10 bg-transparent px-3 py-2 text-sm dark:border-white/15"
          />
        </label>
        <label className="min-w-[140px]">
          <span className="mb-1 block text-xs font-medium text-[var(--muted)]">Category</span>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full rounded-lg border border-black/10 bg-transparent px-3 py-2 text-sm dark:border-white/15"
          >
            <option value="">All</option>
            {FAMILY_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>
        <label className="min-w-[160px]">
          <span className="mb-1 block text-xs font-medium text-[var(--muted)]">Uploaded by</span>
          <select
            value={uploader}
            onChange={(e) => setUploader(e.target.value)}
            className="w-full rounded-lg border border-black/10 bg-transparent px-3 py-2 text-sm dark:border-white/15"
          >
            <option value="">Anyone</option>
            {members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </label>
        <label className="min-w-[180px]">
          <span className="mb-1 block text-xs font-medium text-[var(--muted)]">Folder</span>
          <select
            value={albumFilter}
            onChange={(e) => setAlbumFilter(e.target.value)}
            className="w-full rounded-lg border border-black/10 bg-transparent px-3 py-2 text-sm dark:border-white/15"
          >
            <option value="">All items</option>
            <option value="none">Not in a folder</option>
            {familyAlbums.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      <PhotoGrid photos={photos} onSelect={setSelected} />
      <Lightbox
        photo={selected}
        photos={photos}
        onNavigate={setSelected}
        onClose={() => setSelected(null)}
      />

      {user && (
        <UploadModal
          open={uploadOpen}
          onClose={() => setUploadOpen(false)}
          ownerUserId={user.id}
          defaultMode="family"
          onUploaded={load}
        />
      )}
    </div>
  );
}
