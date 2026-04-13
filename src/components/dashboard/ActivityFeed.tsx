"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

type Item = {
  id: string;
  message: string;
  createdAt: string;
  thumbnailPath: string;
  mediaType?: string;
};

function formatWhen(iso: string) {
  const d = new Date(iso);
  const now = Date.now();
  const diff = now - d.getTime();
  if (diff < 60_000) return "Just now";
  if (diff < 3600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86400_000) return `${Math.floor(diff / 3600_000)}h ago`;
  if (diff < 604800_000) return `${Math.floor(diff / 86400_000)}d ago`;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function ActivityFeed() {
  const [items, setItems] = useState<Item[]>([]);

  useEffect(() => {
    fetch("/api/activity", { credentials: "include" })
      .then((r) => r.json())
      .then((d) => setItems(d.items ?? []))
      .catch(() => setItems([]));
  }, []);

  if (items.length === 0) return null;

  return (
    <section className="activity-feed mb-10 overflow-hidden rounded-2xl border border-black/5 bg-[var(--card)] shadow-md dark:border-white/10">
      <div className="border-b border-black/5 bg-gradient-to-r from-[var(--accent)]/8 to-transparent px-5 py-3 dark:border-white/10">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--foreground)]">
          Recent activity
        </h2>
        <p className="text-xs text-[var(--muted)]">Latest uploads across the family</p>
      </div>
      <ul className="divide-y divide-black/5 p-2 dark:divide-white/10">
        {items.slice(0, 6).map((item) => (
          <li
            key={item.id}
            className="flex gap-3 rounded-xl p-2 text-sm transition hover:bg-black/[0.03] dark:hover:bg-white/[0.04]"
          >
            <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-black/5 ring-1 ring-black/5 dark:ring-white/10">
              {item.mediaType === "video" ? (
                <video
                  src={item.thumbnailPath}
                  className="h-full w-full object-cover"
                  muted
                  playsInline
                  preload="metadata"
                />
              ) : item.mediaType === "file" ? (
                <div className="flex h-full w-full items-center justify-center text-xl">📄</div>
              ) : (
                <Image
                  src={item.thumbnailPath}
                  alt=""
                  fill
                  className="object-cover"
                  sizes="56px"
                  unoptimized={item.thumbnailPath.startsWith("/uploads")}
                />
              )}
            </div>
            <div className="min-w-0 flex-1 py-0.5">
              <p className="leading-snug text-[var(--foreground)]">{item.message}</p>
              <p className="mt-1 text-xs text-[var(--muted)]">{formatWhen(item.createdAt)}</p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
