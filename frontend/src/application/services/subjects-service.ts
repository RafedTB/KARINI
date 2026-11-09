import {
  subjectsRepository,
  type CreateSubjectData,
  type CreateFiliereData,
} from "@/infrastructure/repositories/subjects-repository";

export const subjectsService = {
  list(token: string, filiere?: string) {
    return subjectsRepository.list(token, filiere);
  },

  getFilieres(token: string) {
    return subjectsRepository.getFilieres(token);
  },

  getFilieresDetailed(token: string) {
    return subjectsRepository.getFilieresDetailed(token);
  },

  createFiliere(token: string, data: CreateFiliereData) {
    return subjectsRepository.createFiliere(token, data);
  },

  updateFiliere(token: string, id: number, data: Partial<CreateFiliereData>) {
    return subjectsRepository.updateFiliere(token, id, data);
  },

  deleteFiliere(token: string, id: number) {
    return subjectsRepository.deleteFiliere(token, id);
  },

  getById(token: string, id: number) {
    return subjectsRepository.getById(token, id);
  },

  getBySlug(token: string, slug: string) {
    return subjectsRepository.getBySlug(token, slug);
  },

  create(token: string, data: CreateSubjectData) {
    return subjectsRepository.create(token, data);
  },

  update(token: string, id: number, data: Partial<CreateSubjectData>) {
    return subjectsRepository.update(token, id, data);
  },

  delete(token: string, id: number) {
    return subjectsRepository.delete(token, id);
  },
};
