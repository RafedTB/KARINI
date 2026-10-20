import { Suspense } from "react";
import { RequireAuth } from "@/presentation/components/auth/require-auth";
import { TeacherStudioView } from "@/presentation/features/teacher/teacher-studio-view";
import { PageLoader } from "@/presentation/components/ui/page-loader";

export default function TeacherPage() {
  return (
    <RequireAuth>
      <Suspense fallback={<PageLoader label="Chargement de l'espace enseignant…" />}>
        <TeacherStudioView />
      </Suspense>
    </RequireAuth>
  );
}
