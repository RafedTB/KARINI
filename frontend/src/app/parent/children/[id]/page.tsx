import { RequireRole } from "@/presentation/components/auth/require-role";
import { ParentChildDetailView } from "@/presentation/features/parent/parent-child-detail-view";
import { UserType } from "@/domain/enums";

export default async function ParentChildPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const childId = Number(id);

  return (
    <RequireRole role={UserType.PARENT}>
      <ParentChildDetailView childId={childId} />
    </RequireRole>
  );
}
