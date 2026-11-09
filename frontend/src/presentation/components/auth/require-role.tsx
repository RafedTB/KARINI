"use client";

import { useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { UserType } from "@/domain/enums";
import { useAuth } from "@/presentation/providers/auth-provider";
import { PageLoader } from "@/presentation/components/ui/page-loader";

const dashboardForRole: Record<UserType, string> = {
  [UserType.SUPERADMIN]: "/admin",
  [UserType.STUDENT]: "/",
  [UserType.FINANCE]: "/",
  [UserType.INSTRUCTOR]: "/teacher",
  [UserType.MODERATOR]: "/moderator",
  [UserType.PARENT]: "/parent",
};

export function RequireRole({
  role,
  children,
}: {
  role: UserType;
  children: ReactNode;
}) {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;
    if (!user) {
      router.replace("/login");
      return;
    }
    if (user.userType !== role) {
      router.replace(dashboardForRole[user.userType as UserType] ?? "/");
    }
  }, [isLoading, role, router, user]);

  if (isLoading || !user || user.userType !== role) {
    return <PageLoader label="Vérification de votre espace…" />;
  }

  return children;
}
