"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { Button } from "@/presentation/components/ui/button";
import { useAuth } from "@/presentation/providers/auth-provider";

export function LoginForm() {
  const router = useRouter();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await login(email, password);
      router.push("/library");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to sign in.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-md rounded-3xl border border-[var(--line)] bg-white/50 p-8 shadow-sm">
      <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">Welcome back</p>
      <h1 className="mt-2 font-serif text-3xl">Sign in to Karini</h1>
      <p className="mt-2 text-sm text-[var(--muted)]">
        Access your courses, exercises, and membership library.
      </p>

      <form className="mt-8 space-y-4" onSubmit={onSubmit}>
        <label className="block text-sm">
          Email
          <input
            required
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full rounded-xl border border-[var(--line)] bg-white px-3 py-2.5"
            placeholder="you@example.com"
          />
        </label>
        <label className="block text-sm">
          Password
          <input
            required
            minLength={6}
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 w-full rounded-xl border border-[var(--line)] bg-white px-3 py-2.5"
            placeholder="At least 6 characters"
          />
        </label>

        {error ? (
          <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
            {error}
          </p>
        ) : null}

        <Button type="submit" disabled={busy} className="w-full">
          {busy ? "Signing in…" : "Sign in"}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-[var(--muted)]">
        New here?{" "}
        <Link href="/register" className="text-[var(--ink)] underline-offset-2 hover:underline">
          Create an account
        </Link>
      </p>
      <p className="mt-3 text-center text-xs text-[var(--muted)]">
        Email verification is required before your first sign in.
      </p>
    </div>
  );
}
