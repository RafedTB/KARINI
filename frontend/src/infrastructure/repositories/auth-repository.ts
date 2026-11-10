import type { User } from "@/domain/entities/user";
import { apiClient, apiClientBlob } from "@/infrastructure/http/api-client";

type LoginResponse = {
  accessToken?: string;
  message?: string;
};

type RegisterResponse = {
  message: string;
};

type MessageResponse = {
  message: string;
  emailSent?: boolean;
};

export type RegisterPayload = {
  email: string;
  password: string;
  firstname?: string;
  lastname?: string;
  username?: string;
  studentClass: string;
  phoneNumber: string;
  gender: string;
  age: number;
  cin?: string;
  parentEmail?: string;
  parentPhone?: string;
};

export const authRepository = {
  login(email: string, password: string) {
    return apiClient<LoginResponse>("/api/users/auth/login", {
      method: "POST",
      json: { email, password },
    });
  },

  register(payload: RegisterPayload) {
    return apiClient<RegisterResponse>("/api/users/auth/register", {
      method: "POST",
      json: payload,
    });
  },

  forgotPassword(email: string) {
    return apiClient<MessageResponse>("/api/users/forgot-password", {
      method: "POST",
      json: { email },
    });
  },

  resetPassword(userId: number, resetPasswordToken: string, newPassword: string) {
    return apiClient<MessageResponse>("/api/users/reset-password", {
      method: "POST",
      json: { userId, resetPasswordToken, newPassword },
    });
  },

  validateResetToken(userId: number, resetPasswordToken: string) {
    return apiClient<MessageResponse>(`/api/users/reset-password/${userId}/${resetPasswordToken}`, {
      method: "GET",
    });
  },

  getCurrentUser(token: string) {
    return apiClient<User>("/api/users/current-user", { token });
  },

  updateCurrentUser(token: string, data: Record<string, unknown>) {
    return apiClient<User>("/api/users", { token, method: "PUT", json: data });
  },

  changePassword(token: string, currentPassword: string, password: string) {
    return apiClient<User>("/api/users", {
      token,
      method: "PUT",
      json: { currentPassword, password },
    });
  },

  uploadProfileImage(token: string, file: File) {
    const formData = new FormData();
    formData.append("user-image", file);
    return apiClient<User>("/api/users/upload-profile-image", {
      token,
      method: "POST",
      body: formData,
    });
  },

  getProfileImage(token: string, filename: string) {
    return apiClientBlob(`/api/users/images/${encodeURIComponent(filename)}`, token);
  },
};
