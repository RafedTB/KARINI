"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function PublicHeader() {
  const pathname = usePathname();
  const isLoginPage = pathname === "/login";
  const isRegisterPage = pathname === "/register";

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
        {/* Brand Logo */}
        <Link
          href="/"
          className="flex items-center gap-2 font-serif text-2xl tracking-tight transition-transform hover:scale-[1.02]"
          style={{ color: "var(--ink)" }}
        >
          <span>karini<span className="gradient-text">.</span></span>
          <span
            className="rounded-full px-2 py-0.5 text-[10px] font-sans font-medium tracking-wide uppercase"
            style={{
              color: "var(--accent)",
              background: "var(--accent-glow)",
              border: "1px solid rgba(99, 102, 241, 0.2)",
            }}
          >
            E-Learning
          </span>
        </Link>

        {/* Right side: Login & Register only */}
        <div className="flex items-center gap-3 text-sm">
          <Link
            href="/login"
            className="rounded-xl px-4 py-2 text-sm font-medium transition-all duration-200"
            style={{
              color: isLoginPage ? "var(--accent)" : "var(--muted)",
              background: isLoginPage ? "var(--accent-glow)" : "transparent",
            }}
          >
            Sign in
          </Link>
          <Link
            href="/register"
            className={`btn-primary rounded-xl px-4 py-2 text-xs font-semibold ${
              isRegisterPage ? "ring-2 ring-indigo-400" : ""
            }`}
          >
            Register
          </Link>
        </div>
      </div>
    </header>
  );
}
