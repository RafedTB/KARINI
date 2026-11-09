"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useEffect, useState } from "react";
import { Button } from "@/presentation/components/ui/button";
import { authRepository } from "@/infrastructure/repositories/auth-repository";

function ResetPasswordContent() {
  const params = useSearchParams();
  const rawId = params.get("userId") ?? params.get("id");
  const userId = rawId ? Number(rawId) : 0;
  const token = params.get("token") ?? params.get("resetPasswordToken") ?? "";

  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [validating, setValidating] = useState(false);
  const [busy, setBusy] = useState(false);

  const isFormatInvalid = !Number.isInteger(userId) || userId <= 0 || !token;

  useEffect(() => {
    if (isFormatInvalid) {
      setError("This reset link is invalid or incomplete. Please request a new password reset.");
      return;
    }

    let isMounted = true;
    setValidating(true);
    authRepository
      .validateResetToken(userId, token)
      .then(() => {
        if (isMounted) {
          setError("");
        }
      })
      .catch((err) => {
        if (isMounted) {
          setError(
            err instanceof Error
              ? err.message
              : "This reset link is invalid or has expired. Please request a new one.",
          );
        }
      })
      .finally(() => {
        if (isMounted) {
          setValidating(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [isFormatInvalid, userId, token]);

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
      setMessage(response.message || "Your password has been reset successfully.");
      setPassword("");
      setConfirmation("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to reset your password.");
    } finally {
      setBusy(false);
    }
  }

  const hasFatalError = Boolean(error && (isFormatInvalid || !password));

  return (
    <div className="mx-auto max-w-md animate-fade-in-up">
      <div className="glass-card p-8">
        <div
          className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl"
          style={{ background: "var(--accent-glow)", border: "1px solid rgba(99,102,241,0.2)" }}
        >
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="var(--accent)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect x="4" y="10" width="16" height="10" rx="2" />
            <path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v2" />
          </svg>
        </div>
        <h1 className="mt-5 text-center font-serif text-3xl" style={{ color: "var(--ink)" }}>
          Reset your password
        </h1>
        <p className="mt-2 text-center text-sm" style={{ color: "var(--muted)" }}>
          Choose a new password for your Karini account.
        </p>

        {validating ? (
          <div className="mt-8 text-center text-sm py-4" style={{ color: "var(--muted)" }}>
            Verifying reset link…
          </div>
        ) : message ? (
          <div className="mt-8 space-y-5">
            <p className="alert-success" role="status">
              {message}
            </p>
            <Link
              href="/login"
              className="btn-primary block w-full text-center py-2.5 rounded-xl text-white font-medium shadow-sm transition hover:opacity-90"
              style={{ background: "var(--accent)" }}
            >
              Sign in with new password
            </Link>
          </div>
        ) : (
          <form className="mt-8 space-y-5" onSubmit={onSubmit}>
            {error ? (
              <p className="alert-error" role="alert">
                {error}
              </p>
            ) : null}

            {!isFormatInvalid && !error ? (
              <>
                <label className="block text-sm" style={{ color: "var(--ink-soft)" }}>
                  New password
                  <input
                    required
                    minLength={6}
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    className="input-field mt-1.5"
                    placeholder="At least 6 characters"
                    disabled={busy}
                  />
                </label>
                <label className="block text-sm" style={{ color: "var(--ink-soft)" }}>
                  Confirm password
                  <input
                    required
                    minLength={6}
                    type="password"
                    value={confirmation}
                    onChange={(event) => setConfirmation(event.target.value)}
                    className="input-field mt-1.5"
                    placeholder="Repeat your password"
                    disabled={busy}
                  />
                </label>
                <Button type="submit" disabled={busy || hasFatalError} className="w-full">
                  {busy ? "Saving…" : "Reset password"}
                </Button>
              </>
            ) : (
              <div className="pt-2 text-center">
                <Link
                  href="/forgot-password"
                  className="gradient-text font-medium text-sm underline"
                >
                  Request a new reset link
                </Link>
              </div>
            )}
          </form>
        )}

        <p className="mt-6 text-center text-sm" style={{ color: "var(--muted)" }}>
          <Link href="/login" className="gradient-text font-medium">
            Back to sign in
          </Link>
        </p>
      </div>
    </div>
  );
}

export function ResetPasswordForm() {
  return <Suspense fallback={<div className="mx-auto max-w-md glass-card p-8 text-center">Loading reset link…</div>}><ResetPasswordContent /></Suspense>;
}
