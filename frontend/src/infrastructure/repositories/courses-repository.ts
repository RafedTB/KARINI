import type { Course } from "@/domain/entities/course";
import type { Lesson } from "@/domain/entities/lesson";
import { apiClient, apiClientBlob } from "@/infrastructure/http/api-client";

export type CreateCourseData = {
  title: string;
  description?: string;
  section: string;
  subject?: string;
  filiere?: string;
  textContent?: string;
  youtubeUrl?: string;
  pdfFile?: string;
};

export type CreateLessonData = {
  title: string;
  description?: string;
  type: string;
  textContent?: string;
  youtubeUrl?: string;
  pdfFile?: string;
  orderIndex?: number;
  durationMinutes?: number;
};

export const coursesRepository = {
  list(token: string, filters?: { subject?: string; section?: string; filiere?: string; teacherId?: number }) {
    const params = new URLSearchParams();
    if (filters?.subject) params.set("subject", filters.subject);
    if (filters?.section) params.set("section", filters.section);
    if (filters?.filiere) params.set("filiere", filters.filiere);
    if (filters?.teacherId) params.set("teacherId", String(filters.teacherId));
    const qs = params.toString();
    return apiClient<Course[]>(`/api/courses${qs ? `?${qs}` : ""}`, { token });
  },

  getById(token: string, id: number) {
    return apiClient<Course>(`/api/courses/${id}`, { token });
  },

  createCourse(token: string, data: CreateCourseData) {
    return apiClient<Course>("/api/courses", {
      token,
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  updateCourse(token: string, id: number, data: Partial<CreateCourseData>) {
    return apiClient<Course>(`/api/courses/${id}`, {
      token,
      method: "PATCH",
      body: JSON.stringify(data),
    });
  },

  deleteCourse(token: string, id: number) {
    return apiClient<{ message: string }>(`/api/courses/${id}`, {
      token,
      method: "DELETE",
    });
  },

  createLesson(token: string, courseId: number, data: CreateLessonData) {
    return apiClient<Lesson>(`/api/courses/${courseId}/lessons`, {
      token,
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  updateLesson(token: string, lessonId: number, data: Partial<CreateLessonData>) {
    return apiClient<Lesson>(`/api/courses/lessons/${lessonId}`, {
      token,
      method: "PATCH",
      body: JSON.stringify(data),
    });
  },

  deleteLesson(token: string, lessonId: number) {
    return apiClient<{ message: string }>(`/api/courses/lessons/${lessonId}`, {
      token,
      method: "DELETE",
    });
  },

  async uploadFile(token: string, file: File): Promise<{ filename: string; originalName: string; url: string }> {
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000"}/api/courses/upload-file`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => null);
      throw new Error(errData?.message || "Échec du téléversement du fichier");
    }
    return res.json();
  },

  downloadMagazine(token: string, fileName: string) {
    return apiClientBlob(`/api/courses/magazines/${encodeURIComponent(fileName)}`, token);
  },

  downloadMaterial(token: string, fileName: string) {
    return apiClientBlob(`/api/courses/materials/${encodeURIComponent(fileName)}`, token);
  },
};
