"use client";

import { useState } from "react";
import type { Course } from "@/domain/entities/course";
import { coursesService } from "@/application/services/courses-service";
import { Button } from "@/presentation/components/ui/button";
import { formatCourseSection } from "@/shared/labels/course-section";

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

  return (
    <article className="flex flex-col rounded-2xl border border-[var(--line)] bg-white/60 p-5">
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs uppercase tracking-[0.16em] text-[var(--muted)]">
          {formatCourseSection(course.section)}
        </p>
        <span className="font-mono text-xs text-[var(--muted)]">{String(course.id).padStart(2, "0")}</span>
      </div>
      <h3 className="mt-3 font-serif text-xl">{course.title}</h3>
      <p className="mt-2 flex-1 text-sm text-[var(--muted)]">
        {course.description ?? "Focused learning content for your current season."}
      </p>

      <div className="mt-5">
        {course.youtubeUrl ? (
          <a
            href={course.youtubeUrl}
            target="_blank"
            rel="noreferrer"
            className="text-sm font-medium underline-offset-2 hover:underline"
          >
            Watch on YouTube ↗
          </a>
        ) : course.pdfFile ? (
          <Button type="button" variant="secondary" disabled={busy} onClick={openMagazine}>
            {busy ? "Opening…" : "Read magazine ↗"}
          </Button>
        ) : (
          <span className="text-sm text-[var(--muted)]">Content coming soon</span>
        )}
        {error ? <p className="mt-2 text-xs text-red-700">{error}</p> : null}
      </div>
    </article>
  );
}
