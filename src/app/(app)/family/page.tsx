"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { PhotoGrid } from "@/components/gallery/PhotoGrid";
import { Lightbox } from "@/components/gallery/Lightbox";
import { UploadModal } from "@/components/gallery/UploadModal";
import { useAuth } from "@/components/providers/AuthProvider";
import type { AlbumPublic, PhotoPublic, UserPublic } from "@/shared/api-types";
import { FAMILY_CATEGORIES } from "@/utils/constants";

const SAVED_FILTER_KEY = "family-gallery-family-filters-v1";

type SavedFilters = {
  q: string;
  category: string;
  uploader: string;
  albumFilter: string;
  mediaType: string;
  dateFrom: string;
  dateTo: string;
  sort: "newest" | "oldest";
};

function getInitialFilterParam(name: string) {
  if (typeof window === "undefined") return "";
  return new URLSearchParams(window.location.search).get(name) ?? "";
}

export default function FamilyGalleryPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [photos, setPhotos] = useState<PhotoPublic[]>([]);
  const [members, setMembers] = useState<UserPublic[]>([]);
  const [selected, setSelected] = useState<PhotoPublic | null>(null);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [q, setQ] = useState(() => getInitialFilterParam("q"));
  const [category, setCategory] = useState<string>(() => getInitialFilterParam("category"));
  const [uploader, setUploader] = useState<string>(() => getInitialFilterParam("uploadedBy"));
  const [familyAlbums, setFamilyAlbums] = useState<AlbumPublic[]>([]);
  const [albumFilter, setAlbumFilter] = useState<string>(() => getInitialFilterParam("albumId"));
  const [mediaType, setMediaType] = useState<string>(() => getInitialFilterParam("mediaType"));
  const [dateFrom, setDateFrom] = useState<string>(() => getInitialFilterParam("dateFrom"));
  const [dateTo, setDateTo] = useState<string>(() => getInitialFilterParam("dateTo"));
  const [sort, setSort] = useState<"newest" | "oldest">(() =>
    getInitialFilterParam("sort") === "oldest" ? "oldest" : "newest"
  );

  useEffect(() => {
    const p = new URLSearchParams();
    if (q.trim()) p.set("q", q.trim());
    if (category) p.set("category", category);
    if (uploader) p.set("uploadedBy", uploader);
    if (albumFilter) p.set("albumId", albumFilter);
    if (mediaType) p.set("mediaType", mediaType);
    if (dateFrom) p.set("dateFrom", dateFrom);
    if (dateTo) p.set("dateTo", dateTo);
    p.set("sort", sort);
    const qs = p.toString();
    router.replace(qs ? `/family?${qs}` : "/family");
  }, [q, category, uploader, albumFilter, mediaType, dateFrom, dateTo, sort, router]);

  const queryString = useMemo(() => {
    const p = new URLSearchParams();
    p.set("galleryType", "family");
    if (q.trim()) p.set("q", q.trim());
    if (category) p.set("category", category);
    if (uploader) p.set("uploadedBy", uploader);
    if (albumFilter === "none") p.set("albumId", "none");
    else if (albumFilter) p.set("albumId", albumFilter);
    if (mediaType) p.set("mediaType", mediaType);
    if (dateFrom) p.set("dateFrom", dateFrom);
    if (dateTo) p.set("dateTo", dateTo);
    p.set("sort", sort);
    return p.toString();
  }, [q, category, uploader, albumFilter, mediaType, dateFrom, dateTo, sort]);

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

  const saveCurrentFilters = () => {
    const payload: SavedFilters = { q, category, uploader, albumFilter, mediaType, dateFrom, dateTo, sort };
    localStorage.setItem(SAVED_FILTER_KEY, JSON.stringify(payload));
  };

  const loadSavedFilters = () => {
    const raw = localStorage.getItem(SAVED_FILTER_KEY);
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw) as Partial<SavedFilters>;
      setQ(parsed.q ?? "");
      setCategory(parsed.category ?? "");
      setUploader(parsed.uploader ?? "");
      setAlbumFilter(parsed.albumFilter ?? "");
      setMediaType(parsed.mediaType ?? "");
      setDateFrom(parsed.dateFrom ?? "");
      setDateTo(parsed.dateTo ?? "");
      setSort(parsed.sort === "oldest" ? "oldest" : "newest");
    } catch {
      // ignore invalid local storage payload
    }
  };

  const clearFilters = () => {
    setQ("");
    setCategory("");
    setUploader("");
    setAlbumFilter("");
    setMediaType("");
    setDateFrom("");
    setDateTo("");
    setSort("newest");
  };

  const smartSuggestions = useMemo(() => {
    if (photos.length === 0) return [];

    const uploaderCounts = new Map<string, number>();
    const categoryCounts = new Map<string, number>();
    const mediaCounts = new Map<string, number>();
    let latestDate: Date | null = null;

    for (const p of photos) {
      uploaderCounts.set(p.uploadedBy, (uploaderCounts.get(p.uploadedBy) ?? 0) + 1);
      if (p.category) categoryCounts.set(p.category, (categoryCounts.get(p.category) ?? 0) + 1);
      mediaCounts.set(p.mediaType, (mediaCounts.get(p.mediaType) ?? 0) + 1);
      const d = new Date(p.createdAt);
      if (!latestDate || d > latestDate) latestDate = d;
    }

    const topUploader = [...uploaderCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
    const topCategory = [...categoryCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
    const topMediaType = [...mediaCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] as
      | "image"
      | "video"
      | "file"
      | undefined;
    const topUploaderName = members.find((m) => m.id === topUploader)?.name ?? "Top uploader";

    const suggestions: { label: string; apply: () => void }[] = [];
    if (topUploader) {
      suggestions.push({
        label: `Top uploader: ${topUploaderName}`,
        apply: () => setUploader(topUploader),
      });
    }
    if (topCategory) {
      suggestions.push({
        label: `Top category: ${topCategory}`,
        apply: () => setCategory(topCategory),
      });
    }
    if (topMediaType) {
      suggestions.push({
        label: `Most common: ${topMediaType}`,
        apply: () => setMediaType(topMediaType),
      });
    }
    if (latestDate) {
      const monthStart = new Date(latestDate.getFullYear(), latestDate.getMonth(), 1)
        .toISOString()
        .slice(0, 10);
      const monthEnd = new Date(latestDate.getFullYear(), latestDate.getMonth() + 1, 0)
        .toISOString()
        .slice(0, 10);
      suggestions.push({
        label: `Latest month: ${latestDate.toLocaleDateString(undefined, { month: "short", year: "numeric" })}`,
        apply: () => {
          setDateFrom(monthStart);
          setDateTo(monthEnd);
          setSort("newest");
        },
      });
    }
    return suggestions.slice(0, 4);
  }, [photos, members]);

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
        <label className="min-w-[140px]">
          <span className="mb-1 block text-xs font-medium text-[var(--muted)]">Media type</span>
          <select
            value={mediaType}
            onChange={(e) => setMediaType(e.target.value)}
            className="w-full rounded-lg border border-black/10 bg-transparent px-3 py-2 text-sm dark:border-white/15"
          >
            <option value="">All</option>
            <option value="image">Images</option>
            <option value="video">Videos</option>
            <option value="file">Files</option>
          </select>
        </label>
        <label>
          <span className="mb-1 block text-xs font-medium text-[var(--muted)]">From</span>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="rounded-lg border border-black/10 bg-transparent px-3 py-2 text-sm dark:border-white/15"
          />
        </label>
        <label>
          <span className="mb-1 block text-xs font-medium text-[var(--muted)]">To</span>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="rounded-lg border border-black/10 bg-transparent px-3 py-2 text-sm dark:border-white/15"
          />
        </label>
        <label className="min-w-[130px]">
          <span className="mb-1 block text-xs font-medium text-[var(--muted)]">Sort</span>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as "newest" | "oldest")}
            className="w-full rounded-lg border border-black/10 bg-transparent px-3 py-2 text-sm dark:border-white/15"
          >
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
          </select>
        </label>
        <div className="flex flex-wrap items-center gap-2 sm:ml-auto">
          <button
            type="button"
            onClick={async () => {
              await navigator.clipboard.writeText(window.location.href);
            }}
            className="rounded-lg border border-black/10 px-3 py-2 text-xs font-medium dark:border-white/15"
          >
            Copy link
          </button>
          <button
            type="button"
            onClick={saveCurrentFilters}
            className="rounded-lg border border-black/10 px-3 py-2 text-xs font-medium dark:border-white/15"
          >
            Save filters
          </button>
          <button
            type="button"
            onClick={loadSavedFilters}
            className="rounded-lg border border-black/10 px-3 py-2 text-xs font-medium dark:border-white/15"
          >
            Load saved
          </button>
          <button
            type="button"
            onClick={clearFilters}
            className="rounded-lg border border-black/10 px-3 py-2 text-xs font-medium dark:border-white/15"
          >
            Clear
          </button>
        </div>
      </div>

      <div className="mb-6 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setMediaType("image")}
          className="rounded-full border border-black/10 px-3 py-1 text-xs dark:border-white/15"
        >
          Images
        </button>
        <button
          type="button"
          onClick={() => setMediaType("video")}
          className="rounded-full border border-black/10 px-3 py-1 text-xs dark:border-white/15"
        >
          Videos
        </button>
        <button
          type="button"
          onClick={() => setMediaType("file")}
          className="rounded-full border border-black/10 px-3 py-1 text-xs dark:border-white/15"
        >
          Files
        </button>
        <button
          type="button"
          onClick={() => {
            const now = new Date();
            const start = new Date(now.getFullYear(), 0, 1);
            setDateFrom(start.toISOString().slice(0, 10));
            setDateTo(now.toISOString().slice(0, 10));
          }}
          className="rounded-full border border-black/10 px-3 py-1 text-xs dark:border-white/15"
        >
          This year
        </button>
        <button
          type="button"
          onClick={() => {
            const now = new Date();
            const start = new Date(now);
            start.setDate(now.getDate() - 30);
            setDateFrom(start.toISOString().slice(0, 10));
            setDateTo(now.toISOString().slice(0, 10));
          }}
          className="rounded-full border border-black/10 px-3 py-1 text-xs dark:border-white/15"
        >
          Last 30 days
        </button>
      </div>
      {smartSuggestions.length > 0 ? (
        <div className="mb-6 rounded-xl border border-black/10 p-3 dark:border-white/15">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
            Smart suggestions
          </p>
          <div className="flex flex-wrap gap-2">
            {smartSuggestions.map((s) => (
              <button
                key={s.label}
                type="button"
                onClick={s.apply}
                className="rounded-full border border-[var(--accent)]/40 bg-[var(--accent)]/10 px-3 py-1 text-xs"
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
      ) : null}

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
