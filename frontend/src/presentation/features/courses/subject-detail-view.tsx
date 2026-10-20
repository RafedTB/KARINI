"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import type { Course } from "@/domain/entities/course";
import { CourseSection } from "@/domain/enums";
import { coursesService } from "@/application/services/courses-service";
import { subjectsService } from "@/application/services/subjects-service";
import { CourseCard } from "@/presentation/features/courses/course-card";
import { PageLoader } from "@/presentation/components/ui/page-loader";
import { useAuth } from "@/presentation/providers/auth-provider";
import { getSubjectById, SUBJECTS } from "@/shared/labels/course-subjects";
import { SubjectIcon } from "@/presentation/features/courses/subject-icons";

type SubjectDetailViewProps = {
  subjectId: string;
};

const SECTION_TABS = [
  { key: "all", label: "Tous les contenus", icon: "📚" },
  { key: CourseSection.COURSE, label: "Cours Vidéo", icon: "🎬" },
  { key: CourseSection.EXERCISE, label: "Exercices", icon: "✍️" },
  { key: CourseSection.MAGAZINE, label: "Magazines PDF", icon: "📑" },
  { key: CourseSection.OLDLIVE, label: "Archives Live", icon: "🔴" },
] as const;

export function SubjectDetailView({ subjectId }: SubjectDetailViewProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeSection = searchParams.get("section") || "all";

  const { token, user } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchFilter, setSearchFilter] = useState("");

  const fallbackSubject = useMemo(() => getSubjectById(subjectId), [subjectId]);
  const [dbSubject, setDbSubject] = useState<import("@/domain/entities/subject").Subject | null>(null);

  const subject = useMemo(() => {
    if (dbSubject) {
      return {
        id: dbSubject.slug || String(dbSubject.id),
        name: dbSubject.name,
        shortCode: dbSubject.code,
        category: dbSubject.category,
        description: dbSubject.description || fallbackSubject.description,
        accentColor: dbSubject.color || fallbackSubject.accentColor,
        lightBg: `${dbSubject.color || "#4f46e5"}18`,
        gradient: `linear-gradient(135deg, ${dbSubject.color || "#4f46e5"}20 0%, transparent 100%)`,
        topics: dbSubject.topics ? dbSubject.topics.split(",").map((t) => t.trim()) : fallbackSubject.topics,
      };
    }
    return fallbackSubject;
  }, [dbSubject, fallbackSubject]);

  useEffect(() => {
    if (!token) return;
    setLoading(true);

    // Try fetching subject details from backend
    subjectsService
      .getBySlug(token, subjectId)
      .then(setDbSubject)
      .catch(() => {
        // Fallback to static info if not in db
      });

    // Fetch courses for this subject
    coursesService
      .list(token)
      .then((data) => {
        const targetId = subjectId.toLowerCase();
        const filtered = data.filter((c) => {
          const itemSubject = (c.subject || "math").toLowerCase();
          return (
            itemSubject === targetId ||
            (fallbackSubject && itemSubject === fallbackSubject.shortCode.toLowerCase()) ||
            (c.title && c.title.toLowerCase().includes(fallbackSubject?.shortCode.toLowerCase() || ""))
          );
        });
        setCourses(filtered);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Impossible de charger les cours.");
      })
      .finally(() => setLoading(false));
  }, [token, subjectId, fallbackSubject]);

  const handleTabChange = (key: string) => {
    if (key === "all") {
      router.replace(`/courses/${subject.id}`, { scroll: false });
    } else {
      router.replace(`/courses/${subject.id}?section=${key}`, { scroll: false });
    }
  };

  const sectionCounts = useMemo(() => {
    const counts: Record<string, number> = {
      all: courses.length,
      [CourseSection.COURSE]: 0,
      [CourseSection.EXERCISE]: 0,
      [CourseSection.MAGAZINE]: 0,
      [CourseSection.OLDLIVE]: 0,
    };
    for (const c of courses) {
      if (counts[c.section] !== undefined) {
        counts[c.section] += 1;
      }
    }
    return counts;
  }, [courses]);

  const displayedCourses = useMemo(() => {
    return courses.filter((c) => {
      const matchesSection = activeSection === "all" || c.section === activeSection;
      const matchesSearch =
        !searchFilter ||
        c.title.toLowerCase().includes(searchFilter.toLowerCase()) ||
        (c.description && c.description.toLowerCase().includes(searchFilter.toLowerCase()));
      return matchesSection && matchesSearch;
    });
  }, [courses, activeSection, searchFilter]);

  if (loading) {
    return <PageLoader label={`Chargement du programme de ${subject.name}…`} />;
  }

  return (
    <div className="space-y-8 animate-fade-in-up">
      {/* Top Navigation & Breadcrumb */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <Link
          href="/courses"
          className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition-all duration-200 hover:-translate-x-0.5"
          style={{
            color: "var(--ink)",
            background: "var(--paper-card)",
            border: "1px solid var(--line)",
            boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
          }}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="19" y1="12" x2="5" y2="12" />
            <polyline points="12 19 5 12 12 5" />
          </svg>
          Retour aux matières
        </Link>

        {/* Quick subject switcher pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto py-1 max-w-full">
          <span className="text-xs font-medium mr-1 hidden sm:inline" style={{ color: "var(--muted)" }}>
            Matières :
          </span>
          {SUBJECTS.slice(0, 6).map((s) => {
            const isCurrent = s.id === subject.id;
            return (
              <Link
                key={s.id}
                href={`/courses/${s.id}`}
                className="rounded-lg px-2.5 py-1 text-xs font-medium transition-all shrink-0"
                style={{
                  background: isCurrent ? s.lightBg : "transparent",
                  color: isCurrent ? s.accentColor : "var(--muted)",
                  border: isCurrent ? `1px solid ${s.accentColor}40` : "1px solid transparent",
                  fontWeight: isCurrent ? 700 : 500,
                }}
              >
                {s.shortCode}
              </Link>
            );
          })}
        </div>
      </div>

      {/* Hero Subject Header Banner */}
      <div
        className="relative overflow-hidden rounded-3xl p-6 sm:p-8"
        style={{
          background: "var(--paper-card)",
          border: `1px solid ${subject.accentColor}30`,
          boxShadow: `0 12px 30px -10px ${subject.accentColor}18`,
        }}
      >
        <div
          className="pointer-events-none absolute -right-12 -top-12 h-64 w-64 rounded-full opacity-25 blur-3xl"
          style={{ backgroundColor: subject.accentColor }}
        />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start gap-5">
            <div
              className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl shadow-sm"
              style={{
                backgroundColor: subject.lightBg,
                border: `1px solid ${subject.accentColor}35`,
              }}
            >
              <SubjectIcon subjectId={subject.id} size={40} color={subject.accentColor} />
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className="rounded-full px-2.5 py-0.5 text-xs font-bold tracking-wider font-mono uppercase"
                  style={{
                    backgroundColor: subject.lightBg,
                    color: subject.accentColor,
                    border: `1px solid ${subject.accentColor}30`,
                  }}
                >
                  {subject.shortCode}
                </span>
                <span
                  className="rounded-full px-2.5 py-0.5 text-xs font-medium"
                  style={{
                    background: "rgba(15, 23, 42, 0.05)",
                    color: "var(--muted)",
                  }}
                >
                  {subject.category}
                </span>
              </div>

              <h1 className="mt-2 font-serif text-3xl sm:text-4xl font-bold" style={{ color: "var(--ink)" }}>
                {subject.name}
              </h1>

              <p className="mt-2 max-w-2xl text-sm leading-relaxed" style={{ color: "var(--muted)" }}>
                {subject.description}
              </p>

              {/* Topics tags */}
              <div className="mt-4 flex flex-wrap items-center gap-1.5">
                {subject.topics.map((topic) => (
                  <span
                    key={topic}
                    className="rounded-md px-2 py-0.5 text-[11px] font-medium"
                    style={{
                      backgroundColor: "rgba(15, 23, 42, 0.04)",
                      color: "var(--ink)",
                      border: "1px solid var(--line)",
                    }}
                  >
                    #{topic}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Quick Counter Card */}
          <div
            className="flex flex-col rounded-2xl p-4 shrink-0 sm:min-w-[180px] text-center md:text-right"
            style={{
              backgroundColor: subject.lightBg,
              border: `1px solid ${subject.accentColor}20`,
            }}
          >
            <span className="text-xs font-medium" style={{ color: "var(--muted)" }}>
              Total Contenus
            </span>
            <span className="font-serif text-3xl font-bold mt-1" style={{ color: subject.accentColor }}>
              {courses.length}
            </span>
            <span className="text-[11px] mt-0.5" style={{ color: "var(--muted)" }}>
              Cours, Séries & Magazines
            </span>
          </div>
        </div>
      </div>

      {/* Control Bar: CourseSection Filter Tabs & Search Bar */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        {/* CourseSection Tabs */}
        <div
          className="flex flex-wrap gap-1 rounded-2xl p-1.5"
          style={{
            background: "var(--paper-card)",
            border: "1px solid var(--line)",
            boxShadow: "0 1px 3px 0 rgba(15,23,42,0.04)",
          }}
        >
          {SECTION_TABS.map((tab) => {
            const count = sectionCounts[tab.key] ?? 0;
            const isActive = activeSection === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => handleTabChange(tab.key)}
                className="flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm transition-all duration-200 cursor-pointer"
                style={{
                  color: isActive ? subject.accentColor : "var(--muted)",
                  background: isActive ? subject.lightBg : "transparent",
                  fontWeight: isActive ? 600 : 400,
                  border: isActive ? `1px solid ${subject.accentColor}30` : "1px solid transparent",
                }}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
                <span
                  className="ml-1 rounded-full px-1.5 py-0.2 text-xs"
                  style={{
                    backgroundColor: isActive ? subject.accentColor : "rgba(15,23,42,0.08)",
                    color: isActive ? "#ffffff" : "var(--muted)",
                    fontWeight: 700,
                  }}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Filter Input inside subject */}
        <div className="relative min-w-[240px] max-w-sm">
          <svg
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            placeholder="Filtrer les chapitres..."
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            className="w-full rounded-xl border bg-white/70 pl-9 pr-3 py-2 text-sm outline-none transition-all focus:border-indigo-500 focus:bg-white"
            style={{
              borderColor: "var(--line)",
              color: "var(--ink)",
            }}
          />
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="alert-error" role="alert">
          {error}
        </div>
      )}

      {/* Affichage: Grid of Course Cards */}
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {displayedCourses.map((course, i) => (
          <div key={course.id} className={`animate-fade-in-up stagger-${Math.min(i + 1, 6)}`}>
            <CourseCard course={course} token={token!} />
          </div>
        ))}
      </div>

      {/* Empty State when no courses found */}
      {displayedCourses.length === 0 && (
        <div
          className="glass-card px-8 py-16 text-center rounded-3xl"
          style={{ borderStyle: "dashed" }}
        >
          <div
            className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl"
            style={{
              background: subject.lightBg,
              border: `1px solid ${subject.accentColor}30`,
            }}
          >
            <SubjectIcon subjectId={subject.id} size={30} color={subject.accentColor} />
          </div>

          <h2 className="mt-5 font-serif text-2xl" style={{ color: "var(--ink)" }}>
            Aucun contenu disponible pour le moment
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm" style={{ color: "var(--muted)" }}>
            {activeSection !== "all"
              ? `Il n'y a pas encore de contenu dans cette section (${activeSection}) pour la matière ${subject.name}.`
              : `Les professeurs préparent actuellement les cours et exercices de ${subject.name}.`}
          </p>

          {activeSection !== "all" && (
            <button
              type="button"
              onClick={() => handleTabChange("all")}
              className="mt-5 inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold"
              style={{
                backgroundColor: subject.lightBg,
                color: subject.accentColor,
                border: `1px solid ${subject.accentColor}40`,
              }}
            >
              Voir tous les contenus de {subject.shortCode}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
