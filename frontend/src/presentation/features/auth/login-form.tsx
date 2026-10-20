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
      router.push("/courses");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to sign in.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-md animate-fade-in-up">
      <div className="glass-card p-8">
        {/* Icon */}
        <div
          className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl"
          style={{ background: "var(--accent-glow)", border: "1px solid rgba(99,102,241,0.2)" }}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
            <polyline points="10 17 15 12 10 7" />
            <line x1="15" y1="12" x2="3" y2="12" />
          </svg>
        </div>

        <h1 className="mt-5 text-center font-serif text-3xl" style={{ color: "var(--ink)" }}>
          Welcome back
        </h1>
        <p className="mt-2 text-center text-sm" style={{ color: "var(--muted)" }}>
          Sign in to access your courses.
        </p>

        <form className="mt-8 space-y-5" onSubmit={onSubmit}>
          <label className="block text-sm" style={{ color: "var(--ink-soft)" }}>
            Email
            <input
              required
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input-field mt-1.5"
              placeholder="you@example.com"
            />
          </label>
          <label className="block text-sm" style={{ color: "var(--ink-soft)" }}>
            Password
            <input
              required
              minLength={6}
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input-field mt-1.5"
              placeholder="At least 6 characters"
            />
          </label>

          {error ? (
            <p className="alert-error" role="alert">{error}</p>
          ) : null}

          <Button type="submit" disabled={busy} className="w-full">
            {busy ? "Signing in…" : "Sign in"}
          </Button>
        </form>

        <div className="section-divider my-6" />

        <p className="text-center text-sm" style={{ color: "var(--muted)" }}>
          New here?{" "}
          <Link href="/register" className="gradient-text font-medium">
            Create an account
          </Link>
        </p>
        <p className="mt-2 text-center text-xs" style={{ color: "var(--muted)", opacity: 0.7 }}>
          Email verification is required before your first sign in.
        </p>
      </div>
    </div>
  );
}
