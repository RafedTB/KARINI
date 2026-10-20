import { Suspense } from "react";
import { RequireAuth } from "@/presentation/components/auth/require-auth";
import { SubjectDetailView } from "@/presentation/features/courses/subject-detail-view";
import { PageLoader } from "@/presentation/components/ui/page-loader";

type SubjectPageProps = {
  params: Promise<{ subject: string }>;
};

export default async function SubjectPage({ params }: SubjectPageProps) {
  const { subject } = await params;

  return (
    <RequireAuth>
      <Suspense fallback={<PageLoader label="Chargement de la matière…" />}>
        <SubjectDetailView subjectId={subject} />
      </Suspense>
    </RequireAuth>
  );
}
