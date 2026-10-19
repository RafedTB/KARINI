"use client";

import { useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { useAuth } from "@/presentation/providers/auth-provider";
import { PageLoader } from "@/presentation/components/ui/page-loader";

export function RequireAuth({ children }: { children: ReactNode }) {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace("/login");
    }
  }, [isLoading, user, router]);

  if (isLoading) return <PageLoader label="Loading your account…" />;
  if (!user) return null;

  return children;
}
