"use client";

import { useEffect, useState } from "react";
import type { Course } from "@/domain/entities/course";
import { coursesService } from "@/application/services/courses-service";
import { CourseCard } from "@/presentation/features/courses/course-card";
import { PageLoader } from "@/presentation/components/ui/page-loader";
import { useAuth } from "@/presentation/providers/auth-provider";

export function LibraryView() {
  const { token } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) return;
    coursesService
      .list(token)
      .then(setCourses)
      .catch((err) => setError(err instanceof Error ? err.message : "Could not load library."))
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) return <PageLoader label="Loading your library…" />;

  if (error) {
    return (
      <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
        {error}
      </p>
    );
  }

  if (courses.length === 0) {
    return (
      <div className="rounded-3xl border border-dashed border-[var(--line)] px-6 py-16 text-center">
        <h2 className="font-serif text-2xl">Your library is being prepared</h2>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Instructors and admins can publish courses, exercises, magazines, and live archives here.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {courses.map((course) => (
        <CourseCard key={course.id} course={course} token={token!} />
      ))}
    </div>
  );
}
