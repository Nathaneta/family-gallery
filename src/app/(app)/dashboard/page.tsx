"use client";

import { useCallback, useEffect, useState } from "react";
import { MemberCard } from "@/components/members/MemberCard";
import { FamilySpotlight } from "@/components/dashboard/FamilySpotlight";
import { UploadModal } from "@/components/gallery/UploadModal";
import { useAuth } from "@/components/providers/AuthProvider";
import type { UserPublic } from "@/shared/api-types";

const MEMBERS_CACHE_KEY = "family-gallery-dashboard-members-v1";

function readCachedMembers(): UserPublic[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(MEMBERS_CACHE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as UserPublic[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [members, setMembers] = useState<UserPublic[]>(() => readCachedMembers());
  const [membersLoading, setMembersLoading] = useState(() => readCachedMembers().length === 0);
  const [uploadOpen, setUploadOpen] = useState(false);

  const load = useCallback((showLoading = true) => {
    if (showLoading) setMembersLoading(true);
    fetch("/api/users", { credentials: "include", cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setMembers(d.users ?? []))
      .catch(() => setMembers([]))
      .finally(() => setMembersLoading(false));
  }, []);

  useEffect(() => {
    fetch("/api/users", { credentials: "include", cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        const list = d.users ?? [];
        setMembers(list);
        try {
          window.localStorage.setItem(MEMBERS_CACHE_KEY, JSON.stringify(list));
        } catch {
          // ignore cache write issues
        }
      })
      .catch(() => setMembers([]))
      .finally(() => setMembersLoading(false));
  }, []);

  const firstName = user?.name?.split(/\s+/)[0] ?? "";

  return (
    <div>
      <section className="dashboard-hero mb-10 rounded-2xl border border-[var(--hero-border)] bg-[var(--hero-surface)] p-6 shadow-md sm:p-8">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-widest text-[var(--hero-accent)]">
              Your family hub
            </p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
              {firstName ? (
                <>
                  Welcome back, <span className="text-[var(--accent)]">{firstName}</span>
                </>
              ) : (
                "Welcome"
              )}
            </h1>
            <p className="mt-2 max-w-xl text-[var(--muted)]">
              Browse everyone’s galleries, relive past uploads, and add new moments to the family album.
            </p>
          </div>
          {user ? (
            <button
              type="button"
              onClick={() => setUploadOpen(true)}
              className="shrink-0 rounded-xl bg-[var(--accent)] px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-[var(--accent)]/25 transition hover:opacity-95"
            >
              Upload a photo
            </button>
          ) : null}
        </div>
      </section>

      <FamilySpotlight />

      <h2 className="mb-4 text-lg font-semibold">Family members</h2>
      <div className="member-grid grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        {membersLoading
          ? Array.from({ length: 6 }).map((_, i) => (
              <div
                key={`member-skeleton-${i}`}
                className="h-36 animate-pulse rounded-2xl border border-black/10 bg-black/5 dark:border-white/10 dark:bg-white/5"
              />
            ))
          : members.map((m) => <MemberCard key={m.id} member={m} />)}
      </div>

      {user && (
        <UploadModal
          open={uploadOpen}
          onClose={() => setUploadOpen(false)}
          ownerUserId={user.id}
          defaultMode="personal"
          onUploaded={load}
        />
      )}
    </div>
  );
}
