"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { Button } from "@/presentation/components/ui/button";
import { authRepository } from "@/infrastructure/repositories/auth-repository";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    setError("");

    try {
      const response = await authRepository.forgotPassword(email);
      setMessage(response.message);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to send the reset email.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-md animate-fade-in-up">
      <div className="glass-card p-8">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl" style={{ background: "var(--accent-glow)", border: "1px solid rgba(99,102,241,0.2)" }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 7.5A2.5 2.5 0 0 1 6.5 5h11A2.5 2.5 0 0 1 20 7.5v9a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 4 16.5z" />
            <path d="m5 7 7 5 7-5" />
          </svg>
        </div>
        <h1 className="mt-5 text-center font-serif text-3xl" style={{ color: "var(--ink)" }}>Forgot password?</h1>
        <p className="mt-2 text-center text-sm" style={{ color: "var(--muted)" }}>
          Enter your email and we&apos;ll send you a reset link.
        </p>

        <form className="mt-8 space-y-5" onSubmit={onSubmit}>
          <label className="block text-sm" style={{ color: "var(--ink-soft)" }}>
            Email
            <input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} className="input-field mt-1.5" placeholder="you@example.com" />
          </label>
          {message ? <p className="alert-success" role="status">{message}</p> : null}
          {error ? <p className="alert-error" role="alert">{error}</p> : null}
          <Button type="submit" disabled={busy} className="w-full">{busy ? "Sending…" : "Send reset link"}</Button>
        </form>

        <p className="mt-6 text-center text-sm" style={{ color: "var(--muted)" }}>
          Remember your password?{" "}
          <Link href="/login" className="gradient-text font-medium">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
