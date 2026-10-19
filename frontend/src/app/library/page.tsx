import { RequireAuth } from "@/presentation/components/auth/require-auth";
import { LibraryView } from "@/presentation/features/courses/library-view";

export default function LibraryPage() {
  return (
    <RequireAuth>
      <div className="animate-fade-in-up">
        <p
          className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs uppercase tracking-[0.2em]"
          style={{
            color: "var(--accent)",
            background: "var(--accent-glow)",
            border: "1px solid rgba(99, 102, 241, 0.2)",
          }}
        >
          Library
        </p>
        <h1 className="mt-4 font-serif text-3xl md:text-4xl" style={{ color: "var(--ink)" }}>
          Your learning <span className="gradient-text">content</span>
        </h1>
        <p className="mt-2 max-w-2xl text-sm" style={{ color: "var(--muted)" }}>
          Courses, exercises, magazines, and live archives from the Karini platform.
        </p>
        <div className="mt-8">
          <LibraryView />
        </div>
      </div>
    </RequireAuth>
  );
}
