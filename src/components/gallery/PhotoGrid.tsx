"use client";

import Image from "next/image";
import type { PhotoPublic } from "@/shared/api-types";

type Props = {
  photos: PhotoPublic[];
  onSelect: (photo: PhotoPublic) => void;
};

export function PhotoGrid({ photos, onSelect }: Props) {
  if (photos.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-black/15 bg-black/[0.02] px-8 py-14 text-center dark:border-white/20 dark:bg-white/[0.03]">
        <p className="text-4xl" aria-hidden>
          🖼️
        </p>
        <p className="mt-3 font-medium text-[var(--foreground)]">Nothing here yet</p>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Upload photos, videos, or PDFs — they will show up in this grid.
        </p>
      </div>
    );
  }

  return (
    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
      {photos.map((p) => (
        <li key={p.id}>
          <button
            type="button"
            onClick={() => onSelect(p)}
            className="group relative aspect-square min-h-[148px] w-full overflow-hidden rounded-xl border border-black/5 bg-black/5 shadow-sm transition-shadow focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] active:scale-[0.99] hover:shadow-md dark:border-white/10"
          >
            {p.mediaType === "video" ? (
              <video
                src={p.publicPath}
                className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                muted
                playsInline
                preload="metadata"
              />
            ) : p.mediaType === "file" ? (
              <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-black/10 p-2 text-center">
                <span className="text-3xl">📄</span>
                <span className="line-clamp-3 px-2 text-xs text-[var(--foreground)]">
                  {p.originalFilename || "File"}
                </span>
              </div>
            ) : (
              <Image
                src={p.publicPath}
                alt={p.caption || "Photo"}
                fill
                className="object-cover transition duration-300 group-hover:scale-105"
                sizes="(max-width: 640px) 50vw, 25vw"
                unoptimized={p.publicPath.startsWith("/uploads") || p.publicPath.startsWith("data:")}
              />
            )}
            {p.caption ? (
              <span className="absolute inset-x-0 bottom-0 line-clamp-2 bg-gradient-to-t from-black/70 to-transparent px-2 pb-2 pt-8 text-left text-xs text-white">
                {p.caption}
              </span>
            ) : null}
          </button>
        </li>
      ))}
    </ul>
  );
}
