"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { API_ROUTES } from "@/lib/api-endpoints";
import { useToast } from "@/components/providers/ToastProvider";

type ActivityItem = {
  id: string;
  message: string;
  createdAt: string;
};

const POLL_MS = 12000;

export function ActivityNotifications() {
  const { notify } = useToast();
  const [items, setItems] = useState<ActivityItem[]>([]);
  const [open, setOpen] = useState(false);
  const [lastSeen, setLastSeen] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    try {
      return localStorage.getItem("fg_activity_last_seen");
    } catch {
      return null;
    }
  });
  const firstLoadRef = useRef(true);

  useEffect(() => {
    let mounted = true;
    const load = () => {
      fetch(API_ROUTES.activity, { credentials: "include", cache: "no-store" })
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => {
          if (!mounted) return;
          const next = (d?.items ?? []) as ActivityItem[];
          setItems(next);
          if (firstLoadRef.current) {
            firstLoadRef.current = false;
            if (!lastSeen && next[0]?.createdAt) {
              setLastSeen(next[0].createdAt);
              try {
                localStorage.setItem("fg_activity_last_seen", next[0].createdAt);
              } catch {
                /* ignore */
              }
            }
            return;
          }

          if (!lastSeen) return;
          const fresh = next.filter((x) => new Date(x.createdAt).getTime() > new Date(lastSeen).getTime());
          if (fresh.length > 0) {
            notify(fresh[0].message);
          }
        })
        .catch(() => {});
    };

    load();
    const t = setInterval(load, POLL_MS);
    return () => {
      mounted = false;
      clearInterval(t);
    };
  }, [notify, lastSeen]);

  const unread = useMemo(() => {
    if (!lastSeen) return 0;
    return items.filter((x) => new Date(x.createdAt).getTime() > new Date(lastSeen).getTime()).length;
  }, [items, lastSeen]);

  function markAllRead() {
    const top = items[0]?.createdAt ?? new Date().toISOString();
    setLastSeen(top);
    try {
      localStorage.setItem("fg_activity_last_seen", top);
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => {
          const next = !open;
          setOpen(next);
          if (next) markAllRead();
        }}
        className="relative rounded-lg border border-black/10 px-3 py-1.5 text-xs font-medium transition hover:bg-black/5 dark:border-white/15 dark:hover:bg-white/10"
        aria-label="Notifications"
      >
        🔔
        {unread > 0 ? (
          <span className="absolute -right-1 -top-1 rounded-full bg-rose-500 px-1.5 text-[10px] font-bold text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="absolute right-0 z-50 mt-2 w-80 overflow-hidden rounded-xl border border-black/10 bg-[var(--card)] shadow-xl dark:border-white/15">
          <div className="flex items-center justify-between border-b border-black/5 px-3 py-2 dark:border-white/10">
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">Notifications</p>
            <button
              type="button"
              onClick={() => {
                markAllRead();
                setOpen(false);
              }}
              className="text-xs text-[var(--muted)] hover:text-[var(--foreground)]"
            >
              Close
            </button>
          </div>
          <ul className="max-h-72 overflow-y-auto p-2">
            {items.length === 0 ? (
              <li className="px-2 py-4 text-sm text-[var(--muted)]">No notifications yet.</li>
            ) : (
              items.slice(0, 20).map((item) => (
                <li key={item.id} className="rounded-lg px-2 py-2 text-sm hover:bg-black/5 dark:hover:bg-white/5">
                  <p className="text-[var(--foreground)]">{item.message}</p>
                  <p className="mt-0.5 text-[11px] text-[var(--muted)]">
                    {new Date(item.createdAt).toLocaleString()}
                  </p>
                </li>
              ))
            )}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
