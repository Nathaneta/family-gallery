"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { API_ROUTES } from "@/lib/api-endpoints";

type SpotlightPhoto = {
  publicPath: string;
  caption: string;
  category: string;
  createdAt: string;
};

export function FamilySpotlight() {
  const [photo, setPhoto] = useState<SpotlightPhoto | null | undefined>(undefined);

  useEffect(() => {
    fetch(API_ROUTES.photosSpotlight, { credentials: "include" })
      .then((r) => r.json())
      .then((d) => setPhoto(d.photo ?? null))
      .catch(() => setPhoto(null));
  }, []);

  if (photo === undefined) {
    return (
      <section className="spotlight-card mb-10 overflow-hidden rounded-2xl border border-violet-200/40 bg-[var(--card)] p-5 shadow-sm dark:border-violet-500/25">
        <div className="h-40 animate-pulse rounded-xl bg-black/5 dark:bg-white/5" />
      </section>
    );
  }

  if (photo === null) {
    return null;
  }

  return (
    <section className="spotlight-card mb-10 overflow-hidden rounded-2xl border border-violet-200/50 bg-gradient-to-br from-violet-50/90 to-[var(--card)] shadow-md dark:border-violet-500/30 dark:from-violet-950/50">
      <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-stretch">
        <div className="relative aspect-[4/3] w-full shrink-0 overflow-hidden rounded-xl bg-black/5 sm:max-w-[220px]">
          <Image
            src={photo.publicPath}
            alt=""
            fill
            className="object-cover"
            sizes="220px"
            unoptimized={photo.publicPath.startsWith("/uploads") || photo.publicPath.startsWith("data:")}
          />
        </div>
        <div className="flex min-w-0 flex-1 flex-col justify-center">
          <p className="text-xs font-bold uppercase tracking-widest text-violet-600 dark:text-violet-300">
            Random spotlight
          </p>
          <h2 className="mt-1 text-lg font-semibold text-[var(--foreground)]">From the family gallery</h2>
          {photo.caption ? (
            <p className="mt-2 text-sm text-[var(--muted)] line-clamp-3">{photo.caption}</p>
          ) : (
            <p className="mt-2 text-sm text-[var(--muted)]">No caption on this one — still a nice memory.</p>
          )}
          <p className="mt-2 text-xs text-[var(--muted)]">
            {photo.category ? `${photo.category} · ` : null}
            {new Date(photo.createdAt).toLocaleDateString()}
          </p>
          <Link
            href="/family"
            className="mt-4 inline-flex w-fit rounded-xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:opacity-95 dark:bg-violet-500 dark:text-white"
          >
            Open family gallery
          </Link>
        </div>
      </div>
    </section>
  );
}
