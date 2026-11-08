import type { CreateLiveSessionInput, UpdateLiveSessionInput } from "@/domain/entities/live-session";
import { liveSessionsRepository } from "@/infrastructure/repositories/live-sessions-repository";

export const liveSessionsService = {
  list(token: string) {
    return liveSessionsRepository.list(token);
  },

  getTeachers(token: string) {
    return liveSessionsRepository.getTeachers(token);
  },

  getById(token: string, id: number) {
    return liveSessionsRepository.getById(token, id);
  },

  create(token: string, data: CreateLiveSessionInput) {
    return liveSessionsRepository.create(token, data);
  },

  update(token: string, id: number, data: UpdateLiveSessionInput) {
    return liveSessionsRepository.update(token, id, data);
  },

  delete(token: string, id: number) {
    return liveSessionsRepository.delete(token, id);
  },
};

