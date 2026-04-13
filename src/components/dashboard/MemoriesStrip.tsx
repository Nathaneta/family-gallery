"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { API_ROUTES } from "@/lib/api-endpoints";
import type { PhotoPublic } from "@/shared/api-types";

type Props = {
  /** Second argument is the full “on this day” set so the parent can enable lightbox prev/next. */
  onOpenMemory?: (photo: PhotoPublic, allPhotos: PhotoPublic[]) => void;
};

export function MemoriesStrip({ onOpenMemory }: Props) {
  const [photos, setPhotos] = useState<PhotoPublic[]>([]);
  const [label, setLabel] = useState<string>("");
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetch(API_ROUTES.photosMemories, { credentials: "include" })
      .then((r) => r.json())
      .then((d) => {
        setPhotos(d.photos ?? []);
        if (typeof d.monthDayLabel === "string") setLabel(d.monthDayLabel);
      })
      .catch(() => setPhotos([]))
      .finally(() => setLoaded(true));
  }, []);

  if (!loaded) {
    return (
      <section className="memories-strip mb-10 rounded-2xl border border-[var(--memories-border)] p-5 shadow-sm">
        <div className="h-24 animate-pulse rounded-xl bg-black/5 dark:bg-white/5" />
      </section>
    );
  }

  if (photos.length === 0) {
    return (
      <section className="memories-strip mb-10 rounded-2xl border border-[var(--memories-border)] p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--memories-heading)]">
              On this day
            </h2>
            <p className="mt-1 text-sm text-[var(--muted)]">
              {label ? (
                <>
                  Nothing uploaded on <span className="font-medium text-[var(--foreground)]">{label}</span> yet.
                  Upload a photo and it will show up here in future years.
                </>
              ) : (
                "Uploads from this calendar day in past years will appear here."
              )}
            </p>
          </div>
          <Link
            href="/family"
            className="shrink-0 rounded-xl border border-[var(--accent)]/35 bg-[var(--accent)]/10 px-4 py-2 text-sm font-semibold text-[var(--accent)] transition hover:bg-[var(--accent)]/15"
          >
            Family gallery
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="memories-strip mb-10 rounded-2xl border border-[var(--memories-border)] p-5 shadow-sm">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--memories-heading)]">
            On this day
          </h2>
          <p className="mt-0.5 text-sm text-[var(--muted)]">
            {label ? (
              <>
                From <span className="font-medium text-[var(--foreground)]">{label}</span> in past years — tap to
                preview.
              </>
            ) : (
              "Memories from this date in past years."
            )}
          </p>
        </div>
        <Link
          href="/family"
          className="text-sm font-medium text-[var(--accent)] underline-offset-4 hover:underline"
        >
          Open family gallery
        </Link>
      </div>
      <ul className="flex gap-3 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {photos.map((p) => {
          const year = new Date(p.createdAt).getUTCFullYear();
          return (
            <li key={p.id} className="shrink-0">
              <button
                type="button"
                onClick={() => onOpenMemory?.(p, photos)}
                className="memory-thumb group relative flex w-28 flex-col overflow-hidden rounded-xl border border-black/10 bg-black/5 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] dark:border-white/15"
              >
                <div className="relative aspect-square w-full">
                  {p.mediaType === "video" ? (
                    <video
                      src={p.publicPath}
                      className="h-full w-full object-cover"
                      muted
                      playsInline
                      preload="metadata"
                    />
                  ) : p.mediaType === "file" ? (
                    <div className="flex h-full w-full items-center justify-center bg-violet-500/15 text-2xl">
                      📄
                    </div>
                  ) : (
                    <Image
                      src={p.publicPath}
                      alt=""
                      fill
                      className="object-cover transition duration-300 group-hover:scale-105"
                      sizes="112px"
                      unoptimized={p.publicPath.startsWith("/uploads")}
                    />
                  )}
                  <span className="absolute left-2 top-2 rounded-md bg-black/55 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white backdrop-blur-sm">
                    {year}
                  </span>
                </div>
                {p.caption ? (
                  <p className="line-clamp-2 px-2 py-1.5 text-[11px] leading-snug text-[var(--foreground)]">
                    {p.caption}
                  </p>
                ) : (
                  <p className="px-2 py-1.5 text-[11px] text-[var(--muted)]">No caption</p>
                )}
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
