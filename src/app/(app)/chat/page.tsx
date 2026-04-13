"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/components/providers/AuthProvider";
import { useToast } from "@/components/providers/ToastProvider";
import { API_ROUTES } from "@/lib/api-endpoints";
import type { UserPublic } from "@/shared/api-types";

type ChatMsg = {
  id: string;
  channel: string;
  senderId: string;
  senderName: string;
  body: string;
  createdAt: string;
};

type Channel = "family" | "dm";
type PresenceInfo = { online: boolean; typing: boolean; lastSeenAt: string | null };

const fetchOpts: RequestInit = { credentials: "include", cache: "no-store" };

export default function ChatPage() {
  const { user, loading: authLoading } = useAuth();
  const { notify } = useToast();
  const [members, setMembers] = useState<UserPublic[]>([]);
  const [settings, setSettings] = useState<{
    familyChatEnabled: boolean;
    directMessagesEnabled: boolean;
  } | null>(null);
  const [channel, setChannel] = useState<Channel>("family");
  const [peerId, setPeerId] = useState<string>("");
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [presence, setPresence] = useState<Record<string, PresenceInfo>>({});
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const typingSentRef = useRef(false);
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadSettings = useCallback(() => {
    fetch(API_ROUTES.chat.settings, fetchOpts)
      .then((r) => r.json())
      .then((d) => {
        if (d.settings) setSettings(d.settings);
      })
      .catch(() => setSettings(null));
  }, []);

  const loadMembers = useCallback(() => {
    fetch(API_ROUTES.users, fetchOpts)
      .then((r) => r.json())
      .then((d) => setMembers(d.users ?? []))
      .catch(() => setMembers([]));
  }, []);

  const loadMessages = useCallback(() => {
    if (authLoading || !user) return;
    const p = new URLSearchParams();
    if (channel === "family") {
      p.set("channel", "family");
    } else {
      if (!peerId) {
        setMessages([]);
        return;
      }
      p.set("channel", "dm");
      p.set("peerId", peerId);
    }
    p.set("_", String(Date.now()));
    fetch(`${API_ROUTES.chat.messages}?${p}`, fetchOpts)
      .then((r) => {
        if (r.status === 403) loadSettings();
        if (!r.ok) return null;
        return r.json();
      })
      .then((d) => {
        if (d?.messages) setMessages(d.messages);
      })
      .catch(() => {});
  }, [user, channel, peerId, authLoading, loadSettings]);

  const loadPresence = useCallback(() => {
    if (authLoading || !user) return;
    const p = new URLSearchParams();
    p.set("channel", channel);
    if (channel === "dm" && peerId) p.set("peerId", peerId);
    p.set("_", String(Date.now()));
    fetch(`${API_ROUTES.chat.presence}?${p}`, fetchOpts)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setPresence(d?.presence ?? {}))
      .catch(() => {});
  }, [authLoading, user, channel, peerId]);

  const sendPresence = useCallback(
    async (opts?: { heartbeat?: boolean; typing?: boolean }) => {
      if (!user) return;
      const body: Record<string, unknown> = {
        heartbeat: !!opts?.heartbeat,
        channel,
      };
      if (channel === "dm" && peerId) body.peerUserId = peerId;
      if (opts?.typing !== undefined) body.typing = opts.typing;
      try {
        await fetch(API_ROUTES.chat.presence, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          cache: "no-store",
          body: JSON.stringify(body),
        });
      } catch {
        /* ignore transient presence failures */
      }
    },
    [user, channel, peerId]
  );

  useEffect(() => {
    loadSettings();
    loadMembers();
  }, [loadSettings, loadMembers]);

  useEffect(() => {
    loadMessages();
    loadPresence();
  }, [loadMessages, loadPresence]);

  useEffect(() => {
    const t = setInterval(() => {
      loadMessages();
      loadPresence();
    }, 2500);
    return () => clearInterval(t);
  }, [loadMessages, loadPresence]);

  useEffect(() => {
    if (!user) return;
    sendPresence({ heartbeat: true });
    const t = setInterval(() => {
      sendPresence({ heartbeat: true });
    }, 15_000);
    return () => clearInterval(t);
  }, [user, sendPresence]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    typingSentRef.current = false;
    if (typingTimerRef.current) {
      clearTimeout(typingTimerRef.current);
      typingTimerRef.current = null;
    }
  }, [channel, peerId]);

  useEffect(() => {
    return () => {
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    };
  }, []);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !draft.trim() || sending) return;
    if (channel === "dm" && !peerId) return;
    if (channel === "family" && !settings?.familyChatEnabled) return;
    if (channel === "dm" && !settings?.directMessagesEnabled) return;

    setSending(true);
    try {
      const body =
        channel === "family"
          ? { channel: "family", body: draft.trim() }
          : { channel: "dm", peerUserId: peerId, body: draft.trim() };
      const res = await fetch(API_ROUTES.chat.messages, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        cache: "no-store",
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Could not send");
      }
      setDraft("");
      typingSentRef.current = false;
      if (typingTimerRef.current) {
        clearTimeout(typingTimerRef.current);
        typingTimerRef.current = null;
      }
      sendPresence({ typing: false });
      loadMessages();
      loadPresence();
    } catch (err) {
      notify(err instanceof Error ? err.message : "Could not send");
    } finally {
      setSending(false);
    }
  }

  const others = members.filter((m) => m.id !== user?.id);
  const canFamily = settings?.familyChatEnabled !== false;
  const canDm = settings?.directMessagesEnabled !== false;
  const activePeer = others.find((x) => x.id === peerId) ?? null;
  const onlineCount = others.filter((m) => presence[m.id]?.online).length;
  const typingText =
    channel === "family"
      ? others
          .filter((m) => presence[m.id]?.typing)
          .slice(0, 2)
          .map((m) => m.name)
          .join(", ")
      : activePeer && presence[activePeer.id]?.typing
        ? `${activePeer.name} is typing…`
        : "";

  return (
    <div className="chat-layout flex min-h-[calc(100vh-8rem)] flex-col gap-4 lg:flex-row">
      <aside className="chat-sidebar w-full shrink-0 rounded-2xl border border-cyan-200/40 bg-gradient-to-b from-cyan-50/90 to-[var(--card)] p-4 shadow-sm dark:border-cyan-500/20 dark:from-cyan-950/40 lg:max-w-xs">
        <h1 className="text-xl font-bold tracking-tight text-cyan-950 dark:text-cyan-50">Family chat</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Family room for everyone, or direct messages between two people.
        </p>

        <nav className="mt-6 space-y-2">
          <button
            type="button"
            disabled={!canFamily}
            onClick={() => {
              setChannel("family");
              setPeerId("");
            }}
            className={`flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm font-semibold transition ${
              channel === "family"
                ? "bg-cyan-600 text-white shadow-md dark:bg-cyan-500 dark:text-stone-950"
                : "bg-black/5 hover:bg-black/10 disabled:opacity-50 dark:bg-white/10 dark:hover:bg-white/15"
            }`}
          >
            <span className="text-lg" aria-hidden>
              👨‍👩‍👧‍👦
            </span>
            Family room
            <span className="ml-auto text-[10px] font-medium opacity-80">{onlineCount} online</span>
          </button>

          <p className="pt-2 text-xs font-bold uppercase tracking-wider text-cyan-800/80 dark:text-cyan-200/80">
            Direct messages
          </p>
          {!canDm ? (
            <p className="text-xs text-[var(--muted)]">Direct messages are disabled by an admin.</p>
          ) : (
            <ul className="max-h-48 space-y-1 overflow-y-auto lg:max-h-[min(24rem,50vh)]">
              {others.map((m) => (
                <li key={m.id}>
                  <button
                    type="button"
                    onClick={() => {
                      setChannel("dm");
                      setPeerId(m.id);
                    }}
                    className={`flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm transition ${
                      channel === "dm" && peerId === m.id
                        ? "bg-cyan-600/15 font-medium text-cyan-900 dark:bg-cyan-400/15 dark:text-cyan-100"
                        : "hover:bg-black/5 dark:hover:bg-white/10"
                    }`}
                  >
                    <span className="relative h-8 w-8 shrink-0 overflow-hidden rounded-full ring-1 ring-cyan-500/30">
                      <Image
                        src={m.avatarUrl}
                        alt=""
                        fill
                        className="object-cover"
                        sizes="32px"
                        unoptimized={
                          m.avatarUrl.startsWith("http") ||
                          m.avatarUrl.startsWith("/uploads") ||
                          m.avatarUrl.startsWith("data:")
                        }
                      />
                      <span
                        className={`absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full ring-2 ring-[var(--card)] ${
                          presence[m.id]?.online ? "bg-emerald-500" : "bg-zinc-400"
                        }`}
                      />
                    </span>
                    <span className="min-w-0 flex-1 truncate">{m.name}</span>
                    {presence[m.id]?.typing ? (
                      <span className="text-[10px] font-medium text-cyan-700 dark:text-cyan-300">
                        typing…
                      </span>
                    ) : null}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </nav>
      </aside>

      <section className="chat-main flex min-h-[420px] flex-1 flex-col rounded-2xl border border-cyan-200/35 bg-[var(--card)] shadow-md dark:border-cyan-500/20">
        <header className="border-b border-black/5 px-4 py-3 dark:border-white/10">
          <h2 className="font-semibold text-cyan-950 dark:text-cyan-100">
            {channel === "family"
              ? "Family room"
              : peerId
                ? others.find((x) => x.id === peerId)?.name ?? "Chat"
                : "Pick someone"}
          </h2>
          <p className="text-xs text-[var(--muted)]">
            {typingText
              ? channel === "family"
                ? `${typingText}${others.filter((m) => presence[m.id]?.typing).length > 2 ? " and others" : ""} typing…`
                : typingText
              : channel === "dm" && activePeer
                ? presence[activePeer.id]?.online
                  ? `${activePeer.name} is online`
                  : `${activePeer.name} is offline`
                : "Messages refresh every few seconds. Only your family (signed-in) can see this."}
          </p>
        </header>

        <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
          {channel === "dm" && !peerId ? (
            <p className="text-center text-sm text-[var(--muted)]">Select a family member to start a DM.</p>
          ) : channel === "family" && !canFamily ? (
            <p className="text-center text-sm text-[var(--muted)]">The family chat room is turned off.</p>
          ) : messages.length === 0 ? (
            <p className="text-center text-sm text-[var(--muted)]">No messages yet — say hello.</p>
          ) : (
            messages.map((msg) => {
              const mine = msg.senderId === user?.id;
              return (
                <div
                  key={msg.id}
                  className={`flex ${mine ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm shadow-sm ${
                      mine
                        ? "rounded-br-md bg-cyan-600 text-white dark:bg-cyan-500 dark:text-stone-950"
                        : "rounded-bl-md bg-black/[0.06] text-[var(--foreground)] dark:bg-white/10"
                    }`}
                  >
                    {!mine ? (
                      <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-cyan-700 dark:text-cyan-300">
                        {msg.senderName}
                      </p>
                    ) : null}
                    <p className="whitespace-pre-wrap break-words">{msg.body}</p>
                    <p
                      className={`mt-1 text-[10px] ${mine ? "text-white/75 dark:text-stone-900/60" : "text-[var(--muted)]"}`}
                    >
                      {new Date(msg.createdAt).toLocaleString()}
                    </p>
                  </div>
                </div>
              );
            })
          )}
          <div ref={bottomRef} />
        </div>

        <form
          onSubmit={send}
          className="border-t border-black/5 p-3 dark:border-white/10"
        >
          <div className="flex gap-2">
            <input
              value={draft}
              onChange={(e) => {
                const next = e.target.value;
                setDraft(next);
                if (sending || (channel === "dm" && !peerId)) return;
                const shouldType = next.trim().length > 0;
                if (shouldType && !typingSentRef.current) {
                  typingSentRef.current = true;
                  sendPresence({ typing: true });
                }
                if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
                typingTimerRef.current = setTimeout(() => {
                  typingSentRef.current = false;
                  sendPresence({ typing: false });
                }, shouldType ? 1800 : 0);
              }}
              placeholder={
                channel === "dm" && !peerId
                  ? "Choose someone in the sidebar…"
                  : "Type a message…"
              }
              disabled={
                sending ||
                (channel === "family" && !canFamily) ||
                (channel === "dm" && (!peerId || !canDm))
              }
              className="min-w-0 flex-1 rounded-xl border border-black/10 bg-transparent px-3 py-2 text-sm dark:border-white/15"
            />
            <button
              type="submit"
              disabled={
                sending ||
                !draft.trim() ||
                (channel === "family" && !canFamily) ||
                (channel === "dm" && (!peerId || !canDm))
              }
              className="shrink-0 rounded-xl bg-cyan-600 px-4 py-2 text-sm font-semibold text-white shadow-sm disabled:opacity-50 dark:bg-cyan-500 dark:text-stone-950"
            >
              Send
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
