import type { CourseSection, CourseSubject } from "@/domain/enums";
import type { Lesson } from "@/domain/entities/lesson";
import type { User } from "@/domain/entities/user";

export type Course = {
  id: number;
  title: string;
  description?: string | null;
  section: CourseSection | string;
  subject?: CourseSubject | string | null;
  filiere?: string | null;
  textContent?: string | null;
  youtubeUrl?: string | null;
  videoFile?: string | null;
  pdfFile?: string | null;
  createdById?: number;
  instructor?: Partial<User> | null;
  lessons?: Lesson[];
  createdAt: string;
  updatedAt?: string;
};
