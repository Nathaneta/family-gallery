"use client";

import { useEffect, useState } from "react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

const HIDE_KEY = "family-gallery-hide-install-prompt-v1";

export function PwaInstallPrompt() {
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [hidden, setHidden] = useState(() =>
    typeof window === "undefined" ? false : window.localStorage.getItem(HIDE_KEY) === "1"
  );

  useEffect(() => {
    const onBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setInstallEvent(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => setInstallEvent(null);
    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (!installEvent || hidden) return null;

  return (
    <div className="flex items-center gap-2 rounded-lg border border-indigo-500/35 bg-indigo-500/10 px-2 py-1">
      <button
        type="button"
        className="rounded-md bg-indigo-600 px-2 py-1 text-xs font-semibold text-white"
        onClick={async () => {
          await installEvent.prompt();
          await installEvent.userChoice;
          setInstallEvent(null);
        }}
      >
        Install app
      </button>
      <button
        type="button"
        className="text-xs text-[var(--muted)]"
        onClick={() => {
          window.localStorage.setItem(HIDE_KEY, "1");
          setHidden(true);
        }}
      >
        Hide
      </button>
    </div>
  );
}
