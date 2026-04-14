"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import type { UserPublic } from "@/shared/api-types";

type AuthContextValue = {
  user: UserPublic | null;
  loading: boolean;
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserPublic | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const res = await fetch("/api/auth/me", { credentials: "include", cache: "no-store" });
    const data = await res.json().catch(() => ({}));
    setUser(data.user ?? null);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        let data: { user?: UserPublic | null } = {};
        try {
          const res = await fetch("/api/auth/me", { credentials: "include", cache: "no-store" });
          data = await res.json().catch(() => ({}));
        } catch {
          // Cold starts can fail once; quick retry improves first-load reliability.
          await new Promise((r) => setTimeout(r, 350));
          const res2 = await fetch("/api/auth/me", { credentials: "include", cache: "no-store" });
          data = await res2.json().catch(() => ({}));
        }
        if (!cancelled) setUser(data.user ?? null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const logout = useCallback(async () => {
    await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    setUser(null);
    window.location.href = "/login";
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, refresh, logout }}>{children}</AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
