import type { ReactNode } from "react";
import { SiteFooter } from "@/presentation/components/layout/site-footer";
import { SiteHeader } from "@/presentation/components/layout/site-header";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-full flex-col bg-grid">
      {/* Top radial glow */}
      <div className="pointer-events-none fixed inset-x-0 top-0 h-[500px] bg-radial-glow" />
      <SiteHeader />
      <main className="relative mx-auto w-full max-w-6xl flex-1 px-6 py-10 md:px-10">
        {children}
      </main>
      <SiteFooter />
    </div>
  );
}
