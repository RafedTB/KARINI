import { Suspense } from "react";
import { RequireAuth } from "@/presentation/components/auth/require-auth";
import { SubjectsView } from "@/presentation/features/courses/subjects-view";
import { PageLoader } from "@/presentation/components/ui/page-loader";

export default function CoursesPage() {
  return (
    <RequireAuth>
      <div className="animate-fade-in-up space-y-8">
        {/* Top Academic Header Banner */}
        <div
          className="relative overflow-hidden rounded-3xl p-6 sm:p-8 border shadow-sm"
          style={{
            background: "linear-gradient(135deg, rgba(99, 102, 241, 0.08) 0%, rgba(6, 182, 212, 0.05) 50%, rgba(236, 72, 153, 0.04) 100%), var(--paper-card)",
            borderColor: "rgba(99, 102, 241, 0.18)",
          }}
        >
          {/* Subtle decorative glow */}
          <div
            className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full opacity-30 blur-3xl"
            style={{ background: "radial-gradient(circle, #6366f1, #06b6d4)" }}
          />

          <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div className="max-w-2xl">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider font-mono shadow-sm"
                  style={{
                    color: "var(--accent)",
                    background: "var(--accent-glow)",
                    border: "1px solid rgba(99, 102, 241, 0.25)",
                  }}
                >
                  <span className="flex h-2 w-2 rounded-full bg-indigo-500 animate-pulse" />
                  Programme Pédagogique Officiel
                </span>
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                  Année Scolaire 2024 - 2025
                </span>
              </div>

              <h1 className="mt-3 font-serif text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight" style={{ color: "var(--ink)" }}>
                Cours &amp; <span className="gradient-text">Programmes</span>
              </h1>
              <p className="mt-2 text-sm sm:text-base leading-relaxed" style={{ color: "var(--muted)" }}>
                Explorez vos matières académiques, accédez aux cours vidéo en haute définition, séries d&apos;exercices corrigées, magazines et archives de cours en direct.
              </p>
            </div>
          </div>
        </div>

        {/* Subjects & Curriculum Catalog Component */}
        <div>
          <Suspense fallback={<PageLoader label="Chargement des matières et programmes…" />}>
            <SubjectsView />
          </Suspense>
        </div>
      </div>
    </RequireAuth>
  );
}
