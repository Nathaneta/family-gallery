"use client";

import Image from "next/image";
import Link from "next/link";
import type { UserPublic } from "@/shared/api-types";

function roleBarClass(role?: string): string {
  if (!role) return "from-[var(--accent)] to-violet-500";
  const r = role.toLowerCase();
  if (r.includes("father") || r.includes("mother")) return "from-rose-500 to-amber-500";
  if (r.includes("brother")) return "from-sky-500 to-cyan-400";
  if (r.includes("sister")) return "from-violet-500 to-fuchsia-500";
  return "from-[var(--accent)] to-indigo-400";
}

export function MemberCard({ member }: { member: UserPublic }) {
  const bar = roleBarClass(member.displayRole);

  return (
    <Link
      href={`/profile/${member.id}`}
      className="group relative overflow-hidden rounded-2xl border border-black/5 bg-[var(--card)] p-4 shadow-sm transition hover:-translate-y-1 hover:shadow-lg dark:border-white/10"
    >
      <div
        className={`pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r opacity-90 ${bar}`}
        aria-hidden
      />
      <div className="flex flex-col items-center gap-3 text-center">
        <div className="relative h-24 w-24 overflow-hidden rounded-full ring-2 ring-[var(--ring)] transition group-hover:ring-[var(--accent)] group-hover:shadow-md">
          <Image
            src={member.avatarUrl}
            alt=""
            fill
            className="object-cover transition duration-300 group-hover:scale-105"
            sizes="96px"
            unoptimized={member.avatarUrl.startsWith("http")}
          />
        </div>
        <div>
          <p className="font-semibold">{member.name}</p>
          {member.displayRole ? (
            <p className="text-xs font-medium text-[var(--accent)]">{member.displayRole}</p>
          ) : null}
          <p className="text-xs text-[var(--muted)]">View gallery →</p>
        </div>
      </div>
    </Link>
  );
}
