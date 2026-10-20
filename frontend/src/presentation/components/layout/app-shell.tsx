"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import { useAuth } from "@/presentation/providers/auth-provider";
import { PublicHeader } from "@/presentation/components/layout/public-header";
import { AppHeader } from "@/presentation/components/layout/app-header";
import { AppSidebar } from "@/presentation/components/layout/app-sidebar";
import { SiteFooter } from "@/presentation/components/layout/site-footer";
import { PageLoader } from "@/presentation/components/ui/page-loader";

export function AppShell({ children }: { children: ReactNode }) {
  const { user, isLoading } = useAuth();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  // Loading state while restoring session
  if (isLoading) {
    return (
      <div className="flex min-h-screen flex-col bg-grid items-center justify-center">
        <PageLoader label="Loading Karini…" />
      </div>
    );
  }

  // When student is NOT logged in
  if (!user) {
    return (
      <div className="flex min-h-screen flex-col bg-grid">
        {/* Top radial glow */}
        <div className="pointer-events-none fixed inset-x-0 top-0 h-[500px] bg-radial-glow" />
        
        {/* Header with only Logo, Login, and Register */}
        <PublicHeader />

        {/* Content */}
        <main className="relative mx-auto w-full max-w-6xl flex-1 px-6 py-10 md:px-10">
          {children}
        </main>

        {/* Public Footer */}
        <SiteFooter />
      </div>
    );
  }

  // When student IS logged in
  return (
    <div className="min-h-screen bg-grid">
      {/* Top radial glow */}
      <div className="pointer-events-none fixed inset-x-0 top-0 h-[500px] bg-radial-glow" />

      {/* Nav on the left side */}
      <AppSidebar
        isOpenMobile={mobileNavOpen}
        onCloseMobile={() => setMobileNavOpen(false)}
      />

      {/* Main content wrapper (offset by sidebar on desktop) */}
      <div className="flex min-h-screen flex-col md:pl-64 lg:pl-72">
        {/* Header on the top */}
        <AppHeader onToggleMobileNav={() => setMobileNavOpen(true)} />

        {/* Dashboard / Learning Content */}
        <main className="relative flex-1 px-4 py-8 sm:px-6 md:px-10 max-w-7xl w-full">
          {children}
        </main>

        {/* Authenticated user footer */}
        <footer className="mt-auto border-t px-4 py-6 sm:px-6 md:px-10 text-xs text-slate-400" style={{ borderColor: "var(--line)" }}>
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2">
            <span>© {new Date().getFullYear()} Karini E-learning. All rights reserved.</span>
            <div className="flex items-center gap-4">
              <Link href="/courses" className="transition-colors hover:text-slate-600">Courses</Link>
              <Link href="/membership" className="transition-colors hover:text-slate-600">Membership</Link>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
