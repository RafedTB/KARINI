import type { User } from "@/domain/entities/user";
import { apiClient } from "@/infrastructure/http/api-client";

export type AdminCreateUserData = {
  username: string;
  email: string;
  password: string;
  userType: string;
  membership?: string;
  credits?: number;
  firstname?: string;
  lastname?: string;
  studentClass?: string | null;
  teachingSubjects?: string[] | null;
  teachingClasses?: string[] | null;
};

export type AdminUpdateUserData = Partial<AdminCreateUserData> & {
  isAccountVerified?: boolean;
};

export const adminRepository = {
  getAllUsers(token: string) {
    return apiClient<User[]>("/api/users", { token });
  },

  createUser(token: string, data: AdminCreateUserData) {
    return apiClient<User>("/api/users/admin/create-user", {
      token,
      method: "POST",
      json: data,
    });
  },

  updateUser(token: string, id: number, data: AdminUpdateUserData) {
    return apiClient<User>(`/api/users/admin/${id}`, {
      token,
      method: "PUT",
      json: data,
    });
  },

  deleteUser(token: string, id: number) {
    return apiClient<{ message: string }>(`/api/users/${id}`, {
      token,
      method: "DELETE",
    });
  },

  addCredits(token: string, id: number, credits: number) {
    return apiClient<User>(`/api/users/${id}/credits`, {
      token,
      method: "PUT",
      json: { credits },
    });
  },

  updateMembership(token: string, id: number, membership: string) {
    return apiClient<User>(`/api/users/${id}/membership`, {
      token,
      method: "PUT",
      json: { membership },
    });
  },
};
