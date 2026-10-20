import { Suspense } from "react";
import { RequireAuth } from "@/presentation/components/auth/require-auth";
import { CourseDetailStudyView } from "@/presentation/features/courses/course-detail-study-view";
import { PageLoader } from "@/presentation/components/ui/page-loader";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function CourseStudyPage({ params }: PageProps) {
  const { id } = await params;
  const courseId = parseInt(id, 10);

  return (
    <RequireAuth>
      <Suspense fallback={<PageLoader label="Chargement de votre session de cours…" />}>
        <CourseDetailStudyView courseId={courseId} />
      </Suspense>
    </RequireAuth>
  );
}
