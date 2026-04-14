"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/providers/AuthProvider";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function PushNotificationsSetup() {
  const { user } = useAuth();
  const [publicKey, setPublicKey] = useState<string | null>(null);
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [subscribed, setSubscribed] = useState(false);
  const [dismissed, setDismissed] = useState(() =>
    typeof window === "undefined" ? false : window.localStorage.getItem("fg_push_prompt_hidden") === "1"
  );
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    setPermission(typeof Notification !== "undefined" ? Notification.permission : "default");

    (async () => {
      try {
        await navigator.serviceWorker.register("/sw.js");
      } catch {
        /* best effort */
      }
    })();
  }, []);

  useEffect(() => {
    if (!user) return;
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;

    (async () => {
      try {
        const keyRes = await fetch("/api/notifications/public-key", {
          credentials: "include",
          cache: "no-store",
        });
        const keyData = await keyRes.json().catch(() => ({}));
        if (!keyRes.ok || !keyData?.enabled || !keyData?.publicKey) {
          setPublicKey(null);
          return;
        }
        setPublicKey(keyData.publicKey);
        const reg = await navigator.serviceWorker.ready;
        const existing = await reg.pushManager.getSubscription();
        setSubscribed(!!existing);

        if (Notification.permission !== "granted") return;
        if (existing) return;

        const sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(keyData.publicKey),
        });
        await fetch("/api/notifications/subscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(sub),
        });
        setSubscribed(true);
      } catch {
        /* best effort */
      }
    })();
  }, [user]);

  async function enablePushNow() {
    if (!publicKey || !("serviceWorker" in navigator) || !("PushManager" in window)) return;
    setBusy(true);
    try {
      const next = await Notification.requestPermission();
      setPermission(next);
      if (next !== "granted") return;
      const reg = await navigator.serviceWorker.ready;
      let sub = await reg.pushManager.getSubscription();
      if (!sub) {
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey),
        });
      }
      await fetch("/api/notifications/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(sub),
      });
      setSubscribed(true);
    } finally {
      setBusy(false);
    }
  }

  const canPrompt = !!user && !!publicKey && permission === "default" && !dismissed && !subscribed;

  return canPrompt ? (
    <div className="fixed bottom-20 left-4 right-4 z-50 rounded-xl border border-indigo-500/40 bg-[var(--card)] p-3 shadow-lg sm:bottom-6 sm:left-auto sm:right-6 sm:w-[360px]">
      <p className="text-sm font-semibold">Enable phone notifications</p>
      <p className="mt-1 text-xs text-[var(--muted)]">
        Get real pop-up alerts for new chat messages and uploads, even when the app is closed.
      </p>
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={enablePushNow}
          className="rounded-lg bg-[var(--accent)] px-3 py-2 text-xs font-semibold text-white disabled:opacity-60"
        >
          {busy ? "Enabling…" : "Enable notifications"}
        </button>
        <button
          type="button"
          onClick={() => {
            window.localStorage.setItem("fg_push_prompt_hidden", "1");
            setDismissed(true);
          }}
          className="rounded-lg border border-black/10 px-3 py-2 text-xs dark:border-white/15"
        >
          Not now
        </button>
      </div>
    </div>
  ) : null;
}
