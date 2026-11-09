import type { Subject } from "@/domain/entities/subject";
import type { Filiere } from "@/domain/entities/filiere";
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

export type CreateFiliereData = {
  name: string;
  cycle?: string;
  description?: string;
};

export const subjectsRepository = {
  list(token: string, filiere?: string) {
    const qs = filiere && filiere !== "all" ? `?filiere=${encodeURIComponent(filiere)}` : "";
    return apiClient<Subject[]>(`/api/subjects${qs}`, { token });
  },

  getFilieres(token: string) {
    return apiClient<string[]>("/api/subjects/meta/filieres", { token });
  },

  getFilieresDetailed(token: string) {
    return apiClient<Filiere[]>("/api/subjects/filieres/detailed", { token });
  },

  createFiliere(token: string, data: CreateFiliereData) {
    return apiClient<Filiere>("/api/subjects/filieres", {
      token,
      method: "POST",
      json: data,
    });
  },

  updateFiliere(token: string, id: number, data: Partial<CreateFiliereData>) {
    return apiClient<Filiere>(`/api/subjects/filieres/${id}`, {
      token,
      method: "PATCH",
      json: data,
    });
  },

  deleteFiliere(token: string, id: number) {
    return apiClient<{ message: string }>(`/api/subjects/filieres/${id}`, {
      token,
      method: "DELETE",
    });
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
      json: data,
    });
  },

  update(token: string, id: number, data: Partial<CreateSubjectData>) {
    return apiClient<Subject>(`/api/subjects/${id}`, {
      token,
      method: "PATCH",
      json: data,
    });
  },

  delete(token: string, id: number) {
    return apiClient<{ message: string }>(`/api/subjects/${id}`, {
      token,
      method: "DELETE",
    });
  },
};
