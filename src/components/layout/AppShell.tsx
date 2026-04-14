"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/components/providers/AuthProvider";
import { useTheme } from "@/components/providers/ThemeProvider";
import { ActivityNotifications } from "@/components/notifications/ActivityNotifications";

function navLinks(isAdmin: boolean) {
  const base = [
    { href: "/dashboard", label: "Dashboard" },
    { href: "/family", label: "Family gallery" },
    { href: "/chat", label: "Chat" },
  ];
  if (isAdmin) {
    return [...base, { href: "/admin", label: "Admin" }];
  }
  return base;
}

function NavLink({ href, label }: { href: string; label: string }) {
  const pathname = usePathname();
  const active = pathname === href || pathname.startsWith(href + "/");
  const adminEntry = href === "/admin";
  if (adminEntry) {
    return (
      <Link
        href={href}
        className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${
          active
            ? "bg-amber-600 text-white shadow-md shadow-amber-900/20 dark:bg-amber-500 dark:text-stone-950 dark:shadow-amber-900/40"
            : "border border-amber-600/35 text-amber-800 hover:bg-amber-500/10 dark:border-amber-400/40 dark:text-amber-200 dark:hover:bg-amber-400/10"
        }`}
      >
        {label}
      </Link>
    );
  }
  return (
    <Link
      href={href}
      className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
        active
          ? "bg-[var(--accent)] text-white shadow-sm"
          : "text-[var(--muted)] hover:bg-black/5 dark:hover:bg-white/10"
      }`}
    >
      {label}
    </Link>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const { theme, toggle } = useTheme();
  const pathname = usePathname();
  const nav = navLinks(!!user?.isAdmin);
  const onAdminRoute = pathname.startsWith("/admin");

  const sectionClass = pathname.startsWith("/admin")
    ? "section-admin"
    : pathname.startsWith("/family")
      ? "section-family"
      : pathname.startsWith("/profile")
        ? "section-profile"
        : pathname.startsWith("/chat")
          ? "section-chat"
          : "section-dashboard";

  return (
    <div
      className={`min-h-screen text-[var(--foreground)] ${
        onAdminRoute
          ? "admin-shell bg-gradient-to-b from-amber-50 via-[var(--background)] to-[var(--background)] dark:from-amber-950/40 dark:via-[var(--background)]"
          : "bg-gradient-to-b from-[var(--app-shell-tint-from)] via-[var(--app-shell-tint-via)] to-[var(--background)]"
      }`}
    >
      <header
        className={`sticky top-0 z-40 border-b backdrop-blur-md ${
          onAdminRoute
            ? "border-amber-200/80 bg-[var(--card)]/95 dark:border-amber-500/25 dark:bg-stone-950/90"
            : "border-black/5 bg-[var(--card)]/90 dark:border-white/10"
        }`}
      >
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
          <div className="flex items-center gap-6">
            <Link
              href="/dashboard"
              className="text-lg font-semibold tracking-tight transition hover:text-[var(--accent)]"
            >
              <span className="bg-gradient-to-r from-[var(--accent)] to-violet-500 bg-clip-text text-transparent dark:from-indigo-300 dark:to-violet-300">
                Family Gallery
              </span>
            </Link>
            <nav className="hidden items-center gap-1 sm:flex">
              {nav.map((n) => (
                <NavLink key={n.href} {...n} />
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-2">
            {user ? <ActivityNotifications /> : null}
            <button
              type="button"
              onClick={toggle}
              className="rounded-lg border border-black/10 px-3 py-1.5 text-xs font-medium transition hover:bg-black/5 dark:border-white/15 dark:hover:bg-white/10"
              aria-label="Toggle dark mode"
            >
              <span className="mr-1.5 inline-block align-middle" aria-hidden>
                {theme === "dark" ? "☀️" : "🌙"}
              </span>
              {theme === "dark" ? "Light" : "Dark"}
            </button>
            {user && (
              <div className="hidden items-center gap-2 sm:flex">
                <span className="max-w-[140px] truncate text-sm text-[var(--muted)]">{user.name}</span>
                <button
                  type="button"
                  onClick={() => logout()}
                  className="rounded-lg px-2 py-1 text-sm text-[var(--muted)] hover:text-[var(--foreground)]"
                >
                  Log out
                </button>
              </div>
            )}
            {user && (
              <button
                type="button"
                onClick={() => logout()}
                className="rounded-lg px-2 py-1 text-sm text-[var(--muted)] hover:text-[var(--foreground)] sm:hidden"
              >
                Log out
              </button>
            )}
          </div>
        </div>
        <div className="flex gap-1 border-t border-black/5 px-4 py-2 sm:hidden dark:border-white/10">
          {nav.map((n) => (
            <NavLink key={n.href} {...n} />
          ))}
        </div>
      </header>
      <main
        className={`mx-auto max-w-6xl px-4 py-8 pb-16 ${sectionClass}`}
        data-section={sectionClass.replace("section-", "")}
      >
        {children}
      </main>
    </div>
  );
}
