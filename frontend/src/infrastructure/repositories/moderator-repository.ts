import type { User } from "@/domain/entities/user";
import { apiClient } from "@/infrastructure/http/api-client";

export const moderatorRepository = {
  getStudents(token: string) {
    return apiClient<User[]>("/api/users/students", { token });
  },

  assignStudentClassAndGroup(
    token: string,
    id: number,
    data: { studentClass?: string; studentGroup?: string }
  ) {
    return apiClient<User>(`/api/users/${id}/student-assignment`, {
      token,
      method: "PUT",
      json: data,
    });
  },
};

