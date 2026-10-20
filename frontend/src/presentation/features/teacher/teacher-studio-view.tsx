"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useAuth } from "@/presentation/providers/auth-provider";
import { coursesService } from "@/application/services/courses-service";
import { subjectsService } from "@/application/services/subjects-service";
import type { Course } from "@/domain/entities/course";
import type { Lesson } from "@/domain/entities/lesson";
import type { Subject } from "@/domain/entities/subject";
import { CourseSection, LessonType, UserType } from "@/domain/enums";
import { PageLoader } from "@/presentation/components/ui/page-loader";
import { Button } from "@/presentation/components/ui/button";

export function TeacherStudioView() {
  const { token, user } = useAuth();

  const [courses, setCourses] = useState<Course[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [filieres, setFilieres] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Filter states
  const [selectedSubject, setSelectedSubject] = useState("all");
  const [selectedFiliere, setSelectedFiliere] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Modals
  const [showCourseModal, setShowCourseModal] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [activeCourseForLessons, setActiveCourseForLessons] = useState<Course | null>(null);
  const [editingLesson, setEditingLesson] = useState<Lesson | null>(null);

  // Forms
  const [courseForm, setCourseForm] = useState({
    title: "",
    description: "",
    section: CourseSection.COURSE,
    subject: "math",
    filiere: "2ème Informatique",
    textContent: "",
    youtubeUrl: "",
    pdfFile: "",
  });

  const [lessonForm, setLessonForm] = useState({
    title: "",
    description: "",
    type: LessonType.VIDEO,
    textContent: "",
    youtubeUrl: "",
    pdfFile: "",
    durationMinutes: 15,
    orderIndex: 1,
  });

  const [selectedPdfFile, setSelectedPdfFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);

  const isTeacherOrAdmin =
    user?.userType === UserType.INSTRUCTOR || user?.userType === UserType.SUPERADMIN;

  const showNotification = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(""), 4500);
  };

  const loadData = async () => {
    if (!token) return;
    try {
      setLoading(true);
      setError("");
      const [coursesData, subjectsData, filieresData] = await Promise.all([
        coursesService.list(token),
        subjectsService.list(token),
        subjectsService.getFilieres(token),
      ]);
      setCourses(coursesData);
      setSubjects(subjectsData);
      setFilieres(filieresData);

      // Refresh activeCourseForLessons if opened
      if (activeCourseForLessons) {
        const refreshed = coursesData.find((c) => c.id === activeCourseForLessons.id);
        if (refreshed) setActiveCourseForLessons(refreshed);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur de chargement des données.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [token]);

  // Handle PDF Upload
  const handlePdfUpload = async (file: File) => {
    if (!token) return null;
    try {
      setUploadingFile(true);
      const res = await coursesService.uploadFile(token, file);
      showNotification(`Document PDF téléversé : ${res.originalName}`);
      return res.filename;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors de l'envoi du PDF.");
      return null;
    } finally {
      setUploadingFile(false);
    }
  };

  // Create / Update Course
  const handleSaveCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    try {
      setSubmitting(true);
      setError("");

      let uploadedFilename = courseForm.pdfFile;
      if (selectedPdfFile) {
        const uploaded = await handlePdfUpload(selectedPdfFile);
        if (uploaded) uploadedFilename = uploaded;
      }

      if (editingCourse) {
        await coursesService.updateCourse(token, editingCourse.id, {
          title: courseForm.title,
          description: courseForm.description,
          section: courseForm.section,
          subject: courseForm.subject,
          filiere: courseForm.filiere,
          textContent: courseForm.textContent || undefined,
          youtubeUrl: courseForm.youtubeUrl || undefined,
          pdfFile: uploadedFilename || undefined,
        });
        showNotification("Cours mis à jour avec succès !");
      } else {
        await coursesService.createCourse(token, {
          title: courseForm.title,
          description: courseForm.description,
          section: courseForm.section,
          subject: courseForm.subject,
          filiere: courseForm.filiere,
          textContent: courseForm.textContent || undefined,
          youtubeUrl: courseForm.youtubeUrl || undefined,
          pdfFile: uploadedFilename || undefined,
        });
        showNotification("Nouveau cours créé avec succès !");
      }

      setShowCourseModal(false);
      setEditingCourse(null);
      setSelectedPdfFile(null);
      setCourseForm({
        title: "",
        description: "",
        section: CourseSection.COURSE,
        subject: "math",
        filiere: "2ème Informatique",
        textContent: "",
        youtubeUrl: "",
        pdfFile: "",
      });
      loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors de l'enregistrement du cours.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteCourse = async (id: number, title: string) => {
    if (!token) return;
    if (!confirm(`Supprimer définitivement le cours "${title}" ainsi que toutes ses leçons ?`)) return;
    try {
      await coursesService.deleteCourse(token, id);
      showNotification(`Cours "${title}" supprimé.`);
      loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors de la suppression.");
    }
  };

  // Lesson Handlers
  const handleSaveLesson = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !activeCourseForLessons) return;
    try {
      setSubmitting(true);
      setError("");

      let uploadedFilename = lessonForm.pdfFile;
      if (selectedPdfFile && lessonForm.type === LessonType.PDF) {
        const uploaded = await handlePdfUpload(selectedPdfFile);
        if (uploaded) uploadedFilename = uploaded;
      }

      if (editingLesson) {
        await coursesService.updateLesson(token, editingLesson.id, {
          title: lessonForm.title,
          description: lessonForm.description,
          type: lessonForm.type,
          textContent: lessonForm.textContent || undefined,
          youtubeUrl: lessonForm.youtubeUrl || undefined,
          pdfFile: uploadedFilename || undefined,
          durationMinutes: Number(lessonForm.durationMinutes),
          orderIndex: Number(lessonForm.orderIndex),
        });
        showNotification("Leçon mise à jour !");
        setEditingLesson(null);
      } else {
        await coursesService.createLesson(token, activeCourseForLessons.id, {
          title: lessonForm.title,
          description: lessonForm.description,
          type: lessonForm.type,
          textContent: lessonForm.textContent || undefined,
          youtubeUrl: lessonForm.youtubeUrl || undefined,
          pdfFile: uploadedFilename || undefined,
          durationMinutes: Number(lessonForm.durationMinutes),
          orderIndex: Number(lessonForm.orderIndex),
        });
        showNotification(`Leçon "${lessonForm.title}" ajoutée avec succès !`);
      }

      setSelectedPdfFile(null);
      setLessonForm({
        title: "",
        description: "",
        type: LessonType.VIDEO,
        textContent: "",
        youtubeUrl: "",
        pdfFile: "",
        durationMinutes: 15,
        orderIndex: (activeCourseForLessons.lessons?.length || 0) + 2,
      });

      // Refresh data to show new lesson
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors de l'enregistrement de la leçon.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteLesson = async (lessonId: number, title: string) => {
    if (!token) return;
    if (!confirm(`Supprimer la leçon "${title}" ?`)) return;
    try {
      await coursesService.deleteLesson(token, lessonId);
      showNotification(`Leçon "${title}" supprimée.`);
      loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur de suppression de la leçon.");
    }
  };

  // Filtered courses
  const filteredCourses = useMemo(() => {
    return courses.filter((c) => {
      const matchesSubject = selectedSubject === "all" || (c.subject || "math").toLowerCase() === selectedSubject.toLowerCase();
      const matchesFiliere = selectedFiliere === "all" || (c.filiere && c.filiere === selectedFiliere);
      const search = searchQuery.toLowerCase();
      const matchesSearch =
        !search ||
        c.title.toLowerCase().includes(search) ||
        (c.description && c.description.toLowerCase().includes(search));
      return matchesSubject && matchesFiliere && matchesSearch;
    });
  }, [courses, selectedSubject, selectedFiliere, searchQuery]);

  // Statistics
  const stats = useMemo(() => {
    let totalLessons = 0;
    let videoCount = 0;
    let textCount = 0;
    let pdfCount = 0;

    courses.forEach((c) => {
      if (c.youtubeUrl) videoCount++;
      if (c.pdfFile) pdfCount++;
      if (c.textContent) textCount++;

      if (c.lessons) {
        totalLessons += c.lessons.length;
        c.lessons.forEach((l) => {
          if (l.type === LessonType.VIDEO || l.youtubeUrl) videoCount++;
          if (l.type === LessonType.TEXT || l.textContent) textCount++;
          if (l.type === LessonType.PDF || l.pdfFile) pdfCount++;
        });
      }
    });

    return {
      totalCourses: courses.length,
      totalLessons,
      videoCount,
      textCount,
      pdfCount,
    };
  }, [courses]);

  if (!isTeacherOrAdmin) {
    return (
      <div className="glass-card p-12 text-center rounded-3xl" style={{ borderStyle: "dashed" }}>
        <p className="font-serif text-2xl font-bold" style={{ color: "var(--ink)" }}>
          Accès Réservé aux Enseignants
        </p>
        <p className="mt-2 text-sm max-w-md mx-auto" style={{ color: "var(--muted)" }}>
          Vous devez avoir le rôle Enseignant (Instructor) ou Superadmin pour ajouter des cours et des leçons.
        </p>
        <Link
          href="/courses"
          className="mt-6 inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-xs font-bold bg-indigo-600 text-white"
        >
          Consulter les cours disponibles
        </Link>
      </div>
    );
  }

  if (loading) {
    return <PageLoader label="Chargement de l'espace enseignant…" />;
  }

  return (
    <div className="space-y-8 animate-fade-in-up">
      {/* Top Banner Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider bg-indigo-500/10 text-indigo-600 border border-indigo-500/20">
            <span>🎓</span> Espace Enseignant / Teacher Studio
          </div>
          <h1 className="mt-2 font-serif text-3xl sm:text-4xl font-bold" style={{ color: "var(--ink)" }}>
            Mes Cours & <span className="gradient-text">Leçons Pédagogiques</span>
          </h1>
          <p className="mt-1 text-sm" style={{ color: "var(--muted)" }}>
            Publiez des cours complets avec leçons interactives (texte écrit, vidéos explicatives, documents PDF).
          </p>
        </div>

        {/* Action Button */}
        <Button
          type="button"
          onClick={() => {
            setEditingCourse(null);
            setCourseForm({
              title: "",
              description: "",
              section: CourseSection.COURSE,
              subject: subjects[0]?.slug || "math",
              filiere: filieres[0] || "2ème Informatique",
              textContent: "",
              youtubeUrl: "",
              pdfFile: "",
            });
            setShowCourseModal(true);
          }}
          className="flex items-center gap-2 text-xs sm:text-sm font-semibold rounded-2xl"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          + Créer un nouveau cours
        </Button>
      </div>

      {/* Notifications */}
      {successMsg && (
        <div className="rounded-2xl bg-emerald-500/10 border border-emerald-500/20 px-4 py-3 text-sm font-medium text-emerald-600 flex items-center gap-2">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          {successMsg}
        </div>
      )}

      {error && (
        <div className="alert-error" role="alert">
          {error}
        </div>
      )}

      {/* Teacher Stats Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="glass-card p-5 rounded-2xl">
          <span className="text-xs font-semibold text-slate-500 block">Total Cours</span>
          <span className="font-serif text-3xl font-bold gradient-text">{stats.totalCourses}</span>
          <span className="text-[11px] text-slate-400 block mt-1">Modules pédagogiques</span>
        </div>

        <div className="glass-card p-5 rounded-2xl">
          <span className="text-xs font-semibold text-slate-500 block">Total Leçons</span>
          <span className="font-serif text-3xl font-bold text-indigo-600">{stats.totalLessons}</span>
          <span className="text-[11px] text-slate-400 block mt-1">Chapitres & exercices</span>
        </div>

        <div className="glass-card p-5 rounded-2xl">
          <span className="text-xs font-semibold text-slate-500 block">Vidéos publiées</span>
          <span className="font-serif text-3xl font-bold text-rose-600">{stats.videoCount}</span>
          <span className="text-[11px] text-slate-400 block mt-1">Lectures interactives</span>
        </div>

        <div className="glass-card p-5 rounded-2xl">
          <span className="text-xs font-semibold text-slate-500 block">Documents PDF & Textes</span>
          <span className="font-serif text-3xl font-bold text-teal-600">{stats.pdfCount + stats.textCount}</span>
          <span className="text-[11px] text-slate-400 block mt-1">{stats.pdfCount} PDF • {stats.textCount} Textes</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-sm">
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
            placeholder="Rechercher parmi mes cours..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border bg-white/70 pl-9 pr-3 py-2 text-sm outline-none transition-all focus:border-indigo-500 focus:bg-white"
            style={{ borderColor: "var(--line)", color: "var(--ink)" }}
          />
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Filière filter */}
          <select
            value={selectedFiliere}
            onChange={(e) => setSelectedFiliere(e.target.value)}
            className="rounded-xl border bg-white/80 px-3 py-2 text-xs font-medium outline-none focus:border-indigo-500"
            style={{ borderColor: "var(--line)", color: "var(--ink)" }}
          >
            <option value="all">Toutes les filières</option>
            {filieres.map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>

          {/* Subject filter */}
          <select
            value={selectedSubject}
            onChange={(e) => setSelectedSubject(e.target.value)}
            className="rounded-xl border bg-white/80 px-3 py-2 text-xs font-medium outline-none focus:border-indigo-500"
            style={{ borderColor: "var(--line)", color: "var(--ink)" }}
          >
            <option value="all">Toutes les matières</option>
            {subjects.map((s) => (
              <option key={s.id} value={s.slug || s.code.toLowerCase()}>
                {s.name} ({s.code})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Courses List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredCourses.map((c) => {
          const lessonsCount = c.lessons?.length || 0;
          return (
            <article
              key={c.id}
              className="glass-card flex flex-col justify-between p-6 rounded-3xl transition-all duration-300 hover:shadow-lg border"
              style={{ borderColor: "var(--line)" }}
            >
              <div>
                {/* Header pills */}
                <div className="flex items-center justify-between gap-2">
                  <span className="rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase font-mono bg-indigo-50 text-indigo-700 border border-indigo-100">
                    {c.section}
                  </span>
                  <span className="text-[11px] font-semibold text-slate-500">
                    {c.filiere || "Générale"} • {(c.subject || "math").toUpperCase()}
                  </span>
                </div>

                {/* Title & Desc */}
                <h3 className="mt-4 font-serif text-xl font-bold leading-snug" style={{ color: "var(--ink)" }}>
                  {c.title}
                </h3>
                <p className="mt-2 text-xs line-clamp-3 leading-relaxed" style={{ color: "var(--muted)" }}>
                  {c.description || "Aucune description renseignée."}
                </p>

                {/* Content formats badges */}
                <div className="mt-4 flex flex-wrap items-center gap-1.5 text-[11px]">
                  {c.youtubeUrl && (
                    <span className="rounded-md px-2 py-0.5 bg-rose-50 text-rose-700 font-medium">
                      🎬 Vidéo directe
                    </span>
                  )}
                  {c.pdfFile && (
                    <span className="rounded-md px-2 py-0.5 bg-pink-50 text-pink-700 font-medium">
                      📄 PDF joint
                    </span>
                  )}
                  {c.textContent && (
                    <span className="rounded-md px-2 py-0.5 bg-teal-50 text-teal-700 font-medium">
                      📝 Cours écrit
                    </span>
                  )}
                  <span className="rounded-md px-2 py-0.5 bg-slate-100 text-slate-700 font-bold">
                    📖 {lessonsCount} {lessonsCount === 1 ? "leçon" : "leçons"}
                  </span>
                </div>
              </div>

              {/* Actions */}
              <div className="mt-6 pt-4 border-t flex flex-col gap-2" style={{ borderColor: "var(--line)" }}>
                {/* Lesson Builder Action Button */}
                <Button
                  type="button"
                  onClick={() => {
                    setActiveCourseForLessons(c);
                    setLessonForm({
                      title: "",
                      description: "",
                      type: LessonType.VIDEO,
                      textContent: "",
                      youtubeUrl: "",
                      pdfFile: "",
                      durationMinutes: 15,
                      orderIndex: (c.lessons?.length || 0) + 1,
                    });
                  }}
                  className="w-full justify-center text-xs font-bold rounded-xl py-2"
                >
                  📚 Gérer les leçons ({lessonsCount})
                </Button>

                <div className="flex items-center justify-between gap-2 pt-1">
                  <Link
                    href={`/courses/view/${c.id}`}
                    target="_blank"
                    className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800"
                  >
                    <span>👁️ Aperçu élève</span>
                  </Link>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingCourse(c);
                        setCourseForm({
                          title: c.title,
                          description: c.description || "",
                          section: c.section as CourseSection,
                          subject: c.subject || "math",
                          filiere: c.filiere || "2ème Informatique",
                          textContent: c.textContent || "",
                          youtubeUrl: c.youtubeUrl || "",
                          pdfFile: c.pdfFile || "",
                        });
                        setShowCourseModal(true);
                      }}
                      className="rounded-lg px-2.5 py-1 text-xs font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200"
                    >
                      Modifier
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteCourse(c.id, c.title)}
                      className="rounded-lg px-2.5 py-1 text-xs font-semibold bg-rose-50 text-rose-600 hover:bg-rose-100"
                    >
                      Supprimer
                    </button>
                  </div>
                </div>
              </div>
            </article>
          );
        })}
      </div>

      {filteredCourses.length === 0 && (
        <div className="glass-card p-12 text-center rounded-3xl" style={{ borderStyle: "dashed" }}>
          <p className="font-serif text-xl font-bold" style={{ color: "var(--ink)" }}>
            Aucun cours trouvé
          </p>
          <p className="mt-1 text-sm" style={{ color: "var(--muted)" }}>
            Commencez par ajouter votre premier cours ou modifiez vos filtres de recherche.
          </p>
          <Button
            type="button"
            onClick={() => setShowCourseModal(true)}
            className="mt-5 text-xs font-bold"
          >
            + Créer mon premier cours
          </Button>
        </div>
      )}

      {/* ==================================================== */}
      {/* MODAL 1: CRÉER / MODIFIER UN COURS */}
      {/* ==================================================== */}
      {showCourseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-fade-in-up">
          <div
            className="w-full max-w-xl rounded-3xl p-6 sm:p-8 max-h-[90vh] overflow-y-auto"
            style={{
              background: "var(--paper-card)",
              border: "1px solid var(--line)",
              boxShadow: "0 20px 40px -10px rgba(0,0,0,0.2)",
            }}
          >
            <div className="flex items-center justify-between pb-4 border-b" style={{ borderColor: "var(--line)" }}>
              <div>
                <h2 className="font-serif text-2xl font-bold" style={{ color: "var(--ink)" }}>
                  {editingCourse ? "Modifier le cours" : "Créer un nouveau cours"}
                </h2>
                <p className="text-xs" style={{ color: "var(--muted)" }}>
                  Définissez le sujet, la filière et la description du cours.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowCourseModal(false)}
                className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-black/5 text-slate-400"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveCourse} className="mt-5 space-y-4">
              {/* Titre */}
              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: "var(--ink)" }}>
                  Titre du cours *
                </label>
                <input
                  type="text"
                  required
                  value={courseForm.title}
                  onChange={(e) => setCourseForm({ ...courseForm, title: e.target.value })}
                  placeholder="ex: Chapitre 1 : Les Nombres Complexes et Géométrie"
                  className="w-full rounded-xl border px-3 py-2 text-sm outline-none focus:border-indigo-500"
                  style={{ borderColor: "var(--line)" }}
                />
              </div>

              {/* Matière & Filière */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold mb-1" style={{ color: "var(--ink)" }}>
                    Matière *
                  </label>
                  <select
                    value={courseForm.subject}
                    onChange={(e) => setCourseForm({ ...courseForm, subject: e.target.value })}
                    className="w-full rounded-xl border px-3 py-2 text-sm outline-none focus:border-indigo-500"
                    style={{ borderColor: "var(--line)" }}
                  >
                    {subjects.map((s) => (
                      <option key={s.id} value={s.slug || s.code.toLowerCase()}>
                        {s.name} ({s.code})
                      </option>
                    ))}
                    {subjects.length === 0 && (
                      <>
                        <option value="math">Mathématiques (MATH)</option>
                        <option value="physique">Physique - Chimie (PHY)</option>
                        <option value="informatique">Informatique (INFO)</option>
                        <option value="science">Sciences SVT (SVT)</option>
                      </>
                    )}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1" style={{ color: "var(--ink)" }}>
                    Filière scolaire *
                  </label>
                  <select
                    value={courseForm.filiere}
                    onChange={(e) => setCourseForm({ ...courseForm, filiere: e.target.value })}
                    className="w-full rounded-xl border px-3 py-2 text-sm outline-none focus:border-indigo-500"
                    style={{ borderColor: "var(--line)" }}
                  >
                    {filieres.map((f) => (
                      <option key={f} value={f}>
                        {f}
                      </option>
                    ))}
                    {filieres.length === 0 && (
                      <>
                        <option value="2ème Informatique">2ème Informatique</option>
                        <option value="2ème Math">2ème Math</option>
                        <option value="2ème Sciences">2ème Sciences</option>
                        <option value="Bac Informatique">Bac Informatique</option>
                      </>
                    )}
                  </select>
                </div>
              </div>

              {/* Section */}
              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: "var(--ink)" }}>
                  Type de section *
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { section: CourseSection.COURSE, label: "Cours", icon: "🎬" },
                    { section: CourseSection.EXERCISE, label: "Exercices", icon: "✍️" },
                    { section: CourseSection.MAGAZINE, label: "Magazine PDF", icon: "📑" },
                    { section: CourseSection.OLDLIVE, label: "Direct/Archive", icon: "🔴" },
                  ].map((s) => {
                    const active = courseForm.section === s.section;
                    return (
                      <button
                        key={s.section}
                        type="button"
                        onClick={() => setCourseForm({ ...courseForm, section: s.section })}
                        className="flex items-center gap-1.5 rounded-xl p-2 text-xs font-semibold transition-all border"
                        style={{
                          background: active ? "var(--accent-glow)" : "transparent",
                          borderColor: active ? "var(--accent)" : "var(--line)",
                          color: active ? "var(--accent)" : "var(--ink)",
                        }}
                      >
                        <span>{s.icon}</span>
                        <span>{s.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: "var(--ink)" }}>
                  Description générale du cours
                </label>
                <textarea
                  rows={2}
                  value={courseForm.description}
                  onChange={(e) => setCourseForm({ ...courseForm, description: e.target.value })}
                  placeholder="Objectifs d'apprentissage, prérequis, résumé du chapitre..."
                  className="w-full rounded-xl border px-3 py-2 text-sm outline-none focus:border-indigo-500"
                  style={{ borderColor: "var(--line)" }}
                />
              </div>

              {/* Optional Text Content */}
              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: "var(--ink)" }}>
                  Texte / Notes de cours introductives (Optionnel)
                </label>
                <textarea
                  rows={4}
                  value={courseForm.textContent}
                  onChange={(e) => setCourseForm({ ...courseForm, textContent: e.target.value })}
                  placeholder="Rédigez les définitions fondamentales, formules ou explications pour vos élèves..."
                  className="w-full rounded-xl border px-3 py-2 text-sm outline-none focus:border-indigo-500 font-mono text-xs"
                  style={{ borderColor: "var(--line)" }}
                />
              </div>

              {/* Direct Video or PDF */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
                <div>
                  <label className="block text-xs font-semibold mb-1 text-slate-800">
                    Lien Vidéo YouTube direct
                  </label>
                  <input
                    type="url"
                    value={courseForm.youtubeUrl}
                    onChange={(e) => setCourseForm({ ...courseForm, youtubeUrl: e.target.value })}
                    placeholder="https://www.youtube.com/watch?v=..."
                    className="w-full rounded-xl border bg-white px-3 py-1.5 text-xs outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1 text-slate-800">
                    Document PDF direct (Polycope / Série)
                  </label>
                  <input
                    type="file"
                    accept="application/pdf"
                    onChange={(e) => setSelectedPdfFile(e.target.files?.[0] || null)}
                    className="w-full rounded-xl border bg-white px-2 py-1 text-xs file:mr-2 file:py-1 file:px-2 file:rounded-lg file:border-0 file:text-xs file:bg-indigo-50 file:text-indigo-700"
                  />
                  {courseForm.pdfFile && !selectedPdfFile && (
                    <span className="text-[10px] text-slate-500 mt-1 block truncate">
                      Fichier actuel : {courseForm.pdfFile}
                    </span>
                  )}
                </div>
              </div>

              {/* Modal Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t" style={{ borderColor: "var(--line)" }}>
                <Button type="button" variant="secondary" onClick={() => setShowCourseModal(false)} className="text-xs">
                  Annuler
                </Button>
                <Button type="submit" disabled={submitting || uploadingFile} className="text-xs font-bold">
                  {submitting ? "Enregistrement…" : editingCourse ? "Mettre à jour" : "Créer le cours"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* MODAL 2: GESTIONNAIRE DE LEÇONS (LESSON BUILDER) */}
      {/* ==================================================== */}
      {activeCourseForLessons && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-fade-in-up">
          <div
            className="w-full max-w-3xl rounded-3xl p-6 sm:p-8 max-h-[92vh] overflow-y-auto"
            style={{
              background: "var(--paper-card)",
              border: "1px solid var(--line)",
              boxShadow: "0 25px 50px -12px rgba(0,0,0,0.25)",
            }}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b" style={{ borderColor: "var(--line)" }}>
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 block">
                  Gestionnaire de Leçons
                </span>
                <h2 className="font-serif text-2xl font-bold" style={{ color: "var(--ink)" }}>
                  {activeCourseForLessons.title}
                </h2>
                <p className="text-xs text-slate-500">
                  Ajoutez et organisez les leçons interactives de ce cours (texte, vidéo, PDF).
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveCourseForLessons(null)}
                className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-black/5 text-slate-400"
              >
                ✕
              </button>
            </div>

            {/* List of Existing Lessons */}
            <div className="mt-5">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
                Leçons existantes ({activeCourseForLessons.lessons?.length || 0})
              </h4>

              {(!activeCourseForLessons.lessons || activeCourseForLessons.lessons.length === 0) && (
                <div className="p-6 text-center rounded-2xl bg-slate-50 border border-dashed border-slate-200">
                  <p className="text-xs text-slate-500">
                    Aucune leçon n&apos;a encore été ajoutée à ce cours. Utilisez le formulaire ci-dessous pour ajouter la première leçon !
                  </p>
                </div>
              )}

              <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
                {activeCourseForLessons.lessons?.map((lesson, idx) => {
                  return (
                    <div
                      key={lesson.id}
                      className="flex items-center justify-between p-3.5 rounded-2xl border bg-white/70 hover:bg-white transition-colors"
                      style={{ borderColor: "var(--line)" }}
                    >
                      <div className="flex items-center gap-3">
                        <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-indigo-50 text-indigo-700 text-xs font-bold font-mono">
                          {idx + 1}
                        </span>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold" style={{ color: "var(--ink)" }}>
                              {lesson.title}
                            </span>
                            <span className="text-[10px] font-bold uppercase rounded-md px-1.5 py-0.5 bg-slate-100 text-slate-600 font-mono">
                              {lesson.type === LessonType.VIDEO ? "🎬 Vidéo" : lesson.type === LessonType.PDF ? "📄 PDF" : "📝 Texte"}
                            </span>
                          </div>
                          {lesson.description && (
                            <p className="text-[11px] text-slate-500 line-clamp-1">{lesson.description}</p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingLesson(lesson);
                            setLessonForm({
                              title: lesson.title,
                              description: lesson.description || "",
                              type: lesson.type as LessonType,
                              textContent: lesson.textContent || "",
                              youtubeUrl: lesson.youtubeUrl || "",
                              pdfFile: lesson.pdfFile || "",
                              durationMinutes: lesson.durationMinutes || 15,
                              orderIndex: lesson.orderIndex,
                            });
                          }}
                          className="rounded-lg px-2 py-1 text-xs font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200"
                        >
                          Modifier
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteLesson(lesson.id, lesson.title)}
                          className="rounded-lg px-2 py-1 text-xs font-semibold bg-rose-50 text-rose-600 hover:bg-rose-100"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Form: Add or Edit Lesson */}
            <div className="mt-6 pt-5 border-t" style={{ borderColor: "var(--line)" }}>
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-700">
                  {editingLesson ? `Modifier la leçon #${editingLesson.id}` : "+ Ajouter une nouvelle leçon"}
                </h4>
                {editingLesson && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingLesson(null);
                      setLessonForm({
                        title: "",
                        description: "",
                        type: LessonType.VIDEO,
                        textContent: "",
                        youtubeUrl: "",
                        pdfFile: "",
                        durationMinutes: 15,
                        orderIndex: (activeCourseForLessons.lessons?.length || 0) + 1,
                      });
                    }}
                    className="text-xs text-slate-500 hover:text-slate-800"
                  >
                    Annuler la modification
                  </button>
                )}
              </div>

              <form onSubmit={handleSaveLesson} className="space-y-4 rounded-2xl p-4 bg-slate-50/80 border border-slate-200">
                {/* Title & Type */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold mb-1 text-slate-800">
                      Titre de la leçon *
                    </label>
                    <input
                      type="text"
                      required
                      value={lessonForm.title}
                      onChange={(e) => setLessonForm({ ...lessonForm, title: e.target.value })}
                      placeholder="ex: Leçon 1 : Théorème de Pythagore et applications"
                      className="w-full rounded-xl border bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold mb-1 text-slate-800">
                      Format principal *
                    </label>
                    <select
                      value={lessonForm.type}
                      onChange={(e) => setLessonForm({ ...lessonForm, type: e.target.value as LessonType })}
                      className="w-full rounded-xl border bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500 font-semibold"
                    >
                      <option value={LessonType.VIDEO}>🎬 Vidéo YouTube</option>
                      <option value={LessonType.TEXT}>📝 Cours Texte</option>
                      <option value={LessonType.PDF}>📄 Fichier PDF</option>
                    </select>
                  </div>
                </div>

                {/* Conditional Fields Based on Lesson Type */}
                {lessonForm.type === LessonType.VIDEO && (
                  <div>
                    <label className="block text-xs font-semibold mb-1 text-slate-800">
                      Lien Vidéo YouTube *
                    </label>
                    <input
                      type="url"
                      required
                      value={lessonForm.youtubeUrl}
                      onChange={(e) => setLessonForm({ ...lessonForm, youtubeUrl: e.target.value })}
                      placeholder="https://www.youtube.com/watch?v=..."
                      className="w-full rounded-xl border bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500"
                    />
                  </div>
                )}

                {lessonForm.type === LessonType.TEXT && (
                  <div>
                    <label className="block text-xs font-semibold mb-1 text-slate-800">
                      Contenu écrit / Notes de cours (Markdown supporté) *
                    </label>
                    <textarea
                      rows={5}
                      required
                      value={lessonForm.textContent}
                      onChange={(e) => setLessonForm({ ...lessonForm, textContent: e.target.value })}
                      placeholder="Rédigez ici le cours complet, formules, théorèmes, définitions..."
                      className="w-full rounded-xl border bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500 font-mono text-xs"
                    />
                  </div>
                )}

                {lessonForm.type === LessonType.PDF && (
                  <div>
                    <label className="block text-xs font-semibold mb-1 text-slate-800">
                      Fichier PDF (Polycopié / Série d&apos;exercices) *
                    </label>
                    <input
                      type="file"
                      accept="application/pdf"
                      required={!lessonForm.pdfFile}
                      onChange={(e) => setSelectedPdfFile(e.target.files?.[0] || null)}
                      className="w-full rounded-xl border bg-white px-2.5 py-1.5 text-xs file:mr-2 file:py-1 file:px-2 file:rounded-lg file:border-0 file:text-xs file:bg-indigo-50 file:text-indigo-700"
                    />
                    {lessonForm.pdfFile && !selectedPdfFile && (
                      <span className="text-[11px] text-slate-500 mt-1 block">
                        Fichier existant : {lessonForm.pdfFile}
                      </span>
                    )}
                  </div>
                )}

                {/* Description & Order/Duration */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold mb-1 text-slate-800">
                      Brève explication de la leçon
                    </label>
                    <input
                      type="text"
                      value={lessonForm.description}
                      onChange={(e) => setLessonForm({ ...lessonForm, description: e.target.value })}
                      placeholder="Notions abordées dans cette leçon..."
                      className="w-full rounded-xl border bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold mb-1 text-slate-800">
                      Durée estimée (minutes)
                    </label>
                    <input
                      type="number"
                      min={1}
                      value={lessonForm.durationMinutes}
                      onChange={(e) => setLessonForm({ ...lessonForm, durationMinutes: parseInt(e.target.value) || 15 })}
                      className="w-full rounded-xl border bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500 font-mono"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <Button type="submit" disabled={submitting || uploadingFile} className="text-xs font-bold">
                    {submitting ? "Publication en cours…" : editingLesson ? "Mettre à jour la leçon" : "Publier la leçon"}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
