import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AuthProvider, useAuth } from "./auth-provider";

const { restoreSession, signOut } = vi.hoisted(() => ({
  restoreSession: vi.fn(),
  signOut: vi.fn(),
}));

vi.mock("@/application/services/auth-service", () => ({
  authService: {
    restoreSession,
    signOut,
    login: vi.fn(),
    register: vi.fn(),
  },
}));

function AuthConsumer() {
  const { isLoading, user } = useAuth();
  return (
    <div>
      <span>{isLoading ? "loading" : "ready"}</span>
      <span>{user?.email ?? "anonymous"}</span>
    </div>
  );
}

describe("AuthProvider", () => {
  beforeEach(() => {
    restoreSession.mockReset();
    signOut.mockReset();
  });

  it("restores a saved session", async () => {
    restoreSession.mockResolvedValue({
      token: "saved-token",
      user: { id: 1, email: "saved@example.com" },
    });

    render(
      <AuthProvider>
        <AuthConsumer />
      </AuthProvider>,
    );

    expect(screen.getByText("loading")).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText("ready")).toBeInTheDocument());
    expect(screen.getByText("saved@example.com")).toBeInTheDocument();
  });

  it("becomes ready and anonymous when restoration fails", async () => {
    restoreSession.mockRejectedValue(new Error("invalid session"));

    render(
      <AuthProvider>
        <AuthConsumer />
      </AuthProvider>,
    );

    await waitFor(() => expect(screen.getByText("ready")).toBeInTheDocument());
    expect(screen.getByText("anonymous")).toBeInTheDocument();
    expect(signOut).toHaveBeenCalledOnce();
  });

  it("throws outside the provider", () => {
    function WithoutProvider() {
      useAuth();
      return null;
    }

    expect(() => render(<WithoutProvider />)).toThrow(
      "useAuth must be used within AuthProvider",
    );
  });
});
