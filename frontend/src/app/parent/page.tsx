import { RequireRole } from "@/presentation/components/auth/require-role";
import { ParentOverviewView } from "@/presentation/features/parent/parent-overview-view";
import { UserType } from "@/domain/enums";

export default function ParentPage() {
  return (
    <RequireRole role={UserType.PARENT}>
      <ParentOverviewView />
    </RequireRole>
  );
}
