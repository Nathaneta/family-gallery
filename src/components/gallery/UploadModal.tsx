"use client";

import { useEffect, useRef, useState } from "react";
import { FAMILY_CATEGORIES } from "@/utils/constants";
import { useToast } from "@/components/providers/ToastProvider";
import type { AlbumPublic } from "@/shared/api-types";
import { API_ROUTES } from "@/lib/api-endpoints";

type GalleryMode = "personal" | "family";

type Props = {
  open: boolean;
  onClose: () => void;
  ownerUserId: string;
  defaultMode?: GalleryMode;
  onUploaded?: () => void;
  /** When set (e.g. admin), personal uploads can target any listed member's folders. */
  memberPicker?: { id: string; name: string }[];
};

export function UploadModal({
  open,
  onClose,
  ownerUserId,
  defaultMode = "personal",
  onUploaded,
  memberPicker,
}: Props) {
  const { notify } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [mode, setMode] = useState<GalleryMode>(defaultMode);
  const [category, setCategory] = useState<string>("General");
  const [caption, setCaption] = useState("");
  const [albumId, setAlbumId] = useState("");
  const [albums, setAlbums] = useState<AlbumPublic[]>([]);
  const [busy, setBusy] = useState(false);
  const [personalTargetId, setPersonalTargetId] = useState(ownerUserId);
  const [storageMode, setStorageMode] = useState<"cloudinary" | "local-fallback" | null>(null);
  const [maxRecommendedBytes, setMaxRecommendedBytes] = useState<number | null>(null);

  const showMemberPicker = !!memberPicker?.length;

  useEffect(() => {
    if (open) {
      setMode(defaultMode);
      setPersonalTargetId(ownerUserId);
    }
  }, [open, defaultMode, ownerUserId]);

  const effectivePersonalOwner = showMemberPicker ? personalTargetId : ownerUserId;

  useEffect(() => {
    if (!open) return;
    const q =
      mode === "family"
        ? "/api/albums?scope=family"
        : `/api/albums?scope=personal&ownerUserId=${encodeURIComponent(effectivePersonalOwner)}`;
    fetch(q, { credentials: "include" })
      .then((r) => r.json())
      .then((d) => setAlbums(d.albums ?? []))
      .catch(() => setAlbums([]));
  }, [open, mode, effectivePersonalOwner]);

  useEffect(() => {
    if (!open) return;
    fetch(API_ROUTES.storage.status, { credentials: "include", cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        setStorageMode(d.storage?.mode ?? null);
        setMaxRecommendedBytes(
          typeof d.storage?.maxRecommendedBytes === "number" ? d.storage.maxRecommendedBytes : null
        );
      })
      .catch(() => {
        setStorageMode(null);
        setMaxRecommendedBytes(null);
      });
  }, [open]);

  if (!open) return null;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const files = inputRef.current?.files ? Array.from(inputRef.current.files) : [];
    if (files.length === 0) {
      notify("Choose at least one file.");
      return;
    }
    setBusy(true);
    try {
      let uploaded = 0;
      const failed: string[] = [];
      for (const file of files) {
        const fd = new FormData();
        fd.append("file", file);
        fd.append("galleryType", mode);
        fd.append("caption", caption);
        if (mode === "family") fd.append("category", category);
        if (mode === "personal") fd.append("ownerUserId", effectivePersonalOwner);
        if (albumId) fd.append("albumId", albumId);

        const res = await fetch("/api/photos", { method: "POST", body: fd, credentials: "include" });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          failed.push(err.error || file.name || "Upload failed");
          continue;
        }
        uploaded += 1;
      }
      if (uploaded === 0) {
        throw new Error(failed[0] || "Upload failed");
      }
      if (failed.length === 0) {
        notify(
          uploaded === 1
            ? mode === "family"
              ? "Added to the family gallery!"
              : showMemberPicker
                ? "Added to the selected member's gallery."
                : "Added to your gallery."
            : `${uploaded} files uploaded successfully.`
        );
      } else {
        notify(`${uploaded} uploaded, ${failed.length} failed. First error: ${failed[0]}`);
      }
      setCaption("");
      setAlbumId("");
      if (inputRef.current) inputRef.current.value = "";
      onUploaded?.();
      onClose();
    } catch (err) {
      notify(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-label="Upload media"
      onClick={onClose}
    >
      <form
        onClick={(e) => e.stopPropagation()}
        onSubmit={onSubmit}
        className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl border border-black/10 bg-[var(--card)] p-6 shadow-xl dark:border-white/10"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Upload media</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-sm text-[var(--muted)] hover:text-[var(--foreground)]"
          >
            Close
          </button>
        </div>

        <p className="mb-2 text-xs text-[var(--muted)]">
          Images, MP4/WebM/MOV videos, or PDF files (size limits apply).
        </p>
        {storageMode === "local-fallback" ? (
          <div className="mb-3 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-900 dark:text-amber-100">
            Cloud storage is not active. Large uploads can fail on this deployment.
            {typeof maxRecommendedBytes === "number"
              ? ` Recommended max file size: ${Math.floor(maxRecommendedBytes / (1024 * 1024))} MB.`
              : ""}
          </div>
        ) : null}
        <label className="mb-3 block text-sm font-medium">Files (you can choose multiple)</label>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept="image/*,video/mp4,video/webm,video/quicktime,.pdf,application/pdf"
          className="mb-4 w-full text-sm"
        />

        <label className="mb-3 block text-sm font-medium">Gallery</label>
        <div className="mb-4 flex gap-2">
          {(["personal", "family"] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className={`flex-1 rounded-lg border px-3 py-2 text-sm capitalize ${
                mode === m
                  ? "border-[var(--accent)] bg-[var(--accent)]/10"
                  : "border-black/10 dark:border-white/15"
              }`}
            >
              {m === "personal"
                ? showMemberPicker
                  ? "Personal"
                  : "My gallery"
                : "Family album"}
            </button>
          ))}
        </div>

        {showMemberPicker && mode === "personal" ? (
          <label className="mb-4 block">
            <span className="mb-1 block text-sm font-medium">Member gallery</span>
            <select
              value={personalTargetId}
              onChange={(e) => {
                setPersonalTargetId(e.target.value);
                setAlbumId("");
              }}
              className="w-full rounded-lg border border-black/10 bg-transparent px-3 py-2 text-sm dark:border-white/15"
            >
              {memberPicker!.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </label>
        ) : null}

        {albums.length > 0 ? (
          <label className="mb-4 block">
            <span className="mb-1 block text-sm font-medium">Folder (optional)</span>
            <select
              value={albumId}
              onChange={(e) => setAlbumId(e.target.value)}
              className="w-full rounded-lg border border-black/10 bg-transparent px-3 py-2 dark:border-white/15"
            >
              <option value="">No folder</option>
              {albums.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </label>
        ) : null}

        {mode === "family" ? (
          <label className="mb-4 block">
            <span className="mb-1 block text-sm font-medium">Category tag</span>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full rounded-lg border border-black/10 bg-transparent px-3 py-2 dark:border-white/15"
            >
              {FAMILY_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>
        ) : null}

        <label className="mb-4 block">
          <span className="mb-1 block text-sm font-medium">Caption (optional)</span>
          <textarea
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            rows={2}
            className="w-full rounded-lg border border-black/10 bg-transparent px-3 py-2 text-sm dark:border-white/15"
            placeholder="What is this moment?"
          />
        </label>

        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-xl bg-[var(--accent)] py-2.5 text-sm font-semibold text-white shadow disabled:opacity-60"
        >
          {busy ? "Uploading…" : "Upload"}
        </button>
      </form>
    </div>
  );
}
