import { RequireRole } from "@/presentation/components/auth/require-role";
import { ParentMessagesView } from "@/presentation/features/parent/parent-messages-view";
import { UserType } from "@/domain/enums";

export default function ParentMessagesPage() {
  return (
    <RequireRole role={UserType.PARENT}>
      <ParentMessagesView />
    </RequireRole>
  );
}
