import { RequireRole } from "@/presentation/components/auth/require-role";
import { TeacherMessagesView } from "@/presentation/features/teacher/teacher-messages-view";
import { UserType } from "@/domain/enums";

export default function TeacherMessagesPage() {
  return <RequireRole role={UserType.INSTRUCTOR}><TeacherMessagesView /></RequireRole>;
}
