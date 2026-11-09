"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { Course } from "@/domain/entities/course";
import { LessonType } from "@/domain/enums";
import { useAuth } from "@/presentation/providers/auth-provider";
import {
  VideoCameraIcon,
  RadioLiveIcon,
  UsersIcon,
  GraduationCapIcon,
} from "@/presentation/components/ui/icons";

export type VideoPlaylistItem = {
  id: string;
  courseId: number;
  courseTitle: string;
  lessonId?: number;
  title: string;
  description?: string | null;
  videoFile?: string | null;
  youtubeUrl?: string | null;
  durationMinutes?: number | null;
  instructorName?: string | null;
  filiere?: string | null;
};

type VideoStudioViewProps = {
  courses: Course[];
  token: string;
  subjectName?: string;
  accentColor?: string;
};

export function VideoStudioView({
  courses,
  token,
  subjectName,
  accentColor = "#6366f1",
}: VideoStudioViewProps) {
  const { user } = useAuth();
  const [activeVideoIndex, setActiveVideoIndex] = useState(0);
  const [filterQuery, setFilterQuery] = useState("");

  const userTypeStr = (user?.userType || "").toString().toLowerCase().trim();
  const membershipStr = (user?.membership || "").toString().toLowerCase().trim();
  const isStudent = userTypeStr === "student";
  const isPaidStudent = isStudent && ["silver", "gold", "platinum"].includes(membershipStr);
  const isFreeStudent = isStudent && !isPaidStudent;

  // Flatten courses into a sequential list of video items
  const playlist: VideoPlaylistItem[] = useMemo(() => {
    const items: VideoPlaylistItem[] = [];

    courses.forEach((course) => {
      const instructorName = course.instructor
        ? (course.instructor.firstname
            ? `${course.instructor.firstname} ${course.instructor.lastname || ""}`
            : (course.instructor.username || "Enseignant"))
        : null;

      // 1. Check if course has video lessons
      const videoLessons = (course.lessons || []).filter(
        (l) => l.type === LessonType.VIDEO || Boolean(l.videoFile || l.youtubeUrl)
      );

      if (videoLessons.length > 0) {
        videoLessons.forEach((lesson) => {
          items.push({
            id: `course-${course.id}-lesson-${lesson.id}`,
            courseId: course.id,
            courseTitle: course.title,
            lessonId: lesson.id,
            title: lesson.title,
            description: course.description,
            videoFile: lesson.videoFile || course.videoFile,
            youtubeUrl: lesson.youtubeUrl || course.youtubeUrl,
            durationMinutes: lesson.durationMinutes,
            instructorName,
            filiere: course.filiere,
          });
        });
      } else {
        // 2. Course-level video item
        items.push({
          id: `course-${course.id}`,
          courseId: course.id,
          courseTitle: course.title,
          title: course.title,
          description: course.description,
          videoFile: course.videoFile,
          youtubeUrl: course.youtubeUrl,
          durationMinutes: null,
          instructorName,
          filiere: course.filiere,
        });
      }
    });

    return items;
  }, [courses]);

  // Filter playlist by search query
  const filteredPlaylist = useMemo(() => {
    if (!filterQuery.trim()) return playlist;
    const q = filterQuery.toLowerCase().trim();
    return playlist.filter(
      (item) =>
        item.title.toLowerCase().includes(q) ||
        item.courseTitle.toLowerCase().includes(q) ||
        (item.instructorName && item.instructorName.toLowerCase().includes(q))
    );
  }, [playlist, filterQuery]);

  const activeItem = filteredPlaylist[activeVideoIndex] || filteredPlaylist[0] || null;

  const handleSelectVideo = (index: number) => {
    setActiveVideoIndex(index);
  };

  const handlePrev = () => {
    if (activeVideoIndex > 0) {
      setActiveVideoIndex(activeVideoIndex - 1);
    }
  };

  const handleNext = () => {
    if (activeVideoIndex < filteredPlaylist.length - 1) {
      setActiveVideoIndex(activeVideoIndex + 1);
    }
  };

  if (playlist.length === 0) {
    return (
      <div
        className="glass-card px-8 py-14 text-center rounded-3xl"
        style={{ borderStyle: "dashed" }}
      >
        <div
          className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl mb-4"
          style={{ backgroundColor: `${accentColor}18`, color: accentColor }}
        >
          <VideoCameraIcon size={32} />
        </div>
        <h3 className="font-serif text-xl font-bold" style={{ color: "var(--ink)" }}>
          Aucune vidéo enregistrée pour le moment
        </h3>
        <p className="mt-1 text-sm text-slate-500 max-w-md mx-auto">
          Les enseignants et intervenants ajouteront prochainement des cours vidéo en haute définition pour ce programme.
        </p>
      </div>
    );
  }

  const embedUrl = activeItem ? getEmbedYoutubeUrl(activeItem.youtubeUrl) : null;
  const videoFileUrl = activeItem?.videoFile
    ? `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000"}/api/courses/videos/${encodeURIComponent(activeItem.videoFile)}?token=${encodeURIComponent(token || "")}`
    : null;

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Free Plan Restriction Warning */}
      {isFreeStudent && (
        <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-2xl border border-amber-200 bg-amber-50/90 text-amber-950 shadow-xs">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-200/80 text-amber-800">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
            </span>
            <div className="text-xs">
              <p className="font-bold text-amber-950 text-sm">
                Accès restreint aux vidéos pédagogiques (Formule Free)
              </p>
              <p className="text-amber-800 mt-0.5 leading-relaxed">
                Le visionnage des leçons vidéo est réservé aux formules <strong>Silver</strong>, <strong>Gold</strong> et <strong>Platinum</strong>.
              </p>
            </div>
          </div>
          <Link
            href="/membership"
            className="inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 transition-colors shadow-xs"
          >
            Débloquer les vidéos →
          </Link>
        </div>
      )}

      {/* Main Studio 2-Column Grid: LEFT (Vid 1, 2, 3...) & RIGHT (Video Player) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT COLUMN: Playlist List (vid 1 / 2 / 3 ...) - 4 Columns */}
        <div
          className="lg:col-span-4 rounded-3xl p-5 border flex flex-col justify-between shadow-sm"
          style={{
            background: "var(--paper-card)",
            borderColor: "var(--line)",
          }}
        >
          <div>
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b" style={{ borderColor: "var(--line)" }}>
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-600 font-bold">
                  <VideoCameraIcon size={16} />
                </span>
                <div>
                  <h3 className="font-serif text-base font-bold" style={{ color: "var(--ink)" }}>
                    Liste des vidéos
                  </h3>
                  <span className="text-[11px] text-slate-500">
                    {subjectName ? `Matière : ${subjectName}` : "Programme vidéo"}
                  </span>
                </div>
              </div>
              <span
                className="rounded-full px-2.5 py-0.5 text-xs font-bold font-mono"
                style={{ backgroundColor: `${accentColor}18`, color: accentColor }}
              >
                {playlist.length} {playlist.length === 1 ? "vidéo" : "vidéos"}
              </span>
            </div>

            {/* Quick search input */}
            <div className="mt-3 relative">
              <svg
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                width="14"
                height="14"
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
                placeholder="Rechercher une vidéo..."
                value={filterQuery}
                onChange={(e) => {
                  setFilterQuery(e.target.value);
                  setActiveVideoIndex(0);
                }}
                className="w-full rounded-xl border bg-white/70 pl-8 pr-3 py-1.5 text-xs outline-none focus:border-indigo-500 focus:bg-white"
                style={{ borderColor: "var(--line)", color: "var(--ink)" }}
              />
            </div>

            {/* Playlist Items (Vid 1, Vid 2, Vid 3 ...) */}
            <div className="mt-3 space-y-2 max-h-[580px] overflow-y-auto pr-1">
              {filteredPlaylist.map((item, idx) => {
                const isActive = activeItem?.id === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleSelectVideo(idx)}
                    className="w-full text-left p-3 rounded-2xl transition-all duration-200 flex items-start gap-3 border cursor-pointer group"
                    style={{
                      background: isActive ? `${accentColor}12` : "rgba(15,23,42,0.02)",
                      borderColor: isActive ? accentColor : "transparent",
                    }}
                  >
                    {/* Badge: Vid 1 / Vid 2 / Vid 3 */}
                    <div
                      className="flex flex-col items-center justify-center shrink-0 rounded-xl px-2 py-1 text-center font-mono font-bold transition-transform group-hover:scale-105"
                      style={{
                        backgroundColor: isActive ? accentColor : "rgba(15,23,42,0.06)",
                        color: isActive ? "#ffffff" : "var(--ink)",
                      }}
                    >
                      <span className="text-[9px] uppercase tracking-wider leading-none">Vid</span>
                      <span className="text-sm font-black leading-tight">{idx + 1}</span>
                    </div>

                    {/* Content details */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span
                          className="text-xs font-bold block line-clamp-1 group-hover:text-indigo-600 transition-colors"
                          style={{
                            color: isActive ? accentColor : "var(--ink)",
                          }}
                        >
                          {item.title}
                        </span>
                        {isFreeStudent && (
                          <span className="text-[10px] font-semibold text-amber-600 bg-amber-50 px-1 py-0.5 rounded border border-amber-200">
                            VIP
                          </span>
                        )}
                      </div>

                      <span className="text-[10px] text-slate-500 block truncate mt-0.5">
                        {item.courseTitle !== item.title ? item.courseTitle : (item.instructorName || "Cours vidéo")}
                      </span>

                      <div className="flex items-center gap-2 mt-1 text-[10px] text-slate-400 font-medium">
                        {item.durationMinutes ? (
                          <span className="flex items-center gap-0.5">
                            ⏱ {item.durationMinutes} min
                          </span>
                        ) : (
                          <span className="text-emerald-600 font-semibold">HD</span>
                        )}
                        {item.filiere && <span>• {item.filiere}</span>}
                      </div>
                    </div>

                    {/* Active playing indicator dot */}
                    {isActive && (
                      <span
                        className="h-2 w-2 rounded-full shrink-0 mt-2 animate-pulse"
                        style={{ backgroundColor: accentColor }}
                      />
                    )}
                  </button>
                );
              })}

              {filteredPlaylist.length === 0 && (
                <div className="p-6 text-center text-xs text-slate-500 bg-slate-50 rounded-2xl">
                  Aucune vidéo ne correspond à &quot;{filterQuery}&quot;.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Video Player & Details - 8 Columns */}
        <div
          className="lg:col-span-8 rounded-3xl p-5 sm:p-7 border flex flex-col justify-between shadow-sm min-h-[580px]"
          style={{
            background: "var(--paper-card)",
            borderColor: "var(--line)",
          }}
        >
          {activeItem ? (
            <div className="space-y-4">
              {/* Header with Navigation Controls */}
              <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b" style={{ borderColor: "var(--line)" }}>
                <div>
                  <span
                    className="text-xs font-bold uppercase tracking-wider font-mono block"
                    style={{ color: accentColor }}
                  >
                    Vidéo {activeVideoIndex + 1} sur {filteredPlaylist.length} • {activeItem.courseTitle}
                  </span>
                  <h2 className="mt-1 font-serif text-xl sm:text-2xl font-bold" style={{ color: "var(--ink)" }}>
                    {activeItem.title}
                  </h2>
                </div>

                {/* Prev / Next controls */}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handlePrev}
                    disabled={activeVideoIndex === 0}
                    className="inline-flex items-center gap-1 rounded-xl px-3 py-1.5 text-xs font-bold border transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer bg-white"
                    style={{ borderColor: "var(--line)", color: "var(--ink)" }}
                  >
                    ← Précédente
                  </button>
                  <button
                    type="button"
                    onClick={handleNext}
                    disabled={activeVideoIndex >= filteredPlaylist.length - 1}
                    className="inline-flex items-center gap-1 rounded-xl px-3 py-1.5 text-xs font-bold text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-xs"
                    style={{ backgroundColor: accentColor }}
                  >
                    Suivante →
                  </button>
                </div>
              </div>

              {/* Video Player Display */}
              {isFreeStudent ? (
                <div className="flex flex-col items-center justify-center py-16 px-6 text-center rounded-3xl border border-slate-800 bg-slate-950 text-white shadow-md">
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-500/20 text-3xl shadow-sm border border-amber-500/30 text-amber-400">
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                  </div>
                  <span className="mt-4 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold uppercase font-mono bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    Vidéo Verrouillée
                  </span>
                  <h3 className="mt-3 font-serif text-xl sm:text-2xl font-bold">
                    {activeItem.title}
                  </h3>
                  <p className="mt-2 max-w-md text-xs sm:text-sm text-slate-300 leading-relaxed">
                    Le visionnage de cette vidéo pédagogique est réservé aux élèves ayant souscrit à une formule payante (Silver, Gold ou Platinum).
                  </p>
                  <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                    <Link
                      href="/membership"
                      className="inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 shadow-md transition-all hover:scale-[1.02]"
                    >
                      Débloquer avec un abonnement →
                    </Link>
                  </div>
                </div>
              ) : videoFileUrl ? (
                <div className="relative w-full overflow-hidden rounded-2xl aspect-video bg-black shadow-lg flex items-center justify-center">
                  <video
                    key={activeItem.id}
                    controls
                    playsInline
                    autoPlay={false}
                    preload="metadata"
                    className="h-full w-full object-contain"
                    src={videoFileUrl}
                  >
                    Votre navigateur ne prend pas en charge la lecture de vidéos.
                  </video>
                </div>
              ) : embedUrl ? (
                <div className="relative w-full overflow-hidden rounded-2xl aspect-video bg-black shadow-lg">
                  <iframe
                    key={activeItem.id}
                    src={embedUrl}
                    title={activeItem.title}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    className="absolute inset-0 h-full w-full border-0"
                  />
                </div>
              ) : activeItem.youtubeUrl ? (
                <div className="p-8 rounded-2xl bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200 text-center">
                  <RadioLiveIcon size={32} className="text-rose-500 mx-auto mb-2" />
                  <h4 className="font-serif text-lg font-bold text-slate-800">Lien Direct / Vidéo</h4>
                  <p className="text-xs text-slate-600 mt-1 mb-4">
                    Cette vidéo est accessible directement via le lien ci-dessous.
                  </p>
                  <a
                    href={activeItem.youtubeUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-primary text-xs font-bold inline-flex items-center gap-2 px-5 py-2.5 rounded-xl shadow-sm"
                  >
                    Visionner la session ↗
                  </a>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-16 px-6 text-center rounded-2xl border border-dashed border-slate-300 bg-slate-50">
                  <VideoCameraIcon size={32} className="text-slate-400 mb-2" />
                  <h4 className="font-serif text-lg font-bold text-slate-800">Vidéo en préparation</h4>
                  <p className="text-xs text-slate-500 max-w-sm mt-1">
                    L&apos;enseignant n&apos;a pas encore téléversé le fichier vidéo pour cette leçon. Consultez les notes de cours et exercices associés ci-dessous.
                  </p>
                </div>
              )}

              {/* Lesson Summary & Details */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  {activeItem.instructorName && (
                    <span className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1 font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                      <UsersIcon size={12} />
                      <span>{activeItem.instructorName}</span>
                    </span>
                  )}
                  {activeItem.filiere && (
                    <span className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1 font-bold bg-sky-50 text-sky-700 border border-sky-100">
                      <GraduationCapIcon size={12} />
                      <span>{activeItem.filiere}</span>
                    </span>
                  )}
                  {activeItem.durationMinutes && (
                    <span className="rounded-lg px-2.5 py-1 font-semibold bg-indigo-50 text-indigo-700 border border-indigo-100">
                      ⏱ {activeItem.durationMinutes} minutes
                    </span>
                  )}
                </div>

                {/* Link to Full Interactive Classroom */}
                <Link
                  href={`/courses/view/${activeItem.courseId}`}
                  className="inline-flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-bold text-indigo-600 bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 transition-colors shadow-2xs"
                >
                  Ouvrir le cours complet (leçons &amp; polycopié PDF) ↗
                </Link>
              </div>

              {activeItem.description && (
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs leading-relaxed text-slate-700">
                  <span className="font-semibold text-slate-900 block mb-1">Résumé pédagogique :</span>
                  {activeItem.description}
                </div>
              )}
            </div>
          ) : (
            <div className="p-12 text-center text-xs text-slate-400">
              Sélectionnez une vidéo dans la liste de gauche pour lancer la lecture.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function getEmbedYoutubeUrl(url?: string | null): string | null {
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
}

