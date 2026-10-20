import { Suspense } from "react";
import { RequireAuth } from "@/presentation/components/auth/require-auth";
import { SubjectsView } from "@/presentation/features/courses/subjects-view";
import { PageLoader } from "@/presentation/components/ui/page-loader";

export default function CoursesPage() {
  return (
    <RequireAuth>
      <div className="animate-fade-in-up">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <p
              className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium uppercase tracking-[0.2em]"
              style={{
                color: "var(--accent)",
                background: "var(--accent-glow)",
                border: "1px solid rgba(99, 102, 241, 0.2)",
              }}
            >
              Matières & Programmes
            </p>
            <h1 className="mt-3 font-serif text-3xl md:text-4xl" style={{ color: "var(--ink)" }}>
              Vos matières d&apos;apprentissage <span className="gradient-text">KARINI</span>
            </h1>
            <p className="mt-1 text-sm" style={{ color: "var(--muted)" }}>
              Sélectionnez une matière ci-dessous pour accéder aux cours vidéo, séries d&apos;exercices, magazines et archives en direct.
            </p>
          </div>
        </div>

        <div className="mt-8">
          <Suspense fallback={<PageLoader label="Chargement des matières…" />}>
            <SubjectsView />
          </Suspense>
        </div>
      </div>
    </RequireAuth>
  );
}
