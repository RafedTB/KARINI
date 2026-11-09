"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { useAuth } from "@/presentation/providers/auth-provider";
import { messagingService } from "@/application/services/messaging-service";
import { teacherMessagingRepository } from "@/infrastructure/repositories/teacher-messaging-repository";
import { PublicHeader } from "@/presentation/components/layout/public-header";
import { AppHeader } from "@/presentation/components/layout/app-header";
import { AppSidebar } from "@/presentation/components/layout/app-sidebar";
import { SiteFooter } from "@/presentation/components/layout/site-footer";
import { PageLoader } from "@/presentation/components/ui/page-loader";
import { UserType } from "@/domain/enums";
import { getMessagingSocket } from "@/infrastructure/socket/socket-client";

export function AppShell({ children }: { children: ReactNode }) {
  const { user, token, isLoading } = useAuth();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [unreadMessageCount, setUnreadMessageCount] = useState(0);
  const isParent = user?.userType === UserType.PARENT;
  const isInstructor = user?.userType === UserType.INSTRUCTOR;

  useEffect(() => {
    if ((!isParent && !isInstructor) || !token) return;

    let active = true;
    const loadUnreadCount = async () => {
      try {
        const result = isParent
          ? await messagingService.getUnreadCount(token)
          : await teacherMessagingRepository.getUnreadCount(token);
        if (active) setUnreadMessageCount(result.unreadCount);
      } catch {
        if (active) setUnreadMessageCount(0);
      }
    };

    void loadUnreadCount();

    const socket = getMessagingSocket(token);
    if (socket) {
      const handleLiveUpdate = () => {
        void loadUnreadCount();
      };

      socket.on("conversationUpdated", handleLiveUpdate);
      socket.on("unreadCountUpdated", handleLiveUpdate);
      socket.on("messagesRead", handleLiveUpdate);
      socket.on("newMessage", handleLiveUpdate);

      return () => {
        active = false;
        socket.off("conversationUpdated", handleLiveUpdate);
        socket.off("unreadCountUpdated", handleLiveUpdate);
        socket.off("messagesRead", handleLiveUpdate);
        socket.off("newMessage", handleLiveUpdate);
      };
    }

    return () => {
      active = false;
    };
  }, [isInstructor, isParent, token]);

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
        unreadMessageCount={unreadMessageCount}
      />

      {/* Main content wrapper (offset by sidebar on desktop) */}
      <div className="flex min-h-screen flex-col md:pl-64 lg:pl-72">
        {/* Header on the top */}
        <AppHeader
          onToggleMobileNav={() => setMobileNavOpen(true)}
          unreadMessageCount={unreadMessageCount}
        />

        {/* Dashboard / Learning Content */}
        <main className="relative flex-1 px-4 py-8 sm:px-6 md:px-10 max-w-7xl w-full">
          {children}
        </main>

        {/* Authenticated user footer */}
        <footer className="mt-auto border-t px-4 py-6 sm:px-6 md:px-10 text-xs text-slate-400" style={{ borderColor: "var(--line)" }}>
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2">
            <span>© {new Date().getFullYear()} Karini E-learning. All rights reserved.</span>
            <div className="flex items-center gap-4">
              {!isParent && <Link href="/courses" className="transition-colors hover:text-slate-600">Courses</Link>}
              {!isParent && <Link href="/live" className="transition-colors hover:text-slate-600">Live</Link>}
              {!isParent && <Link href="/membership" className="transition-colors hover:text-slate-600">Membership</Link>}
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
