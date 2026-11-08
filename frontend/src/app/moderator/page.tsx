import { RequireAuth } from "@/presentation/components/auth/require-auth";
import { ModeratorStudentsView } from "@/presentation/features/moderator/moderator-students-view";

export default function ModeratorPage() {
  return (
    <RequireAuth>
      <ModeratorStudentsView />
    </RequireAuth>
  );
}

