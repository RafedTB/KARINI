"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/presentation/providers/auth-provider";
import { displayName } from "@/shared/utils/display-name";

const navItems = [
  { href: "/", label: "Home" },
  { href: "/library", label: "Library" },
  { href: "/membership", label: "Membership" },
];

export function SiteHeader() {
  const pathname = usePathname();
  const { user, signOut } = useAuth();

  return (
    <header className="border-b border-[var(--line)] px-6 py-5 md:px-10">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-6">
        <Link href="/" className="font-serif text-2xl tracking-tight">
          karini<span className="text-[var(--accent)]">.</span>
        </Link>

        <nav className="hidden items-center gap-6 text-sm text-[var(--muted)] md:flex" aria-label="Main">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={pathname === item.href ? "text-[var(--ink)]" : "hover:text-[var(--ink)]"}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3 text-sm">
          {user ? (
            <>
              <span className="rounded-full border border-[var(--line)] px-3 py-1 text-xs">
                {user.credits} credits
              </span>
              <span className="hidden text-[var(--muted)] sm:inline">{displayName(user)}</span>
              <button
                type="button"
                onClick={signOut}
                className="rounded-full border border-[var(--line)] px-3 py-1.5 text-xs hover:border-[var(--ink)]/30"
              >
                Sign out
              </button>
            </>
          ) : (
            <>
              <Link href="/login" className="text-[var(--muted)] hover:text-[var(--ink)]">
                Sign in
              </Link>
              <Link
                href="/register"
                className="rounded-full bg-[var(--ink)] px-4 py-2 text-xs text-[var(--paper)]"
              >
                Create account
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
