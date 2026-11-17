import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import RootLayout from "./layout";

vi.mock("@/presentation/components/layout/app-shell", () => ({
  AppShell: ({ children }: { children: ReactNode }) => (
    <main>{children}</main>
  ),
}));

vi.mock("@/presentation/providers/auth-provider", () => ({
  AuthProvider: ({ children }: { children: ReactNode }) => (
    <div>{children}</div>
  ),
}));

describe("RootLayout", () => {
  it("renders the document shell and page content", () => {
    render(
      <RootLayout>
        <p>Dashboard</p>
      </RootLayout>,
    );

    expect(document.querySelector("html")).toHaveAttribute("lang", "en");
    expect(screen.getByRole("main")).toHaveTextContent("Dashboard");
  });
});
