"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { Button } from "@/presentation/components/ui/button";
import { useAuth } from "@/presentation/providers/auth-provider";

export function RegisterForm() {
  const { register } = useAuth();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const message = await register(email, password, username);
      setNotice(message);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to register.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-md rounded-3xl border border-[var(--line)] bg-white/50 p-8 shadow-sm">
      <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">Get started</p>
      <h1 className="mt-2 font-serif text-3xl">Create your account</h1>
      <p className="mt-2 text-sm text-[var(--muted)]">Join Karini as a student and build your learning library.</p>

      <form className="mt-8 space-y-4" onSubmit={onSubmit}>
        <label className="block text-sm">
          Username
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="mt-1 w-full rounded-xl border border-[var(--line)] bg-white px-3 py-2.5"
            placeholder="How should we call you?"
          />
        </label>
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

        {notice ? (
          <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800" role="status">
            {notice}
          </p>
        ) : null}
        {error ? (
          <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
            {error}
          </p>
        ) : null}

        <Button type="submit" disabled={busy} className="w-full">
          {busy ? "Creating account…" : "Create account"}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-[var(--muted)]">
        Already have an account?{" "}
        <Link href="/login" className="text-[var(--ink)] underline-offset-2 hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
