"use client";

import { useEffect } from "react";
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

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    (async () => {
      try {
        const reg = await navigator.serviceWorker.register("/sw.js");
        if (!user) return;
        if (!("PushManager" in window)) return;

        const keyRes = await fetch("/api/notifications/public-key", {
          credentials: "include",
          cache: "no-store",
        });
        const keyData = await keyRes.json().catch(() => ({}));
        if (!keyRes.ok || !keyData?.enabled || !keyData?.publicKey) return;

        const permission = await Notification.requestPermission();
        if (permission !== "granted") return;

        let sub = await reg.pushManager.getSubscription();
        if (!sub) {
          sub = await reg.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(keyData.publicKey),
          });
        }
        await fetch("/api/notifications/subscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(sub),
        });
      } catch {
        /* best effort */
      }
    })();
  }, [user]);

  return null;
}
