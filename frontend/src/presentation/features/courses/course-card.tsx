"use client";

import { useState } from "react";
import type { Course } from "@/domain/entities/course";
import { coursesService } from "@/application/services/courses-service";
import { Button } from "@/presentation/components/ui/button";
import { formatCourseSection, courseSectionIcon } from "@/shared/labels/course-section";

type CourseCardProps = {
  course: Course;
  token: string;
};

export function CourseCard({ course, token }: CourseCardProps) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function openMagazine() {
    if (!course.pdfFile) return;
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
      className="group glass-card flex flex-col p-6 transition-all duration-300"
      style={{
        ["--hover-border" as string]: sectionColor,
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.borderColor = `${sectionColor}40`;
        (e.currentTarget as HTMLElement).style.transform = "translateY(-2px)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.borderColor = "var(--line)";
        (e.currentTarget as HTMLElement).style.transform = "translateY(0)";
      }}
    >
      {/* Top row: badge + ID */}
      <div className="flex items-start justify-between gap-3">
        <span
          className="badge"
          style={{
            borderColor: `${sectionColor}30`,
            background: `${sectionColor}12`,
            color: sectionColor,
          }}
        >
          {courseSectionIcon(course.section)}{" "}
          {formatCourseSection(course.section)}
        </span>
        <span className="font-mono text-xs" style={{ color: "var(--muted)", opacity: 0.6 }}>
          #{String(course.id).padStart(2, "0")}
        </span>
      </div>

      {/* Title & desc */}
      <h3 className="mt-4 font-serif text-xl" style={{ color: "var(--ink)" }}>
        {course.title}
      </h3>
      <p className="mt-2 flex-1 text-sm leading-relaxed" style={{ color: "var(--muted)" }}>
        {course.description ?? "Focused learning content for your current season."}
      </p>

      {/* Actions */}
      <div className="mt-5 pt-4" style={{ borderTop: "1px solid var(--line)" }}>
        <div className="flex flex-wrap items-center gap-2.5">
          {course.youtubeUrl ? (
            <a
              href={course.youtubeUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-medium transition-all duration-200"
              style={{
                color: "var(--accent)",
                background: "var(--accent-glow)",
                border: "1px solid rgba(99, 102, 241, 0.2)",
              }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polygon points="5 3 19 12 5 21 5 3" />
              </svg>
              Watch Video
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                <polyline points="15 3 21 3 21 9" />
                <line x1="10" y1="14" x2="21" y2="3" />
              </svg>
            </a>
          ) : null}

          {course.pdfFile ? (
            <Button
              type="button"
              variant="secondary"
              disabled={busy}
              onClick={openMagazine}
              className="px-3.5 py-2 text-xs"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
              </svg>
              {busy ? "Opening…" : "Read / Download PDF"}
            </Button>
          ) : null}

          {!course.youtubeUrl && !course.pdfFile ? (
            <span className="text-xs" style={{ color: "var(--muted)", opacity: 0.6 }}>
              Content coming soon
            </span>
          ) : null}
        </div>
        {error ? <p className="mt-2 text-xs" style={{ color: "var(--error)" }}>{error}</p> : null}
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
