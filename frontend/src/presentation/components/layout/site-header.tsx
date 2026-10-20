"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/presentation/providers/auth-provider";
import { displayName } from "@/shared/utils/display-name";

const navItems = [
  { href: "/", label: "Home" },
  { href: "/courses", label: "Courses" },
  { href: "/membership", label: "Membership" },
];

export function SiteHeader() {
  const pathname = usePathname();
  const { user, signOut } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header
      className="sticky top-0 z-50 px-6 py-4 md:px-10"
      style={{
        background: "var(--glass-header)",
        backdropFilter: "blur(20px) saturate(1.4)",
        WebkitBackdropFilter: "blur(20px) saturate(1.4)",
        borderBottom: "1px solid var(--line)",
      }}
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-6">
        {/* Logo */}
        <Link href="/" className="font-serif text-2xl tracking-tight" style={{ color: "var(--ink)" }}>
          karini<span className="gradient-text">.</span>
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden items-center gap-1 md:flex" aria-label="Main">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className="relative rounded-xl px-4 py-2 text-sm transition-colors duration-200"
                style={{
                  color: isActive ? "var(--ink)" : "var(--muted)",
                  background: isActive ? "var(--accent-glow)" : "transparent",
                }}
              >
                {item.label}
                {isActive && (
                  <span
                    className="absolute bottom-0 left-1/2 h-0.5 w-4 -translate-x-1/2 rounded-full"
                    style={{ background: "var(--accent)" }}
                  />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Right side */}
        <div className="flex items-center gap-3 text-sm">
          {user ? (
            <>
              <span className="badge badge-accent hidden sm:inline-flex">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 6v6l4 2" />
                </svg>
                {user.credits} credits
              </span>
              <span className="hidden text-sm lg:inline" style={{ color: "var(--muted)" }}>
                {displayName(user)}
              </span>
              <button
                type="button"
                onClick={signOut}
                className="btn-ghost rounded-xl px-3 py-1.5 text-xs"
                style={{ color: "var(--muted)" }}
              >
                Sign out
              </button>
            </>
          ) : (
            <>
              <Link href="/login" className="hidden text-sm sm:inline" style={{ color: "var(--muted)" }}>
                Sign in
              </Link>
              <Link
                href="/register"
                className="btn-primary rounded-xl px-4 py-2 text-xs"
              >
                Create account
              </Link>
            </>
          )}

          {/* Mobile menu button */}
          <button
            type="button"
            className="md:hidden"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle menu"
            style={{ color: "var(--ink)" }}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              {mobileOpen ? (
                <path d="M18 6L6 18M6 6l12 12" />
              ) : (
                <path d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile Nav */}
      {mobileOpen && (
        <nav
          className="mt-4 flex flex-col gap-1 rounded-2xl p-3 md:hidden animate-fade-in"
          style={{
            background: "var(--paper-card)",
            border: "1px solid var(--line)",
            boxShadow: "var(--card-shadow)",
          }}
        >
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className="rounded-xl px-4 py-3 text-sm transition-colors"
                style={{
                  color: isActive ? "var(--ink)" : "var(--muted)",
                  background: isActive ? "var(--accent-glow)" : "transparent",
                }}
              >
                {item.label}
              </Link>
            );
          })}
          {!user && (
            <Link
              href="/login"
              onClick={() => setMobileOpen(false)}
              className="rounded-xl px-4 py-3 text-sm sm:hidden"
              style={{ color: "var(--muted)" }}
            >
              Sign in
            </Link>
          )}
        </nav>
      )}
    </header>
  );
}
