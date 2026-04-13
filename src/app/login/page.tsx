"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me", { credentials: "include" })
      .then((r) => r.json())
      .then((d) => {
        if (d.user) router.replace("/dashboard");
      });
  }, [router]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      if (mode === "login") {
        const res = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
          credentials: "include",
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Login failed");
        router.replace("/dashboard");
        return;
      }

      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, name, inviteCode }),
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Signup failed");
      router.replace("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-page flex min-h-screen flex-col items-center justify-center bg-[var(--background)] px-4 py-12">
      <div className="auth-panel w-full max-w-md rounded-2xl border border-black/5 bg-[var(--card)] p-8 dark:border-white/10">
        <h1 className="text-center text-2xl font-bold tracking-tight">
          <span className="bg-gradient-to-r from-[var(--accent)] to-violet-500 bg-clip-text text-transparent dark:from-indigo-300 dark:to-violet-300">
            Family Gallery
          </span>
        </h1>
        <p className="mt-1 text-center text-sm text-[var(--muted)]">Private photos for your household</p>

        <div className="mt-6 flex rounded-xl bg-black/5 p-1 dark:bg-white/10">
          <button
            type="button"
            className={`flex-1 rounded-lg py-2 text-sm font-medium ${
              mode === "login" ? "bg-[var(--card)] shadow-sm" : "text-[var(--muted)]"
            }`}
            onClick={() => setMode("login")}
          >
            Log in
          </button>
          <button
            type="button"
            className={`flex-1 rounded-lg py-2 text-sm font-medium ${
              mode === "signup" ? "bg-[var(--card)] shadow-sm" : "text-[var(--muted)]"
            }`}
            onClick={() => setMode("signup")}
          >
            Sign up
          </button>
        </div>

        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          {mode === "signup" ? (
            <>
              <label className="block text-sm">
                <span className="text-[var(--muted)]">Name</span>
                <input
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-black/10 bg-transparent px-3 py-2 dark:border-white/15"
                />
              </label>
              <label className="block text-sm">
                <span className="text-[var(--muted)]">Family invite code</span>
                <input
                  required
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-black/10 bg-transparent px-3 py-2 dark:border-white/15"
                  placeholder="From your .env FAMILY_INVITE_CODE"
                />
              </label>
            </>
          ) : null}
          <label className="block text-sm">
            <span className="text-[var(--muted)]">Email</span>
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-lg border border-black/10 bg-transparent px-3 py-2 dark:border-white/15"
            />
          </label>
          <label className="block text-sm">
            <span className="text-[var(--muted)]">Password</span>
            <input
              type="password"
              required
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded-lg border border-black/10 bg-transparent px-3 py-2 dark:border-white/15"
            />
          </label>
          {error ? <p className="text-sm text-red-600 dark:text-red-400">{error}</p> : null}
          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-xl bg-[var(--accent)] py-2.5 text-sm font-semibold text-white shadow disabled:opacity-60"
          >
            {busy ? "Please wait…" : mode === "login" ? "Log in" : "Create account"}
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-[var(--muted)]">
          After <code className="rounded bg-black/5 px-1 dark:bg-white/10">npm run seed</code>, sign in as{" "}
          <code className="rounded bg-black/5 px-1 dark:bg-white/10">natan@family.gallery</code> (admin) or any
          family email — see README.
        </p>
      </div>
      <p className="mt-6 text-sm text-[var(--muted)]">
        <Link href="/" className="underline">
          Home
        </Link>
      </p>
    </div>
  );
}
