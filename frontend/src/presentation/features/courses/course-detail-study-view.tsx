"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/presentation/providers/auth-provider";
import { coursesService } from "@/application/services/courses-service";
import type { Course } from "@/domain/entities/course";
import type { Lesson } from "@/domain/entities/lesson";
import type { Quiz } from "@/domain/entities/quiz";
import { quizzesService } from "@/application/services/quizzes-service";
import { LessonType, MembershipType, UserType } from "@/domain/enums";
import { PageLoader } from "@/presentation/components/ui/page-loader";
import { Button } from "@/presentation/components/ui/button";
import { MagazinePdfViewer } from "@/presentation/components/pdf/magazine-pdf-viewer";
import { progressRepository } from "@/infrastructure/repositories/progress-repository";

type CourseDetailStudyViewProps = {
  courseId: number;
};

export function CourseDetailStudyView({ courseId }: CourseDetailStudyViewProps) {
  const router = useRouter();
  const { token, user } = useAuth();

  const userTypeStr = (user?.userType || "").toString().toLowerCase().trim();
  const membershipStr = (user?.membership || "").toString().toLowerCase().trim();
  const isStudent = userTypeStr === "student";
  const isPaidStudent = isStudent && ["silver", "gold", "platinum"].includes(membershipStr);
  const isFreeStudent = isStudent && !isPaidStudent;

  const [course, setCourse] = useState<Course | null>(null);
  const [selectedLessonId, setSelectedLessonId] = useState<number | null>(null);
  const [viewingCoursePdf, setViewingCoursePdf] = useState(false);
  const [viewingCourseVideo, setViewingCourseVideo] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [pdfBusy, setPdfBusy] = useState(false);
  const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null);
  const [loadingPdf, setLoadingPdf] = useState(false);
  const [pdfError, setPdfError] = useState("");
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [quizError, setQuizError] = useState("");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const lastSavedProgressSecond = useRef(-1);

  const saveLessonProgress = (lessonId: number, currentTime: number, completed = false) => {
    if (!token || !isStudent) return;
    const second = Math.floor(currentTime);
    if (!completed && second % 10 !== 0) return;
    if (!completed && second === lastSavedProgressSecond.current) return;
    lastSavedProgressSecond.current = second;
    void progressRepository.saveLessonProgress(token, lessonId, {
      watchedSeconds: second,
      lastPositionSeconds: second,
      completed,
    }).catch(() => {
      // Progress saving is best-effort and must not interrupt lesson playback.
    });
  };

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    coursesService
      .getById(token, courseId)
      .then((data) => {
        setCourse(data);
        if (data.lessons && data.lessons.length > 0) {
          setSelectedLessonId(data.lessons[0].id);
        } else if (data.videoFile || data.youtubeUrl) {
          setViewingCourseVideo(true);
        } else if (data.pdfFile) {
          setViewingCoursePdf(true);
        }
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Impossible de charger le cours.");
      })
      .finally(() => setLoading(false));
  }, [token, courseId]);

  useEffect(() => {
    if (!token || !isStudent || !["gold", "platinum"].includes(membershipStr)) {
      setQuizzes([]);
      return;
    }
    quizzesService.listForCourse(token, courseId)
      .then(setQuizzes)
      .catch((cause: unknown) => setQuizError(cause instanceof Error ? cause.message : "Impossible de charger les quiz."));
  }, [token, courseId, isStudent, membershipStr]);

  const activeLesson: Lesson | null = useMemo(() => {
    if (!course?.lessons || course.lessons.length === 0) return null;
    return course.lessons.find((l) => l.id === selectedLessonId) || course.lessons[0];
  }, [course, selectedLessonId]);

  const activeLessonIndex = useMemo(() => {
    if (!course?.lessons || !activeLesson) return 0;
    return course.lessons.findIndex((l) => l.id === activeLesson.id);
  }, [course, activeLesson]);

  // Determine which PDF file is currently targeted (Free plan students cannot open PDF)
  const currentPdfFile = useMemo(() => {
    if (isFreeStudent) return null;
    if (viewingCoursePdf && course?.pdfFile) {
      return course.pdfFile;
    }
    if (!viewingCoursePdf && activeLesson && activeLesson.type === LessonType.PDF && activeLesson.pdfFile) {
      return activeLesson.pdfFile;
    }
    return null;
  }, [viewingCoursePdf, course, activeLesson, isFreeStudent]);

  // Load PDF as interactive Blob URL in the browser
  useEffect(() => {
    let isCancelled = false;
    let objectUrl: string | null = null;

    if (!token || !currentPdfFile || isFreeStudent) {
      setPdfBlobUrl(null);
      setLoadingPdf(false);
      setPdfError("");
      return;
    }

    setLoadingPdf(true);
    setPdfError("");

    coursesService
      .getPdfBlobUrl(token, currentPdfFile)
      .then((url) => {
        if (isCancelled) {
          URL.revokeObjectURL(url);
          return;
        }
        objectUrl = url;
        setPdfBlobUrl(url);
      })
      .catch((err) => {
        if (!isCancelled) {
          setPdfError(err instanceof Error ? err.message : "Erreur de chargement du PDF");
          setPdfBlobUrl(null);
        }
      })
      .finally(() => {
        if (!isCancelled) {
          setLoadingPdf(false);
        }
      });

    return () => {
      isCancelled = true;
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [token, currentPdfFile, isFreeStudent]);

  const handleDownloadPdf = async (fileName: string) => {
    if (!token || !fileName) return;
    if (isFreeStudent) {
      router.push("/membership");
      return;
    }
    try {
      setPdfBusy(true);
      await coursesService.downloadPdf(token, fileName);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors du téléchargement du PDF.");
    } finally {
      setPdfBusy(false);
    }
  };

  // Convert regular YouTube / Vimeo link to embed link
  const getEmbedYoutubeUrl = (url?: string | null) => {
    if (!url) return null;
    try {
      if (url.includes("/embed/")) return url;
      const u = new URL(url);
      const host = u.hostname.replace(/^www\./, "");
      if (host === "youtu.be") {
        const id = u.pathname.replace(/^\//, "").split("/")[0];
        return `https://www.youtube-nocookie.com/embed/${id}`;
      }
      if (host === "youtube.com" || host === "m.youtube.com") {
        if (u.pathname.startsWith("/live/")) {
          const id = u.pathname.replace("/live/", "").split("/")[0];
          return `https://www.youtube-nocookie.com/embed/${id}`;
        }
        if (u.pathname.startsWith("/shorts/")) {
          const id = u.pathname.replace("/shorts/", "").split("/")[0];
          return `https://www.youtube-nocookie.com/embed/${id}`;
        }
        const v = u.searchParams.get("v");
        if (v) {
          return `https://www.youtube-nocookie.com/embed/${v}`;
        }
      }
      if (host.includes("vimeo.com")) {
        const id = u.pathname.split("/").filter(Boolean).pop();
        if (id) return `https://player.vimeo.com/video/${id}`;
      }
      return null;
    } catch {
      return null;
    }
  };

  if (loading) {
    return <PageLoader label="Chargement de votre session d'apprentissage…" />;
  }

  if (error || !course) {
    return (
      <div className="glass-card p-12 text-center rounded-3xl" style={{ borderStyle: "dashed" }}>
        <p className="font-serif text-xl font-bold text-rose-600">Erreur d&apos;accès au cours</p>
        <p className="mt-2 text-sm" style={{ color: "var(--muted)" }}>
          {error || "Ce cours est introuvable ou vous n'avez pas les autorisations nécessaires."}
        </p>
        <Button onClick={() => router.back()} className="mt-5 text-xs font-semibold">
          ← Retour aux cours
        </Button>
      </div>
    );
  }

  const lessons = course.lessons || [];

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Top Breadcrumb Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <Link
          href={`/courses/${course.subject || "math"}`}
          className="inline-flex items-center gap-2 rounded-xl px-3.5 py-1.5 text-xs font-semibold transition-all hover:-translate-x-0.5"
          style={{
            background: "var(--paper-card)",
            border: "1px solid var(--line)",
            color: "var(--ink)",
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="19" y1="12" x2="5" y2="12" />
            <polyline points="12 19 5 12 12 5" />
          </svg>
          Retour aux cours de {(course.subject || "math").toUpperCase()}
        </Link>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors shadow-xs cursor-pointer"
            title={sidebarCollapsed ? "Afficher le programme" : "Agrandir l'espace de lecture"}
          >
            <span>{sidebarCollapsed ? "📑 Afficher le sommaire" : "⤢ Mode lecture large"}</span>
          </button>
          <span className="rounded-full px-2.5 py-0.5 text-xs font-bold uppercase font-mono bg-indigo-50 text-indigo-700">
            {course.filiere || "Générale"}
          </span>
          <span className="rounded-full px-2.5 py-0.5 text-xs font-semibold bg-slate-100 text-slate-700">
            {lessons.length} {lessons.length === 1 ? "leçon" : "leçons"}
          </span>
        </div>
      </div>

      {/* Free Plan Restriction Notice Banner */}
      {isFreeStudent && (
        <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-2xl border border-amber-200 bg-amber-50/90 text-amber-950 shadow-xs animate-fade-in">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-200/80 text-xl">
              🔒
            </span>
            <div className="text-xs">
              <p className="font-bold text-amber-950 text-sm">
                Formule actuelle : Gratuit (Free)
              </p>
              <p className="text-amber-800 mt-0.5 leading-relaxed">
                Vous pouvez consulter le programme du cours. L&apos;ouverture des <strong>vidéos pédagogiques</strong> et des <strong>supports PDF</strong> est réservée aux abonnés.
              </p>
            </div>
          </div>
          <Link
            href="/membership"
            className="inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 transition-colors shadow-xs"
          >
            Débloquer l&apos;accès complet →
          </Link>
        </div>
      )}

      {/* Main Learning Classroom Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT COLUMN: Course Curriculum & Lessons Navigation (4 cols) */}
        {!sidebarCollapsed && (
          <div
            className="lg:col-span-4 rounded-3xl p-5 border flex flex-col justify-between"
            style={{
              background: "var(--paper-card)",
              borderColor: "var(--line)",
              boxShadow: "0 4px 20px -2px rgba(15,23,42,0.04)",
            }}
          >
          <div>
            <div className="border-b pb-4" style={{ borderColor: "var(--line)" }}>
              <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-600 block">
                Programme du cours
              </span>
              <h2 className="mt-1 font-serif text-lg font-bold leading-tight" style={{ color: "var(--ink)" }}>
                {course.title}
              </h2>
              {course.description && (
                <p className="mt-1.5 text-xs leading-relaxed line-clamp-2" style={{ color: "var(--muted)" }}>
                  {course.description}
                </p>
              )}
            </div>

            {/* Lessons List */}
            <div className="mt-4 space-y-2 max-h-[520px] overflow-y-auto pr-1">
              {isStudent && !["gold", "platinum"].includes(membershipStr) && (
                <Link href="/membership" className="block rounded-2xl border border-amber-200 bg-amber-50 p-3">
                  <span className="text-xs font-bold text-amber-900">Quiz réservés aux membres Gold et Platinum</span>
                  <span className="mt-1 block text-[10px] text-amber-800">Passer à une formule supérieure →</span>
                </Link>
              )}
              {quizzes.length > 0 && (
                <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-3">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-amber-800">Quiz du cours</p>
                  <div className="mt-2 space-y-2">
                    {quizzes.map((quiz) => (
                      <details key={quiz.id} className="rounded-xl bg-white p-2.5">
                        <summary className="cursor-pointer text-xs font-bold text-slate-800">{quiz.title}</summary>
                        <div className="mt-2 space-y-2">
                          {(quiz.questions ?? []).map((question) => (
                            <div key={question.id} className="rounded-lg bg-slate-50 p-2 text-[11px] text-slate-700">
                              <p className="font-semibold">{question.prompt}</p>
                              <ul className="mt-1 list-disc pl-4 text-slate-500">
                                {question.options.map((option, index) => <li key={`${question.id}-${index}`}>{option}</li>)}
                              </ul>
                            </div>
                          ))}
                          {(quiz.questions ?? []).length === 0 && <p className="text-[10px] text-slate-500">Questions à venir.</p>}
                        </div>
                      </details>
                    ))}
                  </div>
                </div>
              )}
              {quizError && <p className="text-[10px] text-rose-600">{quizError}</p>}
              {/* Standalone Course Video button if present */}
              {(course.videoFile || course.youtubeUrl) && (
                <button
                  type="button"
                  onClick={() => {
                    setViewingCourseVideo(true);
                    setViewingCoursePdf(false);
                    setSelectedLessonId(null);
                  }}
                  className={`w-full text-left p-3 rounded-2xl transition-all duration-200 flex items-center justify-between border cursor-pointer ${
                    viewingCourseVideo
                      ? "border-indigo-400 bg-indigo-50/90 shadow-xs"
                      : "border-slate-200 bg-white hover:bg-slate-50"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl text-xs bg-indigo-100 text-indigo-700 font-bold">
                      {isFreeStudent ? "🔒" : "🎬"}
                    </span>
                    <div className="min-w-0 flex-1">
                      <span className="text-xs font-bold text-slate-800 block truncate">
                        Vidéo de la ressource {isFreeStudent ? "🔒" : ""}
                      </span>
                      <span className="text-[10px] text-slate-500">
                        {isFreeStudent ? "Réservé aux abonnés" : "Visionner la vidéo"}
                      </span>
                    </div>
                  </div>
                  {viewingCourseVideo ? (
                    <span className="h-2 w-2 rounded-full bg-indigo-600 shrink-0" />
                  ) : (
                    <span className="text-[11px] font-semibold text-indigo-600 shrink-0">
                      {isFreeStudent ? "🔒" : "Regarder →"}
                    </span>
                  )}
                </button>
              )}

              {/* Standalone Course Polycopié PDF button if present */}
              {course.pdfFile && (
                <button
                  type="button"
                  onClick={() => {
                    setViewingCoursePdf(true);
                    setViewingCourseVideo(false);
                    setSelectedLessonId(null);
                  }}
                  className={`w-full text-left p-3 rounded-2xl transition-all duration-200 flex items-center justify-between border cursor-pointer ${
                    viewingCoursePdf
                      ? "border-rose-400 bg-rose-50/90 shadow-xs"
                      : "border-slate-200 bg-white hover:bg-slate-50"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl text-xs bg-rose-100 text-rose-700 font-bold">
                      {isFreeStudent ? "🔒" : "📄"}
                    </span>
                    <div className="min-w-0 flex-1">
                      <span className="text-xs font-bold text-slate-800 block truncate">
                        Polycopié PDF du cours {isFreeStudent ? "🔒" : ""}
                      </span>
                      <span className="text-[10px] text-slate-500">
                        {isFreeStudent ? "Réservé aux abonnés" : "Document officiel complet"}
                      </span>
                    </div>
                  </div>
                  {viewingCoursePdf ? (
                    <span className="h-2 w-2 rounded-full bg-rose-600 shrink-0" />
                  ) : (
                    <span className="text-[11px] font-semibold text-rose-600 shrink-0">
                      {isFreeStudent ? "🔒" : "Lire →"}
                    </span>
                  )}
                </button>
              )}

              {lessons.map((lesson, idx) => {
                const isSelected = !viewingCoursePdf && !viewingCourseVideo && activeLesson?.id === lesson.id;
                const isLessonLocked = isFreeStudent && (lesson.type === LessonType.VIDEO || lesson.type === LessonType.PDF);
                return (
                  <button
                    key={lesson.id}
                    type="button"
                    onClick={() => {
                      setSelectedLessonId(lesson.id);
                      setViewingCoursePdf(false);
                      setViewingCourseVideo(false);
                    }}
                    className="w-full text-left p-3 rounded-2xl transition-all duration-200 flex items-center justify-between border cursor-pointer"
                    style={{
                      background: isSelected ? "var(--accent-glow)" : "rgba(15,23,42,0.02)",
                      borderColor: isSelected ? "var(--accent)" : "transparent",
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl text-xs font-bold font-mono"
                        style={{
                          backgroundColor: isSelected ? "var(--accent)" : "rgba(15,23,42,0.06)",
                          color: isSelected ? "#ffffff" : "var(--muted)",
                        }}
                      >
                        {idx + 1}
                      </span>
                      <div>
                        <span
                          className="text-xs font-semibold block line-clamp-1"
                          style={{
                            color: isSelected ? "var(--accent)" : "var(--ink)",
                          }}
                        >
                          {lesson.title} {isLessonLocked ? "🔒" : ""}
                        </span>
                        <span className="text-[10px] text-slate-400 font-medium">
                          {lesson.type === LessonType.VIDEO ? "🎬 Vidéo" : lesson.type === LessonType.PDF ? "📄 Document PDF" : "📝 Notes écrites"}
                          {isLessonLocked ? " • Verrouillé" : ""}
                          {lesson.durationMinutes ? ` • ${lesson.durationMinutes} min` : ""}
                        </span>
                      </div>
                    </div>

                    {isSelected && (
                      <span className="h-2 w-2 rounded-full bg-indigo-600 shrink-0" />
                    )}
                  </button>
                );
              })}

              {lessons.length === 0 && !course.pdfFile && (
                <div className="p-6 text-center text-xs text-slate-500 rounded-2xl bg-slate-50">
                  Aucune sous-leçon n&apos;a été enregistrée pour ce cours.
                </div>
              )}
            </div>
          </div>
        </div>
        )}

        {/* RIGHT COLUMN: Active Lesson / Course PDF Stage (8 or 12 cols) */}
        <div
          className={`${
            sidebarCollapsed ? "lg:col-span-12" : "lg:col-span-8"
          } rounded-3xl p-5 sm:p-7 border flex flex-col justify-between min-h-[580px] transition-all duration-300`}
          style={{
            background: "var(--paper-card)",
            borderColor: "var(--line)",
            boxShadow: "0 4px 20px -2px rgba(15,23,42,0.04)",
          }}
        >
          {/* VIEW A: Full Course Polycopié PDF in Magazine Viewer */}
          {viewingCoursePdf && course.pdfFile ? (
            <div className="space-y-4">
              <div className="border-b pb-3" style={{ borderColor: "var(--line)" }}>
                <span className="text-xs font-bold uppercase tracking-wider text-rose-600 font-mono">
                  Polycopié de cours • Document officiel
                </span>
                <h1 className="mt-1 font-serif text-2xl sm:text-3xl font-bold" style={{ color: "var(--ink)" }}>
                  {course.title}
                </h1>
              </div>

              {/* Magazine Flipbook Viewer or Free Plan Locked View */}
              {isFreeStudent ? (
                <LockedMediaCard
                  type="pdf"
                  title={`Polycopié officiel : ${course.title}`}
                  description="Le polycopié officiel complet au format PDF est réservé aux élèves ayant souscrit à un abonnement (Silver, Gold ou Platinum)."
                />
              ) : loadingPdf ? (
                <div className="flex flex-col items-center justify-center h-[620px] rounded-3xl bg-slate-900 border border-slate-800">
                  <div className="h-10 w-10 animate-spin rounded-full border-3 border-indigo-500 border-t-transparent" />
                  <p className="mt-3 text-xs font-semibold text-slate-300">Préparation du magazine interactif…</p>
                </div>
              ) : pdfBlobUrl ? (
                <MagazinePdfViewer
                  pdfUrl={pdfBlobUrl}
                  title={course.title}
                  onDownload={() => handleDownloadPdf(course.pdfFile!)}
                  downloading={pdfBusy}
                />
              ) : (
                <div className="p-12 text-center text-xs text-slate-400 rounded-3xl border border-dashed">
                  {pdfError || "Fichier PDF introuvable ou indisponible."}
                </div>
              )}
            </div>
          ) : viewingCourseVideo && (course.videoFile || course.youtubeUrl) ? (
            /* VIEW D: Course Main Video */
            <div className="space-y-4">
              <div className="border-b pb-3" style={{ borderColor: "var(--line)" }}>
                <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 font-mono">
                  Vidéo principale • {course.title}
                </span>
                <h1 className="mt-1 font-serif text-2xl sm:text-3xl font-bold" style={{ color: "var(--ink)" }}>
                  {course.title}
                </h1>
              </div>

              {isFreeStudent ? (
                <LockedMediaCard
                  type="video"
                  title={course.title}
                  description="Le visionnage de cette vidéo pédagogique est réservé aux élèves ayant souscrit à une formule Silver, Gold ou Platinum."
                />
              ) : course.videoFile ? (
                <div className="relative w-full overflow-hidden rounded-2xl aspect-video bg-black shadow-md flex items-center justify-center">
                  <video
                    controls
                    playsInline
                    preload="metadata"
                    className="h-full w-full object-contain"
                    src={`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000"}/api/courses/videos/${encodeURIComponent(course.videoFile)}?token=${encodeURIComponent(token || "")}`}
                  >
                    Votre navigateur ne prend pas en charge la lecture de vidéos.
                  </video>
                </div>
              ) : course.youtubeUrl && getEmbedYoutubeUrl(course.youtubeUrl) ? (
                <div className="relative w-full overflow-hidden rounded-2xl aspect-video bg-black shadow-md">
                  <iframe
                    src={getEmbedYoutubeUrl(course.youtubeUrl) || ""}
                    title={course.title}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    className="absolute inset-0 h-full w-full border-0"
                  />
                </div>
              ) : course.youtubeUrl ? (
                <div className="p-8 rounded-2xl bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200 text-center">
                  <span className="text-3xl block mb-2">🔴</span>
                  <h4 className="font-serif text-lg font-bold text-slate-800">Lien Direct / Session</h4>
                  <p className="text-xs text-slate-600 mt-1 mb-4">Cliquez sur le lien ci-dessous pour rejoindre ou visionner ce direct.</p>
                  <a
                    href={course.youtubeUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-primary text-xs font-bold inline-flex items-center gap-2 px-5 py-2.5 rounded-xl shadow-sm"
                  >
                    Accéder au direct ↗
                  </a>
                </div>
              ) : null}

              {course.description && (
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs leading-relaxed text-slate-700">
                  <p className="font-semibold text-slate-900 mb-1">Résumé pédagogique :</p>
                  {course.description}
                </div>
              )}
            </div>
          ) : activeLesson ? (
            /* VIEW B: Active Lesson Content */
            <div className="space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-4" style={{ borderColor: "var(--line)" }}>
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 font-mono">
                    Leçon {activeLessonIndex + 1} sur {lessons.length}
                  </span>
                  <h1 className="mt-1 font-serif text-2xl sm:text-3xl font-bold" style={{ color: "var(--ink)" }}>
                    {activeLesson.title}
                  </h1>
                </div>

                <span className="rounded-full px-3 py-1 text-xs font-bold uppercase font-mono bg-slate-100 text-slate-700">
                  {activeLesson.type === LessonType.VIDEO ? "🎬 Vidéo" : activeLesson.type === LessonType.PDF ? "📄 Document PDF" : "📝 Cours Écrit"}
                </span>
              </div>

              {/* 1. VIDEO LESSON STAGE */}
              {activeLesson.type === LessonType.VIDEO && (
                <div className="space-y-4">
                  {isFreeStudent ? (
                    <LockedMediaCard
                      type="video"
                      title={activeLesson.title}
                      description="Le visionnage des explications vidéo des professeurs est réservé aux élèves ayant souscrit à une formule Silver, Gold ou Platinum."
                    />
                  ) : activeLesson.videoFile ? (
                    <div className="relative w-full overflow-hidden rounded-2xl aspect-video bg-black shadow-md flex items-center justify-center">
                      <video
                        controls
                        playsInline
                        preload="metadata"
                        className="h-full w-full object-contain"
                        src={`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000"}/api/courses/videos/${encodeURIComponent(activeLesson.videoFile)}?token=${encodeURIComponent(token || "")}`}
                        onTimeUpdate={(event) => {
                          const video = event.currentTarget;
                          saveLessonProgress(activeLesson.id, video.currentTime);
                        }}
                        onEnded={(event) => saveLessonProgress(activeLesson.id, event.currentTarget.currentTime, true)}
                      >
                        Votre navigateur ne prend pas en charge la lecture de vidéos.
                      </video>
                    </div>
                  ) : activeLesson.youtubeUrl ? (
                    getEmbedYoutubeUrl(activeLesson.youtubeUrl) ? (
                      <div className="relative w-full overflow-hidden rounded-2xl aspect-video bg-black shadow-md">
                        <iframe
                          src={getEmbedYoutubeUrl(activeLesson.youtubeUrl) || ""}
                          title={activeLesson.title}
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                          className="absolute inset-0 h-full w-full border-0"
                        />
                      </div>
                    ) : (
                      <div className="p-8 rounded-2xl bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200 text-center">
                        <span className="text-3xl block mb-2">🔴</span>
                        <h4 className="font-serif text-lg font-bold text-slate-800">Lien Direct / Session</h4>
                        <p className="text-xs text-slate-600 mt-1 mb-4">Cliquez sur le lien ci-dessous pour rejoindre ou visionner ce contenu.</p>
                        <a
                          href={activeLesson.youtubeUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn-primary text-xs font-bold inline-flex items-center gap-2 px-5 py-2.5 rounded-xl shadow-sm"
                        >
                          Accéder au lien direct ↗
                        </a>
                      </div>
                    )
                  ) : (
                    <div className="p-12 text-center text-xs text-slate-400 rounded-2xl border border-dashed">
                      Vidéo en cours d&apos;intégration pour cette leçon.
                    </div>
                  )}

                  {activeLesson.description && (
                    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs leading-relaxed text-slate-700">
                      <p className="font-semibold text-slate-900 mb-1">Résumé pédagogique :</p>
                      {activeLesson.description}
                    </div>
                  )}
                </div>
              )}

              {/* 2. TEXT LESSON STAGE */}
              {activeLesson.type === LessonType.TEXT && (
                <div className="space-y-4">
                  <div
                    className="prose prose-indigo max-w-none rounded-2xl p-6 bg-slate-50/70 border border-slate-200 text-sm leading-relaxed whitespace-pre-line"
                    style={{ color: "var(--ink)" }}
                  >
                    {activeLesson.textContent || "Aucun contenu textuel rédigé pour cette leçon."}
                  </div>
                </div>
              )}

              {/* 3. PDF LESSON STAGE (MAGAZINE INTERACTIVE FLIPBOOK + DOWNLOAD) */}
              {activeLesson.type === LessonType.PDF && (
                <div className="space-y-4">
                  {activeLesson.description && (
                    <p className="text-xs text-slate-600 px-1">
                      {activeLesson.description}
                    </p>
                  )}

                  {/* Magazine Flipbook Viewer or Free Plan Locked View */}
                  {isFreeStudent ? (
                    <LockedMediaCard
                      type="pdf"
                      title={activeLesson.title}
                      description="Ce document et support d'exercices PDF sont réservés aux élèves ayant souscrit à une formule Silver, Gold ou Platinum."
                    />
                  ) : loadingPdf ? (
                    <div className="flex flex-col items-center justify-center h-[620px] rounded-3xl bg-slate-900 border border-slate-800">
                      <div className="h-10 w-10 animate-spin rounded-full border-3 border-indigo-500 border-t-transparent" />
                      <p className="mt-3 text-xs font-semibold text-slate-300">Préparation du document interactif…</p>
                    </div>
                  ) : pdfBlobUrl ? (
                    <MagazinePdfViewer
                      pdfUrl={pdfBlobUrl}
                      title={activeLesson.title}
                      onDownload={activeLesson.pdfFile ? () => handleDownloadPdf(activeLesson.pdfFile!) : undefined}
                      downloading={pdfBusy}
                    />
                  ) : (
                    <div className="p-12 text-center text-xs text-slate-400 rounded-3xl border border-dashed">
                      {pdfError || "Fichier PDF introuvable ou indisponible."}
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            /* VIEW C: If no lessons and no course PDF selected, show course overview text */
            <div className="space-y-6">
              <h1 className="font-serif text-3xl font-bold" style={{ color: "var(--ink)" }}>
                {course.title}
              </h1>

              {course.textContent && (
                <div className="rounded-2xl p-6 bg-slate-50 border border-slate-200 text-sm leading-relaxed whitespace-pre-line">
                  {course.textContent}
                </div>
              )}

              {course.videoFile && (
                isFreeStudent ? (
                  <LockedMediaCard
                    type="video"
                    title={course.title}
                    description="La vidéo de cette ressource est réservée aux élèves abonnés Silver, Gold et Platinum."
                  />
                ) : (
                  <div className="relative w-full overflow-hidden rounded-2xl aspect-video bg-black shadow-md flex items-center justify-center">
                    <video
                      controls
                      playsInline
                      preload="metadata"
                      className="h-full w-full object-contain"
                      src={`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000"}/api/courses/videos/${encodeURIComponent(course.videoFile)}?token=${encodeURIComponent(token || "")}`}
                    >
                      Votre navigateur ne prend pas en charge la lecture de vidéos.
                    </video>
                  </div>
                )
              )}

              {course.youtubeUrl && (
                isFreeStudent ? (
                  <LockedMediaCard
                    type="video"
                    title={course.title}
                    description="La vidéo de ce cours est réservée aux élèves abonnés Silver, Gold et Platinum."
                  />
                ) : getEmbedYoutubeUrl(course.youtubeUrl) ? (
                  <div className="relative w-full overflow-hidden rounded-2xl aspect-video bg-black">
                    <iframe
                      src={getEmbedYoutubeUrl(course.youtubeUrl) || ""}
                      title={course.title}
                      allowFullScreen
                      className="absolute inset-0 h-full w-full border-0"
                    />
                  </div>
                ) : (
                  <div className="p-8 rounded-2xl bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200 text-center">
                    <span className="text-3xl block mb-2">🔴</span>
                    <h4 className="font-serif text-lg font-bold text-slate-800">Lien Direct / Session</h4>
                    <p className="text-xs text-slate-600 mt-1 mb-4">Cliquez sur le lien ci-dessous pour rejoindre ou visionner ce direct.</p>
                    <a
                      href={course.youtubeUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-primary text-xs font-bold inline-flex items-center gap-2 px-5 py-2.5 rounded-xl shadow-sm"
                    >
                      Accéder au direct ↗
                    </a>
                  </div>
                )
              )}
            </div>
          )}

          {/* Bottom Pagination Controls: Previous & Next Lesson */}
          {lessons.length > 1 && (
            <div className="mt-8 pt-5 border-t flex items-center justify-between" style={{ borderColor: "var(--line)" }}>
              <Button
                type="button"
                variant="secondary"
                disabled={activeLessonIndex <= 0}
                onClick={() => {
                  if (activeLessonIndex > 0) {
                    setSelectedLessonId(lessons[activeLessonIndex - 1].id);
                  }
                }}
                className="text-xs font-semibold"
              >
                ← Leçon précédente
              </Button>

              <span className="text-xs text-slate-400 font-mono">
                {activeLessonIndex + 1} / {lessons.length}
              </span>

              <Button
                type="button"
                disabled={activeLessonIndex >= lessons.length - 1}
                onClick={() => {
                  if (activeLessonIndex < lessons.length - 1) {
                    setSelectedLessonId(lessons[activeLessonIndex + 1].id);
                  }
                }}
                className="text-xs font-semibold"
              >
                Leçon suivante →
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function LockedMediaCard({
  type,
  title,
  description,
}: {
  type: "video" | "pdf";
  title?: string;
  description?: string;
}) {
  const isVideo = type === "video";
  return isVideo ? (
    <div className="relative w-full overflow-hidden rounded-2xl aspect-video bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 border border-slate-800 flex flex-col items-center justify-center p-6 text-center shadow-xl">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-500/20 text-indigo-300 text-2xl border border-indigo-500/30 shadow-inner">
        🔒
      </div>
      <span className="mt-3 inline-flex items-center gap-1.5 rounded-full px-3 py-0.5 text-[11px] font-bold uppercase font-mono bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
        Vidéo Verrouillée • Formule Free
      </span>
      {title && (
        <h3 className="mt-2 font-serif text-lg sm:text-xl font-bold text-white max-w-lg line-clamp-1">
          {title}
        </h3>
      )}
      <p className="mt-1.5 max-w-md text-xs text-slate-300 leading-relaxed">
        {description || "Le visionnage des explications vidéo des professeurs est réservé aux élèves ayant souscrit à une formule Silver, Gold ou Platinum."}
      </p>
      <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
        <Link
          href="/membership"
          className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 shadow-md transition-all hover:scale-[1.02]"
        >
          Débloquer la vidéo • Voir les formules →
        </Link>
      </div>
    </div>
  ) : (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center rounded-3xl border border-dashed border-rose-300 bg-rose-50/60 shadow-xs">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-100 text-3xl shadow-xs border border-rose-200">
        🔒
      </div>
      <span className="mt-4 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold uppercase font-mono bg-rose-100 text-rose-700 border border-rose-200">
        Document PDF Verrouillé
      </span>
      {title && (
        <h3 className="mt-3 font-serif text-xl sm:text-2xl font-bold text-slate-800">
          {title}
        </h3>
      )}
      <p className="mt-2 max-w-md text-xs sm:text-sm text-slate-600 leading-relaxed">
        {description || "Le polycopié officiel et les supports PDF interactifs sont réservés aux élèves abonnés (Formules Silver, Gold et Platinum)."}
      </p>
      <div className="mt-3 text-xs font-medium text-slate-500">
        Votre formule actuelle : <span className="font-bold text-rose-700">Gratuit (Free)</span>
      </div>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <Link
          href="/membership"
          className="inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-md transition-all hover:scale-[1.02]"
        >
          Débloquer avec un abonnement →
        </Link>
      </div>
    </div>
  );
}
