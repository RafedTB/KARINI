import type { CourseSection, CourseSubject } from "@/domain/enums";
import type { Lesson } from "@/domain/entities/lesson";

export type Course = {
  id: number;
  title: string;
  description?: string | null;
  section: CourseSection | string;
  subject?: CourseSubject | string | null;
  filiere?: string | null;
  textContent?: string | null;
  youtubeUrl?: string | null;
  pdfFile?: string | null;
  createdById?: number;
  lessons?: Lesson[];
  createdAt: string;
  updatedAt?: string;
};
