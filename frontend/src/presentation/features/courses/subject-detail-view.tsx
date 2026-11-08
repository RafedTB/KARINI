"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import type { Course } from "@/domain/entities/course";
import { CourseSection, MembershipType, UserType } from "@/domain/enums";
import { coursesService } from "@/application/services/courses-service";
import { subjectsService } from "@/application/services/subjects-service";
import { CourseCard } from "@/presentation/features/courses/course-card";
import { PageLoader } from "@/presentation/components/ui/page-loader";
import { useAuth } from "@/presentation/providers/auth-provider";
import { getSubjectById, SUBJECTS } from "@/shared/labels/course-subjects";
import { SubjectIcon } from "@/presentation/features/courses/subject-icons";
import { VideoStudioView } from "@/presentation/features/courses/video-studio-view";

type SubjectDetailViewProps = {
  subjectId: string;
};

const SECTION_TABS = [
  { key: CourseSection.COURSE, label: "Cours Vidéo", icon: "🎬" },
  { key: CourseSection.EXERCISE, label: "Exercices PDF", icon: "✍️" },
  { key: CourseSection.MAGAZINE, label: "Magazines PDF", icon: "📑" },
  { key: CourseSection.OLDLIVE, label: "Direct", icon: "🔴" },
] as const;

export function SubjectDetailView({ subjectId }: SubjectDetailViewProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeSection = searchParams.get("section") || CourseSection.COURSE;

  const { token, user } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchFilter, setSearchFilter] = useState("");
  const [videoViewMode, setVideoViewMode] = useState<"studio" | "grid">("studio");

  const fallbackSubject = useMemo(() => getSubjectById(subjectId), [subjectId]);
  const [dbSubject, setDbSubject] = useState<import("@/domain/entities/subject").Subject | null>(null);
  const [allDbSubjects, setAllDbSubjects] = useState<import("@/domain/entities/subject").Subject[]>([]);

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

    // Try fetching subject details from backend dynamically
    const loadSubjectDetails = async () => {
      try {
        const sub = await subjectsService.getBySlug(token, subjectId);
        setDbSubject(sub);
        return sub;
      } catch {
        const numId = Number(subjectId);
        if (!isNaN(numId) && numId > 0) {
          try {
            const sub = await subjectsService.getById(token, numId);
            setDbSubject(sub);
            return sub;
          } catch {
            return null;
          }
        }
        return null;
      }
    };

    const filiereParam = user?.userType === UserType.STUDENT && user?.studentClass ? user.studentClass : undefined;

    Promise.all([
      loadSubjectDetails(),
      coursesService.list(token),
      subjectsService.list(token, filiereParam).catch(() => []),
    ])
      .then(([loadedSub, coursesData, subjectsList]) => {
        if (subjectsList && subjectsList.length > 0) {
          setAllDbSubjects(subjectsList);
        }
        const targetSlug = subjectId.toLowerCase();
        const subCode = loadedSub?.code?.toLowerCase();
        const subSlug = loadedSub?.slug?.toLowerCase();
        const subIdStr = loadedSub ? String(loadedSub.id) : null;
        const fallbackCode = fallbackSubject?.shortCode?.toLowerCase();

        const filtered = coursesData.filter((c) => {
          const itemSubject = (c.subject || "").toLowerCase();
          return (
            itemSubject === targetSlug ||
            (subSlug && itemSubject === subSlug) ||
            (subCode && itemSubject === subCode) ||
            (subIdStr && itemSubject === subIdStr) ||
            (fallbackCode && itemSubject === fallbackCode) ||
            (c.title && subCode && c.title.toLowerCase().includes(subCode))
          );
        });
        setCourses(filtered);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Impossible de charger les cours.");
      })
      .finally(() => setLoading(false));
  }, [token, subjectId, fallbackSubject]);

  const switcherSubjects = useMemo(() => {
    if (allDbSubjects.length > 0) {
      return allDbSubjects.map((s) => ({
        id: s.slug || String(s.id),
        name: s.name,
        shortCode: s.code,
        accentColor: s.color || "#4f46e5",
        lightBg: `${s.color || "#4f46e5"}18`,
      }));
    }
    return SUBJECTS.slice(0, 8);
  }, [allDbSubjects]);

  const handleTabChange = (key: string) => {
    router.replace(`/courses/${subject.id}?section=${key}`, { scroll: false });
  };

  const sectionCounts = useMemo(() => {
    const counts: Record<string, number> = {
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
      const matchesSection = c.section === activeSection;
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
        <div className="flex items-center gap-1.5 overflow-x-auto py-1 max-w-full scrollbar-none">
          <span className="text-xs font-semibold mr-1 hidden sm:inline" style={{ color: "var(--muted)" }}>
            Matières :
          </span>
          {switcherSubjects.map((s) => {
            const isCurrent = s.id === subject.id || s.shortCode.toLowerCase() === subject.shortCode.toLowerCase();
            return (
              <Link
                key={s.id}
                href={`/courses/${s.id}`}
                className="rounded-xl px-3 py-1.5 text-xs font-semibold transition-all shrink-0 flex items-center gap-1.5"
                style={{
                  background: isCurrent ? s.lightBg : "var(--paper-card)",
                  color: isCurrent ? s.accentColor : "var(--muted)",
                  border: isCurrent ? `1px solid ${s.accentColor}40` : "1px solid var(--line)",
                  fontWeight: isCurrent ? 700 : 500,
                  boxShadow: isCurrent ? `0 2px 8px -2px ${s.accentColor}30` : "none",
                }}
              >
                <span>{s.shortCode}</span>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Hero Subject Header Banner */}
      <div
        className="relative overflow-hidden rounded-3xl p-6 sm:p-8 border shadow-sm"
        style={{
          background: `linear-gradient(135deg, ${subject.lightBg} 0%, rgba(255,255,255,0.95) 100%), var(--paper-card)`,
          borderColor: `${subject.accentColor}35`,
          boxShadow: `0 12px 30px -10px ${subject.accentColor}20`,
        }}
      >
        <div
          className="pointer-events-none absolute -right-12 -top-12 h-64 w-64 rounded-full opacity-25 blur-3xl"
          style={{ backgroundColor: subject.accentColor }}
        />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
            <div
              className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl shadow-md transition-transform hover:scale-105"
              style={{
                backgroundColor: subject.lightBg,
                border: `1px solid ${subject.accentColor}40`,
                boxShadow: `0 8px 24px -4px ${subject.accentColor}35`,
              }}
            >
              <SubjectIcon subjectId={subject.id} size={40} color={subject.accentColor} />
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className="rounded-full px-3 py-0.5 text-xs font-bold tracking-wider font-mono uppercase shadow-xs"
                  style={{
                    backgroundColor: subject.lightBg,
                    color: subject.accentColor,
                    border: `1px solid ${subject.accentColor}35`,
                  }}
                >
                  {subject.shortCode}
                </span>
                <span
                  className="rounded-full px-3 py-0.5 text-xs font-semibold"
                  style={{
                    background: "rgba(15, 23, 42, 0.06)",
                    color: "var(--ink)",
                  }}
                >
                  {subject.category}
                </span>
                <span className="text-xs text-slate-500 font-medium hidden sm:inline">
                  • Programme Officiel
                </span>
              </div>

              <h1 className="mt-2 font-serif text-3xl sm:text-4xl font-bold tracking-tight" style={{ color: "var(--ink)" }}>
                {subject.name}
              </h1>

              <p className="mt-2 max-w-2xl text-sm leading-relaxed" style={{ color: "var(--muted)" }}>
                {subject.description}
              </p>

              {/* Topics tags */}
              {subject.topics && subject.topics.length > 0 && (
                <div className="mt-4 flex flex-wrap items-center gap-1.5">
                  {subject.topics.map((topic) => (
                    <span
                      key={topic}
                      className="rounded-lg px-2.5 py-0.5 text-[11px] font-semibold bg-white/80 text-slate-700 border shadow-xs"
                      style={{
                        borderColor: "var(--line)",
                      }}
                    >
                      #{topic}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Quick Counter Card & Breakdown */}
          <div
            className="flex flex-col rounded-2xl p-5 shrink-0 lg:min-w-[220px] bg-white/85 border shadow-sm"
            style={{
              borderColor: `${subject.accentColor}30`,
            }}
          >
            <div className="flex items-center justify-between pb-2 border-b" style={{ borderColor: "var(--line)" }}>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Total Contenus
              </span>
              <span className="font-serif text-3xl font-bold" style={{ color: subject.accentColor }}>
                {courses.length}
              </span>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
              <div className="flex items-center gap-1.5 text-slate-600">
                <span>🎬</span>
                <span className="font-bold">{sectionCounts[CourseSection.COURSE] ?? 0}</span>
                <span className="text-[10px] text-slate-400">vidéos</span>
              </div>
              <div className="flex items-center gap-1.5 text-slate-600">
                <span>✍️</span>
                <span className="font-bold">{sectionCounts[CourseSection.EXERCISE] ?? 0}</span>
                <span className="text-[10px] text-slate-400">séries</span>
              </div>
              <div className="flex items-center gap-1.5 text-slate-600">
                <span>📑</span>
                <span className="font-bold">{sectionCounts[CourseSection.MAGAZINE] ?? 0}</span>
                <span className="text-[10px] text-slate-400">revues</span>
              </div>
              <div className="flex items-center gap-1.5 text-slate-600">
                <span>🔴</span>
                <span className="font-bold">{sectionCounts[CourseSection.OLDLIVE] ?? 0}</span>
                <span className="text-[10px] text-slate-400">directs</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Control Bar: CourseSection Filter Tabs & Search Bar */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        {/* CourseSection Tabs */}
        <div
          className="flex flex-wrap gap-1 rounded-2xl p-1.5 border shadow-sm"
          style={{
            background: "var(--paper-card)",
            borderColor: "var(--line)",
          }}
        >
          {SECTION_TABS.map((tab) => {
            const isGoldOnlyTab = tab.key === CourseSection.OLDLIVE;
            const isStudentNonGold = user?.userType === UserType.STUDENT && user?.membership !== MembershipType.GOLD;
            const count = sectionCounts[tab.key] ?? 0;
            const isActive = activeSection === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => handleTabChange(tab.key)}
                className="flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs sm:text-sm transition-all duration-200 cursor-pointer"
                style={{
                  color: isActive ? subject.accentColor : "var(--muted)",
                  background: isActive ? subject.lightBg : "transparent",
                  fontWeight: isActive ? 700 : 500,
                  border: isActive ? `1px solid ${subject.accentColor}30` : "1px solid transparent",
                }}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
                {isGoldOnlyTab && isStudentNonGold ? (
                  <span className="badge text-[9px] px-1.5 py-0.2 bg-amber-100 text-amber-800 border-amber-200">
                    ⭐ Gold
                  </span>
                ) : (
                  <span
                    className="ml-1 rounded-full px-1.5 py-0.2 text-[11px]"
                    style={{
                      backgroundColor: isActive ? subject.accentColor : "rgba(15,23,42,0.08)",
                      color: isActive ? "#ffffff" : "var(--muted)",
                      fontWeight: 700,
                    }}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Right side controls: Video studio toggle & Search bar */}
        <div className="flex flex-wrap items-center gap-2.5">
          {activeSection === CourseSection.COURSE && (
            <div
              className="flex items-center rounded-2xl p-1 border shadow-xs"
              style={{
                background: "var(--paper-card)",
                borderColor: "var(--line)",
              }}
            >
              <button
                type="button"
                onClick={() => setVideoViewMode("studio")}
                className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
                  videoViewMode === "studio"
                    ? "bg-indigo-600 text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <span>🎬</span>
                <span>Lecteur Vidéo</span>
              </button>
              <button
                type="button"
                onClick={() => setVideoViewMode("grid")}
                className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
                  videoViewMode === "grid"
                    ? "bg-indigo-600 text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <span>⊞</span>
                <span>Grille</span>
              </button>
            </div>
          )}

          {/* Filter Input inside subject */}
          <div className="relative min-w-[220px] max-w-sm">
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
              className="w-full rounded-2xl border bg-white/80 pl-9 pr-9 py-2 text-xs sm:text-sm outline-none transition-all focus:border-indigo-500 focus:bg-white shadow-sm"
              style={{
                borderColor: "var(--line)",
                color: "var(--ink)",
              }}
            />
            {searchFilter && (
              <button
                type="button"
                onClick={() => setSearchFilter("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 hover:text-slate-600 bg-slate-100 rounded-full h-5 w-5 flex items-center justify-center"
              >
                ✕
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="alert-error" role="alert">
          {error}
        </div>
      )}

      {/* Gold Gate Banner for Archive Live */}
      {activeSection === CourseSection.OLDLIVE && user?.userType === UserType.STUDENT && user?.membership !== MembershipType.GOLD ? (
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
      ) : activeSection === CourseSection.COURSE && videoViewMode === "studio" ? (
        /* INTERACTIVE VIDEO STUDIO: Left playlist (Vid 1, 2, 3...) & Right video display */
        <VideoStudioView
          courses={displayedCourses}
          token={token!}
          subjectName={subject.name}
          accentColor={subject.accentColor}
        />
      ) : (
        <>
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
                Aucun contenu disponible dans cette section
              </h2>
              <p className="mx-auto mt-2 max-w-md text-sm" style={{ color: "var(--muted)" }}>
                Les professeurs préparent et publieront prochainement les contenus pour cette section de {subject.name}.
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
