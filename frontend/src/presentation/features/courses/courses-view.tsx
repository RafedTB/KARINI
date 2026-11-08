"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import type { Course } from "@/domain/entities/course";
import { CourseSection, MembershipType, UserType } from "@/domain/enums";
import { coursesService } from "@/application/services/courses-service";
import { CourseCard } from "@/presentation/features/courses/course-card";
import { PageLoader } from "@/presentation/components/ui/page-loader";
import { useAuth } from "@/presentation/providers/auth-provider";

const TABS = [
  { key: "all", label: "Tout" },
  { key: CourseSection.COURSE, label: "Cours Vidéo" },
  { key: CourseSection.EXERCISE, label: "Exercices PDF" },
  { key: CourseSection.MAGAZINE, label: "Magazines PDF" },
  { key: CourseSection.OLDLIVE, label: "Direct" },
] as const;

export function CoursesView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeTab = searchParams.get("section") || "all";

  const { token, user } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const handleTabChange = (key: string) => {
    if (key === "all") {
      router.replace("/courses", { scroll: false });
    } else {
      router.replace(`/courses?section=${key}`, { scroll: false });
    }
  };

  useEffect(() => {
    if (!token) return;
    coursesService
      .list(token)
      .then(setCourses)
      .catch((err) => setError(err instanceof Error ? err.message : "Could not load courses."))
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) return <PageLoader label="Loading your courses…" />;

  if (error) {
    return (
      <p className="alert-error" role="alert">{error}</p>
    );
  }

  if (courses.length === 0) {
    return (
      <div
        className="glass-card px-8 py-16 text-center"
        style={{ borderStyle: "dashed" }}
      >
        <div
          className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl"
          style={{ background: "var(--accent-glow)", border: "1px solid rgba(99,102,241,0.2)" }}
        >
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.5">
            <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
            <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
          </svg>
        </div>
        <h2 className="mt-5 font-serif text-2xl" style={{ color: "var(--ink)" }}>
          Your courses are being prepared
        </h2>
        <p className="mx-auto mt-2 max-w-md text-sm" style={{ color: "var(--muted)" }}>
          Instructors and admins can publish courses, exercises, magazines, and live archives here.
        </p>
      </div>
    );
  }

  const filtered = activeTab === "all"
    ? courses
    : courses.filter((c) => c.section === activeTab);

  return (
    <div>
      {/* Student Class Info Banner */}
      {user?.studentClass && (
        <div
          className="mb-6 flex items-center justify-between rounded-2xl px-5 py-3 border"
          style={{
            background: "linear-gradient(135deg, rgba(99,102,241,0.06), rgba(236,72,153,0.04))",
            borderColor: "rgba(99,102,241,0.15)",
          }}
        >
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-500/10 text-base">
              🎓
            </span>
            <div>
              <span className="text-xs font-medium text-slate-500 block">Votre programme scolaire</span>
              <span className="text-sm font-bold text-slate-900">
                Classe : <span className="text-indigo-600">{user.studentClass}</span>
              </span>
            </div>
          </div>
          <span className="text-xs text-indigo-700 font-semibold hidden sm:inline-block px-2.5 py-1 rounded-lg bg-indigo-50 border border-indigo-100">
            Contenus adaptés à votre classe
          </span>
        </div>
      )}

      {/* Filter tabs */}
      <div
        className="mb-8 flex flex-wrap gap-1 rounded-2xl p-1.5"
        style={{ background: "var(--paper-card)", border: "1px solid var(--line)", boxShadow: "0 1px 3px 0 rgba(15,23,42,0.04)" }}
      >
        {TABS.map((tab) => {
          const isGoldOnlyTab = tab.key === CourseSection.OLDLIVE;
          const isStudentNonGold = user?.userType === UserType.STUDENT && user?.membership !== MembershipType.GOLD;
          const count = tab.key === "all"
            ? courses.length
            : courses.filter((c) => c.section === tab.key).length;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => handleTabChange(tab.key)}
              className="rounded-xl px-4 py-2 text-sm transition-all duration-200 cursor-pointer flex items-center gap-1.5"
              style={{
                color: isActive ? "var(--accent)" : "var(--muted)",
                background: isActive ? "var(--accent-glow)" : "transparent",
                fontWeight: isActive ? 600 : 400,
              }}
            >
              <span>{tab.label}</span>
              {isGoldOnlyTab && isStudentNonGold ? (
                <span className="badge text-[9px] px-1.5 py-0.2 bg-amber-100 text-amber-800 border-amber-200">
                  ⭐ Gold
                </span>
              ) : (
                <span
                  className="text-xs"
                  style={{ opacity: 0.6 }}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Gold Gate Banner for Archive Live */}
      {activeTab === CourseSection.OLDLIVE && user?.userType === UserType.STUDENT && user?.membership !== MembershipType.GOLD ? (
        <div className="glass-card p-8 sm:p-10 rounded-3xl border border-amber-300/80 bg-gradient-to-r from-amber-50/80 via-yellow-50/50 to-orange-50/40 text-center animate-fade-in my-6">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500 text-white text-2xl shadow-sm mb-4">
            ⭐
          </div>
          <h3 className="font-serif text-xl font-bold text-slate-900">
            Archives Live : Réservées exclusivement aux membres Gold
          </h3>
          <p className="mt-2 text-xs sm:text-sm text-slate-600 max-w-lg mx-auto leading-relaxed">
            Les rediffusions et archives des sessions en direct sont une exclusivité de la formule <strong>Gold</strong>. Les élèves inscrits en formule Standard, Silver ou Platinum ne peuvent pas accéder aux replays des directs.
          </p>
          <div className="mt-6 flex justify-center">
            <Link href="/membership" className="btn-primary text-xs py-2.5 px-6 font-bold shadow-sm">
              Passer à la formule Gold ⭐
            </Link>
          </div>
        </div>
      ) : (
        <>
          {/* Grid */}
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((course, i) => (
              <div key={course.id} className={`animate-fade-in-up stagger-${Math.min(i + 1, 6)}`}>
                <CourseCard course={course} token={token!} />
              </div>
            ))}
          </div>

          {filtered.length === 0 && (
            <p className="mt-8 text-center text-sm" style={{ color: "var(--muted)" }}>
              No content in this category yet.
            </p>
          )}
        </>
      )}
    </div>
  );
}
