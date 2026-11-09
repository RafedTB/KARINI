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
import { formatCourseSection, courseSectionIcon } from "@/shared/labels/course-section";
import {
  BookOpenIcon,
  VideoCameraIcon,
  FileTextIcon,
  RadioLiveIcon,
  PenEditIcon,
  EyeIcon,
  PlusCircleIcon,
  SchoolIcon,
  GraduationCapIcon,
} from "@/presentation/components/ui/icons";

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
    videoFile: "",
    pdfFile: "",
  });

  const [lessonForm, setLessonForm] = useState({
    title: "",
    description: "",
    type: LessonType.VIDEO,
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
  const [submitting, setSubmitting] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [uploadingVideo, setUploadingVideo] = useState(false);

  const isTeacherOrAdmin =
    user?.userType === UserType.INSTRUCTOR || user?.userType === UserType.SUPERADMIN;

  // Helpers for robust matching between assigned teacher credentials & subjects/classes
  const normalizeText = (str: string) =>
    (str || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim();

  const isSubjectAllowedForTeacher = (subject: Subject, assigned: string[]) => {
    if (!assigned || assigned.length === 0) return true;
    const cleanAssigned = assigned.map(normalizeText);
    const subSlug = normalizeText(subject.slug || "");
    const subCode = normalizeText(subject.code || "");
    const subName = normalizeText(subject.name || "");

    return cleanAssigned.some((a) => {
      if (!a) return false;
      if (a === subSlug || a === subCode || a === subName) return true;
      if (subSlug.startsWith(a + "-") || subSlug.startsWith(a)) return true;
      if (subName.includes(a) || a.includes(subName)) return true;
      if (subCode && (subCode.includes(a) || a.includes(subCode))) return true;
      return false;
    });
  };

  const isFiliereAllowedForTeacher = (filiereName: string, assigned: string[]) => {
    if (!assigned || assigned.length === 0) return true;
    const cleanFiliere = normalizeText(filiereName);
    return assigned.some((a) => {
      const cleanA = normalizeText(a);
      return cleanFiliere === cleanA || cleanFiliere.includes(cleanA) || cleanA.includes(cleanFiliere);
    });
  };

  const allowedFilieres = useMemo(() => {
    let list = filieres;
    if (list.length === 0) {
      list = [
        "2ème Informatique",
        "2ème Math",
        "2ème Sciences",
        "3ème Informatique",
        "3ème Math",
        "3ème Sciences",
        "3ème Technique",
        "3ème Economie",
        "Bac Informatique",
        "Bac Math",
        "Bac Sciences",
        "Bac Technique",
        "Bac Economie",
      ];
    }
    if (user?.userType === UserType.SUPERADMIN || !user?.teachingClasses || user.teachingClasses.length === 0) {
      return list;
    }
    const filtered = list.filter((f) => isFiliereAllowedForTeacher(f, user.teachingClasses!));
    return filtered.length > 0 ? filtered : user.teachingClasses;
  }, [user, filieres]);

  // Dynamically filter subjects for the course modal based on the currently selected filière
  // and the teacher's assigned subjects (if an instructor)
  const modalSubjects = useMemo(() => {
    const selectedFilNorm = normalizeText(courseForm.filiere || "");

    // 1. Filter by selected class/filière
    let list = subjects.filter((s) => {
      const sFilNorm = normalizeText(s.filiere || "");
      return (
        sFilNorm === "all" ||
        sFilNorm === selectedFilNorm ||
        (selectedFilNorm && sFilNorm.includes(selectedFilNorm)) ||
        (sFilNorm && selectedFilNorm.includes(sFilNorm))
      );
    });

    // 2. If instructor has assigned subjects, filter strictly to allowed subjects
    if (user?.userType === UserType.INSTRUCTOR && user.teachingSubjects && user.teachingSubjects.length > 0) {
      list = list.filter((s) => isSubjectAllowedForTeacher(s, user.teachingSubjects!));
    }

    // 3. Fallback: if empty for this filière (e.g. subjects not yet seeded for this level),
    // provide the teacher's subjects or general fallback
    if (list.length === 0) {
      const baseAllowed = subjects.filter((s) =>
        user?.userType === UserType.SUPERADMIN ||
        !user?.teachingSubjects?.length ||
        isSubjectAllowedForTeacher(s, user.teachingSubjects)
      );
      if (baseAllowed.length > 0) return baseAllowed;

      if (user?.teachingSubjects && user.teachingSubjects.length > 0) {
        return user.teachingSubjects.map((slug, idx) => ({
          id: idx + 9999,
          name: slug.charAt(0).toUpperCase() + slug.slice(1),
          code: slug.toUpperCase().slice(0, 5),
          slug,
          filiere: courseForm.filiere,
          category: "Enseignement",
          icon: "math",
          color: "#4f46e5",
          createdAt: "",
          updatedAt: "",
        }));
      }
    }

    return list;
  }, [subjects, courseForm.filiere, user]);

  // When instructor changes the Filière in the modal, automatically re-evaluate available subjects
  // and set the subject to the first valid one if the previous subject is not in the new filière
  const handleFiliereChange = (newFiliere: string) => {
    const newFilNorm = normalizeText(newFiliere || "");

    let newSubjects = subjects.filter((s) => {
      const sFilNorm = normalizeText(s.filiere || "");
      return (
        sFilNorm === "all" ||
        sFilNorm === newFilNorm ||
        (newFilNorm && sFilNorm.includes(newFilNorm)) ||
        (sFilNorm && newFilNorm.includes(sFilNorm))
      );
    });

    if (user?.userType === UserType.INSTRUCTOR && user.teachingSubjects && user.teachingSubjects.length > 0) {
      newSubjects = newSubjects.filter((s) => isSubjectAllowedForTeacher(s, user.teachingSubjects!));
    }

    const isCurrentValid = newSubjects.some(
      (s) => (s.slug || s.code.toLowerCase()) === courseForm.subject
    );

    const nextSubject = isCurrentValid
      ? courseForm.subject
      : (newSubjects[0]?.slug || newSubjects[0]?.code?.toLowerCase() || "math");

    setCourseForm((prev) => ({
      ...prev,
      filiere: newFiliere,
      subject: nextSubject,
    }));
  };

  // Keep courseForm.subject synchronized with modalSubjects whenever modal opens or subjects update
  useEffect(() => {
    if (!showCourseModal || modalSubjects.length === 0) return;
    const exists = modalSubjects.some(
      (s) => (s.slug || s.code.toLowerCase()) === courseForm.subject
    );
    if (!exists) {
      const nextSub = modalSubjects[0].slug || modalSubjects[0].code.toLowerCase();
      setCourseForm((prev) => ({ ...prev, subject: nextSub }));
    }
  }, [showCourseModal, modalSubjects, courseForm.subject]);

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

  // Handle Video Upload from PC
  const handleVideoUpload = async (file: File) => {
    if (!token) return null;
    try {
      setUploadingVideo(true);
      const res = await coursesService.uploadVideo(token, file);
      showNotification(`Vidéo téléversée depuis votre PC : ${res.originalName}`);
      return res.filename;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors de l'envoi de la vidéo.");
      return null;
    } finally {
      setUploadingVideo(false);
    }
  };

  // Create / Update Resource
  const handleSaveCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    try {
      setSubmitting(true);
      setError("");

      let uploadedPdfFilename = courseForm.pdfFile;
      if (selectedPdfFile) {
        const uploaded = await handlePdfUpload(selectedPdfFile);
        if (uploaded) uploadedPdfFilename = uploaded;
      }

      let uploadedVideoFilename = courseForm.videoFile;
      if (selectedVideoFile) {
        const uploaded = await handleVideoUpload(selectedVideoFile);
        if (uploaded) uploadedVideoFilename = uploaded;
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
        showNotification("Ressource mise à jour avec succès !");
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
        showNotification("Nouvelle ressource créée avec succès !");
      }

      setShowCourseModal(false);
      setEditingCourse(null);
      setSelectedPdfFile(null);
      setSelectedVideoFile(null);
      setCourseForm({
        title: "",
        description: "",
        section: CourseSection.COURSE,
        subject: "math",
        filiere: "2ème Informatique",
        textContent: "",
        youtubeUrl: "",
        videoFile: "",
        pdfFile: "",
      });
      loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors de l'enregistrement de la ressource.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteCourse = async (id: number, title: string) => {
    if (!token) return;
    if (!confirm(`Supprimer définitivement la ressource "${title}" ainsi que toutes ses leçons ?`)) return;
    try {
      await coursesService.deleteCourse(token, id);
      showNotification(`Ressource "${title}" supprimée.`);
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

      let uploadedPdfFilename = lessonForm.pdfFile;
      if (selectedPdfFile && lessonForm.type === LessonType.PDF) {
        const uploaded = await handlePdfUpload(selectedPdfFile);
        if (uploaded) uploadedPdfFilename = uploaded;
      }

      let uploadedLessonVideoFilename = lessonForm.videoFile;
      if (selectedLessonVideoFile && lessonForm.type === LessonType.VIDEO) {
        const uploaded = await handleVideoUpload(selectedLessonVideoFile);
        if (uploaded) uploadedLessonVideoFilename = uploaded;
      }

      if (editingLesson) {
        await coursesService.updateLesson(token, editingLesson.id, {
          title: lessonForm.title,
          description: lessonForm.description,
          type: lessonForm.type,
          textContent: lessonForm.textContent || undefined,
          youtubeUrl: lessonForm.youtubeUrl || undefined,
          videoFile: uploadedLessonVideoFilename || undefined,
          pdfFile: uploadedPdfFilename || undefined,
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
          videoFile: uploadedLessonVideoFilename || undefined,
          pdfFile: uploadedPdfFilename || undefined,
          durationMinutes: Number(lessonForm.durationMinutes),
          orderIndex: Number(lessonForm.orderIndex),
        });
        showNotification(`Leçon "${lessonForm.title}" ajoutée avec succès !`);
      }

      setSelectedPdfFile(null);
      setSelectedLessonVideoFile(null);
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
      const cSub = (c.subject || "math").toLowerCase();
      const sSub = selectedSubject.toLowerCase();
      const matchesSubject =
        selectedSubject === "all" ||
        cSub === sSub ||
        cSub.startsWith(sSub + "-") ||
        sSub.startsWith(cSub + "-");
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
            <GraduationCapIcon size={14} /> Espace Enseignant / Teacher Studio
          </div>
          <h1 className="mt-2 font-serif text-3xl sm:text-4xl font-bold" style={{ color: "var(--ink)" }}>
            Mes Ressources & <span className="gradient-text">Cours Pédagogiques</span>
          </h1>
          <p className="mt-1 text-sm" style={{ color: "var(--muted)" }}>
            Publiez vos ressources éducatives : cours vidéo depuis votre PC, exercices PDF, magazines PDF et directs.
          </p>
        </div>

        {/* Action Button */}
        <Button
          type="button"
          onClick={() => {
            const initialFil = allowedFilieres[0] || (user?.teachingClasses?.[0] || "2ème Informatique");
            const initialFilNorm = normalizeText(initialFil);

            let filSubs = subjects.filter((s) => {
              const sFilNorm = normalizeText(s.filiere || "");
              return (
                sFilNorm === "all" ||
                sFilNorm === initialFilNorm ||
                (initialFilNorm && sFilNorm.includes(initialFilNorm)) ||
                (sFilNorm && initialFilNorm.includes(sFilNorm))
              );
            });

            if (user?.userType === UserType.INSTRUCTOR && user.teachingSubjects && user.teachingSubjects.length > 0) {
              filSubs = filSubs.filter((s) => isSubjectAllowedForTeacher(s, user.teachingSubjects!));
            }

            const initialSub =
              filSubs[0]?.slug ||
              filSubs[0]?.code?.toLowerCase() ||
              (user?.teachingSubjects?.[0] ? user.teachingSubjects[0].toLowerCase() : "math");

            setEditingCourse(null);
            setSelectedVideoFile(null);
            setSelectedPdfFile(null);
            setCourseForm({
              title: "",
              description: "",
              section: CourseSection.COURSE,
              subject: initialSub,
              filiere: initialFil,
              textContent: "",
              youtubeUrl: "",
              videoFile: "",
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
          + Nouvelle ressource
        </Button>
      </div>

      {/* Teacher Teaching Assignment Info Card */}
      {user?.userType === UserType.INSTRUCTOR && (
        <div className="rounded-2xl p-4 bg-gradient-to-r from-indigo-50/80 via-purple-50/50 to-pink-50/40 border border-indigo-100/80 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-950 flex items-center gap-1.5">
                <FileTextIcon size={14} /> Vos Affectations d&apos;Enseignement
              </h3>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <span className="text-xs font-semibold text-slate-600">Matières autorisées :</span>
                {user.teachingSubjects && user.teachingSubjects.length > 0 ? (
                  user.teachingSubjects.map((s) => (
                    <span key={s} className="rounded-lg px-2 py-0.5 text-xs font-bold uppercase bg-white text-indigo-700 border border-indigo-200 shadow-xs">
                      {s}
                    </span>
                  ))
                ) : (
                  <span className="text-xs text-amber-700 italic">Toutes les matières (aucune restriction)</span>
                )}
              </div>
              <div className="mt-1.5 flex flex-wrap items-center gap-2">
                <span className="text-xs font-semibold text-slate-600">Classes prises en charge :</span>
                {user.teachingClasses && user.teachingClasses.length > 0 ? (
                  user.teachingClasses.map((c) => (
                    <span key={c} className="rounded-lg px-2 py-0.5 text-xs font-medium bg-white text-slate-700 border border-slate-200 shadow-xs">
                      {c}
                    </span>
                  ))
                ) : (
                  <span className="text-xs text-slate-500 italic">Toutes les classes</span>
                )}
              </div>
            </div>
            <div className="text-left sm:text-right sm:border-l sm:pl-4 border-indigo-100">
              <span className="text-[11px] text-slate-500 block">Enseignant</span>
              <span className="text-xs font-bold text-slate-800">
                {user.firstname ? `${user.firstname} ${user.lastname || ""}` : user.username}
              </span>
            </div>
          </div>
        </div>
      )}

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
            {subjects
              .filter((s) => selectedFiliere === "all" || !s.filiere || s.filiere === "all" || s.filiere === selectedFiliere)
              .map((s) => (
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
                  <span className="rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase font-mono bg-indigo-50 text-indigo-700 border border-indigo-100 flex items-center gap-1.5">
                    {c.section === CourseSection.COURSE ? (
                      <VideoCameraIcon size={12} />
                    ) : c.section === CourseSection.EXERCISE ? (
                      <FileTextIcon size={12} />
                    ) : c.section === CourseSection.MAGAZINE ? (
                      <BookOpenIcon size={12} />
                    ) : (
                      <RadioLiveIcon size={12} />
                    )}
                    <span>{formatCourseSection(c.section)}</span>
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
                  {c.videoFile && (
                    <span className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 bg-indigo-50 text-indigo-700 font-medium">
                      <VideoCameraIcon size={11} />
                      <span>Vidéo PC</span>
                    </span>
                  )}
                  {c.youtubeUrl && !c.videoFile && (
                    <span className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 bg-rose-50 text-rose-700 font-medium">
                      <VideoCameraIcon size={11} />
                      <span>Vidéo / Direct</span>
                    </span>
                  )}
                  {c.pdfFile && (
                    <span className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 bg-pink-50 text-pink-700 font-medium">
                      <FileTextIcon size={11} />
                      <span>PDF joint</span>
                    </span>
                  )}
                  {c.textContent && (
                    <span className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 bg-teal-50 text-teal-700 font-medium">
                      <FileTextIcon size={11} />
                      <span>Notes / Texte</span>
                    </span>
                  )}
                  <span className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 bg-slate-100 text-slate-700 font-bold">
                    <BookOpenIcon size={11} />
                    <span>{lessonsCount} {lessonsCount === 1 ? "leçon" : "leçons"}</span>
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
                      videoFile: "",
                      pdfFile: "",
                      durationMinutes: 15,
                      orderIndex: (c.lessons?.length || 0) + 1,
                    });
                  }}
                  className="w-full justify-center text-xs font-bold rounded-xl py-2 flex items-center gap-1.5"
                >
                  <BookOpenIcon size={14} />
                  <span>Gérer les leçons ({lessonsCount})</span>
                </Button>

                <div className="flex items-center justify-between gap-2 pt-1">
                  <Link
                    href={`/teacher/quizzes?courseId=${c.id}`}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-amber-100 px-3 py-2 text-xs font-bold text-amber-800 hover:bg-amber-200"
                  >
                    <PenEditIcon size={13} />
                    <span>Gérer les quiz</span>
                  </Link>
                  <Link
                    href={`/courses/view/${c.id}`}
                    target="_blank"
                    className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800"
                  >
                    <EyeIcon size={13} />
                    <span>Aperçu élève</span>
                  </Link>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingCourse(c);
                        setSelectedVideoFile(null);
                        setSelectedPdfFile(null);
                        setCourseForm({
                          title: c.title,
                          description: c.description || "",
                          section: c.section as CourseSection,
                          subject: c.subject || "math",
                          filiere: c.filiere || "2ème Informatique",
                          textContent: c.textContent || "",
                          youtubeUrl: c.youtubeUrl || "",
                          videoFile: c.videoFile || "",
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
            Aucune ressource trouvée
          </p>
          <p className="mt-1 text-sm" style={{ color: "var(--muted)" }}>
            Commencez par ajouter votre première ressource ou modifiez vos filtres de recherche.
          </p>
          <Button
            type="button"
            onClick={() => setShowCourseModal(true)}
            className="mt-5 text-xs font-bold"
          >
            + Ajouter ma première ressource
          </Button>
        </div>
      )}

      {/* ==================================================== */}
      {/* MODAL 1: AJOUTER / MODIFIER UNE RESSOURCE */}
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
                  {editingCourse ? "Modifier la ressource" : "Ajouter une nouvelle ressource"}
                </h2>
                <p className="text-xs" style={{ color: "var(--muted)" }}>
                  Définissez le type (cours vidéo, exercice PDF, magazine PDF, direct), la matière et la classe.
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

              {/* Filière & Matière */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* 1. Filière / Classe (Placed First) */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold" style={{ color: "var(--ink)" }}>
                      Filière scolaire *
                    </label>
                    {user?.userType === UserType.INSTRUCTOR && user.teachingClasses && user.teachingClasses.length > 0 && (
                      <span className="text-[10px] font-bold text-indigo-600">Assignée</span>
                    )}
                  </div>
                  <select
                    value={courseForm.filiere}
                    onChange={(e) => handleFiliereChange(e.target.value)}
                    className="w-full rounded-xl border px-3 py-2 text-sm outline-none focus:border-indigo-500"
                    style={{ borderColor: "var(--line)" }}
                  >
                    {allowedFilieres.map((f) => (
                      <option key={f} value={f}>
                        {f}
                      </option>
                    ))}
                    {allowedFilieres.length === 0 && (
                      <>
                        <option value="2ème Informatique">2ème Informatique</option>
                        <option value="2ème Math">2ème Math</option>
                        <option value="2ème Sciences">2ème Sciences</option>
                        <option value="Bac Informatique">Bac Informatique</option>
                      </>
                    )}
                  </select>
                </div>

                {/* 2. Matière (Dynamically filtered by chosen Filière) */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold" style={{ color: "var(--ink)" }}>
                      Matière *
                    </label>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-medium text-slate-500">
                        {modalSubjects.length} dispo{modalSubjects.length > 1 ? "s" : ""}
                      </span>
                      {user?.userType === UserType.INSTRUCTOR && user.teachingSubjects && user.teachingSubjects.length > 0 && (
                        <span className="text-[10px] font-bold text-indigo-600">Assignée</span>
                      )}
                    </div>
                  </div>
                  <select
                    value={courseForm.subject}
                    onChange={(e) => setCourseForm({ ...courseForm, subject: e.target.value })}
                    className="w-full rounded-xl border px-3 py-2 text-sm outline-none focus:border-indigo-500"
                    style={{ borderColor: "var(--line)" }}
                  >
                    {modalSubjects.map((s) => (
                      <option key={s.id} value={s.slug || s.code.toLowerCase()}>
                        {s.name} ({s.code})
                      </option>
                    ))}
                    {modalSubjects.length === 0 && (
                      <>
                        <option value="math">Mathématiques (MATH)</option>
                        <option value="physique">Physique - Chimie (PHY)</option>
                        <option value="informatique">Informatique (INFO)</option>
                        <option value="science">Sciences SVT (SVT)</option>
                      </>
                    )}
                  </select>
                </div>
              </div>

              {/* Type de ressource (4 Types) */}
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--ink)" }}>
                  Type de ressource pédagogique *
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {[
                    { section: CourseSection.COURSE, label: "Cours Vidéo", IconComp: VideoCameraIcon, desc: "Vidéo PC / Streaming" },
                    { section: CourseSection.EXERCISE, label: "Exercice PDF", IconComp: FileTextIcon, desc: "Série d'exercices" },
                    { section: CourseSection.MAGAZINE, label: "Magazine PDF", IconComp: BookOpenIcon, desc: "Document complet" },
                    { section: CourseSection.OLDLIVE, label: "Direct", IconComp: RadioLiveIcon, desc: "Session Live / Replay" },
                  ].map((s) => {
                    const active = courseForm.section === s.section;
                    const Icon = s.IconComp;
                    return (
                      <button
                        key={s.section}
                        type="button"
                        onClick={() => setCourseForm({ ...courseForm, section: s.section })}
                        className="flex flex-col items-start gap-1 rounded-2xl p-3 text-left transition-all border cursor-pointer"
                        style={{
                          background: active ? "var(--accent-glow)" : "rgba(15,23,42,0.02)",
                          borderColor: active ? "var(--accent)" : "var(--line)",
                        }}
                      >
                        <Icon size={20} className={active ? "text-indigo-600" : "text-slate-500"} />
                        <span className="text-xs font-bold leading-tight" style={{ color: active ? "var(--accent)" : "var(--ink)" }}>
                          {s.label}
                        </span>
                        <span className="text-[10px] text-slate-500 line-clamp-1">{s.desc}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: "var(--ink)" }}>
                  Description de la ressource
                </label>
                <textarea
                  rows={2}
                  value={courseForm.description}
                  onChange={(e) => setCourseForm({ ...courseForm, description: e.target.value })}
                  placeholder="Objectifs d'apprentissage, prérequis, résumé du chapitre ou consignes..."
                  className="w-full rounded-xl border px-3 py-2 text-sm outline-none focus:border-indigo-500"
                  style={{ borderColor: "var(--line)" }}
                />
              </div>

              {/* ========================================================= */}
              {/* SPECIFIC INPUTS DEPENDING ON THE SELECTED RESOURCE TYPE   */}
              {/* ========================================================= */}

              {/* TYPE 1: COURS VIDÉO */}
              {courseForm.section === CourseSection.COURSE && (
                <div className="rounded-2xl p-4 bg-indigo-50/60 border border-indigo-200/80 space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold text-indigo-950 flex items-center gap-1.5">
                      <VideoCameraIcon size={14} /> Vidéo du cours depuis votre PC (Recommandé)
                    </label>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-700 bg-white px-2 py-0.5 rounded-md border border-indigo-200">
                      MP4, WebM, MOV
                    </span>
                  </div>

                  <input
                    type="file"
                    accept="video/mp4,video/webm,video/quicktime,video/x-matroska,video/*"
                    onChange={(e) => setSelectedVideoFile(e.target.files?.[0] || null)}
                    className="w-full rounded-xl border bg-white px-3 py-2 text-xs file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-indigo-600 file:text-white hover:file:bg-indigo-700 cursor-pointer"
                  />

                  {selectedVideoFile && (
                    <div className="rounded-xl p-2.5 bg-emerald-50 border border-emerald-200 flex items-center gap-2 text-xs font-semibold text-emerald-800">
                      <span>✓</span> Fichier vidéo prêt pour l&apos;envoi : <strong>{selectedVideoFile.name}</strong> ({(selectedVideoFile.size / (1024 * 1024)).toFixed(1)} MB)
                    </div>
                  )}

                  {courseForm.videoFile && !selectedVideoFile && (
                    <p className="text-xs text-slate-600">
                      Fichier vidéo actuel : <span className="font-mono font-semibold text-indigo-900">{courseForm.videoFile}</span>
                    </p>
                  )}

                  <div className="pt-2 border-t border-indigo-100">
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Ou lien vidéo externe (YouTube, etc.)
                    </label>
                    <input
                      type="url"
                      value={courseForm.youtubeUrl}
                      onChange={(e) => setCourseForm({ ...courseForm, youtubeUrl: e.target.value })}
                      placeholder="https://www.youtube.com/watch?v=..."
                      className="w-full rounded-xl border bg-white px-3 py-1.5 text-xs outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div className="pt-2 border-t border-indigo-100">
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Polycopié ou document PDF d&apos;accompagnement (Optionnel)
                    </label>
                    <input
                      type="file"
                      accept="application/pdf"
                      onChange={(e) => setSelectedPdfFile(e.target.files?.[0] || null)}
                      className="w-full rounded-xl border bg-white px-2 py-1 text-xs file:mr-2 file:py-1 file:px-2 file:rounded-lg file:border-0 file:text-xs file:bg-slate-100 file:text-slate-700"
                    />
                    {courseForm.pdfFile && !selectedPdfFile && (
                      <span className="text-[10px] text-slate-500 mt-1 block">
                        PDF actuel : {courseForm.pdfFile}
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* TYPE 2: EXERCICE PDF */}
              {courseForm.section === CourseSection.EXERCISE && (
                <div className="rounded-2xl p-4 bg-teal-50/60 border border-teal-200/80 space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold text-teal-950 flex items-center gap-1.5">
                      <FileTextIcon size={14} /> Document PDF d&apos;exercice (Série / Énoncé / Corrigé) *
                    </label>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-teal-700 bg-white px-2 py-0.5 rounded-md border border-teal-200">
                      PDF obligatoire
                    </span>
                  </div>

                  <input
                    type="file"
                    accept="application/pdf"
                    onChange={(e) => setSelectedPdfFile(e.target.files?.[0] || null)}
                    className="w-full rounded-xl border bg-white px-3 py-2 text-xs file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-teal-600 file:text-white hover:file:bg-teal-700 cursor-pointer"
                  />

                  {selectedPdfFile && (
                    <div className="rounded-xl p-2.5 bg-emerald-50 border border-emerald-200 flex items-center gap-2 text-xs font-semibold text-emerald-800">
                      <span>✓</span> Fichier PDF sélectionné : <strong>{selectedPdfFile.name}</strong> ({(selectedPdfFile.size / (1024 * 1024)).toFixed(1)} MB)
                    </div>
                  )}

                  {courseForm.pdfFile && !selectedPdfFile && (
                    <p className="text-xs text-slate-600">
                      Fichier PDF actuel : <span className="font-mono font-semibold text-teal-900">{courseForm.pdfFile}</span>
                    </p>
                  )}
                </div>
              )}

              {/* TYPE 3: MAGAZINE PDF */}
              {courseForm.section === CourseSection.MAGAZINE && (
                <div className="rounded-2xl p-4 bg-pink-50/60 border border-pink-200/80 space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold text-pink-950 flex items-center gap-1.5">
                      <BookOpenIcon size={14} /> Document Magazine PDF complet *
                    </label>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-pink-700 bg-white px-2 py-0.5 rounded-md border border-pink-200">
                      Magazine Flipbook
                    </span>
                  </div>

                  <input
                    type="file"
                    accept="application/pdf"
                    onChange={(e) => setSelectedPdfFile(e.target.files?.[0] || null)}
                    className="w-full rounded-xl border bg-white px-3 py-2 text-xs file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-pink-600 file:text-white hover:file:bg-pink-700 cursor-pointer"
                  />

                  {selectedPdfFile && (
                    <div className="rounded-xl p-2.5 bg-emerald-50 border border-emerald-200 flex items-center gap-2 text-xs font-semibold text-emerald-800">
                      <span>✓</span> Magazine PDF sélectionné : <strong>{selectedPdfFile.name}</strong> ({(selectedPdfFile.size / (1024 * 1024)).toFixed(1)} MB)
                    </div>
                  )}

                  {courseForm.pdfFile && !selectedPdfFile && (
                    <p className="text-xs text-slate-600">
                      Magazine actuel : <span className="font-mono font-semibold text-pink-900">{courseForm.pdfFile}</span>
                    </p>
                  )}
                </div>
              )}

              {/* TYPE 4: DIRECT */}
              {courseForm.section === CourseSection.OLDLIVE && (
                <div className="rounded-2xl p-4 bg-amber-50/70 border border-amber-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold text-amber-950 flex items-center gap-1.5">
                      <RadioLiveIcon size={14} className="text-rose-500" /> Lien direct de la session / streaming *
                    </label>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800 bg-white px-2 py-0.5 rounded-md border border-amber-300">
                      Direct / Live Stream
                    </span>
                  </div>

                  <input
                    type="url"
                    required
                    value={courseForm.youtubeUrl}
                    onChange={(e) => setCourseForm({ ...courseForm, youtubeUrl: e.target.value })}
                    placeholder="https://meet.google.com/... ou https://youtube.com/live/..."
                    className="w-full rounded-xl border bg-white px-3 py-2 text-sm outline-none focus:border-amber-500"
                  />

                  <p className="text-xs text-slate-600 leading-relaxed">
                    Les élèves pourront rejoindre ou visionner ce direct directement depuis leur espace.
                  </p>
                </div>
              )}

              {/* Optional Text Content */}
              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: "var(--ink)" }}>
                  Texte / Notes explicatives de la ressource (Optionnel)
                </label>
                <textarea
                  rows={3}
                  value={courseForm.textContent}
                  onChange={(e) => setCourseForm({ ...courseForm, textContent: e.target.value })}
                  placeholder="Rédigez les définitions fondamentales, formules ou explications complémentaires..."
                  className="w-full rounded-xl border px-3 py-2 text-sm outline-none focus:border-indigo-500 font-mono text-xs"
                  style={{ borderColor: "var(--line)" }}
                />
              </div>

              {/* Modal Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t" style={{ borderColor: "var(--line)" }}>
                <Button type="button" variant="secondary" onClick={() => setShowCourseModal(false)} className="text-xs">
                  Annuler
                </Button>
                <Button type="submit" disabled={submitting || uploadingFile || uploadingVideo} className="text-xs font-bold">
                  {submitting
                    ? "Enregistrement…"
                    : uploadingVideo
                    ? "Téléversement vidéo en cours…"
                    : uploadingFile
                    ? "Téléversement document…"
                    : editingCourse
                    ? "Mettre à jour la ressource"
                    : "Ajouter la ressource"}
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
                              {lesson.type === LessonType.VIDEO ? "Vidéo" : lesson.type === LessonType.PDF ? "PDF" : "Texte"}
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
                            setSelectedPdfFile(null);
                            setSelectedLessonVideoFile(null);
                            setLessonForm({
                              title: lesson.title,
                              description: lesson.description || "",
                              type: lesson.type as LessonType,
                              textContent: lesson.textContent || "",
                              youtubeUrl: lesson.youtubeUrl || "",
                              videoFile: lesson.videoFile || "",
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
                      setSelectedPdfFile(null);
                      setSelectedLessonVideoFile(null);
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
                      <option value={LessonType.VIDEO}>Vidéo (PC ou YouTube)</option>
                      <option value={LessonType.TEXT}>Cours Texte</option>
                      <option value={LessonType.PDF}>Fichier PDF</option>
                    </select>
                  </div>
                </div>

                {/* Conditional Fields Based on Lesson Type */}
                {lessonForm.type === LessonType.VIDEO && (
                  <div className="space-y-3">
                    <div className="rounded-xl p-3 bg-indigo-50/70 border border-indigo-100 space-y-2">
                      <label className="block text-xs font-semibold text-slate-800">
                        Vidéo de la leçon depuis votre PC (Recommandé)
                      </label>
                      <input
                        type="file"
                        accept="video/*"
                        onChange={(e) => setSelectedLessonVideoFile(e.target.files?.[0] || null)}
                        className="w-full rounded-xl border bg-white px-2.5 py-1.5 text-xs file:mr-2 file:py-1 file:px-2 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-indigo-600 file:text-white cursor-pointer"
                      />
                      {selectedLessonVideoFile && (
                        <p className="text-xs text-indigo-700 font-medium">
                          ✓ Fichier : {selectedLessonVideoFile.name} ({(selectedLessonVideoFile.size / (1024 * 1024)).toFixed(1)} MB)
                        </p>
                      )}
                      {lessonForm.videoFile && !selectedLessonVideoFile && (
                        <p className="text-[11px] text-slate-600 font-mono">
                          Fichier actuel : {lessonForm.videoFile}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-xs font-semibold mb-1 text-slate-800">
                        Ou lien Vidéo externe (YouTube, etc.)
                      </label>
                      <input
                        type="url"
                        value={lessonForm.youtubeUrl}
                        onChange={(e) => setLessonForm({ ...lessonForm, youtubeUrl: e.target.value })}
                        placeholder="https://www.youtube.com/watch?v=..."
                        className="w-full rounded-xl border bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500"
                      />
                    </div>
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
                  <Button type="submit" disabled={submitting || uploadingFile || uploadingVideo} className="text-xs font-bold">
                    {submitting
                      ? "Publication en cours…"
                      : uploadingVideo
                      ? "Téléversement vidéo en cours…"
                      : uploadingFile
                      ? "Téléversement document en cours…"
                      : editingLesson
                      ? "Mettre à jour la leçon"
                      : "Publier la leçon"}
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
