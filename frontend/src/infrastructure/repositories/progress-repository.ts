import { apiClient } from "@/infrastructure/http/api-client";

export type LessonProgress = {
  id?: number;
  studentId?: number;
  lessonId: number;
  completed: boolean;
  watchedSeconds: number;
  lastPositionSeconds: number;
  updatedAt?: string;
};

export type SaveLessonProgressInput = {
  completed?: boolean;
  watchedSeconds?: number;
  lastPositionSeconds?: number;
};

export const progressRepository = {
  getLessonProgress(token: string, lessonId: number) {
    return apiClient<LessonProgress | null>(`/api/student/lessons/${lessonId}/progress`, {
      token,
      method: "GET",
    });
  },

  getCourseProgress(token: string, courseId: number) {
    return apiClient<LessonProgress[]>(`/api/student/courses/${courseId}/progress`, {
      token,
      method: "GET",
    });
  },

  saveLessonProgress(token: string, lessonId: number, input: SaveLessonProgressInput) {
    return apiClient<LessonProgress>(`/api/student/lessons/${lessonId}/progress`, {
      token,
      method: "PUT",
      json: input,
    });
  },
};
