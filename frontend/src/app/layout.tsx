import type { Metadata } from "next";
import { AppShell } from "@/presentation/components/layout/app-shell";
import { AuthProvider } from "@/presentation/providers/auth-provider";
import "./globals.css";

export const metadata: Metadata = {
  title: "Karini | E-learning platform",
  description: "Courses, exercises, magazines, and memberships — powered by the Karini API.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full">
        <AuthProvider>
          <AppShell>{children}</AppShell>
        </AuthProvider>
      </body>
    </html>
  );
}
