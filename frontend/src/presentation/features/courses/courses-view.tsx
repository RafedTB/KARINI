"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { Course } from "@/domain/entities/course";
import { CourseSection } from "@/domain/enums";
import { coursesService } from "@/application/services/courses-service";
import { CourseCard } from "@/presentation/features/courses/course-card";
import { PageLoader } from "@/presentation/components/ui/page-loader";
import { useAuth } from "@/presentation/providers/auth-provider";

const TABS = [
  { key: "all", label: "All" },
  { key: CourseSection.COURSE, label: "Courses" },
  { key: CourseSection.EXERCISE, label: "Exercises" },
  { key: CourseSection.MAGAZINE, label: "Magazines" },
  { key: CourseSection.OLDLIVE, label: "Live archive" },
] as const;

export function CoursesView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeTab = searchParams.get("section") || "all";

  const { token } = useAuth();
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
      {/* Filter tabs */}
      <div
        className="mb-8 flex flex-wrap gap-1 rounded-2xl p-1.5"
        style={{ background: "var(--paper-card)", border: "1px solid var(--line)", boxShadow: "0 1px 3px 0 rgba(15,23,42,0.04)" }}
      >
        {TABS.map((tab) => {
          const count = tab.key === "all"
            ? courses.length
            : courses.filter((c) => c.section === tab.key).length;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => handleTabChange(tab.key)}
              className="rounded-xl px-4 py-2 text-sm transition-all duration-200 cursor-pointer"
              style={{
                color: isActive ? "var(--accent)" : "var(--muted)",
                background: isActive ? "var(--accent-glow)" : "transparent",
                fontWeight: isActive ? 600 : 400,
              }}
            >
              {tab.label}
              <span
                className="ml-1.5 text-xs"
                style={{ opacity: 0.6 }}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

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
    </div>
  );
}
