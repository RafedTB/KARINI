import type { LessonType } from "@/domain/enums";

export type Lesson = {
  id: number;
  title: string;
  description?: string | null;
  type: LessonType | string;
  textContent?: string | null;
  youtubeUrl?: string | null;
  pdfFile?: string | null;
  orderIndex: number;
  durationMinutes?: number | null;
  courseId: number;
  createdAt: string;
  updatedAt?: string;
};
