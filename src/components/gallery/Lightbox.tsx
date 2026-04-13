"use client";

import Image from "next/image";
import { useEffect, useMemo } from "react";
import type { PhotoPublic } from "@/shared/api-types";

type Props = {
  photo: PhotoPublic | null;
  onClose: () => void;
  /** Same ordering as the grid; enables ← → and on-screen controls. */
  photos?: PhotoPublic[];
  onNavigate?: (photo: PhotoPublic) => void;
};

export function Lightbox({ photo, onClose, photos, onNavigate }: Props) {
  const index = useMemo(() => {
    if (!photo || !photos?.length) return -1;
    return photos.findIndex((p) => p.id === photo.id);
  }, [photo, photos]);

  const canNav = index >= 0 && !!photos?.length && !!onNavigate;
  const hasPrev = canNav && index > 0;
  const hasNext = canNav && index < photos!.length - 1;

  useEffect(() => {
    if (!photo) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }
      if (photos?.length && onNavigate) {
        const idx = photos.findIndex((p) => p.id === photo.id);
        if (idx >= 0) {
          if (e.key === "ArrowLeft" && idx > 0) {
            e.preventDefault();
            onNavigate(photos[idx - 1]);
            return;
          }
          if (e.key === "ArrowRight" && idx < photos.length - 1) {
            e.preventDefault();
            onNavigate(photos[idx + 1]);
            return;
          }
        }
      }
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [photo, onClose, photos, onNavigate]);

  if (!photo) return null;

  return (
    <div
      className="lightbox-backdrop fixed inset-0 z-50 flex items-center justify-center bg-black/82 p-4 backdrop-blur-md"
      role="dialog"
      aria-modal="true"
      aria-label="Media viewer"
      onClick={onClose}
    >
      <button
        type="button"
        className="absolute right-4 top-4 z-10 rounded-full border border-white/15 bg-white/10 px-4 py-1.5 text-sm font-medium text-white shadow-lg transition hover:bg-white/20"
        onClick={onClose}
      >
        Close
      </button>
      {hasPrev ? (
        <button
          type="button"
          aria-label="Previous"
          className="absolute left-2 top-1/2 z-10 hidden -translate-y-1/2 rounded-full border border-white/20 bg-black/40 p-3 text-white shadow-lg backdrop-blur-sm transition hover:bg-black/55 sm:left-4 sm:block"
          onClick={(e) => {
            e.stopPropagation();
            if (photos && index > 0) onNavigate?.(photos[index - 1]);
          }}
        >
          <span className="text-lg leading-none">←</span>
        </button>
      ) : null}
      {hasNext ? (
        <button
          type="button"
          aria-label="Next"
          className="absolute right-2 top-1/2 z-10 hidden -translate-y-1/2 rounded-full border border-white/20 bg-black/40 p-3 text-white shadow-lg backdrop-blur-sm transition hover:bg-black/55 sm:right-4 sm:block"
          onClick={(e) => {
            e.stopPropagation();
            if (photos && index >= 0 && index < photos.length - 1) onNavigate?.(photos[index + 1]);
          }}
        >
          <span className="text-lg leading-none">→</span>
        </button>
      ) : null}
      <div className="relative max-h-[90vh] max-w-5xl" onClick={(e) => e.stopPropagation()}>
        <div className="relative max-h-[85vh] min-h-[200px] w-full min-w-[280px]">
          {photo.mediaType === "video" ? (
            <video
              key={photo.id}
              src={photo.publicPath}
              controls
              className="max-h-[85vh] w-full max-w-full rounded-xl shadow-2xl ring-1 ring-white/10"
              playsInline
            />
          ) : photo.mediaType === "file" ? (
            <div className="rounded-xl bg-gradient-to-b from-white/12 to-white/5 p-8 text-center text-white shadow-2xl ring-1 ring-white/10">
              <p className="mb-4 text-lg font-medium">{photo.originalFilename || "Download file"}</p>
              <a
                href={photo.publicPath}
                download={photo.originalFilename || true}
                className="inline-block rounded-xl bg-[var(--accent)] px-6 py-3 font-semibold text-white shadow-lg transition hover:opacity-95"
              >
                Download
              </a>
            </div>
          ) : (
            <Image
              key={photo.id}
              src={photo.publicPath}
              alt={photo.caption || "Full size"}
              width={1600}
              height={1200}
              className="max-h-[85vh] w-auto max-w-full rounded-xl object-contain shadow-2xl ring-1 ring-white/10"
              unoptimized={photo.publicPath.startsWith("/uploads")}
            />
          )}
        </div>
        <div className="lightbox-meta mt-4 rounded-xl border border-white/10 bg-gradient-to-br from-black/50 to-black/30 px-4 py-3 text-sm text-white shadow-lg backdrop-blur-md">
          {photo.caption ? (
            <p className="text-[15px] font-medium leading-relaxed text-white/95">{photo.caption}</p>
          ) : (
            <p className="text-white/50">No caption</p>
          )}
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-white/65">
            {photo.uploaderName ? <span>Uploaded by {photo.uploaderName}</span> : null}
            <span>
              {new Date(photo.createdAt).toLocaleDateString(undefined, {
                year: "numeric",
                month: "short",
                day: "numeric",
              })}
            </span>
            {photo.galleryType === "family" ? (
              <span className="rounded-md bg-[var(--accent)]/25 px-2 py-0.5 font-medium text-[var(--accent)]">
                Family · {photo.category}
              </span>
            ) : (
              <span className="rounded-md bg-white/10 px-2 py-0.5">Personal</span>
            )}
          </div>
          {canNav && photos!.length > 1 ? (
            <p className="mt-2 text-[11px] uppercase tracking-wider text-white/40">
              {index + 1} / {photos!.length} · use arrow keys
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
