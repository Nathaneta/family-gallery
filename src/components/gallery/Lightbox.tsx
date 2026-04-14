"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/components/providers/AuthProvider";
import { useToast } from "@/components/providers/ToastProvider";
import type { PhotoPublic } from "@/shared/api-types";

type Props = {
  photo: PhotoPublic | null;
  onClose: () => void;
  /** Same ordering as the grid; enables ← → and on-screen controls. */
  photos?: PhotoPublic[];
  onNavigate?: (photo: PhotoPublic) => void;
};

type CommentItem = {
  id: string;
  userId: string;
  userName: string;
  body: string;
  createdAt: string;
  mine: boolean;
};

const REACTIONS = ["👍", "❤️", "😂", "😮", "😢", "🔥"] as const;

export function Lightbox({ photo, onClose, photos, onNavigate }: Props) {
  const { user } = useAuth();
  const { notify } = useToast();
  const index = useMemo(() => {
    if (!photo || !photos?.length) return -1;
    return photos.findIndex((p) => p.id === photo.id);
  }, [photo, photos]);
  const [comments, setComments] = useState<CommentItem[]>([]);
  const [commentDraft, setCommentDraft] = useState("");
  const [commentBusy, setCommentBusy] = useState(false);
  const [reactions, setReactions] = useState<Record<string, number>>({});
  const [mine, setMine] = useState<Record<string, boolean>>({});
  const [reactionBusy, setReactionBusy] = useState(false);

  const canNav = index >= 0 && !!photos?.length && !!onNavigate;
  const hasPrev = canNav && index > 0;
  const hasNext = canNav && index < photos!.length - 1;

  const loadSocial = useCallback(async () => {
    if (!photo) return;
    try {
      const [cRes, rRes] = await Promise.all([
        fetch(`/api/photos/${photo.id}/comments`, { credentials: "include", cache: "no-store" }),
        fetch(`/api/photos/${photo.id}/reactions`, { credentials: "include", cache: "no-store" }),
      ]);
      const cData = await cRes.json().catch(() => ({}));
      const rData = await rRes.json().catch(() => ({}));
      if (cRes.ok) setComments(cData.comments ?? []);
      if (rRes.ok) {
        setReactions(rData.summary ?? {});
        setMine(rData.mine ?? {});
      }
    } catch {
      /* ignore */
    }
  }, [photo]);

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

  useEffect(() => {
    if (!photo) return;
    loadSocial();
    const t = setInterval(loadSocial, 10000);
    return () => clearInterval(t);
  }, [photo, loadSocial]);

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
              unoptimized={photo.publicPath.startsWith("/uploads") || photo.publicPath.startsWith("data:")}
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
          {user && !photo.hidden ? (
            <div className="mt-3">
              <button
                type="button"
                className="rounded-lg border border-rose-300/40 bg-rose-500/10 px-3 py-1.5 text-xs font-medium text-rose-200 hover:bg-rose-500/20"
                onClick={async () => {
                  const reason = window.prompt("Why are you reporting this media?")?.trim() ?? "";
                  if (!reason) return;
                  try {
                    const res = await fetch(`/api/photos/${photo.id}/report`, {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      credentials: "include",
                      body: JSON.stringify({ reason }),
                    });
                    const data = await res.json().catch(() => ({}));
                    if (!res.ok) throw new Error(data.error || "Could not submit report");
                    notify("Report sent to admins.");
                  } catch (err) {
                    notify(err instanceof Error ? err.message : "Could not submit report");
                  }
                }}
              >
                Report this media
              </button>
            </div>
          ) : null}

          <div className="mt-4 border-t border-white/10 pt-3">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-white/70">Reactions</p>
            <div className="flex flex-wrap gap-2">
              {REACTIONS.map((emoji) => {
                const count = reactions[emoji] ?? 0;
                return (
                  <button
                    key={emoji}
                    type="button"
                    disabled={reactionBusy}
                    onClick={async () => {
                      if (!user) return;
                      setReactionBusy(true);
                      try {
                        const res = await fetch(`/api/photos/${photo.id}/reactions`, {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          credentials: "include",
                          cache: "no-store",
                          body: JSON.stringify({ emoji }),
                        });
                        const data = await res.json().catch(() => ({}));
                        if (!res.ok) throw new Error(data.error || "Could not react");
                        setReactions(data.summary ?? {});
                        setMine(data.mine ?? {});
                      } catch (err) {
                        notify(err instanceof Error ? err.message : "Could not react");
                      } finally {
                        setReactionBusy(false);
                      }
                    }}
                    className={`rounded-full border px-2.5 py-1 text-xs transition ${
                      mine[emoji]
                        ? "border-cyan-300 bg-cyan-500/20 text-cyan-100"
                        : "border-white/20 bg-white/10 text-white hover:bg-white/15"
                    }`}
                  >
                    <span>{emoji}</span>
                    <span className="ml-1">{count}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mt-4 border-t border-white/10 pt-3">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-white/70">Comments</p>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const body = commentDraft.trim();
                if (!body || commentBusy) return;
                setCommentBusy(true);
                try {
                  const res = await fetch(`/api/photos/${photo.id}/comments`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    credentials: "include",
                    cache: "no-store",
                    body: JSON.stringify({ body }),
                  });
                  const data = await res.json().catch(() => ({}));
                  if (!res.ok) throw new Error(data.error || "Could not comment");
                  setCommentDraft("");
                  await loadSocial();
                } catch (err) {
                  notify(err instanceof Error ? err.message : "Could not comment");
                } finally {
                  setCommentBusy(false);
                }
              }}
              className="mb-3 flex gap-2"
            >
              <input
                value={commentDraft}
                onChange={(e) => setCommentDraft(e.target.value)}
                placeholder="Write a comment…"
                className="min-w-0 flex-1 rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-sm text-white placeholder:text-white/55"
              />
              <button
                type="submit"
                disabled={!commentDraft.trim() || commentBusy}
                className="rounded-lg bg-cyan-500 px-3 py-2 text-sm font-semibold text-stone-950 disabled:opacity-50"
              >
                Send
              </button>
            </form>
            <ul className="max-h-40 space-y-2 overflow-y-auto pr-1">
              {comments.length === 0 ? (
                <li className="text-xs text-white/55">No comments yet.</li>
              ) : (
                comments.map((c) => (
                  <li key={c.id} className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-2">
                    <p className="text-[11px] font-semibold text-white/80">
                      {c.mine ? "You" : c.userName}
                    </p>
                    <p className="mt-0.5 text-sm text-white">{c.body}</p>
                    <p className="mt-1 text-[10px] text-white/50">
                      {new Date(c.createdAt).toLocaleString()}
                    </p>
                  </li>
                ))
              )}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
