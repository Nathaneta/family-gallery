"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useAuth } from "@/components/providers/AuthProvider";
import { useToast } from "@/components/providers/ToastProvider";
import { UploadModal } from "@/components/gallery/UploadModal";
import { Lightbox } from "@/components/gallery/Lightbox";
import { MemoriesStrip } from "@/components/dashboard/MemoriesStrip";
import { FAMILY_CATEGORIES } from "@/utils/constants";
import type { AlbumPublic, PhotoPublic } from "@/shared/api-types";
import { API_ROUTES } from "@/lib/api-endpoints";

type AdminUser = {
  id: string;
  name: string;
  email: string;
  avatarUrl: string;
  displayRole: string;
  isAdmin: boolean;
  sortIndex: number;
};

type AdminAlbum = {
  id: string;
  name: string;
  description: string;
  scope: "family" | "personal";
  ownerUserId: string | null;
  visibility: "all" | "restricted";
  allowedUserIds: string[];
};

export default function AdminPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const { notify } = useToast();
  const [tab, setTab] = useState<
    "overview" | "members" | "albums" | "media" | "upload" | "chat"
  >("overview");
  const [uploadOpen, setUploadOpen] = useState(false);
  const avatarFileRef = useRef<HTMLInputElement>(null);

  const [stats, setStats] = useState<{
    memberCount: number;
    photoCount: number;
    albumCount: number;
    messagesToday: number;
    adminCount: number;
  } | null>(null);

  const [adminChat, setAdminChat] = useState<{
    familyChatEnabled: boolean;
    directMessagesEnabled: boolean;
  } | null>(null);
  const [avatarBusy, setAvatarBusy] = useState(false);

  const [members, setMembers] = useState<AdminUser[]>([]);
  const [albums, setAlbums] = useState<AdminAlbum[]>([]);
  const [media, setMedia] = useState<PhotoPublic[]>([]);

  const [newMember, setNewMember] = useState({
    name: "",
    email: "",
    password: "",
    displayRole: "",
    isAdmin: false,
    sortIndex: 99,
    avatarUrl: "",
  });

  const [newAlbum, setNewAlbum] = useState({
    name: "",
    description: "",
    scope: "family" as "family" | "personal",
    ownerUserId: "",
    visibility: "all" as "all" | "restricted",
    allowedUserIds: [] as string[],
  });

  const [editingMember, setEditingMember] = useState<AdminUser | null>(null);
  const [editPassword, setEditPassword] = useState("");

  const [editingAlbum, setEditingAlbum] = useState<AdminAlbum | null>(null);
  const [editAlbumName, setEditAlbumName] = useState("");
  const [editAlbumDescription, setEditAlbumDescription] = useState("");
  const [editAlbumVisibility, setEditAlbumVisibility] = useState<"all" | "restricted">("all");
  const [editAlbumAllowedUserIds, setEditAlbumAllowedUserIds] = useState<string[]>([]);

  const [editingMedia, setEditingMedia] = useState<PhotoPublic | null>(null);
  const [editMediaCaption, setEditMediaCaption] = useState("");
  const [editMediaCategory, setEditMediaCategory] = useState("");
  const [editMediaAlbumId, setEditMediaAlbumId] = useState("");
  const [editMediaAlbums, setEditMediaAlbums] = useState<AlbumPublic[]>([]);
  const [memoryLightbox, setMemoryLightbox] = useState<{
    photos: PhotoPublic[];
    current: PhotoPublic;
  } | null>(null);

  const loadMembers = useCallback(() => {
    fetch("/api/admin/users", { credentials: "include" })
      .then((r) => r.json())
      .then((d) => setMembers(d.users ?? []))
      .catch(() => setMembers([]));
  }, []);

  const loadAlbums = useCallback(() => {
    fetch("/api/admin/albums", { credentials: "include" })
      .then((r) => r.json())
      .then((d) => setAlbums(d.albums ?? []))
      .catch(() => setAlbums([]));
  }, []);

  const loadMedia = useCallback(() => {
    fetch("/api/admin/media", { credentials: "include" })
      .then((r) => r.json())
      .then((d) => setMedia(d.photos ?? []))
      .catch(() => setMedia([]));
  }, []);

  const loadStats = useCallback(() => {
    fetch(API_ROUTES.admin.stats, { credentials: "include" })
      .then((r) => r.json())
      .then((d) => setStats(d.stats ?? null))
      .catch(() => setStats(null));
  }, []);

  const loadAdminChatSettings = useCallback(() => {
    fetch(API_ROUTES.chat.settings, { credentials: "include" })
      .then((r) => r.json())
      .then((d) => {
        if (d.settings) setAdminChat(d.settings);
      })
      .catch(() => setAdminChat(null));
  }, []);

  useEffect(() => {
    if (loading) return;
    if (!user?.isAdmin) {
      router.replace("/dashboard");
      return;
    }
    loadMembers();
    loadAlbums();
    loadMedia();
    loadStats();
  }, [user, loading, router, loadMembers, loadAlbums, loadMedia, loadStats]);

  useEffect(() => {
    if (tab === "chat") loadAdminChatSettings();
  }, [tab, loadAdminChatSettings]);

  async function createMember(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        ...newMember,
        avatarUrl: newMember.avatarUrl || undefined,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      notify(data.error || "Could not add member");
      return;
    }
    notify("Member added.");
    setNewMember({
      name: "",
      email: "",
      password: "",
      displayRole: "",
      isAdmin: false,
      sortIndex: 99,
      avatarUrl: "",
    });
    loadMembers();
  }

  async function saveMemberEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingMember) return;
    const body: Record<string, unknown> = {
      name: editingMember.name,
      email: editingMember.email,
      displayRole: editingMember.displayRole,
      sortIndex: editingMember.sortIndex,
      isAdmin: editingMember.isAdmin,
      avatarUrl: editingMember.avatarUrl,
    };
    if (editPassword.trim()) body.password = editPassword;
    const res = await fetch(`/api/admin/users/${editingMember.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      notify(data.error || "Could not update");
      return;
    }
    notify(
      editPassword.trim()
        ? "Member updated (new password is active)."
        : "Member updated."
    );
    setEditingMember(null);
    setEditPassword("");
    loadMembers();
  }

  async function deleteMember(id: string) {
    if (!confirm("Delete this member and their uploads?")) return;
    const res = await fetch(`/api/admin/users/${id}`, { method: "DELETE", credentials: "include" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      notify(data.error || "Could not delete");
      return;
    }
    notify("Member removed.");
    loadMembers();
    loadMedia();
  }

  async function createAlbum(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/admin/albums", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        name: newAlbum.name,
        description: newAlbum.description,
        scope: newAlbum.scope,
        ownerUserId: newAlbum.scope === "personal" ? newAlbum.ownerUserId : null,
        visibility: newAlbum.visibility,
        allowedUserIds: newAlbum.allowedUserIds,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      notify(data.error || "Could not create folder");
      return;
    }
    notify("Folder created.");
    setNewAlbum({
      name: "",
      description: "",
      scope: "family",
      ownerUserId: "",
      visibility: "all",
      allowedUserIds: [],
    });
    loadAlbums();
  }

  async function deleteAlbum(id: string) {
    if (!confirm("Delete this folder? Items inside become “not in a folder”.")) return;
    const res = await fetch(`/api/admin/albums/${id}`, { method: "DELETE", credentials: "include" });
    if (!res.ok) {
      notify("Could not delete folder");
      return;
    }
    notify("Folder deleted.");
    loadAlbums();
    loadMedia();
  }

  async function deleteMediaItem(id: string) {
    if (!confirm("Delete this item permanently?")) return;
    const res = await fetch(`/api/photos/${id}`, { method: "DELETE", credentials: "include" });
    if (!res.ok) {
      notify("Could not delete");
      return;
    }
    notify("Deleted.");
    loadMedia();
  }

  useEffect(() => {
    if (!editingMedia) {
      queueMicrotask(() => setEditMediaAlbums([]));
      return;
    }
    queueMicrotask(() => {
      setEditMediaCaption(editingMedia.caption);
      setEditMediaCategory(editingMedia.category);
      setEditMediaAlbumId(editingMedia.albumId ?? "");
    });
    if (editingMedia.galleryType === "personal" && !editingMedia.ownerUserId) {
      queueMicrotask(() => setEditMediaAlbums([]));
      return;
    }
    const q =
      editingMedia.galleryType === "family"
        ? "/api/albums?scope=family"
        : `/api/albums?scope=personal&ownerUserId=${encodeURIComponent(editingMedia.ownerUserId!)}`;
    fetch(q, { credentials: "include" })
      .then((r) => r.json())
      .then((d) => setEditMediaAlbums(d.albums ?? []))
      .catch(() => setEditMediaAlbums([]));
  }, [editingMedia]);

  async function saveAlbumEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingAlbum) return;
    const res = await fetch(`/api/admin/albums/${editingAlbum.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        name: editAlbumName,
        description: editAlbumDescription,
        visibility: editAlbumVisibility,
        allowedUserIds: editAlbumAllowedUserIds,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      notify(data.error || "Could not update folder");
      return;
    }
    notify("Folder updated.");
    setEditingAlbum(null);
    setEditAlbumAllowedUserIds([]);
    loadAlbums();
  }

  async function saveMediaEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingMedia) return;
    const body: Record<string, unknown> = { caption: editMediaCaption };
    if (editingMedia.galleryType === "family") {
      body.category = editMediaCategory;
    }
    body.albumId = editMediaAlbumId || null;
    const res = await fetch(`/api/photos/${editingMedia.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      notify(data.error || "Could not update media");
      return;
    }
    notify("Media updated.");
    setEditingMedia(null);
    loadMedia();
  }

  if (loading || !user?.isAdmin) {
    return (
      <p className="text-[var(--muted)]">{loading ? "Loading…" : "Redirecting…"}</p>
    );
  }

  const tabBtn = (k: typeof tab, label: string) => (
    <button
      key={k}
      type="button"
      onClick={() => setTab(k)}
      className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
        tab === k
          ? "bg-amber-600 text-white shadow-md shadow-amber-900/15 dark:bg-amber-500 dark:text-stone-950"
          : "text-amber-900/80 hover:bg-amber-500/15 dark:text-amber-100/80 dark:hover:bg-amber-400/10"
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="admin-console p-5 sm:p-8">
      <div className="flex flex-col gap-3 border-b border-amber-200/60 pb-6 dark:border-amber-500/20 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-amber-700 dark:text-amber-300/90">
            Control center
          </p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-stone-900 dark:text-amber-50">
            Family admin
          </h1>
          <p className="mt-2 max-w-xl text-sm text-stone-600 dark:text-stone-400">
            Full access: people, folders, uploads to any gallery, and editing or removing any media.
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-xl border border-amber-300/50 bg-amber-100/40 px-3 py-2 text-xs font-medium text-amber-950 dark:border-amber-500/30 dark:bg-amber-950/40 dark:text-amber-100">
          <span aria-hidden>◆</span>
          Signed in as {user.name}
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-2 border-b border-amber-200/50 pb-3 dark:border-amber-500/15">
        {tabBtn("overview", "Overview")}
        {tabBtn("members", "People")}
        {tabBtn("albums", "Folders")}
        {tabBtn("media", "All media")}
        {tabBtn("upload", "Upload media")}
        {tabBtn("chat", "Chat settings")}
      </div>

      {user ? (
        <UploadModal
          open={uploadOpen}
          onClose={() => setUploadOpen(false)}
          ownerUserId={user.id}
          defaultMode="family"
          memberPicker={members.map((m) => ({ id: m.id, name: m.name }))}
          onUploaded={() => {
            loadMedia();
            notify("Upload complete.");
          }}
        />
      ) : null}

      {tab === "overview" ? (
        <div className="mt-8 space-y-8">
          <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { label: "Members", value: stats?.memberCount ?? "—", sub: "Accounts" },
              { label: "Media items", value: stats?.photoCount ?? "—", sub: "Photos, video, files" },
              { label: "Folders", value: stats?.albumCount ?? "—", sub: "Albums" },
              { label: "Chat today", value: stats?.messagesToday ?? "—", sub: "Messages (UTC day)" },
            ].map((c) => (
              <div
                key={c.label}
                className="rounded-2xl border border-amber-200/50 bg-[var(--card)] p-5 shadow-sm dark:border-amber-500/20"
              >
                <p className="text-xs font-bold uppercase tracking-wider text-amber-800 dark:text-amber-200/90">
                  {c.label}
                </p>
                <p className="mt-2 text-3xl font-bold text-stone-900 dark:text-amber-50">{c.value}</p>
                <p className="mt-1 text-xs text-[var(--muted)]">{c.sub}</p>
              </div>
            ))}
          </section>
          <section className="rounded-2xl border border-amber-200/50 bg-[var(--card)] p-6 dark:border-amber-500/20">
            <h2 className="text-lg font-semibold text-stone-900 dark:text-amber-50">Server check</h2>
            <p className="mt-1 text-sm text-[var(--muted)]">
              Ping the JSON health endpoint to confirm MongoDB is reachable from the app.
            </p>
            <a
              href={API_ROUTES.health}
              target="_blank"
              rel="noreferrer"
              className="mt-4 inline-flex rounded-xl bg-amber-600 px-4 py-2 text-sm font-semibold text-white dark:bg-amber-500 dark:text-stone-950"
            >
              Open /api/health
            </a>
          </section>
          <section className="rounded-2xl border border-amber-200/50 bg-[var(--card)] p-6 dark:border-amber-500/20">
            <h2 className="text-lg font-semibold text-stone-900 dark:text-amber-50">
              On this day (admin pin)
            </h2>
            <p className="mt-1 text-sm text-[var(--muted)]">
              Pinned memories panel visible only in admin.
            </p>
            <div className="mt-4">
              <MemoriesStrip
                onOpenMemory={(p, all) => setMemoryLightbox({ current: p, photos: all })}
              />
            </div>
          </section>
          <section className="rounded-2xl border border-dashed border-amber-300/60 p-6 dark:border-amber-500/30">
            <h2 className="font-semibold text-stone-900 dark:text-amber-50">Quick paths</h2>
            <ul className="mt-3 list-inside list-disc text-sm text-[var(--muted)]">
              <li>
                Use <strong>People</strong> to add accounts, upload profile photos, and reset passwords.
              </li>
              <li>
                Use <strong>Chat settings</strong> to disable the family room or direct messages for everyone.
              </li>
              <li>
                <strong>Upload media</strong> sends to family or any member&apos;s personal gallery.
              </li>
            </ul>
          </section>
        </div>
      ) : null}

      {tab === "chat" ? (
        <div className="mt-8 max-w-xl space-y-6">
          <section className="rounded-2xl border border-amber-200/50 bg-[var(--card)] p-6 dark:border-amber-500/20">
            <h2 className="text-lg font-semibold text-stone-900 dark:text-amber-50">Messaging</h2>
            <p className="mt-1 text-sm text-[var(--muted)]">
              Turn channels off if you need a quiet period — members still keep the rest of the app.
            </p>
            {adminChat ? (
              <div className="mt-6 space-y-4">
                <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-black/10 p-4 dark:border-white/15">
                  <input
                    type="checkbox"
                    checked={adminChat.familyChatEnabled}
                    onChange={(e) =>
                      setAdminChat((s) =>
                        s ? { ...s, familyChatEnabled: e.target.checked } : s
                      )
                    }
                    className="mt-1"
                  />
                  <span>
                    <span className="font-medium text-stone-900 dark:text-amber-50">Family room</span>
                    <span className="mt-0.5 block text-sm text-[var(--muted)]">
                      Everyone can post in the shared family chat.
                    </span>
                  </span>
                </label>
                <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-black/10 p-4 dark:border-white/15">
                  <input
                    type="checkbox"
                    checked={adminChat.directMessagesEnabled}
                    onChange={(e) =>
                      setAdminChat((s) =>
                        s ? { ...s, directMessagesEnabled: e.target.checked } : s
                      )
                    }
                    className="mt-1"
                  />
                  <span>
                    <span className="font-medium text-stone-900 dark:text-amber-50">Direct messages</span>
                    <span className="mt-0.5 block text-sm text-[var(--muted)]">
                      Two members can chat privately (still family-only accounts).
                    </span>
                  </span>
                </label>
                <button
                  type="button"
                  className="rounded-xl bg-amber-600 px-4 py-2 text-sm font-semibold text-white dark:bg-amber-500 dark:text-stone-950"
                  onClick={async () => {
                    if (!adminChat) return;
                    const res = await fetch(API_ROUTES.admin.chatSettings, {
                      method: "PATCH",
                      headers: { "Content-Type": "application/json" },
                      credentials: "include",
                      body: JSON.stringify({
                        familyChatEnabled: adminChat.familyChatEnabled,
                        directMessagesEnabled: adminChat.directMessagesEnabled,
                      }),
                    });
                    const data = await res.json().catch(() => ({}));
                    if (!res.ok) {
                      notify(data.error || "Could not save");
                      return;
                    }
                    if (data.settings) setAdminChat(data.settings);
                    notify("Chat settings saved.");
                  }}
                >
                  Save chat settings
                </button>
              </div>
            ) : (
              <p className="mt-4 text-sm text-[var(--muted)]">Loading…</p>
            )}
          </section>
        </div>
      ) : null}

      {tab === "members" ? (
        <div className="mt-8 space-y-10">
          <section className="rounded-2xl border border-black/5 bg-[var(--card)] p-6 dark:border-white/10">
            <h2 className="text-lg font-semibold">Add family member</h2>
            <form onSubmit={createMember} className="mt-4 grid gap-3 sm:grid-cols-2">
              <input
                required
                placeholder="Full name"
                value={newMember.name}
                onChange={(e) => setNewMember((s) => ({ ...s, name: e.target.value }))}
                className="rounded-lg border border-black/10 px-3 py-2 text-sm dark:border-white/15"
              />
              <input
                required
                type="email"
                placeholder="Email"
                value={newMember.email}
                onChange={(e) => setNewMember((s) => ({ ...s, email: e.target.value }))}
                className="rounded-lg border border-black/10 px-3 py-2 text-sm dark:border-white/15"
              />
              <input
                required
                type="password"
                placeholder="Password"
                value={newMember.password}
                onChange={(e) => setNewMember((s) => ({ ...s, password: e.target.value }))}
                className="rounded-lg border border-black/10 px-3 py-2 text-sm dark:border-white/15"
              />
              <input
                placeholder="Label (e.g. Sister)"
                value={newMember.displayRole}
                onChange={(e) => setNewMember((s) => ({ ...s, displayRole: e.target.value }))}
                className="rounded-lg border border-black/10 px-3 py-2 text-sm dark:border-white/15"
              />
              <input
                type="number"
                placeholder="Sort order (lower = first)"
                value={newMember.sortIndex}
                onChange={(e) => setNewMember((s) => ({ ...s, sortIndex: Number(e.target.value) }))}
                className="rounded-lg border border-black/10 px-3 py-2 text-sm dark:border-white/15"
              />
              <input
                placeholder="Avatar URL (optional)"
                value={newMember.avatarUrl}
                onChange={(e) => setNewMember((s) => ({ ...s, avatarUrl: e.target.value }))}
                className="rounded-lg border border-black/10 px-3 py-2 text-sm dark:border-white/15"
              />
              <label className="flex items-center gap-2 text-sm sm:col-span-2">
                <input
                  type="checkbox"
                  checked={newMember.isAdmin}
                  onChange={(e) => setNewMember((s) => ({ ...s, isAdmin: e.target.checked }))}
                />
                Admin (can open this screen)
              </label>
              <button
                type="submit"
                className="rounded-xl bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white sm:col-span-2"
              >
                Add member
              </button>
            </form>
          </section>

          <section>
            <h2 className="mb-1 text-lg font-semibold">Everyone ({members.length})</h2>
            <p className="mb-3 text-sm text-[var(--muted)]">
              <strong>Edit</strong> opens a panel where you can change that person&apos;s{" "}
              <strong>login email</strong> and set a <strong>new password</strong> (optional).
            </p>
            <div className="overflow-x-auto rounded-2xl border border-black/5 dark:border-white/10">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead className="border-b border-black/10 bg-black/[0.02] dark:border-white/10 dark:bg-white/[0.04]">
                  <tr>
                    <th className="p-3">Name</th>
                    <th className="p-3">Email</th>
                    <th className="p-3">Label</th>
                    <th className="p-3">Order</th>
                    <th className="p-3">Admin</th>
                    <th className="p-3" />
                  </tr>
                </thead>
                <tbody>
                  {members.map((m) => (
                    <tr key={m.id} className="border-b border-black/5 dark:border-white/10">
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <div className="relative h-8 w-8 overflow-hidden rounded-full">
                            <Image
                              src={m.avatarUrl}
                              alt=""
                              fill
                              className="object-cover"
                              sizes="32px"
                              unoptimized={
                                m.avatarUrl.startsWith("http") || m.avatarUrl.startsWith("data:")
                              }
                            />
                          </div>
                          {m.name}
                        </div>
                      </td>
                      <td className="p-3 text-[var(--muted)]">{m.email}</td>
                      <td className="p-3">{m.displayRole}</td>
                      <td className="p-3">{m.sortIndex}</td>
                      <td className="p-3">{m.isAdmin ? "Yes" : ""}</td>
                      <td className="p-3 text-right">
                        <button
                          type="button"
                          className="mr-2 font-medium text-amber-700 dark:text-amber-300"
                          onClick={() => {
                            setEditingMember({ ...m });
                            setEditPassword("");
                          }}
                        >
                          Edit login & profile
                        </button>
                        <button
                          type="button"
                          className="text-red-600 dark:text-red-400"
                          onClick={() => deleteMember(m.id)}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

        </div>
      ) : null}

      {tab === "albums" ? (
        <div className="mt-8 space-y-8">
          <section className="rounded-2xl border border-black/5 bg-[var(--card)] p-6 dark:border-white/10">
            <h2 className="text-lg font-semibold">New folder</h2>
            <form onSubmit={createAlbum} className="mt-4 grid gap-3 sm:grid-cols-2">
              <input
                required
                placeholder="Folder name"
                value={newAlbum.name}
                onChange={(e) => setNewAlbum((s) => ({ ...s, name: e.target.value }))}
                className="rounded-lg border border-black/10 px-3 py-2 text-sm dark:border-white/15"
              />
              <select
                value={newAlbum.scope}
                onChange={(e) =>
                  setNewAlbum((s) => ({
                    ...s,
                    scope: e.target.value as "family" | "personal",
                  }))
                }
                className="rounded-lg border border-black/10 px-3 py-2 text-sm dark:border-white/15"
              >
                <option value="family">Family (shared)</option>
                <option value="personal">Personal (one member)</option>
              </select>
              {newAlbum.scope === "personal" ? (
                <select
                  required
                  value={newAlbum.ownerUserId}
                  onChange={(e) => setNewAlbum((s) => ({ ...s, ownerUserId: e.target.value }))}
                  className="sm:col-span-2 rounded-lg border border-black/10 px-3 py-2 text-sm dark:border-white/15"
                >
                  <option value="">Choose member…</option>
                  {members.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
              ) : null}
              <textarea
                placeholder="Description (optional)"
                value={newAlbum.description}
                onChange={(e) => setNewAlbum((s) => ({ ...s, description: e.target.value }))}
                className="sm:col-span-2 rounded-lg border border-black/10 px-3 py-2 text-sm dark:border-white/15"
                rows={2}
              />
              <label className="sm:col-span-2">
                <span className="mb-1 block text-sm font-medium">Visibility</span>
                <select
                  value={newAlbum.visibility}
                  onChange={(e) =>
                    setNewAlbum((s) => ({
                      ...s,
                      visibility: e.target.value as "all" | "restricted",
                    }))
                  }
                  className="w-full rounded-lg border border-black/10 px-3 py-2 text-sm dark:border-white/15"
                >
                  <option value="all">All family members</option>
                  <option value="restricted">Restricted (selected members)</option>
                </select>
              </label>
              {newAlbum.visibility === "restricted" ? (
                <div className="sm:col-span-2 rounded-lg border border-black/10 p-3 dark:border-white/15">
                  <p className="mb-2 text-xs font-medium text-[var(--muted)]">Allowed members</p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {members.map((m) => (
                      <label key={m.id} className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={newAlbum.allowedUserIds.includes(m.id)}
                          onChange={(e) =>
                            setNewAlbum((s) => ({
                              ...s,
                              allowedUserIds: e.target.checked
                                ? [...s.allowedUserIds, m.id]
                                : s.allowedUserIds.filter((id) => id !== m.id),
                            }))
                          }
                        />
                        {m.name}
                      </label>
                    ))}
                  </div>
                </div>
              ) : null}
              <button
                type="submit"
                className="rounded-xl bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white sm:col-span-2"
              >
                Create folder
              </button>
            </form>
          </section>

          <ul className="space-y-2">
            {albums.map((a) => (
              <li
                key={a.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-black/5 p-4 dark:border-white/10"
              >
                <div>
                  <p className="font-medium">{a.name}</p>
                  <p className="text-xs text-[var(--muted)]">
                    {a.scope === "family" ? "Family" : "Personal"}
                    {a.ownerUserId
                      ? ` · ${members.find((m) => m.id === a.ownerUserId)?.name ?? a.ownerUserId}`
                      : ""}
                    {a.visibility === "restricted" ? " · Restricted" : " · All members"}
                  </p>
                  {a.description ? <p className="mt-1 text-sm">{a.description}</p> : null}
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="text-sm font-medium text-amber-700 dark:text-amber-300"
                    onClick={() => {
                      setEditingAlbum(a);
                      setEditAlbumName(a.name);
                      setEditAlbumDescription(a.description);
                      setEditAlbumVisibility(a.visibility ?? "all");
                      setEditAlbumAllowedUserIds(a.allowedUserIds ?? []);
                    }}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    className="text-sm text-red-600 dark:text-red-400"
                    onClick={() => deleteAlbum(a.id)}
                  >
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>

          {editingAlbum ? (
            <section className="rounded-2xl border border-amber-300/50 bg-[var(--card)] p-6 dark:border-amber-500/25">
              <h2 className="text-lg font-semibold">Edit folder</h2>
              <form onSubmit={saveAlbumEdit} className="mt-4 grid gap-3 sm:grid-cols-2">
                <input
                  required
                  value={editAlbumName}
                  onChange={(e) => setEditAlbumName(e.target.value)}
                  className="rounded-lg border border-black/10 px-3 py-2 text-sm dark:border-white/15"
                />
                <textarea
                  value={editAlbumDescription}
                  onChange={(e) => setEditAlbumDescription(e.target.value)}
                  className="sm:col-span-2 rounded-lg border border-black/10 px-3 py-2 text-sm dark:border-white/15"
                  rows={2}
                />
                <label className="sm:col-span-2">
                  <span className="mb-1 block text-sm font-medium">Visibility</span>
                  <select
                    value={editAlbumVisibility}
                    onChange={(e) => setEditAlbumVisibility(e.target.value as "all" | "restricted")}
                    className="w-full rounded-lg border border-black/10 px-3 py-2 text-sm dark:border-white/15"
                  >
                    <option value="all">All family members</option>
                    <option value="restricted">Restricted (selected members)</option>
                  </select>
                </label>
                {editAlbumVisibility === "restricted" ? (
                  <div className="sm:col-span-2 rounded-lg border border-black/10 p-3 dark:border-white/15">
                    <p className="mb-2 text-xs font-medium text-[var(--muted)]">Allowed members</p>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {members.map((m) => (
                        <label key={m.id} className="flex items-center gap-2 text-sm">
                          <input
                            type="checkbox"
                            checked={editAlbumAllowedUserIds.includes(m.id)}
                            onChange={(e) =>
                              setEditAlbumAllowedUserIds((prev) =>
                                e.target.checked ? [...prev, m.id] : prev.filter((id) => id !== m.id)
                              )
                            }
                          />
                          {m.name}
                        </label>
                      ))}
                    </div>
                  </div>
                ) : null}
                <div className="flex gap-2 sm:col-span-2">
                  <button
                    type="submit"
                    className="rounded-xl bg-amber-600 px-4 py-2 text-sm font-semibold text-white dark:bg-amber-500 dark:text-stone-950"
                  >
                    Save folder
                  </button>
                  <button
                    type="button"
                    className="rounded-xl border border-black/10 px-4 py-2 text-sm dark:border-white/15"
                    onClick={() => setEditingAlbum(null)}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </section>
          ) : null}
        </div>
      ) : null}

      {tab === "media" ? (
        <div className="mt-8 overflow-x-auto rounded-2xl border border-black/5 dark:border-white/10">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="border-b border-black/10 bg-black/[0.02] dark:border-white/10 dark:bg-white/[0.04]">
              <tr>
                <th className="p-3">Preview</th>
                <th className="p-3">Type</th>
                <th className="p-3">Gallery</th>
                <th className="p-3">Caption</th>
                <th className="p-3">By</th>
                <th className="p-3" />
              </tr>
            </thead>
            <tbody>
              {media.map((p) => (
                <tr key={p.id} className="border-b border-black/5 dark:border-white/10">
                  <td className="p-2">
                    <div className="relative h-14 w-14 overflow-hidden rounded-lg bg-black/5">
                      {p.mediaType === "video" ? (
                        <video src={p.publicPath} className="h-full w-full object-cover" muted playsInline />
                      ) : p.mediaType === "file" ? (
                        <div className="flex h-full items-center justify-center text-lg">📄</div>
                      ) : (
                        <Image
                          src={p.publicPath}
                          alt=""
                          fill
                          className="object-cover"
                          sizes="56px"
                          unoptimized={p.publicPath.startsWith("/uploads") || p.publicPath.startsWith("data:")}
                        />
                      )}
                    </div>
                  </td>
                  <td className="p-3 capitalize">{p.mediaType}</td>
                  <td className="p-3 text-[var(--muted)]">{p.galleryType}</td>
                  <td className="p-3 max-w-[200px] truncate">{p.caption || "—"}</td>
                  <td className="p-3 text-[var(--muted)]">{p.uploaderName ?? "—"}</td>
                  <td className="p-3 text-right">
                    <button
                      type="button"
                      className="mr-3 font-medium text-amber-700 dark:text-amber-300"
                      onClick={() => setEditingMedia(p)}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      className="text-red-600 dark:text-red-400"
                      onClick={() => deleteMediaItem(p.id)}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {tab === "upload" ? (
        <div className="mt-10 max-w-lg space-y-4">
          <p className="text-sm text-stone-600 dark:text-stone-400">
            Upload images, video, or PDFs to the <strong>family gallery</strong> or to any member&apos;s{" "}
            <strong>personal</strong> gallery. Pick the member when you choose Personal.
          </p>
          <button
            type="button"
            onClick={() => setUploadOpen(true)}
            className="rounded-xl bg-amber-600 px-6 py-3 text-sm font-semibold text-white shadow-md shadow-amber-900/20 dark:bg-amber-500 dark:text-stone-950"
          >
            Open upload window
          </button>
        </div>
      ) : null}

      {editingMember ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center"
          role="dialog"
          aria-modal="true"
          aria-label="Edit family member"
          onClick={() => {
            setEditingMember(null);
            setEditPassword("");
          }}
        >
          <form
            onClick={(e) => e.stopPropagation()}
            onSubmit={saveMemberEdit}
            className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-amber-200/60 bg-[var(--card)] p-6 shadow-xl dark:border-amber-500/25"
          >
            <h2 className="text-lg font-semibold text-stone-900 dark:text-amber-50">Edit member</h2>
            <p className="mt-1 text-sm text-[var(--muted)]">
              Change their sign-in email, set a new password, or update profile details.
            </p>

            <div className="mt-6 space-y-4 border-t border-amber-200/40 pt-5 dark:border-amber-500/20">
              <p className="text-xs font-bold uppercase tracking-wider text-amber-800 dark:text-amber-200/90">
                Login
              </p>
              <label className="block">
                <span className="mb-1 block text-sm font-medium">Email (sign-in)</span>
                <input
                  required
                  type="email"
                  value={editingMember.email}
                  onChange={(e) => setEditingMember((s) => (s ? { ...s, email: e.target.value } : s))}
                  className="w-full rounded-lg border border-black/10 px-3 py-2 text-sm dark:border-white/15"
                  autoComplete="off"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-sm font-medium">New password</span>
                <input
                  type="password"
                  value={editPassword}
                  onChange={(e) => setEditPassword(e.target.value)}
                  placeholder="Leave blank to keep the current password"
                  className="w-full rounded-lg border border-black/10 px-3 py-2 text-sm dark:border-white/15"
                  autoComplete="new-password"
                />
              </label>
            </div>

            <div className="mt-6 space-y-4 border-t border-amber-200/40 pt-5 dark:border-amber-500/20">
              <p className="text-xs font-bold uppercase tracking-wider text-amber-800 dark:text-amber-200/90">
                Profile
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block sm:col-span-2">
                  <span className="mb-1 block text-sm font-medium">Display name</span>
                  <input
                    value={editingMember.name}
                    onChange={(e) => setEditingMember((s) => (s ? { ...s, name: e.target.value } : s))}
                    className="w-full rounded-lg border border-black/10 px-3 py-2 text-sm dark:border-white/15"
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-sm font-medium">Label (e.g. Sister)</span>
                  <input
                    value={editingMember.displayRole}
                    onChange={(e) =>
                      setEditingMember((s) => (s ? { ...s, displayRole: e.target.value } : s))
                    }
                    className="w-full rounded-lg border border-black/10 px-3 py-2 text-sm dark:border-white/15"
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-sm font-medium">Sort order</span>
                  <input
                    type="number"
                    value={editingMember.sortIndex}
                    onChange={(e) =>
                      setEditingMember((s) =>
                        s ? { ...s, sortIndex: Number(e.target.value) } : s
                      )
                    }
                    className="w-full rounded-lg border border-black/10 px-3 py-2 text-sm dark:border-white/15"
                  />
                </label>
                <label className="block sm:col-span-2">
                  <span className="mb-1 block text-sm font-medium">Avatar URL</span>
                  <input
                    value={editingMember.avatarUrl}
                    onChange={(e) =>
                      setEditingMember((s) => (s ? { ...s, avatarUrl: e.target.value } : s))
                    }
                    className="w-full rounded-lg border border-black/10 px-3 py-2 text-sm dark:border-white/15"
                  />
                </label>
                <div className="sm:col-span-2">
                  <input
                    ref={avatarFileRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    className="hidden"
                    onChange={async (e) => {
                      const f = e.target.files?.[0];
                      if (!f || !editingMember) return;
                      setAvatarBusy(true);
                      try {
                        const fd = new FormData();
                        fd.append("file", f);
                        const res = await fetch(API_ROUTES.admin.userAvatar(editingMember.id), {
                          method: "POST",
                          body: fd,
                          credentials: "include",
                        });
                        const data = await res.json().catch(() => ({}));
                        if (!res.ok) {
                          notify(data.error || "Upload failed");
                          return;
                        }
                        if (data.user?.avatarUrl) {
                          setEditingMember((s) =>
                            s ? { ...s, avatarUrl: data.user.avatarUrl } : s
                          );
                        }
                        notify("Profile photo file updated.");
                        loadMembers();
                      } finally {
                        setAvatarBusy(false);
                        e.target.value = "";
                      }
                    }}
                  />
                  <button
                    type="button"
                    disabled={avatarBusy}
                    onClick={() => avatarFileRef.current?.click()}
                    className="rounded-lg border border-amber-600/40 bg-amber-500/10 px-3 py-2 text-sm font-medium text-amber-900 disabled:opacity-60 dark:border-amber-400/40 dark:text-amber-100"
                  >
                    {avatarBusy ? "Uploading…" : "Or upload profile photo file (JPEG, PNG, WebP, GIF · max 5 MB)"}
                  </button>
                </div>
                <label className="flex items-center gap-2 text-sm sm:col-span-2">
                  <input
                    type="checkbox"
                    checked={editingMember.isAdmin}
                    onChange={(e) =>
                      setEditingMember((s) => (s ? { ...s, isAdmin: e.target.checked } : s))
                    }
                  />
                  Admin (can open this screen)
                </label>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap gap-2 border-t border-amber-200/40 pt-5 dark:border-amber-500/20">
              <button
                type="submit"
                className="rounded-xl bg-amber-600 px-4 py-2 text-sm font-semibold text-white dark:bg-amber-500 dark:text-stone-950"
              >
                Save changes
              </button>
              <button
                type="button"
                className="rounded-xl border border-black/10 px-4 py-2 text-sm dark:border-white/15"
                onClick={() => {
                  setEditingMember(null);
                  setEditPassword("");
                }}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      ) : null}

      {editingMedia ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center"
          role="dialog"
          aria-modal="true"
          aria-label="Edit media"
          onClick={() => setEditingMedia(null)}
        >
          <form
            onClick={(e) => e.stopPropagation()}
            onSubmit={saveMediaEdit}
            className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl border border-amber-200/60 bg-[var(--card)] p-6 shadow-xl dark:border-amber-500/25"
          >
            <h2 className="text-lg font-semibold">Edit media</h2>
            <p className="mt-1 text-xs text-[var(--muted)]">
              {editingMedia.galleryType} · {editingMedia.mediaType}
            </p>
            <label className="mt-4 block">
              <span className="mb-1 block text-sm font-medium">Caption</span>
              <textarea
                value={editMediaCaption}
                onChange={(e) => setEditMediaCaption(e.target.value)}
                rows={3}
                className="w-full rounded-lg border border-black/10 px-3 py-2 text-sm dark:border-white/15"
              />
            </label>
            {editingMedia.galleryType === "family" ? (
              <label className="mt-3 block">
                <span className="mb-1 block text-sm font-medium">Category</span>
                <select
                  value={editMediaCategory}
                  onChange={(e) => setEditMediaCategory(e.target.value)}
                  className="w-full rounded-lg border border-black/10 px-3 py-2 text-sm dark:border-white/15"
                >
                  {FAMILY_CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
            <label className="mt-3 block">
              <span className="mb-1 block text-sm font-medium">Folder</span>
              <select
                value={editMediaAlbumId}
                onChange={(e) => setEditMediaAlbumId(e.target.value)}
                className="w-full rounded-lg border border-black/10 px-3 py-2 text-sm dark:border-white/15"
              >
                <option value="">No folder</option>
                {editMediaAlbums.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
            </label>
            <div className="mt-6 flex flex-wrap gap-2">
              <button
                type="submit"
                className="rounded-xl bg-amber-600 px-4 py-2 text-sm font-semibold text-white dark:bg-amber-500 dark:text-stone-950"
              >
                Save
              </button>
              <button
                type="button"
                className="rounded-xl border border-black/10 px-4 py-2 text-sm dark:border-white/15"
                onClick={() => setEditingMedia(null)}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      ) : null}
      <Lightbox
        photo={memoryLightbox?.current ?? null}
        photos={memoryLightbox?.photos}
        onNavigate={(p) => setMemoryLightbox((s) => (s ? { ...s, current: p } : null))}
        onClose={() => setMemoryLightbox(null)}
      />
    </div>
  );
}
