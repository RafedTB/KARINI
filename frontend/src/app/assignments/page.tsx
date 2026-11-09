import { RequireAuth } from "@/presentation/components/auth/require-auth";
import { AssignmentsView } from "@/presentation/features/assignments/assignments-view";

export default function AssignmentsPage() {
  return <RequireAuth><AssignmentsView /></RequireAuth>;
}
