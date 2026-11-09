import type { ParentChild, ParentTeacher, WeeklySummary } from "@/domain/entities/parent-dashboard";
import { apiClient } from "@/infrastructure/http/api-client";

export const parentRepository = {
  listChildren(token: string) {
    return apiClient<ParentChild[]>("/api/parent/children", { token });
  },

  getWeeklySummary(token: string, childId: number) {
    return apiClient<WeeklySummary>(`/api/parent/children/${childId}/weekly-summary`, { token });
  },

  listTeachers(token: string, childId: number) {
    return apiClient<ParentTeacher[]>(`/api/parent/children/${childId}/teachers`, { token });
  },
};
