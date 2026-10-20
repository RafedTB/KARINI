import { Suspense } from "react";
import { RequireAuth } from "@/presentation/components/auth/require-auth";
import { AdminBoardView } from "@/presentation/features/admin/admin-board-view";
import { PageLoader } from "@/presentation/components/ui/page-loader";

export default function AdminPage() {
  return (
    <RequireAuth>
      <Suspense fallback={<PageLoader label="Chargement du tableau Superadmin…" />}>
        <AdminBoardView />
      </Suspense>
    </RequireAuth>
  );
}
