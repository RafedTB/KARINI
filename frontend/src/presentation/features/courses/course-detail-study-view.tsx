"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/presentation/providers/auth-provider";
import { coursesService } from "@/application/services/courses-service";
import type { Course } from "@/domain/entities/course";
import type { Lesson } from "@/domain/entities/lesson";
import { LessonType } from "@/domain/enums";
import { PageLoader } from "@/presentation/components/ui/page-loader";
import { Button } from "@/presentation/components/ui/button";
import { MagazinePdfViewer } from "@/presentation/components/pdf/magazine-pdf-viewer";

type CourseDetailStudyViewProps = {
  courseId: number;
};

export function CourseDetailStudyView({ courseId }: CourseDetailStudyViewProps) {
  const router = useRouter();
  const { token } = useAuth();

  const [course, setCourse] = useState<Course | null>(null);
  const [selectedLessonId, setSelectedLessonId] = useState<number | null>(null);
  const [viewingCoursePdf, setViewingCoursePdf] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [pdfBusy, setPdfBusy] = useState(false);
  const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null);
  const [loadingPdf, setLoadingPdf] = useState(false);
  const [pdfError, setPdfError] = useState("");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    coursesService
      .getById(token, courseId)
      .then((data) => {
        setCourse(data);
        if (data.lessons && data.lessons.length > 0) {
          setSelectedLessonId(data.lessons[0].id);
        } else if (data.pdfFile) {
          setViewingCoursePdf(true);
        }
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Impossible de charger le cours.");
      })
      .finally(() => setLoading(false));
  }, [token, courseId]);

  const activeLesson: Lesson | null = useMemo(() => {
    if (!course?.lessons || course.lessons.length === 0) return null;
    return course.lessons.find((l) => l.id === selectedLessonId) || course.lessons[0];
  }, [course, selectedLessonId]);

  const activeLessonIndex = useMemo(() => {
    if (!course?.lessons || !activeLesson) return 0;
    return course.lessons.findIndex((l) => l.id === activeLesson.id);
  }, [course, activeLesson]);

  // Determine which PDF file is currently targeted
  const currentPdfFile = useMemo(() => {
    if (viewingCoursePdf && course?.pdfFile) {
      return course.pdfFile;
    }
    if (!viewingCoursePdf && activeLesson && activeLesson.type === LessonType.PDF && activeLesson.pdfFile) {
      return activeLesson.pdfFile;
    }
    return null;
  }, [viewingCoursePdf, course, activeLesson]);

  // Load PDF as interactive Blob URL in the browser
  useEffect(() => {
    let isCancelled = false;
    let objectUrl: string | null = null;

    if (!token || !currentPdfFile) {
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
  }, [token, currentPdfFile]);

  const handleDownloadPdf = async (fileName: string) => {
    if (!token || !fileName) return;
    try {
      setPdfBusy(true);
      await coursesService.downloadPdf(token, fileName);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors du téléchargement du PDF.");
    } finally {
      setPdfBusy(false);
    }
  };

  // Convert regular YouTube link to embed link
  const getEmbedYoutubeUrl = (url?: string | null) => {
    if (!url) return null;
    try {
      if (url.includes("embed")) return url;
      const u = new URL(url);
      if (u.hostname === "youtu.be") {
        return `https://www.youtube.com/embed${u.pathname}`;
      }
      const v = u.searchParams.get("v");
      if (v) {
        return `https://www.youtube.com/embed/${v}`;
      }
      return url;
    } catch {
      return url;
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
              {/* Standalone Course Polycopié PDF button if present */}
              {course.pdfFile && (
                <button
                  type="button"
                  onClick={() => setViewingCoursePdf(true)}
                  className={`w-full text-left p-3 rounded-2xl transition-all duration-200 flex items-center justify-between border cursor-pointer ${
                    viewingCoursePdf
                      ? "border-rose-400 bg-rose-50/90 shadow-xs"
                      : "border-slate-200 bg-white hover:bg-slate-50"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl text-xs bg-rose-100 text-rose-700 font-bold">
                      📄
                    </span>
                    <div className="min-w-0 flex-1">
                      <span className="text-xs font-bold text-slate-800 block truncate">
                        Polycopié PDF du cours
                      </span>
                      <span className="text-[10px] text-slate-500">Document officiel complet</span>
                    </div>
                  </div>
                  {viewingCoursePdf ? (
                    <span className="h-2 w-2 rounded-full bg-rose-600 shrink-0" />
                  ) : (
                    <span className="text-[11px] font-semibold text-rose-600 shrink-0">Lire →</span>
                  )}
                </button>
              )}

              {lessons.map((lesson, idx) => {
                const isSelected = !viewingCoursePdf && activeLesson?.id === lesson.id;
                return (
                  <button
                    key={lesson.id}
                    type="button"
                    onClick={() => {
                      setSelectedLessonId(lesson.id);
                      setViewingCoursePdf(false);
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
                          {lesson.title}
                        </span>
                        <span className="text-[10px] text-slate-400 font-medium">
                          {lesson.type === LessonType.VIDEO ? "🎬 Vidéo" : lesson.type === LessonType.PDF ? "📄 Document PDF" : "📝 Notes écrites"}
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

              {/* Magazine Flipbook Viewer */}
              {loadingPdf ? (
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
              {activeLesson.type === LessonType.VIDEO && activeLesson.youtubeUrl && (
                <div className="space-y-4">
                  <div className="relative w-full overflow-hidden rounded-2xl aspect-video bg-black shadow-md">
                    <iframe
                      src={getEmbedYoutubeUrl(activeLesson.youtubeUrl) || ""}
                      title={activeLesson.title}
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      className="absolute inset-0 h-full w-full border-0"
                    />
                  </div>

                  {activeLesson.description && (
                    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs leading-relaxed text-slate-700">
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

                  {/* Magazine Flipbook Viewer */}
                  {loadingPdf ? (
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

              {course.youtubeUrl && (
                <div className="relative w-full overflow-hidden rounded-2xl aspect-video bg-black">
                  <iframe
                    src={getEmbedYoutubeUrl(course.youtubeUrl) || ""}
                    title={course.title}
                    allowFullScreen
                    className="absolute inset-0 h-full w-full border-0"
                  />
                </div>
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
