import { apiClient } from "@/infrastructure/http/api-client";

export type SaveLessonProgressInput = {
  completed?: boolean;
  watchedSeconds?: number;
  lastPositionSeconds?: number;
};

export const progressRepository = {
  saveLessonProgress(token: string, lessonId: number, input: SaveLessonProgressInput) {
    return apiClient(`/api/student/lessons/${lessonId}/progress`, {
      token,
      method: "PUT",
      json: input,
    });
  },
};
