import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="mt-auto px-6 py-10 md:px-10" style={{ borderTop: "1px solid var(--line)" }}>
      <div className="mx-auto flex max-w-6xl flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <span className="font-serif text-xl" style={{ color: "var(--ink)" }}>
            karini<span className="gradient-text">.</span>
          </span>
          <p className="mt-2 max-w-xs text-sm" style={{ color: "var(--muted)" }}>
            A modern e-learning destination featuring video courses, interactive exercises, PDF magazines, and live archives.
          </p>
        </div>
        <div className="flex flex-col items-start gap-1 text-sm sm:items-end" style={{ color: "var(--muted)" }}>
          <div className="flex gap-4">
            <Link href="/login" className="transition-colors hover:text-[var(--ink)]">
              Sign in
            </Link>
            <Link href="/register" className="transition-colors hover:text-[var(--ink)]">
              Create account
            </Link>
          </div>
          <p className="mt-1 text-xs" style={{ color: "var(--muted)", opacity: 0.6 }}>
            © {new Date().getFullYear()} Karini E-learning. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
