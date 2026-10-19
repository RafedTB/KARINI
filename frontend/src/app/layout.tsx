import type { Metadata } from "next";
import { DM_Sans, Instrument_Serif } from "next/font/google";
import { AppShell } from "@/presentation/components/layout/app-shell";
import { AuthProvider } from "@/presentation/providers/auth-provider";
import "./globals.css";

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
});

const instrumentSerif = Instrument_Serif({
  variable: "--font-instrument-serif",
  subsets: ["latin"],
  weight: "400",
});

export const metadata: Metadata = {
  title: "Karini | E-learning platform",
  description: "Courses, exercises, magazines, and memberships — powered by the Karini API.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${dmSans.variable} ${instrumentSerif.variable} h-full antialiased`}>
      <body className="min-h-full">
        <AuthProvider>
          <AppShell>{children}</AppShell>
        </AuthProvider>
      </body>
    </html>
  );
}
