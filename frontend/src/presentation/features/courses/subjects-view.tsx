"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useAuth } from "@/presentation/providers/auth-provider";
import { coursesService } from "@/application/services/courses-service";
import { subjectsService } from "@/application/services/subjects-service";
import type { Course } from "@/domain/entities/course";
import type { Subject } from "@/domain/entities/subject";
import { UserType } from "@/domain/enums";
import { SubjectIcon } from "@/presentation/features/courses/subject-icons";
import { PageLoader } from "@/presentation/components/ui/page-loader";
import { Button } from "@/presentation/components/ui/button";

const PRESET_COLORS = [
  { label: "Indigo", value: "#4f46e5" },
  { label: "Bleu Océan", value: "#0284c7" },
  { label: "Ciel", value: "#0ea5e9" },
  { label: "Émeraude", value: "#059669" },
  { label: "Violet Royal", value: "#7c3aed" },
  { label: "Rose Magenta", value: "#e11d48" },
  { label: "Ambre Chaud", value: "#d97706" },
  { label: "Ardoise", value: "#64748b" },
];

const PRESET_ICONS = [
  { id: "informatique", label: "Informatique", emoji: "💻" },
  { id: "math", label: "Mathématiques", emoji: "📐" },
  { id: "physique", label: "Physique - Chimie", emoji: "⚡" },
  { id: "science", label: "Sciences (SVT)", emoji: "🧬" },
  { id: "francais", label: "Français", emoji: "📖" },
  { id: "anglais", label: "Anglais", emoji: "🌍" },
  { id: "arabe", label: "Arabe", emoji: "📜" },
  { id: "philosophie", label: "Philosophie", emoji: "💡" },
  { id: "economie", label: "Économie & Gestion", emoji: "📈" },
  { id: "histoire_geo", label: "Histoire - Géo", emoji: "🧭" },
];

const PRESET_CATEGORIES = [
  "Technologies",
  "Sciences Exactes",
  "Sciences Physiques",
  "Sciences Naturelles",
  "Lettres & Langues",
  "Langues Vivantes",
  "Sciences Humaines",
  "Sciences Économiques",
];

export function SubjectsView() {
  const { token, user } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [dbSubjects, setDbSubjects] = useState<Subject[]>([]);
  const [filieres, setFilieres] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const isSuperAdmin = user?.userType === UserType.SUPERADMIN;
  const isStudent = user?.userType === UserType.STUDENT;
  const isBacInfo = Boolean(
    user?.studentClass &&
      (/bac.*info/i.test(user.studentClass) ||
        user.studentClass.toLowerCase() === "bac informatique")
  );
  const studentFiliere = isBacInfo
    ? "Bac Informatique"
    : user?.studentClass?.trim() || null;

  const [selectedFiliere, setSelectedFiliere] = useState<string>(
    studentFiliere || "all"
  );

  // Modals state for Superadmin
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  const [deletingSubject, setDeletingSubject] = useState<Subject | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Form states
  const [subjectForm, setSubjectForm] = useState({
    name: "",
    code: "",
    filiere: "2ème Informatique",
    customFiliere: "",
    category: "Technologies",
    description: "",
    icon: "informatique",
    color: "#4f46e5",
    topics: "",
  });

  useEffect(() => {
    if (isStudent && studentFiliere) {
      setSelectedFiliere(studentFiliere);
    }
  }, [isStudent, studentFiliere]);

  const showNotification = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(""), 4500);
  };

  const loadData = async () => {
    if (!token) return;
    try {
      setLoading(true);
      setErrorMsg("");
      const filiereParam = isStudent && studentFiliere ? studentFiliere : undefined;

      const [coursesData, subjectsData, filieresData] = await Promise.all([
        coursesService.list(token).catch(() => []),
        subjectsService.list(token, filiereParam).catch(() => []),
        subjectsService.getFilieres(token).catch(() => []),
      ]);

      setCourses(coursesData);
      setDbSubjects(subjectsData);

      if (isStudent && studentFiliere) {
        setFilieres([studentFiliere]);
        setSelectedFiliere(studentFiliere);
      } else {
        setFilieres(filieresData);
      }
    } catch (err) {
      setErrorMsg(
        err instanceof Error
          ? err.message
          : "Erreur lors du chargement des matières."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [token, isStudent, studentFiliere]);

  // Dynamic DB subjects list
  const allSubjects = useMemo(() => {
    return dbSubjects.map((s) => ({
      dbId: s.id,
      id: s.slug || String(s.id),
      name: s.name,
      shortCode: s.code,
      filiere: s.filiere,
      category: s.category || "Sciences",
      description: s.description || "",
      accentColor: s.color || "#4f46e5",
      lightBg: `${s.color || "#4f46e5"}18`,
      icon: s.icon || s.code.toLowerCase(),
      topics: s.topics ? s.topics.split(",").map((t) => t.trim()).filter(Boolean) : [],
      raw: s,
    }));
  }, [dbSubjects]);

  const filteredSubjects = useMemo(() => {
    return allSubjects.filter((subject) => {
      let matchesFiliere = false;
      if (isStudent && studentFiliere) {
        matchesFiliere =
          subject.filiere.toLowerCase().trim() === studentFiliere.toLowerCase().trim();
      } else {
        matchesFiliere =
          selectedFiliere === "all" || subject.filiere === selectedFiliere;
      }

      const query = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !query ||
        subject.name.toLowerCase().includes(query) ||
        subject.shortCode.toLowerCase().includes(query) ||
        subject.description.toLowerCase().includes(query) ||
        subject.filiere.toLowerCase().includes(query) ||
        subject.category.toLowerCase().includes(query);

      return matchesFiliere && matchesSearch;
    });
  }, [allSubjects, selectedFiliere, searchQuery, isStudent, studentFiliere]);

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

  // Open Add Modal
  const openAddModal = () => {
    const defaultFiliere =
      selectedFiliere !== "all" ? selectedFiliere : filieres[0] || "2ème Informatique";
    setSubjectForm({
      name: "",
      code: "",
      filiere: defaultFiliere,
      customFiliere: "",
      category: "Technologies",
      description: "",
      icon: "informatique",
      color: "#4f46e5",
      topics: "",
    });
    setShowAddModal(true);
  };

  // Open Edit Modal
  const openEditModal = (subject: Subject) => {
    setEditingSubject(subject);
    setSubjectForm({
      name: subject.name,
      code: subject.code,
      filiere: subject.filiere,
      customFiliere: "",
      category: subject.category || "Technologies",
      description: subject.description || "",
      icon: subject.icon || "math",
      color: subject.color || "#4f46e5",
      topics: subject.topics || "",
    });
  };

  // Create Subject
  const handleCreateSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    try {
      setSubmitting(true);
      setErrorMsg("");

      const resolvedFiliere =
        subjectForm.filiere === "custom"
          ? subjectForm.customFiliere.trim()
          : subjectForm.filiere;

      if (!resolvedFiliere) {
        throw new Error("Veuillez spécifier une filière valide.");
      }

      await subjectsService.create(token, {
        name: subjectForm.name.trim(),
        code: subjectForm.code.trim().toUpperCase(),
        filiere: resolvedFiliere,
        category: subjectForm.category,
        description: subjectForm.description.trim(),
        icon: subjectForm.icon,
        color: subjectForm.color,
        topics: subjectForm.topics.trim(),
      });

      setShowAddModal(false);
      showNotification(`Matière "${subjectForm.name}" créée dynamiquement avec succès !`);
      await loadData();
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : "Erreur lors de la création de la matière."
      );
    } finally {
      setSubmitting(false);
    }
  };

  // Update Subject
  const handleUpdateSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !editingSubject) return;

    try {
      setSubmitting(true);
      setErrorMsg("");

      const resolvedFiliere =
        subjectForm.filiere === "custom"
          ? subjectForm.customFiliere.trim()
          : subjectForm.filiere;

      await subjectsService.update(token, editingSubject.id, {
        name: subjectForm.name.trim(),
        code: subjectForm.code.trim().toUpperCase(),
        filiere: resolvedFiliere,
        category: subjectForm.category,
        description: subjectForm.description.trim(),
        icon: subjectForm.icon,
        color: subjectForm.color,
        topics: subjectForm.topics.trim(),
      });

      setEditingSubject(null);
      showNotification(`Matière "${subjectForm.name}" modifiée avec succès !`);
      await loadData();
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : "Erreur lors de la mise à jour."
      );
    } finally {
      setSubmitting(false);
    }
  };

  // Delete Subject
  const confirmDeleteSubject = async () => {
    if (!token || !deletingSubject) return;

    try {
      setSubmitting(true);
      setErrorMsg("");
      await subjectsService.delete(token, deletingSubject.id);
      showNotification(`Matière "${deletingSubject.name}" supprimée avec succès.`);
      setDbSubjects((prev) => prev.filter((s) => s.id !== deletingSubject.id));
      setDeletingSubject(null);
      await loadData();
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : "Erreur lors de la suppression."
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (loading && dbSubjects.length === 0) {
    return <PageLoader label="Chargement des matières dynamiques…" />;
  }

  return (
    <div className="space-y-8 animate-fade-in-up">
      {/* Toast Notifications */}
      {successMsg && (
        <div className="rounded-2xl bg-emerald-500/10 border border-emerald-500/25 px-5 py-3.5 text-sm font-semibold text-emerald-600 flex items-center justify-between shadow-sm animate-fade-in-up">
          <div className="flex items-center gap-2.5">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg("")} className="text-emerald-500 hover:text-emerald-700">
            ✕
          </button>
        </div>
      )}

      {errorMsg && (
        <div className="rounded-2xl bg-rose-500/10 border border-rose-500/25 px-5 py-3.5 text-sm font-semibold text-rose-600 flex items-center justify-between shadow-sm animate-fade-in-up">
          <div className="flex items-center gap-2.5">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span>{errorMsg}</span>
          </div>
          <button onClick={() => setErrorMsg("")} className="text-rose-500 hover:text-rose-700">
            ✕
          </button>
        </div>
      )}

      {/* Superadmin Quick Banner */}
      {isSuperAdmin && (
        <div
          className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-2xl px-5 py-3 border shadow-sm"
          style={{
            background: "linear-gradient(135deg, rgba(225, 29, 72, 0.06), rgba(99, 102, 241, 0.08))",
            borderColor: "rgba(225, 29, 72, 0.2)",
          }}
        >
          <div className="flex items-center gap-2.5">
            <span className="flex h-3 w-3 rounded-full bg-rose-500 animate-pulse shadow-sm shadow-rose-500/50" />
            <span className="text-xs font-bold text-rose-600 uppercase tracking-wider font-mono">
              Espace Superadmin
            </span>
            <span className="text-xs" style={{ color: "var(--muted)" }}>
              • Gestion dynamique des matières & filières en direct
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              onClick={openAddModal}
              className="flex items-center gap-2 rounded-xl text-xs font-bold shadow-md"
              style={{
                background: "linear-gradient(135deg, #e11d48, #4f46e5)",
                color: "#ffffff",
              }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              + Ajouter une matière
            </Button>

            <Link
              href="/admin"
              className="rounded-xl border px-3 py-1.5 text-xs font-semibold transition-all hover:bg-black/5"
              style={{ borderColor: "var(--line)", color: "var(--ink)" }}
            >
              Panneau complet ↗
            </Link>
          </div>
        </div>
      )}

      {/* Search & Filière Header */}
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
            placeholder="Rechercher une matière (ex: Algo, BDD, Math, Web...)"
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

        {/* Filière Indicator / Selector */}
        <div className="flex items-center gap-3">
          {isStudent && studentFiliere ? (
            <div
              className="flex items-center gap-2.5 rounded-2xl border px-4 py-2.5 text-xs font-semibold shadow-sm"
              style={{
                borderColor: "rgba(99, 102, 241, 0.25)",
                background: "linear-gradient(135deg, rgba(99, 102, 241, 0.08), rgba(14, 165, 233, 0.06))",
                color: "var(--ink)",
              }}
            >
              <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse shadow-sm shadow-emerald-500/50" />
              <span style={{ color: "var(--muted)" }}>Programme scolaire :</span>
              <span className="font-bold text-indigo-600 dark:text-indigo-400">
                {studentFiliere}
              </span>
              <span
                className="ml-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold tracking-wide font-mono"
                style={{
                  background: "rgba(99, 102, 241, 0.15)",
                  color: "#4f46e5",
                }}
              >
                {filteredSubjects.length} {filteredSubjects.length === 1 ? "matière" : "matières"}
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <label className="text-xs font-semibold whitespace-nowrap" style={{ color: "var(--muted)" }}>
                Filière :
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
          )}

          {isSuperAdmin && !isStudent && (
            <button
              type="button"
              onClick={openAddModal}
              className="hidden sm:inline-flex items-center gap-1.5 rounded-2xl border px-3.5 py-2 text-xs font-bold transition-all hover:border-indigo-500 shadow-sm"
              style={{
                borderColor: "rgba(99, 102, 241, 0.3)",
                background: "var(--accent-glow)",
                color: "var(--accent)",
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              Ajouter
            </button>
          )}
        </div>
      </div>

      {/* Grid of Dynamic SQUARE FORMAT Subjects */}
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

              {/* Superadmin Card Quick Actions (Edit / Delete) */}
              {isSuperAdmin && (
                <div className="absolute top-3 right-3 z-20 flex items-center gap-1.5 opacity-90 group-hover:opacity-100 transition-opacity">
                  <button
                    type="button"
                    title="Modifier la matière"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      openEditModal(subject.raw);
                    }}
                    className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 hover:bg-indigo-600 hover:text-white transition-colors shadow-sm"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M12 20h9" />
                      <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                    </svg>
                  </button>

                  <button
                    type="button"
                    title="Supprimer la matière"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setDeletingSubject(subject.raw);
                    }}
                    className="flex h-7 w-7 items-center justify-center rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white transition-colors shadow-sm"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                    </svg>
                  </button>
                </div>
              )}

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

                <div className={`flex flex-col items-end gap-1 ${isSuperAdmin ? "mr-16" : ""}`}>
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

      {/* Empty State */}
      {filteredSubjects.length === 0 && (
        <div
          className="glass-card px-8 py-14 text-center rounded-3xl"
          style={{ borderStyle: "dashed" }}
        >
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 mb-4">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
              <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
            </svg>
          </div>
          <p className="font-serif text-lg font-bold" style={{ color: "var(--ink)" }}>
            {searchQuery
              ? `Aucune matière trouvée pour "${searchQuery}"`
              : isStudent && studentFiliere
              ? `Aucune matière configurée pour votre filière ${studentFiliere}`
              : selectedFiliere !== "all"
              ? `Aucune matière configurée pour la filière ${selectedFiliere}`
              : "Aucune matière dans le catalogue pour le moment"}
          </p>
          <p className="mt-1 text-sm max-w-md mx-auto" style={{ color: "var(--muted)" }}>
            {searchQuery
              ? "Vérifiez l'orthographe ou tentez un autre mot-clé."
              : isSuperAdmin
              ? "En tant que Superadministrateur, vous pouvez ajouter immédiatement les matières dynamiques pour cette filière."
              : "Les enseignants et l'administration ajouteront prochainement les programmes scolaires."}
          </p>

          {isSuperAdmin && (
            <div className="mt-5">
              <Button
                type="button"
                onClick={openAddModal}
                className="inline-flex items-center gap-2 rounded-xl text-xs font-bold"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                + Ajouter la première matière
              </Button>
            </div>
          )}
        </div>
      )}

      {/* MODAL 1: AJOUTER UNE MATIÈRE (SUPERADMIN) */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-fade-in-up">
          <div
            className="w-full max-w-lg rounded-3xl p-6 sm:p-8 overflow-y-auto max-h-[90vh]"
            style={{
              background: "var(--paper-card)",
              border: "1px solid var(--line)",
              boxShadow: "0 20px 40px -10px rgba(0,0,0,0.2)",
            }}
          >
            <div className="flex items-center justify-between pb-4 border-b" style={{ borderColor: "var(--line)" }}>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-rose-600 bg-rose-50 px-2.5 py-0.5 rounded-full border border-rose-200">
                  Superadmin Action
                </span>
                <h2 className="mt-1 font-serif text-2xl font-bold" style={{ color: "var(--ink)" }}>
                  Nouvelle matière dynamique
                </h2>
                <p className="text-xs" style={{ color: "var(--muted)" }}>
                  Créez une matière spécifique assignée à une filière scolaire.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-black/5 text-slate-400"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateSubject} className="mt-5 space-y-4">
              {/* Filière Selection */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider mb-1" style={{ color: "var(--muted)" }}>
                  Filière scolaire *
                </label>
                <select
                  value={subjectForm.filiere}
                  onChange={(e) => setSubjectForm({ ...subjectForm, filiere: e.target.value })}
                  className="w-full rounded-xl border px-3 py-2 text-sm outline-none focus:border-indigo-500 font-medium cursor-pointer"
                  style={{ borderColor: "var(--line)" }}
                >
                  {filieres.map((f) => (
                    <option key={f} value={f}>
                      {f}
                    </option>
                  ))}
                  <option value="2ème Informatique">2ème Informatique</option>
                  <option value="2ème Math">2ème Math</option>
                  <option value="2ème Sciences">2ème Sciences</option>
                  <option value="2ème Économie & Services">2ème Économie & Services</option>
                  <option value="3ème Informatique">3ème Informatique</option>
                  <option value="3ème Math">3ème Math</option>
                  <option value="3ème Sciences Expérimentales">3ème Sciences Expérimentales</option>
                  <option value="Bac Informatique">Bac Informatique</option>
                  <option value="Bac Math">Bac Math</option>
                  <option value="Bac Sciences">Bac Sciences</option>
                  <option value="Tronc Commun">Tronc Commun</option>
                  <option value="custom">+ Créer une nouvelle filière...</option>
                </select>

                {subjectForm.filiere === "custom" && (
                  <input
                    type="text"
                    required
                    placeholder="Saisissez le nom de la nouvelle filière (ex: 1ère Année Secondaire)"
                    value={subjectForm.customFiliere}
                    onChange={(e) => setSubjectForm({ ...subjectForm, customFiliere: e.target.value })}
                    className="mt-2 w-full rounded-xl border px-3 py-2 text-sm outline-none focus:border-indigo-500"
                    style={{ borderColor: "var(--line)" }}
                  />
                )}
              </div>

              {/* Subject Name & Short Code */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold mb-1" style={{ color: "var(--ink)" }}>
                    Nom de la matière *
                  </label>
                  <input
                    type="text"
                    required
                    value={subjectForm.name}
                    onChange={(e) => setSubjectForm({ ...subjectForm, name: e.target.value })}
                    placeholder="ex: Algorithmique & Programmation"
                    className="w-full rounded-xl border px-3 py-2 text-sm outline-none focus:border-indigo-500"
                    style={{ borderColor: "var(--line)" }}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1" style={{ color: "var(--ink)" }}>
                    Code court *
                  </label>
                  <input
                    type="text"
                    required
                    value={subjectForm.code}
                    onChange={(e) => setSubjectForm({ ...subjectForm, code: e.target.value.toUpperCase() })}
                    placeholder="ex: ALGO"
                    className="w-full rounded-xl border px-3 py-2 text-sm outline-none focus:border-indigo-500 uppercase font-mono"
                    style={{ borderColor: "var(--line)" }}
                  />
                </div>
              </div>

              {/* Catégorie */}
              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: "var(--ink)" }}>
                  Catégorie d&apos;enseignement
                </label>
                <select
                  value={subjectForm.category}
                  onChange={(e) => setSubjectForm({ ...subjectForm, category: e.target.value })}
                  className="w-full rounded-xl border px-3 py-2 text-sm outline-none focus:border-indigo-500 cursor-pointer"
                  style={{ borderColor: "var(--line)" }}
                >
                  {PRESET_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: "var(--ink)" }}>
                  Description de la matière
                </label>
                <textarea
                  rows={2}
                  value={subjectForm.description}
                  onChange={(e) => setSubjectForm({ ...subjectForm, description: e.target.value })}
                  placeholder="Notions principales abordées dans le programme..."
                  className="w-full rounded-xl border px-3 py-2 text-sm outline-none focus:border-indigo-500"
                  style={{ borderColor: "var(--line)" }}
                />
              </div>

              {/* Icon & Color selector */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold mb-1" style={{ color: "var(--ink)" }}>
                    Icône illustrative
                  </label>
                  <select
                    value={subjectForm.icon}
                    onChange={(e) => setSubjectForm({ ...subjectForm, icon: e.target.value })}
                    className="w-full rounded-xl border px-3 py-2 text-sm outline-none focus:border-indigo-500 cursor-pointer"
                    style={{ borderColor: "var(--line)" }}
                  >
                    {PRESET_ICONS.map((ico) => (
                      <option key={ico.id} value={ico.id}>
                        {ico.emoji} {ico.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1" style={{ color: "var(--ink)" }}>
                    Couleur d&apos;accent
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={subjectForm.color}
                      onChange={(e) => setSubjectForm({ ...subjectForm, color: e.target.value })}
                      className="h-9 w-12 cursor-pointer rounded-lg border p-0.5"
                    />
                    <input
                      type="text"
                      value={subjectForm.color}
                      onChange={(e) => setSubjectForm({ ...subjectForm, color: e.target.value })}
                      className="w-full rounded-xl border px-3 py-2 text-xs font-mono uppercase"
                      style={{ borderColor: "var(--line)" }}
                    />
                  </div>
                </div>
              </div>

              {/* Quick color swatches */}
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                <span className="text-[11px] text-slate-400 mr-1">Palettes recommandées :</span>
                {PRESET_COLORS.map((c) => (
                  <button
                    key={c.value}
                    type="button"
                    title={c.label}
                    onClick={() => setSubjectForm({ ...subjectForm, color: c.value })}
                    className="h-6 w-6 rounded-full border-2 transition-transform hover:scale-110"
                    style={{
                      backgroundColor: c.value,
                      borderColor: subjectForm.color === c.value ? "#000" : "transparent",
                    }}
                  />
                ))}
              </div>

              {/* Topics tags */}
              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: "var(--ink)" }}>
                  Chapitres / Notions clés (séparés par des virgules)
                </label>
                <input
                  type="text"
                  value={subjectForm.topics}
                  onChange={(e) => setSubjectForm({ ...subjectForm, topics: e.target.value })}
                  placeholder="ex: Python, Tableaux, Récursivité, Fichiers"
                  className="w-full rounded-xl border px-3 py-2 text-sm outline-none focus:border-indigo-500"
                  style={{ borderColor: "var(--line)" }}
                />
              </div>

              {/* Modal buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t" style={{ borderColor: "var(--line)" }}>
                <Button type="button" variant="secondary" onClick={() => setShowAddModal(false)} className="text-xs">
                  Annuler
                </Button>
                <Button type="submit" disabled={submitting} className="text-xs font-bold">
                  {submitting ? "Création en cours…" : "Créer la matière"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: MODIFIER LA MATIÈRE (SUPERADMIN) */}
      {editingSubject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-fade-in-up">
          <div
            className="w-full max-w-lg rounded-3xl p-6 sm:p-8 overflow-y-auto max-h-[90vh]"
            style={{
              background: "var(--paper-card)",
              border: "1px solid var(--line)",
              boxShadow: "0 20px 40px -10px rgba(0,0,0,0.2)",
            }}
          >
            <div className="flex items-center justify-between pb-4 border-b" style={{ borderColor: "var(--line)" }}>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-200">
                  Modifier la matière #{editingSubject.id}
                </span>
                <h2 className="mt-1 font-serif text-2xl font-bold" style={{ color: "var(--ink)" }}>
                  {editingSubject.name}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setEditingSubject(null)}
                className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-black/5 text-slate-400"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleUpdateSubject} className="mt-5 space-y-4">
              {/* Subject Name & Short Code */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold mb-1" style={{ color: "var(--ink)" }}>
                    Nom de la matière
                  </label>
                  <input
                    type="text"
                    required
                    value={subjectForm.name}
                    onChange={(e) => setSubjectForm({ ...subjectForm, name: e.target.value })}
                    className="w-full rounded-xl border px-3 py-2 text-sm outline-none focus:border-indigo-500"
                    style={{ borderColor: "var(--line)" }}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1" style={{ color: "var(--ink)" }}>
                    Code court
                  </label>
                  <input
                    type="text"
                    required
                    value={subjectForm.code}
                    onChange={(e) => setSubjectForm({ ...subjectForm, code: e.target.value.toUpperCase() })}
                    className="w-full rounded-xl border px-3 py-2 text-sm outline-none focus:border-indigo-500 uppercase font-mono"
                    style={{ borderColor: "var(--line)" }}
                  />
                </div>
              </div>

              {/* Filière */}
              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: "var(--ink)" }}>
                  Filière
                </label>
                <input
                  type="text"
                  required
                  value={subjectForm.filiere}
                  onChange={(e) => setSubjectForm({ ...subjectForm, filiere: e.target.value })}
                  className="w-full rounded-xl border px-3 py-2 text-sm outline-none focus:border-indigo-500"
                  style={{ borderColor: "var(--line)" }}
                />
              </div>

              {/* Catégorie */}
              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: "var(--ink)" }}>
                  Catégorie
                </label>
                <select
                  value={subjectForm.category}
                  onChange={(e) => setSubjectForm({ ...subjectForm, category: e.target.value })}
                  className="w-full rounded-xl border px-3 py-2 text-sm outline-none focus:border-indigo-500 cursor-pointer"
                  style={{ borderColor: "var(--line)" }}
                >
                  {PRESET_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: "var(--ink)" }}>
                  Description
                </label>
                <textarea
                  rows={2}
                  value={subjectForm.description}
                  onChange={(e) => setSubjectForm({ ...subjectForm, description: e.target.value })}
                  className="w-full rounded-xl border px-3 py-2 text-sm outline-none focus:border-indigo-500"
                  style={{ borderColor: "var(--line)" }}
                />
              </div>

              {/* Icon & Color selector */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold mb-1" style={{ color: "var(--ink)" }}>
                    Icône illustrative
                  </label>
                  <select
                    value={subjectForm.icon}
                    onChange={(e) => setSubjectForm({ ...subjectForm, icon: e.target.value })}
                    className="w-full rounded-xl border px-3 py-2 text-sm outline-none focus:border-indigo-500 cursor-pointer"
                    style={{ borderColor: "var(--line)" }}
                  >
                    {PRESET_ICONS.map((ico) => (
                      <option key={ico.id} value={ico.id}>
                        {ico.emoji} {ico.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1" style={{ color: "var(--ink)" }}>
                    Couleur d&apos;accent
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={subjectForm.color}
                      onChange={(e) => setSubjectForm({ ...subjectForm, color: e.target.value })}
                      className="h-9 w-12 cursor-pointer rounded-lg border p-0.5"
                    />
                    <input
                      type="text"
                      value={subjectForm.color}
                      onChange={(e) => setSubjectForm({ ...subjectForm, color: e.target.value })}
                      className="w-full rounded-xl border px-3 py-2 text-xs font-mono uppercase"
                      style={{ borderColor: "var(--line)" }}
                    />
                  </div>
                </div>
              </div>

              {/* Quick color swatches */}
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                {PRESET_COLORS.map((c) => (
                  <button
                    key={c.value}
                    type="button"
                    title={c.label}
                    onClick={() => setSubjectForm({ ...subjectForm, color: c.value })}
                    className="h-6 w-6 rounded-full border-2 transition-transform hover:scale-110"
                    style={{
                      backgroundColor: c.value,
                      borderColor: subjectForm.color === c.value ? "#000" : "transparent",
                    }}
                  />
                ))}
              </div>

              {/* Topics tags */}
              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: "var(--ink)" }}>
                  Mots-clés / Chapitres
                </label>
                <input
                  type="text"
                  value={subjectForm.topics}
                  onChange={(e) => setSubjectForm({ ...subjectForm, topics: e.target.value })}
                  className="w-full rounded-xl border px-3 py-2 text-sm outline-none focus:border-indigo-500"
                  style={{ borderColor: "var(--line)" }}
                />
              </div>

              {/* Modal buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t" style={{ borderColor: "var(--line)" }}>
                <Button type="button" variant="secondary" onClick={() => setEditingSubject(null)} className="text-xs">
                  Annuler
                </Button>
                <Button type="submit" disabled={submitting} className="text-xs font-bold">
                  {submitting ? "Enregistrement…" : "Enregistrer les modifications"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: CONFIRMATION SUPPRESSION (SUPERADMIN) */}
      {deletingSubject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-fade-in-up">
          <div
            className="w-full max-w-md rounded-3xl p-6 sm:p-7"
            style={{
              background: "var(--paper-card)",
              border: "1px solid var(--line)",
              boxShadow: "0 20px 40px -10px rgba(0,0,0,0.2)",
            }}
          >
            <div className="flex items-center gap-3 text-rose-600 mb-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-rose-100 dark:bg-rose-950/40">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                  <line x1="12" y1="9" x2="12" y2="13" />
                  <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
              </div>
              <h3 className="font-serif text-xl font-bold" style={{ color: "var(--ink)" }}>
                Supprimer la matière ?
              </h3>
            </div>

            <p className="text-sm leading-relaxed" style={{ color: "var(--muted)" }}>
              Êtes-vous sûr de vouloir supprimer définitivement la matière{" "}
              <strong style={{ color: "var(--ink)" }}>&ldquo;{deletingSubject.name}&rdquo;</strong> ({deletingSubject.code}) de la filière{" "}
              <strong style={{ color: "var(--ink)" }}>{deletingSubject.filiere}</strong> ?
            </p>
            <p className="mt-2 text-xs text-rose-500 font-medium">
              Cette action est irréversible et supprimera cette matière de la liste dynamique.
            </p>

            <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t" style={{ borderColor: "var(--line)" }}>
              <Button
                type="button"
                variant="secondary"
                disabled={submitting}
                onClick={() => setDeletingSubject(null)}
                className="text-xs"
              >
                Annuler
              </Button>
              <Button
                type="button"
                disabled={submitting}
                onClick={confirmDeleteSubject}
                className="text-xs font-bold"
                style={{
                  background: "#e11d48",
                  color: "#ffffff",
                }}
              >
                {submitting ? "Suppression…" : "Oui, supprimer définitivement"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
