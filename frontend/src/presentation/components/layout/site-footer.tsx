export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-[var(--line)] px-6 py-8 text-sm text-[var(--muted)] md:px-10">
      <div className="mx-auto flex max-w-6xl flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <span className="font-serif text-lg text-[var(--ink)]">
          karini<span className="text-[var(--accent)]">.</span>
        </span>
        <p>E-learning for courses, exercises, magazines, and live archives.</p>
        <p>© {new Date().getFullYear()} Karini</p>
      </div>
    </footer>
  );
}
