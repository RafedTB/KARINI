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
    <div className="mx-auto max-w-md animate-fade-in-up">
      <div className="glass-card p-8">
        {/* Icon */}
        <div
          className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl"
          style={{ background: "linear-gradient(135deg, rgba(236,72,153,0.12), rgba(99,102,241,0.12))", border: "1px solid rgba(236,72,153,0.2)" }}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="8.5" cy="7" r="4" />
            <line x1="20" y1="8" x2="20" y2="14" />
            <line x1="23" y1="11" x2="17" y2="11" />
          </svg>
        </div>

        <h1 className="mt-5 text-center font-serif text-3xl" style={{ color: "var(--ink)" }}>
          Create your account
        </h1>
        <p className="mt-2 text-center text-sm" style={{ color: "var(--muted)" }}>
          Join Karini as a student and build your learning path.
        </p>

        <form className="mt-8 space-y-5" onSubmit={onSubmit}>
          <label className="block text-sm" style={{ color: "var(--ink-soft)" }}>
            Username
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="input-field mt-1.5"
              placeholder="How should we call you?"
            />
          </label>
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

          {notice ? (
            <p className="alert-success" role="status">{notice}</p>
          ) : null}
          {error ? (
            <p className="alert-error" role="alert">{error}</p>
          ) : null}

          <Button type="submit" disabled={busy} className="w-full">
            {busy ? "Creating account…" : "Create account"}
          </Button>
        </form>

        <div className="section-divider my-6" />

        <p className="text-center text-sm" style={{ color: "var(--muted)" }}>
          Already have an account?{" "}
          <Link href="/login" className="gradient-text font-medium">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
