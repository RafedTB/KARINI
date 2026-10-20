import type { Subject } from "@/domain/entities/subject";
import { apiClient } from "@/infrastructure/http/api-client";

export type CreateSubjectData = {
  name: string;
  code: string;
  slug?: string;
  filiere: string;
  category?: string;
  description?: string;
  icon?: string;
  color?: string;
  topics?: string;
};

export const subjectsRepository = {
  list(token: string, filiere?: string) {
    const qs = filiere && filiere !== "all" ? `?filiere=${encodeURIComponent(filiere)}` : "";
    return apiClient<Subject[]>(`/api/subjects${qs}`, { token });
  },

  getFilieres(token: string) {
    return apiClient<string[]>("/api/subjects/meta/filieres", { token });
  },

  getById(token: string, id: number) {
    return apiClient<Subject>(`/api/subjects/${id}`, { token });
  },

  getBySlug(token: string, slug: string) {
    return apiClient<Subject>(`/api/subjects/by-slug/${encodeURIComponent(slug)}`, { token });
  },

  create(token: string, data: CreateSubjectData) {
    return apiClient<Subject>("/api/subjects", {
      token,
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  update(token: string, id: number, data: Partial<CreateSubjectData>) {
    return apiClient<Subject>(`/api/subjects/${id}`, {
      token,
      method: "PATCH",
      body: JSON.stringify(data),
    });
  },

  delete(token: string, id: number) {
    return apiClient<{ message: string }>(`/api/subjects/${id}`, {
      token,
      method: "DELETE",
    });
  },
};
