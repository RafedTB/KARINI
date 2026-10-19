import type { CourseSection } from "@/domain/enums";

export type Course = {
  id: number;
  title: string;
  description?: string | null;
  section: CourseSection | string;
  youtubeUrl?: string | null;
  pdfFile?: string | null;
  createdById?: number;
  createdAt: string;
  updatedAt?: string;
};
