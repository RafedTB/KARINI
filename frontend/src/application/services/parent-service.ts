import { parentRepository } from "@/infrastructure/repositories/parent-repository";

export const parentService = {
  listChildren(token: string) {
    return parentRepository.listChildren(token);
  },

  getWeeklySummary(token: string, childId: number) {
    return parentRepository.getWeeklySummary(token, childId);
  },

  listTeachers(token: string, childId: number) {
    return parentRepository.listTeachers(token, childId);
  },
};
