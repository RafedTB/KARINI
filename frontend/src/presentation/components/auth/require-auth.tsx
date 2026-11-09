"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { UserType } from "@/domain/enums";
import { useAuth } from "@/presentation/providers/auth-provider";
import { PageLoader } from "@/presentation/components/ui/page-loader";

export function RequireAuth({ children }: { children: ReactNode }) {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (isLoading) return;
    if (!user) {
      router.replace("/login");
      return;
    }
    if (user.userType === UserType.PARENT && !pathname.startsWith("/parent")) {
      router.replace("/parent");
    }
  }, [isLoading, pathname, router, user]);

  if (isLoading) return <PageLoader label="Loading your account…" />;
  if (!user || (user.userType === UserType.PARENT && !pathname.startsWith("/parent"))) return null;

  return children;
}
