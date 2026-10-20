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
      body: JSON.stringify(data),
    });
  },

  updateUser(token: string, id: number, data: AdminUpdateUserData) {
    return apiClient<User>(`/api/users/admin/${id}`, {
      token,
      method: "PUT",
      body: JSON.stringify(data),
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
      body: JSON.stringify({ credits }),
    });
  },

  updateMembership(token: string, id: number, membership: string) {
    return apiClient<User>(`/api/users/${id}/membership`, {
      token,
      method: "PUT",
      body: JSON.stringify({ membership }),
    });
  },
};
