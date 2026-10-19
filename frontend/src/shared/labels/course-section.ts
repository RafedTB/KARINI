import { CourseSection } from "@/domain/enums";

export const courseSectionLabel: Record<CourseSection, string> = {
  [CourseSection.COURSE]: "Course",
  [CourseSection.EXERCISE]: "Exercise",
  [CourseSection.MAGAZINE]: "Magazine",
  [CourseSection.OLDLIVE]: "Live archive",
};

export function formatCourseSection(section: string): string {
  return courseSectionLabel[section as CourseSection] ?? section;
}

export function courseSectionIcon(section: string): string {
  switch (section) {
    case CourseSection.COURSE: return "▶";
    case CourseSection.EXERCISE: return "✎";
    case CourseSection.MAGAZINE: return "📄";
    case CourseSection.OLDLIVE: return "📡";
    default: return "•";
  }
}
