import type { User } from "@/domain/entities/user";
import { apiClient } from "@/infrastructure/http/api-client";

type LoginResponse = {
  accessToken?: string;
  message?: string;
};

type RegisterResponse = {
  message: string;
};

export const authRepository = {
  login(email: string, password: string) {
    return apiClient<LoginResponse>("/api/users/auth/login", {
      method: "POST",
      json: { email, password },
    });
  },

  register(email: string, password: string, username: string) {
    return apiClient<RegisterResponse>("/api/users/auth/register", {
      method: "POST",
      json: { email, password, username },
    });
  },

  getCurrentUser(token: string) {
    return apiClient<User>("/api/users/current-user", { token });
  },
};
