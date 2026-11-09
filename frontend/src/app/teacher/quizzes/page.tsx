import { RequireRole } from "@/presentation/components/auth/require-role";
import { TeacherQuizBuilderView } from "@/presentation/features/teacher/teacher-quiz-builder-view";
import { UserType } from "@/domain/enums";

export default function TeacherQuizzesPage() {
  return <RequireRole role={UserType.INSTRUCTOR}><TeacherQuizBuilderView /></RequireRole>;
}
