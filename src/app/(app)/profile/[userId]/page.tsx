"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { useParams } from "next/navigation";
import { PhotoGrid } from "@/components/gallery/PhotoGrid";
import { Lightbox } from "@/components/gallery/Lightbox";
import { UploadModal } from "@/components/gallery/UploadModal";
import { useAuth } from "@/components/providers/AuthProvider";
import { useToast } from "@/components/providers/ToastProvider";
import type { AlbumPublic, PhotoPublic, UserPublic } from "@/shared/api-types";

/** Remount when `userId` changes so loading state resets without sync setState in an effect. */
export default function ProfilePage() {
  const params = useParams();
  const userId = params.userId as string;
  return <ProfileBody key={userId} userId={userId} />;
}

function ProfileBody({ userId }: { userId: string }) {
  const { user: current, refresh } = useAuth();
  const { notify } = useToast();

  const [profile, setProfile] = useState<UserPublic | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [photos, setPhotos] = useState<PhotoPublic[]>([]);
  const [selected, setSelected] = useState<PhotoPublic | null>(null);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [q, setQ] = useState("");
  const [personalAlbums, setPersonalAlbums] = useState<AlbumPublic[]>([]);
  const [albumFilter, setAlbumFilter] = useState("");
  const [avatarUrlDraft, setAvatarUrlDraft] = useState("");
  const [avatarSaving, setAvatarSaving] = useState(false);
  const [sessions, setSessions] = useState<
    { sid: string; userAgent: string; ip: string; lastSeenAt: string; createdAt: string; current: boolean }[]
  >([]);

  const queryString = useMemo(() => {
    const p = new URLSearchParams();
    p.set("galleryType", "personal");
    p.set("ownerUserId", userId);
    if (q.trim()) p.set("q", q.trim());
    if (albumFilter === "none") p.set("albumId", "none");
    else if (albumFilter) p.set("albumId", albumFilter);
    return p.toString();
  }, [userId, q, albumFilter]);

  const loadPhotos = useCallback(() => {
    fetch(`/api/photos?${queryString}`, { credentials: "include" })
      .then((r) => r.json())
      .then((d) => setPhotos(d.photos ?? []))
      .catch(() => setPhotos([]));
  }, [queryString]);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/users/${userId}`, { credentials: "include" })
      .then((r) => {
        if (!r.ok) throw new Error("not found");
        return r.json();
      })
      .then((d) => {
        if (!cancelled) setProfile(d.user);
      })
      .catch(() => {
        if (!cancelled) setProfile(null);
      })
      .finally(() => {
        if (!cancelled) setProfileLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  useEffect(() => {
    fetch(`/api/albums?scope=personal&ownerUserId=${encodeURIComponent(userId)}`, {
      credentials: "include",
    })
      .then((r) => r.json())
      .then((d) => setPersonalAlbums(d.albums ?? []))
      .catch(() => setPersonalAlbums([]));
  }, [userId]);

  useEffect(() => {
    loadPhotos();
  }, [loadPhotos]);

  useEffect(() => {
    if (profile?.avatarUrl) setAvatarUrlDraft(profile.avatarUrl);
  }, [profile?.avatarUrl]);

  useEffect(() => {
    if (!isSelf) return;
    fetch("/api/auth/sessions", { credentials: "include", cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setSessions(d.sessions ?? []))
      .catch(() => setSessions([]));
  }, [isSelf]);

  const isSelf = current?.id === userId;
  const canEditAvatar = !!current && (isSelf || !!current.isAdmin);

  if (profileLoading) {
    return <p className="text-[var(--muted)]">Loading profile…</p>;
  }

  if (profile === null) {
    return (
      <p className="text-[var(--muted)]">
        This profile could not be loaded. Return to the dashboard and pick a family member.
      </p>
    );
  }

  return (
    <div>
      <div className="page-intro mb-8 flex flex-col gap-6 sm:flex-row sm:items-center">
        <div className="relative h-28 w-28 shrink-0 overflow-hidden rounded-2xl ring-2 ring-[var(--ring)] shadow-md transition hover:ring-[var(--accent)]">
          <Image
            src={profile.avatarUrl}
            alt=""
            fill
            className="object-cover"
            sizes="112px"
            unoptimized={profile.avatarUrl.startsWith("http") || profile.avatarUrl.startsWith("data:")}
          />
        </div>
        <div className="flex-1">
          <p className="text-xs font-semibold uppercase tracking-widest text-[var(--accent)]">Personal gallery</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight">{profile.name}</h1>
          {profile.displayRole ? (
            <p className="text-sm font-medium text-[var(--accent)]">{profile.displayRole}</p>
          ) : null}
          <p className="text-[var(--muted)]">Only your family can view this page.</p>
          {isSelf && (
            <button
              type="button"
              onClick={() => setUploadOpen(true)}
              className="mt-4 rounded-xl bg-[var(--accent)] px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-[var(--accent)]/20 transition hover:opacity-95"
            >
              Upload to my gallery
            </button>
          )}
          {canEditAvatar ? (
            <form
              className="mt-5 max-w-xl rounded-xl border border-black/10 p-4 dark:border-white/15"
              onSubmit={async (e) => {
                e.preventDefault();
                setAvatarSaving(true);
                try {
                  const res = await fetch(`/api/users/${userId}`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    credentials: "include",
                    body: JSON.stringify({ avatarUrl: avatarUrlDraft }),
                  });
                  const data = await res.json().catch(() => ({}));
                  if (!res.ok) throw new Error(data.error || "Could not update photo");
                  if (data.user) setProfile(data.user);
                  if (isSelf) await refresh();
                  notify("Profile photo updated.");
                } catch (err) {
                  notify(err instanceof Error ? err.message : "Update failed");
                } finally {
                  setAvatarSaving(false);
                }
              }}
            >
              <p className="text-xs font-medium text-[var(--muted)]">
                {isSelf ? "Your profile photo (URL)" : "Admin: profile photo URL"}
              </p>
              <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                <input
                  value={avatarUrlDraft}
                  onChange={(e) => setAvatarUrlDraft(e.target.value)}
                  placeholder="https://... or /uploads/..."
                  className="min-w-0 flex-1 rounded-lg border border-black/10 bg-transparent px-3 py-2 text-sm dark:border-white/15"
                />
                <button
                  type="submit"
                  disabled={avatarSaving}
                  className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                >
                  {avatarSaving ? "Saving…" : "Save photo"}
                </button>
              </div>
            </form>
          ) : null}
        </div>
      </div>

      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:flex-wrap">
        <label className="block max-w-md flex-1">
          <span className="mb-1 block text-xs font-medium text-[var(--muted)]">Search this gallery</span>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Caption or filename…"
            className="w-full rounded-lg border border-black/10 bg-transparent px-3 py-2 text-sm dark:border-white/15"
          />
        </label>
        {personalAlbums.length > 0 ? (
          <label className="block min-w-[200px] max-w-xs">
            <span className="mb-1 block text-xs font-medium text-[var(--muted)]">Folder</span>
            <select
              value={albumFilter}
              onChange={(e) => setAlbumFilter(e.target.value)}
              className="w-full rounded-lg border border-black/10 bg-transparent px-3 py-2 text-sm dark:border-white/15"
            >
              <option value="">All items</option>
              <option value="none">Not in a folder</option>
              {personalAlbums.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </label>
        ) : null}
      </div>

      {isSelf ? (
        <section className="mb-6 rounded-xl border border-black/10 p-4 dark:border-white/15">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--muted)]">My devices</h2>
            <button
              type="button"
              className="rounded-lg border border-black/10 px-3 py-1.5 text-xs dark:border-white/15"
              onClick={async () => {
                const res = await fetch("/api/auth/sessions", {
                  method: "DELETE",
                  headers: { "Content-Type": "application/json" },
                  credentials: "include",
                  body: JSON.stringify({ revokeOthers: true }),
                });
                if (!res.ok) {
                  notify("Could not sign out other devices.");
                  return;
                }
                notify("Signed out other devices.");
                setSessions((prev) => prev.filter((s) => s.current));
              }}
            >
              Sign out other devices
            </button>
          </div>
          <ul className="mt-3 space-y-2">
            {sessions.length === 0 ? (
              <li className="text-sm text-[var(--muted)]">No active sessions found.</li>
            ) : (
              sessions.map((s) => (
                <li
                  key={s.sid}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-black/5 p-2.5 text-sm dark:border-white/10"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate">{s.userAgent || "Unknown device"}</p>
                    <p className="text-xs text-[var(--muted)]">
                      Last seen: {new Date(s.lastSeenAt).toLocaleString()}
                    </p>
                  </div>
                  {s.current ? (
                    <span className="rounded-md bg-emerald-500/15 px-2 py-1 text-xs font-medium text-emerald-700 dark:text-emerald-300">
                      Current
                    </span>
                  ) : (
                    <button
                      type="button"
                      className="rounded-md border border-black/10 px-2 py-1 text-xs dark:border-white/15"
                      onClick={async () => {
                        const res = await fetch("/api/auth/sessions", {
                          method: "DELETE",
                          headers: { "Content-Type": "application/json" },
                          credentials: "include",
                          body: JSON.stringify({ sid: s.sid }),
                        });
                        if (!res.ok) {
                          notify("Could not revoke this device.");
                          return;
                        }
                        setSessions((prev) => prev.filter((x) => x.sid !== s.sid));
                      }}
                    >
                      Revoke
                    </button>
                  )}
                </li>
              ))
            )}
          </ul>
        </section>
      ) : null}

      <PhotoGrid photos={photos} onSelect={setSelected} />
      <Lightbox
        photo={selected}
        photos={photos}
        onNavigate={setSelected}
        onClose={() => setSelected(null)}
      />

      {current && isSelf && (
        <UploadModal
          open={uploadOpen}
          onClose={() => setUploadOpen(false)}
          ownerUserId={current.id}
          defaultMode="personal"
          onUploaded={loadPhotos}
        />
      )}
    </div>
  );
}
