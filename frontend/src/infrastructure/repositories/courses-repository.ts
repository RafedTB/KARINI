import type { Course } from "@/domain/entities/course";
import { apiClient, apiClientBlob } from "@/infrastructure/http/api-client";

export const coursesRepository = {
  list(token: string, filters?: { subject?: string; section?: string }) {
    const params = new URLSearchParams();
    if (filters?.subject) params.set("subject", filters.subject);
    if (filters?.section) params.set("section", filters.section);
    const qs = params.toString();
    return apiClient<Course[]>(`/api/courses${qs ? `?${qs}` : ""}`, { token });
  },

  getById(token: string, id: number) {
    return apiClient<Course>(`/api/courses/${id}`, { token });
  },

  downloadMagazine(token: string, fileName: string) {
    return apiClientBlob(`/api/courses/magazines/${encodeURIComponent(fileName)}`, token);
  },
};
