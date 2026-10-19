import type { Course } from "@/domain/entities/course";
import { apiClient, apiClientBlob } from "@/infrastructure/http/api-client";

export const coursesRepository = {
  list(token: string) {
    return apiClient<Course[]>("/api/courses", { token });
  },

  getById(token: string, id: number) {
    return apiClient<Course>(`/api/courses/${id}`, { token });
  },

  downloadMagazine(token: string, fileName: string) {
    return apiClientBlob(`/api/courses/magazines/${encodeURIComponent(fileName)}`, token);
  },
};
