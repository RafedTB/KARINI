import { moderatorRepository } from "@/infrastructure/repositories/moderator-repository";

export const moderatorService = {
  getStudents(token: string) {
    return moderatorRepository.getStudents(token);
  },

  assignStudentClassAndGroup(
    token: string,
    id: number,
    data: { studentClass?: string; studentGroup?: string }
  ) {
    return moderatorRepository.assignStudentClassAndGroup(token, id, data);
  },
};

