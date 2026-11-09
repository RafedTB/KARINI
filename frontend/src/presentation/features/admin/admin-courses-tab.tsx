"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { Course } from "@/domain/entities/course";
import type { Lesson } from "@/domain/entities/lesson";
import type { Subject } from "@/domain/entities/subject";
import { CourseSection, LessonType } from "@/domain/enums";
import { coursesService } from "@/application/services/courses-service";
import { SubjectIcon } from "@/presentation/features/courses/subject-icons";
import { SearchInput } from "@/presentation/components/ui/search-input";
import { Button } from "@/presentation/components/ui/button";
import { formatCourseSection } from "@/shared/labels/course-section";
import {
  GraduationCapIcon,
  BookOpenIcon,
  VideoCameraIcon,
  FileTextIcon,
  EyeIcon,
  PaperclipIcon,
  PenEditIcon,
  RadioLiveIcon,
  AlertCircleIcon,
} from "@/presentation/components/ui/icons";

type AdminCoursesTabProps = {
  courses: Course[];
  subjects: Subject[];
  filieres: string[];
  token: string;
  onRefresh: () => void;
  showNotification: (msg: string) => void;
};

export function AdminCoursesTab({
  courses,
  subjects,
  filieres,
  token,
  onRefresh,
  showNotification,
}: AdminCoursesTabProps) {
  // Filter states
  const [levelFilter, setLevelFilter] = useState<string>("all");
  const [subjectFilter, setSubjectFilter] = useState<string>("all");
  const [sectionFilter, setSectionFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Modals state
  const [showCourseModal, setShowCourseModal] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [activeCourseForLessons, setActiveCourseForLessons] = useState<Course | null>(null);
  const [editingLesson, setEditingLesson] = useState<Lesson | null>(null);

  // Form states
  const [courseForm, setCourseForm] = useState({
    title: "",
    description: "",
    section: CourseSection.COURSE as CourseSection,
    filiere: "Bac Informatique",
    subject: "algo-bac-info",
    textContent: "",
    youtubeUrl: "",
    videoFile: "",
    pdfFile: "",
  });

  const [lessonForm, setLessonForm] = useState({
    title: "",
    description: "",
    type: LessonType.VIDEO as LessonType,
    textContent: "",
    youtubeUrl: "",
    videoFile: "",
    pdfFile: "",
    durationMinutes: 15,
    orderIndex: 1,
  });

  const [selectedPdfFile, setSelectedPdfFile] = useState<File | null>(null);
  const [selectedVideoFile, setSelectedVideoFile] = useState<File | null>(null);
  const [selectedLessonVideoFile, setSelectedLessonVideoFile] = useState<File | null>(null);
  const [selectedLessonPdfFile, setSelectedLessonPdfFile] = useState<File | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [uploadingPdf, setUploadingPdf] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const normalize = (str?: string | null) =>
    (str || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim();

  // Distinct list of filières from DB or fallback
  const availableFilieres = useMemo(() => {
    const list = Array.from(new Set([...filieres, ...subjects.map((s) => s.filiere)])).filter(Boolean);
    if (!list.includes("Bac Informatique")) list.push("Bac Informatique");
    return list.sort();
  }, [filieres, subjects]);

  // Subjects filtered for the filter dropdown
  const filterSubjects = useMemo(() => {
    if (levelFilter === "all") return subjects;
    const normLevel = normalize(levelFilter);
    return subjects.filter((s) => {
      const sFil = normalize(s.filiere);
      return sFil === normLevel || sFil.includes(normLevel) || normLevel.includes(sFil);
    });
  }, [subjects, levelFilter]);

  // Subjects dynamically available for the Course creation/edit modal based on chosen filière
  const modalSubjects = useMemo(() => {
    const selectedFilNorm = normalize(courseForm.filiere);
    const list = subjects.filter((s) => {
      const sFilNorm = normalize(s.filiere);
      return (
        sFilNorm === "all" ||
        sFilNorm === selectedFilNorm ||
        (selectedFilNorm && sFilNorm.includes(selectedFilNorm)) ||
        (sFilNorm && selectedFilNorm.includes(sFilNorm))
      );
    });

    if (list.length > 0) return list;
    // Fallback if subjects haven't been seeded for a custom filière
    return subjects;
  }, [subjects, courseForm.filiere]);

  // When changing filière in course modal, update subject automatically
  const handleFiliereChangeInModal = (newFiliere: string) => {
    const newFilNorm = normalize(newFiliere);
    const available = subjects.filter((s) => {
      const sFilNorm = normalize(s.filiere);
      return sFilNorm === newFilNorm || sFilNorm.includes(newFilNorm) || newFilNorm.includes(sFilNorm);
    });

    const isCurrentValid = available.some(
      (s) => (s.slug || s.code.toLowerCase()) === courseForm.subject
    );

    const nextSubject = isCurrentValid
      ? courseForm.subject
      : available[0]?.slug || available[0]?.code?.toLowerCase() || (subjects[0]?.slug || "math");

    setCourseForm((prev) => ({
      ...prev,
      filiere: newFiliere,
      subject: nextSubject,
    }));
  };

  // Filtered courses list
  const filteredCourses = useMemo(() => {
    return courses.filter((c) => {
      // Level match
      if (levelFilter !== "all") {
        const cFil = normalize(c.filiere);
        const reqFil = normalize(levelFilter);
        if (cFil && cFil !== reqFil && !cFil.includes(reqFil) && !reqFil.includes(cFil)) {
          return false;
        }
      }

      // Subject match
      if (subjectFilter !== "all") {
        const cSub = normalize(c.subject);
        const reqSub = normalize(subjectFilter);
        if (cSub !== reqSub && !cSub.includes(reqSub)) {
          return false;
        }
      }

      // Section match
      if (sectionFilter !== "all" && c.section !== sectionFilter) {
        return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = normalize(searchQuery);
        const inTitle = normalize(c.title).includes(q);
        const inDesc = normalize(c.description).includes(q);
        const inFiliere = normalize(c.filiere).includes(q);
        const inSubject = normalize(c.subject).includes(q);
        if (!inTitle && !inDesc && !inFiliere && !inSubject) return false;
      }

      return true;
    });
  }, [courses, levelFilter, subjectFilter, sectionFilter, searchQuery]);

  // Open modal for creating new course
  const handleOpenAddCourse = (prefilledFiliere?: string) => {
    const defaultFil = prefilledFiliere || (levelFilter !== "all" ? levelFilter : "Bac Informatique");
    const matchingSubs = subjects.filter((s) => normalize(s.filiere) === normalize(defaultFil));
    const defaultSub = matchingSubs[0]?.slug || matchingSubs[0]?.code?.toLowerCase() || (subjects[0]?.slug || "math");

    setEditingCourse(null);
    setSelectedPdfFile(null);
    setSelectedVideoFile(null);
    setErrorMsg("");
    setCourseForm({
      title: "",
      description: "",
      section: CourseSection.COURSE,
      filiere: defaultFil,
      subject: defaultSub,
      textContent: "",
      youtubeUrl: "",
      videoFile: "",
      pdfFile: "",
    });
    setShowCourseModal(true);
  };

  // Open modal for editing existing course
  const handleOpenEditCourse = (course: Course) => {
    setEditingCourse(course);
    setSelectedPdfFile(null);
    setSelectedVideoFile(null);
    setErrorMsg("");
    setCourseForm({
      title: course.title,
      description: course.description || "",
      section: (course.section as CourseSection) || CourseSection.COURSE,
      filiere: course.filiere || "Bac Informatique",
      subject: course.subject || "math",
      textContent: course.textContent || "",
      youtubeUrl: course.youtubeUrl || "",
      videoFile: course.videoFile || "",
      pdfFile: course.pdfFile || "",
    });
    setShowCourseModal(true);
  };

  // Submit Course (Create or Update)
  const handleSubmitCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    if (!courseForm.title.trim()) {
      setErrorMsg("Le titre du cours est obligatoire.");
      return;
    }

    try {
      setSubmitting(true);
      setErrorMsg("");

      let uploadedPdfFilename = courseForm.pdfFile;
      if (selectedPdfFile) {
        setUploadingPdf(true);
        const res = await coursesService.uploadFile(token, selectedPdfFile);
        uploadedPdfFilename = res.filename;
        setUploadingPdf(false);
      }

      let uploadedVideoFilename = courseForm.videoFile;
      if (selectedVideoFile) {
        setUploadingVideo(true);
        const res = await coursesService.uploadVideo(token, selectedVideoFile);
        uploadedVideoFilename = res.filename;
        setUploadingVideo(false);
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
          videoFile: uploadedVideoFilename || undefined,
          pdfFile: uploadedPdfFilename || undefined,
        });
        showNotification(`Cours "${courseForm.title}" mis à jour avec succès dans la base de données !`);
      } else {
        await coursesService.createCourse(token, {
          title: courseForm.title,
          description: courseForm.description,
          section: courseForm.section,
          subject: courseForm.subject,
          filiere: courseForm.filiere,
          textContent: courseForm.textContent || undefined,
          youtubeUrl: courseForm.youtubeUrl || undefined,
          videoFile: uploadedVideoFilename || undefined,
          pdfFile: uploadedPdfFilename || undefined,
        });
        showNotification(`Nouveau cours "${courseForm.title}" ajouté à la classe ${courseForm.filiere} avec succès !`);
      }

      setShowCourseModal(false);
      setEditingCourse(null);
      onRefresh();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Erreur lors de l'enregistrement du cours.");
    } finally {
      setSubmitting(false);
      setUploadingPdf(false);
      setUploadingVideo(false);
    }
  };

  // Delete Course
  const handleDeleteCourse = async (id: number, title: string) => {
    if (!token) return;
    if (!confirm(`Supprimer définitivement le cours "${title}" et toutes ses leçons de la base de données ?`)) {
      return;
    }
    try {
      await coursesService.deleteCourse(token, id);
      showNotification(`Le cours "${title}" a été supprimé de la base de données.`);
      onRefresh();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Erreur lors de la suppression du cours.");
    }
  };

  // Open Lesson Manager
  const handleOpenLessonsModal = (course: Course) => {
    setActiveCourseForLessons(course);
    setEditingLesson(null);
    setSelectedLessonVideoFile(null);
    setSelectedLessonPdfFile(null);
    setLessonForm({
      title: "",
      description: "",
      type: LessonType.VIDEO,
      textContent: "",
      youtubeUrl: "",
      videoFile: "",
      pdfFile: "",
      durationMinutes: 15,
      orderIndex: (course.lessons?.length || 0) + 1,
    });
  };

  // Save Lesson
  const handleSaveLesson = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !activeCourseForLessons) return;
    if (!lessonForm.title.trim()) {
      alert("Le titre de la leçon est requis.");
      return;
    }

    try {
      setSubmitting(true);
      let uploadedVideo = lessonForm.videoFile;
      if (selectedLessonVideoFile) {
        const res = await coursesService.uploadVideo(token, selectedLessonVideoFile);
        uploadedVideo = res.filename;
      }

      let uploadedPdf = lessonForm.pdfFile;
      if (selectedLessonPdfFile) {
        const res = await coursesService.uploadFile(token, selectedLessonPdfFile);
        uploadedPdf = res.filename;
      }

      if (editingLesson) {
        await coursesService.updateLesson(token, editingLesson.id, {
          title: lessonForm.title,
          description: lessonForm.description,
          type: lessonForm.type,
          textContent: lessonForm.textContent || undefined,
          youtubeUrl: lessonForm.youtubeUrl || undefined,
          videoFile: uploadedVideo || undefined,
          pdfFile: uploadedPdf || undefined,
          durationMinutes: Number(lessonForm.durationMinutes) || 15,
          orderIndex: Number(lessonForm.orderIndex) || 1,
        });
        showNotification("Leçon mise à jour !");
      } else {
        await coursesService.createLesson(token, activeCourseForLessons.id, {
          title: lessonForm.title,
          description: lessonForm.description,
          type: lessonForm.type,
          textContent: lessonForm.textContent || undefined,
          youtubeUrl: lessonForm.youtubeUrl || undefined,
          videoFile: uploadedVideo || undefined,
          pdfFile: uploadedPdf || undefined,
          durationMinutes: Number(lessonForm.durationMinutes) || 15,
          orderIndex: Number(lessonForm.orderIndex) || (activeCourseForLessons.lessons?.length || 0) + 1,
        });
        showNotification("Nouvelle leçon ajoutée au cours !");
      }

      setEditingLesson(null);
      setSelectedLessonVideoFile(null);
      setSelectedLessonPdfFile(null);
      setLessonForm({
        title: "",
        description: "",
        type: LessonType.VIDEO,
        textContent: "",
        youtubeUrl: "",
        videoFile: "",
        pdfFile: "",
        durationMinutes: 15,
        orderIndex: (activeCourseForLessons.lessons?.length || 0) + 2,
      });

      // Reload courses
      onRefresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Erreur lors de l'enregistrement de la leçon.");
    } finally {
      setSubmitting(false);
    }
  };

  // Delete Lesson
  const handleDeleteLesson = async (lessonId: number) => {
    if (!token || !activeCourseForLessons) return;
    if (!confirm("Voulez-vous supprimer cette leçon ?")) return;
    try {
      await coursesService.deleteLesson(token, lessonId);
      showNotification("Leçon supprimée.");
      onRefresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Erreur lors de la suppression.");
    }
  };

  // Helper to find subject metadata
  const getSubjectMeta = (subjectSlugOrCode?: string | null) => {
    if (!subjectSlugOrCode) return null;
    const clean = normalize(subjectSlugOrCode);
    return subjects.find(
      (s) =>
        normalize(s.slug) === clean ||
        normalize(s.code) === clean ||
        normalize(s.name) === clean
    );
  };

  return (
    <div className="space-y-6">
      {/* Top Controls Bar */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-1 flex-wrap items-center gap-3">
          <SearchInput
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Rechercher par titre de cours, mot-clé..."
          />

          {/* Level / Filière Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-semibold" style={{ color: "var(--muted)" }}>
              Niveau / Filière :
            </span>
            <select
              value={levelFilter}
              onChange={(e) => {
                setLevelFilter(e.target.value);
                setSubjectFilter("all");
              }}
              className="rounded-xl border bg-white/90 px-3 py-1.5 text-xs font-semibold outline-none transition-all focus:border-indigo-500 cursor-pointer shadow-xs"
              style={{ borderColor: "var(--line)", color: "var(--ink)" }}
            >
              <option value="all">Tous les niveaux ({courses.length})</option>
              {availableFilieres.map((f) => {
                const count = courses.filter((c) => normalize(c.filiere) === normalize(f)).length;
                return (
                  <option key={f} value={f}>
                    {f} ({count})
                  </option>
                );
              })}
            </select>
          </div>

          {/* Subject Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-semibold" style={{ color: "var(--muted)" }}>
              Matière :
            </span>
            <select
              value={subjectFilter}
              onChange={(e) => setSubjectFilter(e.target.value)}
              className="rounded-xl border bg-white/90 px-3 py-1.5 text-xs font-semibold outline-none transition-all focus:border-indigo-500 cursor-pointer shadow-xs max-w-[200px]"
              style={{ borderColor: "var(--line)", color: "var(--ink)" }}
            >
              <option value="all">Toutes les matières</option>
              {filterSubjects.map((s) => (
                <option key={s.id} value={s.slug || s.code.toLowerCase()}>
                  {s.name} ({s.code})
                </option>
              ))}
            </select>
          </div>

          {/* Section Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-semibold" style={{ color: "var(--muted)" }}>
              Type :
            </span>
            <select
              value={sectionFilter}
              onChange={(e) => setSectionFilter(e.target.value)}
              className="rounded-xl border bg-white/90 px-3 py-1.5 text-xs font-semibold outline-none transition-all focus:border-indigo-500 cursor-pointer shadow-xs"
              style={{ borderColor: "var(--line)", color: "var(--ink)" }}
            >
              <option value="all">Tous les types</option>
              <option value={CourseSection.COURSE}>Cours Vidéo</option>
              <option value={CourseSection.EXERCISE}>Exercices PDF</option>
              <option value={CourseSection.MAGAZINE}>Magazines PDF</option>
              <option value={CourseSection.OLDLIVE}>Directs & Archives</option>
            </select>
          </div>
        </div>

        {/* Add Course Button */}
        <Button
          type="button"
          onClick={() => handleOpenAddCourse()}
          className="flex items-center gap-2 rounded-xl text-xs sm:text-sm font-bold shadow-md cursor-pointer shrink-0"
          style={{ background: "linear-gradient(135deg, #4f46e5, #06b6d4)" }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          + Ajouter un Cours {levelFilter !== "all" ? `(${levelFilter})` : ""}
        </Button>
      </div>

      {/* Quick Level Shortcuts (e.g. Bac Informatique, 2ème Info, etc.) */}
      <div className="flex flex-wrap items-center gap-2 pt-1 pb-2">
        <span className="text-xs font-bold text-slate-500">Accès rapide par niveau :</span>
        <button
          type="button"
          onClick={() => {
            setLevelFilter("all");
            setSubjectFilter("all");
          }}
          className={`px-3 py-1 text-xs rounded-full font-semibold transition-all ${
            levelFilter === "all"
              ? "bg-indigo-600 text-white shadow-sm"
              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
          }`}
        >
          Tous les niveaux ({courses.length})
        </button>
        {availableFilieres.map((fil) => {
          const isSelected = levelFilter === fil;
          const count = courses.filter((c) => normalize(c.filiere) === normalize(fil)).length;
          return (
            <button
              key={fil}
              type="button"
              onClick={() => {
                setLevelFilter(fil);
                setSubjectFilter("all");
              }}
              className={`px-3 py-1 text-xs rounded-full font-semibold transition-all flex items-center gap-1.5 ${
                isSelected
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-50"
              }`}
            >
              <GraduationCapIcon size={13} className={isSelected ? "text-white" : "text-indigo-600"} />
              <span>{fil}</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                  isSelected ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500"
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {errorMsg && (
        <div className="rounded-2xl bg-rose-500/10 border border-rose-500/20 px-4 py-3 text-sm font-medium text-rose-600 flex items-center gap-2">
          <AlertCircleIcon size={16} />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Courses Cards / Table Grid */}
      {filteredCourses.length === 0 ? (
        <div
          className="glass-card px-8 py-16 text-center rounded-3xl"
          style={{ borderStyle: "dashed" }}
        >
          <div
            className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl mb-4 bg-indigo-50 text-indigo-600"
          >
            <BookOpenIcon size={28} />
          </div>
          <h3 className="font-serif text-xl font-bold" style={{ color: "var(--ink)" }}>
            Aucun cours trouvé dans la base de données
          </h3>
          <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">
            {levelFilter !== "all"
              ? `Il n'y a pas encore de cours enregistrés pour le niveau "${levelFilter}".`
              : "Aucun cours ne correspond aux filtres actuels."}
          </p>
          <div className="mt-5">
            <Button
              type="button"
              onClick={() => handleOpenAddCourse(levelFilter !== "all" ? levelFilter : undefined)}
              className="text-xs font-semibold"
            >
              + Publier le premier cours {levelFilter !== "all" ? `pour ${levelFilter}` : ""}
            </Button>
          </div>
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {filteredCourses.map((c) => {
            const subjectMeta = getSubjectMeta(c.subject);
            const lessonsCount = c.lessons?.length || 0;
            const hasVideo = Boolean(c.videoFile || c.youtubeUrl || c.lessons?.some((l) => l.videoFile || l.youtubeUrl));
            const hasPdf = Boolean(c.pdfFile || c.lessons?.some((l) => l.pdfFile));

            return (
              <div
                key={c.id}
                className="glass-card group flex flex-col justify-between rounded-3xl p-5 border transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5"
                style={{
                  borderColor: subjectMeta?.color ? `${subjectMeta.color}35` : "var(--line)",
                  background: "var(--paper-card)",
                }}
              >
                <div>
                  {/* Card Header: Level & Section Badges */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider bg-indigo-50 text-indigo-700 border border-indigo-200">
                      <GraduationCapIcon size={12} className="text-indigo-600" />
                      <span>{c.filiere || "Tous niveaux"}</span>
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold bg-slate-100 text-slate-700">
                      {c.section === CourseSection.COURSE && <VideoCameraIcon size={12} className="text-purple-600" />}
                      {c.section === CourseSection.EXERCISE && <PenEditIcon size={12} className="text-blue-600" />}
                      {c.section === CourseSection.MAGAZINE && <FileTextIcon size={12} className="text-emerald-600" />}
                      {c.section === CourseSection.OLDLIVE && <RadioLiveIcon size={12} className="text-rose-600" />}
                      <span>{formatCourseSection(c.section as CourseSection)}</span>
                    </span>
                  </div>

                  {/* Subject Title & Icon */}
                  <div className="flex items-start gap-3 mt-1">
                    <div
                      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl"
                      style={{
                        backgroundColor: subjectMeta?.color ? `${subjectMeta.color}15` : "#e0e7ff",
                        border: `1px solid ${subjectMeta?.color ? `${subjectMeta.color}30` : "#c7d2fe"}`,
                      }}
                    >
                      <SubjectIcon
                        subjectId={subjectMeta?.icon || subjectMeta?.code || c.subject || "math"}
                        size={22}
                        color={subjectMeta?.color || "#4f46e5"}
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
                        {subjectMeta?.name || c.subject || "Matière"}
                      </span>
                      <h4
                        className="font-serif text-base font-bold leading-snug line-clamp-2 mt-0.5"
                        style={{ color: "var(--ink)" }}
                        title={c.title}
                      >
                        {c.title}
                      </h4>
                    </div>
                  </div>

                  {/* Description preview */}
                  {c.description && (
                    <p className="mt-2.5 text-xs text-slate-500 line-clamp-2 leading-relaxed">
                      {c.description}
                    </p>
                  )}

                  {/* Resource Badges */}
                  <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px]">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 font-semibold text-slate-700">
                      <BookOpenIcon size={11} className="text-slate-600" />
                      <span>{lessonsCount} {lessonsCount > 1 ? "leçons" : "leçon"}</span>
                    </span>
                    {hasVideo && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-purple-50 font-semibold text-purple-700 border border-purple-200">
                        <VideoCameraIcon size={11} className="text-purple-600" />
                        <span>Vidéo</span>
                      </span>
                    )}
                    {hasPdf && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 font-semibold text-emerald-700 border border-emerald-200">
                        <FileTextIcon size={11} className="text-emerald-600" />
                        <span>PDF</span>
                      </span>
                    )}
                    {c.instructor && (
                      <span className="text-slate-400 text-[10px]">
                        Par {c.instructor.firstname ? `${c.instructor.firstname} ${c.instructor.lastname || ""}` : c.instructor.username}
                      </span>
                    )}
                  </div>
                </div>

                {/* Card Action Footer */}
                <div className="mt-5 pt-3 border-t flex flex-wrap items-center justify-between gap-2" style={{ borderColor: "var(--line)" }}>
                  <div className="flex items-center gap-1.5">
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => handleOpenLessonsModal(c)}
                      className="px-2.5 py-1 text-xs font-semibold rounded-lg flex items-center gap-1"
                    >
                      <FileTextIcon size={12} />
                      <span>Leçons ({lessonsCount})</span>
                    </Button>
                    <Link
                      href={`/courses/view/${c.id}`}
                      target="_blank"
                      className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-indigo-600 hover:text-indigo-800 rounded-lg hover:bg-indigo-50"
                    >
                      <EyeIcon size={12} />
                      <span>Voir</span>
                    </Link>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleOpenEditCourse(c)}
                      title="Modifier le cours"
                      className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                    >
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteCourse(c.id, c.title)}
                      title="Supprimer le cours"
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                    >
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* =========================================================================
          COURSE ADD / EDIT MODAL
          ========================================================================= */}
      {showCourseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in overflow-y-auto">
          <div className="relative w-full max-w-2xl rounded-3xl bg-white p-6 sm:p-8 shadow-2xl my-8 border border-slate-100 animate-scale-up">
            <div className="flex items-center justify-between border-b pb-4 mb-5">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-indigo-600">
                  {editingCourse ? "Édition du Cours" : "Nouveau Cours Direct Base de Données"}
                </span>
                <h3 className="font-serif text-2xl font-bold text-slate-900">
                  {editingCourse ? "Modifier le cours" : "Créer un nouveau cours"}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowCourseModal(false)}
                className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitCourse} className="space-y-4">
              {/* Level / Filière and Subject Row */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Niveau / Filière Scolaire *
                  </label>
                  <select
                    value={courseForm.filiere}
                    onChange={(e) => handleFiliereChangeInModal(e.target.value)}
                    required
                    className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm font-semibold text-slate-900 focus:border-indigo-600 focus:outline-none"
                  >
                    {availableFilieres.map((f) => (
                      <option key={f} value={f}>
                        {f}
                      </option>
                    ))}
                  </select>
                  <p className="mt-1 text-[11px] text-slate-500">
                    Ex: Bac Informatique, 2ème Informatique, etc.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Matière (Base de Données) *
                  </label>
                  <select
                    value={courseForm.subject}
                    onChange={(e) => setCourseForm({ ...courseForm, subject: e.target.value })}
                    required
                    className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm font-semibold text-slate-900 focus:border-indigo-600 focus:outline-none"
                  >
                    {modalSubjects.map((s) => (
                      <option key={s.id} value={s.slug || s.code.toLowerCase()}>
                        {s.name} ({s.code})
                      </option>
                    ))}
                  </select>
                  <p className="mt-1 text-[11px] text-slate-500">
                    Matières configurées pour {courseForm.filiere}
                  </p>
                </div>
              </div>

              {/* Title & Section */}
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Titre du cours *
                  </label>
                  <input
                    type="text"
                    required
                    value={courseForm.title}
                    onChange={(e) => setCourseForm({ ...courseForm, title: e.target.value })}
                    placeholder="Ex: Chapitre 1 : Les Structures de Données Avancées"
                    className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm text-slate-900 focus:border-indigo-600 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Section *
                  </label>
                  <select
                    value={courseForm.section}
                    onChange={(e) => setCourseForm({ ...courseForm, section: e.target.value as CourseSection })}
                    required
                    className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm font-semibold text-slate-900 focus:border-indigo-600 focus:outline-none"
                  >
                    <option value={CourseSection.COURSE}>Cours Vidéo</option>
                    <option value={CourseSection.EXERCISE}>Exercices PDF</option>
                    <option value={CourseSection.MAGAZINE}>Magazines PDF</option>
                    <option value={CourseSection.OLDLIVE}>Archive Direct</option>
                  </select>
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Description / Objectifs pédagogiques
                </label>
                <textarea
                  rows={2}
                  value={courseForm.description}
                  onChange={(e) => setCourseForm({ ...courseForm, description: e.target.value })}
                  placeholder="Présentation des concepts clés abordés dans ce module..."
                  className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm text-slate-900 focus:border-indigo-600 focus:outline-none"
                />
              </div>

              {/* Media Attachments Section */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <PaperclipIcon size={14} className="text-slate-600" />
                  <span>Médias et Contenus (Optionnels)</span>
                </h4>

                <div className="grid gap-3 sm:grid-cols-2">
                  {/* YouTube URL */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">
                      Lien Vidéo YouTube
                    </label>
                    <input
                      type="url"
                      value={courseForm.youtubeUrl}
                      onChange={(e) => setCourseForm({ ...courseForm, youtubeUrl: e.target.value })}
                      placeholder="https://www.youtube.com/watch?v=..."
                      className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-xs text-slate-900 focus:border-indigo-600 focus:outline-none"
                    />
                  </div>

                  {/* Video Upload from PC */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">
                      OU Fichier Vidéo Direct (PC)
                    </label>
                    <input
                      type="file"
                      accept="video/mp4,video/webm,video/quicktime,video/x-matroska"
                      onChange={(e) => setSelectedVideoFile(e.target.files?.[0] || null)}
                      className="w-full text-xs text-slate-500 file:mr-2 file:py-1 file:px-2.5 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                    />
                    {courseForm.videoFile && !selectedVideoFile && (
                      <span className="text-[10px] text-emerald-600 block mt-0.5">
                        Vidéo existante: {courseForm.videoFile}
                      </span>
                    )}
                  </div>
                </div>

                {/* PDF File Upload */}
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Document PDF (Support de cours ou Exercice / Magazine)
                  </label>
                  <input
                    type="file"
                    accept="application/pdf"
                    onChange={(e) => setSelectedPdfFile(e.target.files?.[0] || null)}
                    className="w-full text-xs text-slate-500 file:mr-2 file:py-1 file:px-2.5 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100"
                  />
                  {courseForm.pdfFile && !selectedPdfFile && (
                    <span className="text-[10px] text-emerald-600 block mt-0.5">
                      PDF existant: {courseForm.pdfFile}
                    </span>
                  )}
                </div>

                {/* Text Notes */}
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Synthèse de cours ou notes écrites
                  </label>
                  <textarea
                    rows={2}
                    value={courseForm.textContent}
                    onChange={(e) => setCourseForm({ ...courseForm, textContent: e.target.value })}
                    placeholder="Formules, théorèmes ou explications écrites..."
                    className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-xs text-slate-900 focus:border-indigo-600 focus:outline-none"
                  />
                </div>
              </div>

              {/* Form Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setShowCourseModal(false)}
                  disabled={submitting}
                  className="text-xs"
                >
                  Annuler
                </Button>
                <Button
                  type="submit"
                  disabled={submitting}
                  className="text-xs font-bold"
                >
                  {submitting
                    ? uploadingVideo
                      ? "Téléversement de la vidéo..."
                      : uploadingPdf
                      ? "Téléversement du PDF..."
                      : "Enregistrement en base..."
                    : editingCourse
                    ? "Mettre à jour le cours"
                    : "Enregistrer dans la base de données"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          LESSONS MANAGER MODAL
          ========================================================================= */}
      {activeCourseForLessons && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in overflow-y-auto">
          <div className="relative w-full max-w-3xl rounded-3xl bg-white p-6 sm:p-8 shadow-2xl my-8 border border-slate-100 animate-scale-up">
            <div className="flex items-center justify-between border-b pb-4 mb-5">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-indigo-600">
                  Gestion des Leçons
                </span>
                <h3 className="font-serif text-xl font-bold text-slate-900">
                  {activeCourseForLessons.title}
                </h3>
                <span className="text-xs text-slate-500">
                  Niveau : <strong>{activeCourseForLessons.filiere}</strong> • Matière : <strong>{activeCourseForLessons.subject}</strong>
                </span>
              </div>
              <button
                type="button"
                onClick={() => setActiveCourseForLessons(null)}
                className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            {/* Existing Lessons List */}
            <div className="mb-6 space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Leçons existantes ({activeCourseForLessons.lessons?.length || 0})
              </h4>

              {(!activeCourseForLessons.lessons || activeCourseForLessons.lessons.length === 0) ? (
                <div className="p-4 text-center rounded-xl bg-slate-50 text-xs text-slate-500">
                  Aucune leçon spécifique pour ce cours. Vous pouvez en ajouter ci-dessous.
                </div>
              ) : (
                <div className="max-h-56 overflow-y-auto space-y-2 pr-1">
                  {activeCourseForLessons.lessons
                    .sort((a, b) => a.orderIndex - b.orderIndex)
                    .map((l) => (
                      <div
                        key={l.id}
                        className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs"
                      >
                        <div className="flex items-center gap-2.5">
                          <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-indigo-600 text-white text-[11px] font-bold">
                            {l.orderIndex}
                          </span>
                          <div>
                            <span className="font-bold text-slate-800 block">{l.title}</span>
                            <span className="text-[10px] text-slate-500">
                              Type: {l.type} • {l.durationMinutes || 15} min
                              {l.videoFile && " • Vidéo PC"}
                              {l.youtubeUrl && " • YouTube"}
                              {l.pdfFile && " • PDF"}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingLesson(l);
                              setLessonForm({
                                title: l.title,
                                description: l.description || "",
                                type: (l.type as LessonType) || LessonType.VIDEO,
                                textContent: l.textContent || "",
                                youtubeUrl: l.youtubeUrl || "",
                                videoFile: l.videoFile || "",
                                pdfFile: l.pdfFile || "",
                                durationMinutes: l.durationMinutes || 15,
                                orderIndex: l.orderIndex,
                              });
                            }}
                            className="px-2 py-1 text-slate-600 hover:text-indigo-600 hover:bg-white rounded font-medium"
                          >
                            Modifier
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteLesson(l.id)}
                            className="px-2 py-1 text-rose-600 hover:bg-rose-50 rounded font-medium"
                          >
                            Supprimer
                          </button>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>

            {/* Add / Edit Lesson Form */}
            <form onSubmit={handleSaveLesson} className="p-4 rounded-2xl bg-indigo-50/40 border border-indigo-100 space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-950 flex items-center gap-1.5">
                <span>+</span> {editingLesson ? "Modifier la leçon" : "Ajouter une nouvelle leçon"}
              </h4>

              <div className="grid gap-3 sm:grid-cols-3">
                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Titre de la leçon *
                  </label>
                  <input
                    type="text"
                    required
                    value={lessonForm.title}
                    onChange={(e) => setLessonForm({ ...lessonForm, title: e.target.value })}
                    placeholder="Ex: Partie 1 : Définitions et Théorème Fondamental"
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-900 focus:border-indigo-600 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Type de leçon
                  </label>
                  <select
                    value={lessonForm.type}
                    onChange={(e) => setLessonForm({ ...lessonForm, type: e.target.value as LessonType })}
                    className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-900 focus:border-indigo-600 focus:outline-none"
                  >
                    <option value={LessonType.VIDEO}>Vidéo (MP4 / YouTube)</option>
                    <option value={LessonType.PDF}>Document PDF</option>
                    <option value={LessonType.TEXT}>Texte / Synthèse</option>
                  </select>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Vidéo YouTube URL
                  </label>
                  <input
                    type="url"
                    value={lessonForm.youtubeUrl}
                    onChange={(e) => setLessonForm({ ...lessonForm, youtubeUrl: e.target.value })}
                    placeholder="https://www.youtube.com/watch?v=..."
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-900 focus:border-indigo-600 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    OU Fichier Vidéo (PC)
                  </label>
                  <input
                    type="file"
                    accept="video/*"
                    onChange={(e) => setSelectedLessonVideoFile(e.target.files?.[0] || null)}
                    className="w-full text-xs text-slate-500 file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-[11px] file:bg-white file:text-indigo-600"
                  />
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Document PDF associé
                  </label>
                  <input
                    type="file"
                    accept="application/pdf"
                    onChange={(e) => setSelectedLessonPdfFile(e.target.files?.[0] || null)}
                    className="w-full text-xs text-slate-500 file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-[11px] file:bg-white file:text-emerald-600"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Durée (minutes)
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={lessonForm.durationMinutes}
                    onChange={(e) => setLessonForm({ ...lessonForm, durationMinutes: Number(e.target.value) })}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-900 focus:border-indigo-600 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Contenu texte ou explications de la leçon
                </label>
                <textarea
                  rows={2}
                  value={lessonForm.textContent}
                  onChange={(e) => setLessonForm({ ...lessonForm, textContent: e.target.value })}
                  placeholder="Notes de cours..."
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-900 focus:border-indigo-600 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                {editingLesson && (
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => {
                      setEditingLesson(null);
                      setLessonForm({
                        title: "",
                        description: "",
                        type: LessonType.VIDEO,
                        textContent: "",
                        youtubeUrl: "",
                        videoFile: "",
                        pdfFile: "",
                        durationMinutes: 15,
                        orderIndex: (activeCourseForLessons.lessons?.length || 0) + 1,
                      });
                    }}
                    className="text-xs"
                  >
                    Annuler l&apos;édition
                  </Button>
                )}
                <Button type="submit" disabled={submitting} className="text-xs font-bold">
                  {submitting ? "Enregistrement..." : editingLesson ? "Mettre à jour la leçon" : "Ajouter cette leçon"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

