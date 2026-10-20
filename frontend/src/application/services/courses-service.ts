import {
  coursesRepository,
  type CreateCourseData,
  type CreateLessonData,
} from "@/infrastructure/repositories/courses-repository";

export const coursesService = {
  list(token: string, filters?: { subject?: string; section?: string; filiere?: string; teacherId?: number }) {
    return coursesRepository.list(token, filters);
  },

  getById(token: string, id: number) {
    return coursesRepository.getById(token, id);
  },

  createCourse(token: string, data: CreateCourseData) {
    return coursesRepository.createCourse(token, data);
  },

  updateCourse(token: string, id: number, data: Partial<CreateCourseData>) {
    return coursesRepository.updateCourse(token, id, data);
  },

  deleteCourse(token: string, id: number) {
    return coursesRepository.deleteCourse(token, id);
  },

  createLesson(token: string, courseId: number, data: CreateLessonData) {
    return coursesRepository.createLesson(token, courseId, data);
  },

  updateLesson(token: string, lessonId: number, data: Partial<CreateLessonData>) {
    return coursesRepository.updateLesson(token, lessonId, data);
  },

  deleteLesson(token: string, lessonId: number) {
    return coursesRepository.deleteLesson(token, lessonId);
  },

  uploadFile(token: string, file: File) {
    return coursesRepository.uploadFile(token, file);
  },

  async openMagazine(token: string, fileName: string): Promise<void> {
    const blob = await coursesRepository.downloadMagazine(token, fileName);
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    link.target = "_blank";
    link.rel = "noopener,noreferrer";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
  },

  async openMaterial(token: string, fileName: string): Promise<void> {
    const blob = await coursesRepository.downloadMaterial(token, fileName);
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    link.target = "_blank";
    link.rel = "noopener,noreferrer";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
  },
};
