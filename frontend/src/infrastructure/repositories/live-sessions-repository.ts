import type { CreateLiveSessionInput, LiveSession, LiveTeacher, UpdateLiveSessionInput } from "@/domain/entities/live-session";
import { apiClient } from "@/infrastructure/http/api-client";

export const liveSessionsRepository = {
  list(token: string) {
    return apiClient<LiveSession[]>("/api/live-sessions", { token });
  },

  getTeachers(token: string) {
    return apiClient<LiveTeacher[]>("/api/live-sessions/teachers", { token });
  },

  getById(token: string, id: number) {
    return apiClient<LiveSession>(`/api/live-sessions/${id}`, { token });
  },

  recordAttendance(token: string, id: number) {
    return apiClient(`/api/live-sessions/${id}/attendance`, { token, method: "POST" });
  },

  create(token: string, data: CreateLiveSessionInput) {
    return apiClient<LiveSession>("/api/live-sessions", {
      token,
      method: "POST",
      json: data,
    });
  },

  update(token: string, id: number, data: UpdateLiveSessionInput) {
    return apiClient<LiveSession>(`/api/live-sessions/${id}`, {
      token,
      method: "PATCH",
      json: data,
    });
  },

  delete(token: string, id: number) {
    return apiClient<{ message: string }>(`/api/live-sessions/${id}`, {
      token,
      method: "DELETE",
    });
  },
};
