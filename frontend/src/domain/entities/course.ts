import type { CourseSection, CourseSubject } from "@/domain/enums";

export type Course = {
  id: number;
  title: string;
  description?: string | null;
  section: CourseSection | string;
  subject?: CourseSubject | string | null;
  youtubeUrl?: string | null;
  pdfFile?: string | null;
  createdById?: number;
  createdAt: string;
  updatedAt?: string;
};
