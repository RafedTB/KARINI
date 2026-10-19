import { RequireAuth } from "@/presentation/components/auth/require-auth";
import { LibraryView } from "@/presentation/features/courses/library-view";

export default function LibraryPage() {
  return (
    <RequireAuth>
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">Library</p>
        <h1 className="mt-2 font-serif text-3xl">Your learning content</h1>
        <p className="mt-2 max-w-2xl text-sm text-[var(--muted)]">
          Courses, exercises, magazines, and live archives from the Karini backend.
        </p>
        <div className="mt-8">
          <LibraryView />
        </div>
      </div>
    </RequireAuth>
  );
}
