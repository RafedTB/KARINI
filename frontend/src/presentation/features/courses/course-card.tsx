"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Course } from "@/domain/entities/course";
import { MembershipType, UserType } from "@/domain/enums";
import { useAuth } from "@/presentation/providers/auth-provider";
import { coursesService } from "@/application/services/courses-service";
import { Button } from "@/presentation/components/ui/button";
import { formatCourseSection } from "@/shared/labels/course-section";
import {
  GraduationCapIcon,
  BookOpenIcon,
  VideoCameraIcon,
  FileTextIcon,
  UsersIcon,
  RadioLiveIcon,
} from "@/presentation/components/ui/icons";

type CourseCardProps = {
  course: Course;
  token: string;
};

export function CourseCard({ course, token }: CourseCardProps) {
  const router = useRouter();
  const { user } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const userTypeStr = (user?.userType || "").toString().toLowerCase().trim();
  const membershipStr = (user?.membership || "").toString().toLowerCase().trim();
  const isStudent = userTypeStr === "student";
  const isPaidStudent = isStudent && ["silver", "gold", "platinum"].includes(membershipStr);
  const isFreeStudent = isStudent && !isPaidStudent;

  async function openMagazine() {
    if (!course.pdfFile) return;
    if (isFreeStudent) {
      router.push("/membership");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await coursesService.openMagazine(token, course.pdfFile);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not open magazine.");
    } finally {
      setBusy(false);
    }
  }

  const sectionColor = getSectionColor(course.section);

  return (
    <article
      className="group relative flex flex-col rounded-3xl p-6 sm:p-7 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
      style={{
        background: "var(--paper-card)",
        border: "1px solid var(--line)",
        boxShadow: "0 4px 20px -2px rgba(15, 23, 42, 0.05)",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.borderColor = `${sectionColor}50`;
        (e.currentTarget as HTMLElement).style.boxShadow = `0 16px 32px -8px ${sectionColor}20`;
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.borderColor = "var(--line)";
        (e.currentTarget as HTMLElement).style.boxShadow = "0 4px 20px -2px rgba(15, 23, 42, 0.05)";
      }}
    >
      {/* Decorative subtle colored line indicator at the top */}
      <div
        className="pointer-events-none absolute top-0 left-8 right-8 h-1 rounded-b-full transition-opacity opacity-70 group-hover:opacity-100"
        style={{ backgroundColor: sectionColor }}
      />

      {/* Top row: badge + ID */}
      <div className="flex items-start justify-between gap-3 pt-1">
        <span
          className="badge text-xs font-bold px-3 py-1 rounded-full shadow-xs inline-flex items-center gap-1.5"
          style={{
            borderColor: `${sectionColor}35`,
            background: `${sectionColor}12`,
            color: sectionColor,
          }}
        >
          {course.section === "course" ? (
            <VideoCameraIcon size={12} />
          ) : course.section === "exercise" ? (
            <FileTextIcon size={12} />
          ) : course.section === "magazine" ? (
            <BookOpenIcon size={12} />
          ) : (
            <RadioLiveIcon size={12} />
          )}
          <span>{formatCourseSection(course.section)}</span>
        </span>
        <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-500">
          #{String(course.id).padStart(2, "0")}
        </span>
      </div>

      {/* Title & desc */}
      <h3
        className="mt-4 font-serif text-xl sm:text-2xl font-bold tracking-tight transition-colors"
        style={{ color: "var(--ink)" }}
      >
        {course.title}
      </h3>
      <p className="mt-2 flex-1 text-xs sm:text-sm leading-relaxed line-clamp-3" style={{ color: "var(--muted)" }}>
        {course.description ?? "Programme pédagogique complet et ressources associées."}
      </p>

      {/* Course format highlights */}
      <div className="mt-4 flex flex-wrap items-center gap-1.5 text-[11px]">
        {course.filiere && (
          <span className="inline-flex items-center gap-1 rounded-lg px-2 py-0.5 font-bold bg-sky-50 text-sky-700 border border-sky-200/60 shadow-2xs">
            <GraduationCapIcon size={12} />
            <span>{course.filiere}</span>
          </span>
        )}
        {course.instructor && (
          <span className="inline-flex items-center gap-1 rounded-lg px-2 py-0.5 font-medium bg-slate-100 text-slate-700 border border-slate-200 shadow-2xs">
            <UsersIcon size={12} />
            <span>{course.instructor.firstname ? `${course.instructor.firstname} ${course.instructor.lastname || ""}` : (course.instructor.username || "Enseignant")}</span>
          </span>
        )}
        {course.lessons && course.lessons.length > 0 && (
          <span className="inline-flex items-center gap-1 rounded-lg px-2 py-0.5 font-bold bg-indigo-50 text-indigo-700 border border-indigo-100 shadow-2xs">
            <BookOpenIcon size={12} />
            <span>{course.lessons.length} {course.lessons.length === 1 ? "leçon" : "leçons"}</span>
          </span>
        )}
        {course.textContent && (
          <span className="inline-flex items-center gap-1 rounded-lg px-2 py-0.5 font-semibold bg-teal-50 text-teal-700 border border-teal-100 shadow-2xs">
            <FileTextIcon size={12} />
            <span>Cours écrit</span>
          </span>
        )}
        {(course.videoFile || course.youtubeUrl) && (
          <span className="inline-flex items-center gap-1 rounded-lg px-2 py-0.5 font-semibold bg-rose-50 text-rose-700 border border-rose-100 shadow-2xs">
            <VideoCameraIcon size={12} />
            <span>Vidéo {isFreeStudent ? "(VIP)" : ""}</span>
          </span>
        )}
        {course.pdfFile && (
          <span className="inline-flex items-center gap-1 rounded-lg px-2 py-0.5 font-semibold bg-pink-50 text-pink-700 border border-pink-100 shadow-2xs">
            <FileTextIcon size={12} />
            <span>PDF {isFreeStudent ? "(VIP)" : ""}</span>
          </span>
        )}
      </div>

      {/* Actions */}
      <div className="mt-5 pt-4 flex flex-wrap items-center justify-between gap-2 border-t" style={{ borderColor: "var(--line)" }}>
        <div className="flex flex-wrap items-center gap-2">
          {/* Main Study Link */}
          <Link
            href={`/courses/view/${course.id}`}
            className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold text-white transition-all duration-200 shadow-sm hover:scale-[1.02]"
            style={{
              background: `linear-gradient(135deg, ${sectionColor}, var(--accent-soft))`,
            }}
          >
            Commencer le cours
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </Link>

          {course.pdfFile ? (
            <Button
              type="button"
              variant="secondary"
              disabled={busy}
              onClick={openMagazine}
              className={`rounded-xl px-3 py-2 text-xs font-semibold transition-colors shadow-2xs ${
                isFreeStudent ? "border-amber-300 bg-amber-50/80 text-amber-800 hover:bg-amber-100 hover:text-amber-900" : ""
              }`}
              title={isFreeStudent ? "Document réservé aux formules payantes (Silver, Gold, Platinum). Cliquez pour vous abonner." : "Ouvrir le polycopié PDF"}
            >
              {isFreeStudent ? (
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
              ) : (
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                </svg>
              )}
              {busy ? "…" : isFreeStudent ? "PDF (Abonné)" : "PDF"}
            </Button>
          ) : null}
        </div>
        {error ? <p className="w-full mt-2 text-xs" style={{ color: "var(--error)" }}>{error}</p> : null}
      </div>
    </article>
  );
}

function getSectionColor(section: string): string {
  switch (section) {
    case "course": return "#6366f1";
    case "exercise": return "#0d9488";
    case "magazine": return "#db2777";
    case "oldlive": return "#d97706";
    default: return "#6366f1";
  }
}
