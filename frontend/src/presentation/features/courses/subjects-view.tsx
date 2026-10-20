"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useAuth } from "@/presentation/providers/auth-provider";
import { coursesService } from "@/application/services/courses-service";
import { subjectsService } from "@/application/services/subjects-service";
import type { Course } from "@/domain/entities/course";
import type { Subject } from "@/domain/entities/subject";
import { SUBJECTS } from "@/shared/labels/course-subjects";
import { SubjectIcon } from "@/presentation/features/courses/subject-icons";
import { PageLoader } from "@/presentation/components/ui/page-loader";

export function SubjectsView() {
  const { token } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [dbSubjects, setDbSubjects] = useState<Subject[]>([]);
  const [filieres, setFilieres] = useState<string[]>([]);
  const [selectedFiliere, setSelectedFiliere] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    Promise.all([
      coursesService.list(token).catch(() => []),
      subjectsService.list(token).catch(() => []),
      subjectsService.getFilieres(token).catch(() => []),
    ])
      .then(([coursesData, subjectsData, filieresData]) => {
        setCourses(coursesData);
        setDbSubjects(subjectsData);
        setFilieres(filieresData);
      })
      .finally(() => setLoading(false));
  }, [token]);

  // Merge dynamic DB subjects or fallback to static ones if DB empty
  const allSubjects = useMemo(() => {
    if (dbSubjects.length > 0) {
      return dbSubjects.map((s) => ({
        id: s.slug || String(s.id),
        name: s.name,
        shortCode: s.code,
        filiere: s.filiere,
        category: s.category || "Sciences",
        description: s.description || "",
        accentColor: s.color || "#4f46e5",
        lightBg: `${s.color || "#4f46e5"}15`,
        icon: s.icon || s.code.toLowerCase(),
        topics: s.topics ? s.topics.split(",").map((t) => t.trim()) : [],
      }));
    }
    // Fallback static
    return SUBJECTS.map((s) => ({
      id: s.id,
      name: s.name,
      shortCode: s.shortCode,
      filiere: "Générale",
      category: s.category,
      description: s.description,
      accentColor: s.accentColor,
      lightBg: s.lightBg,
      icon: s.id,
      topics: s.topics,
    }));
  }, [dbSubjects]);

  const filteredSubjects = useMemo(() => {
    return allSubjects.filter((subject) => {
      const matchesFiliere =
        selectedFiliere === "all" || subject.filiere === selectedFiliere;

      const matchesSearch =
        !searchQuery ||
        subject.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        subject.shortCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
        subject.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        subject.filiere.toLowerCase().includes(searchQuery.toLowerCase());

      return matchesFiliere && matchesSearch;
    });
  }, [allSubjects, selectedFiliere, searchQuery]);

  const getSubjectCourseCount = (subjectId: string, shortCode: string) => {
    return courses.filter((c) => {
      const s = (c.subject || "math").toLowerCase();
      return (
        s === subjectId.toLowerCase() ||
        s === shortCode.toLowerCase() ||
        (c.title && c.title.toLowerCase().includes(shortCode.toLowerCase()))
      );
    }).length;
  };

  if (loading) {
    return <PageLoader label="Chargement des matières et programmes…" />;
  }

  return (
    <div className="space-y-8 animate-fade-in-up">
      {/* Search & Filière Selector Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <svg
            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
            width="18"
            height="18"
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
            placeholder="Rechercher une matière (ex: Algo, Math, Physique, 2ème Info...)"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-2xl border bg-white/70 pl-10 pr-4 py-2.5 text-sm outline-none transition-all focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-500/20"
            style={{
              borderColor: "var(--line)",
              color: "var(--ink)",
            }}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600"
            >
              Effacer
            </button>
          )}
        </div>

        {/* Filière Filter Selector */}
        <div className="flex items-center gap-2">
          <label className="text-xs font-semibold whitespace-nowrap" style={{ color: "var(--muted)" }}>
            Filière / Niveau :
          </label>
          <select
            value={selectedFiliere}
            onChange={(e) => setSelectedFiliere(e.target.value)}
            className="rounded-2xl border bg-white/90 px-3.5 py-2 text-xs font-semibold outline-none transition-all focus:border-indigo-500 shadow-sm cursor-pointer"
            style={{ borderColor: "var(--line)", color: "var(--ink)" }}
          >
            <option value="all">Toutes les filières ({allSubjects.length} matières)</option>
            {filieres.map((f) => {
              const count = allSubjects.filter((s) => s.filiere === f).length;
              return (
                <option key={f} value={f}>
                  {f} {count > 0 ? `(${count})` : ""}
                </option>
              );
            })}
          </select>
        </div>
      </div>

      {/* Grid of SQUARE FORMAT Subjects */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {filteredSubjects.map((subject, idx) => {
          const count = getSubjectCourseCount(subject.id, subject.shortCode);
          return (
            <Link
              key={subject.id}
              href={`/courses/${subject.id}`}
              className={`group relative flex flex-col justify-between aspect-square rounded-3xl p-6 transition-all duration-300 hover:-translate-y-1.5 hover:shadow-xl cursor-pointer animate-fade-in-up stagger-${Math.min(
                idx + 1,
                6
              )}`}
              style={{
                background: "var(--paper-card)",
                border: "1px solid var(--line)",
                boxShadow: "0 4px 20px -2px rgba(15, 23, 42, 0.05)",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = `${subject.accentColor}55`;
                e.currentTarget.style.boxShadow = `0 16px 32px -8px ${subject.accentColor}25`;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "var(--line)";
                e.currentTarget.style.boxShadow = "0 4px 20px -2px rgba(15, 23, 42, 0.05)";
              }}
            >
              {/* Subtle decorative background gradient */}
              <div
                className="pointer-events-none absolute inset-0 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                style={{
                  background: `radial-gradient(circle at top right, ${subject.accentColor}12, transparent 70%)`,
                }}
              />

              {/* Top Row: Icon container + ShortCode Pill */}
              <div className="relative z-10 flex items-start justify-between">
                <div
                  className="flex h-14 w-14 items-center justify-center rounded-2xl transition-transform duration-300 group-hover:scale-110"
                  style={{
                    backgroundColor: subject.lightBg,
                    border: `1px solid ${subject.accentColor}25`,
                  }}
                >
                  <SubjectIcon subjectId={subject.icon} size={28} color={subject.accentColor} />
                </div>

                <div className="flex flex-col items-end gap-1">
                  <span
                    className="rounded-full px-2.5 py-0.5 text-[11px] font-bold tracking-wider uppercase font-mono"
                    style={{
                      backgroundColor: subject.lightBg,
                      color: subject.accentColor,
                      border: `1px solid ${subject.accentColor}30`,
                    }}
                  >
                    {subject.shortCode}
                  </span>

                  <span className="text-[10px] font-semibold text-slate-500 truncate max-w-[110px]">
                    {subject.filiere}
                  </span>
                </div>
              </div>

              {/* Middle: Subject Name & Short description */}
              <div className="relative z-10 my-auto pt-2">
                <h3
                  className="font-serif text-xl font-bold tracking-tight transition-colors group-hover:text-indigo-600 line-clamp-1"
                  style={{ color: "var(--ink)" }}
                >
                  {subject.name}
                </h3>
                <p
                  className="mt-1.5 text-xs line-clamp-2 leading-relaxed"
                  style={{ color: "var(--muted)" }}
                >
                  {subject.description || "Contenus et ressources pour cette matière."}
                </p>
              </div>

              {/* Bottom: Course count & Open Arrow */}
              <div className="relative z-10 pt-3 border-t flex items-center justify-between" style={{ borderColor: "var(--line)" }}>
                <span
                  className="text-xs font-semibold flex items-center gap-1.5 transition-colors"
                  style={{ color: subject.accentColor }}
                >
                  {count > 0 ? `${count} ${count === 1 ? "contenu" : "contenus"}` : "Explorer"}
                </span>

                <div
                  className="flex h-7 w-7 items-center justify-center rounded-full transition-all duration-300 group-hover:translate-x-1"
                  style={{
                    backgroundColor: subject.lightBg,
                    color: subject.accentColor,
                  }}
                >
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <line x1="5" y1="12" x2="19" y2="12" />
                    <polyline points="12 5 19 12 12 19" />
                  </svg>
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      {filteredSubjects.length === 0 && (
        <div
          className="glass-card px-8 py-14 text-center rounded-3xl"
          style={{ borderStyle: "dashed" }}
        >
          <p className="font-serif text-lg" style={{ color: "var(--ink)" }}>
            Aucune matière trouvée pour cette filière ou ce mot-clé &quot;{searchQuery}&quot;
          </p>
          <p className="mt-1 text-sm" style={{ color: "var(--muted)" }}>
            Sélectionnez &quot;Toutes les filières&quot; ou essayez une autre recherche.
          </p>
        </div>
      )}
    </div>
  );
}
