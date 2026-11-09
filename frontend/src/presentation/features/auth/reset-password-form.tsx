"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useEffect, useState } from "react";
import { Button } from "@/presentation/components/ui/button";
import { authRepository } from "@/infrastructure/repositories/auth-repository";

function ResetPasswordContent() {
  const params = useSearchParams();
  const userId = Number(params.get("userId"));
  const token = params.get("token") ?? "";
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!Number.isInteger(userId) || userId <= 0 || !token) {
      setError("This reset link is invalid or incomplete.");
    }
  }, [token, userId]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setError("");
    if (password !== confirmation) {
      setError("Passwords do not match.");
      return;
    }
    if (password.length < 6) {
      setError("Your password must contain at least 6 characters.");
      return;
    }

    setBusy(true);
    try {
      const response = await authRepository.resetPassword(userId, token, password);
      setMessage(response.message);
      setPassword("");
      setConfirmation("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to reset your password.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-md animate-fade-in-up">
      <div className="glass-card p-8">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl" style={{ background: "var(--accent-glow)", border: "1px solid rgba(99,102,241,0.2)" }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="4" y="10" width="16" height="10" rx="2" />
            <path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v2" />
          </svg>
        </div>
        <h1 className="mt-5 text-center font-serif text-3xl" style={{ color: "var(--ink)" }}>Reset your password</h1>
        <p className="mt-2 text-center text-sm" style={{ color: "var(--muted)" }}>Choose a new password for your Karini account.</p>

        <form className="mt-8 space-y-5" onSubmit={onSubmit}>
          <label className="block text-sm" style={{ color: "var(--ink-soft)" }}>
            New password
            <input required minLength={6} type="password" value={password} onChange={(event) => setPassword(event.target.value)} className="input-field mt-1.5" placeholder="At least 6 characters" />
          </label>
          <label className="block text-sm" style={{ color: "var(--ink-soft)" }}>
            Confirm password
            <input required minLength={6} type="password" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} className="input-field mt-1.5" placeholder="Repeat your password" />
          </label>
          {message ? <p className="alert-success" role="status">{message}</p> : null}
          {error ? <p className="alert-error" role="alert">{error}</p> : null}
          <Button type="submit" disabled={busy || Boolean(error && !password)} className="w-full">{busy ? "Saving…" : "Reset password"}</Button>
        </form>

        <p className="mt-6 text-center text-sm" style={{ color: "var(--muted)" }}>
          <Link href="/login" className="gradient-text font-medium">Back to sign in</Link>
        </p>
      </div>
    </div>
  );
}

export function ResetPasswordForm() {
  return <Suspense fallback={<div className="mx-auto max-w-md glass-card p-8 text-center">Loading reset link…</div>}><ResetPasswordContent /></Suspense>;
}
