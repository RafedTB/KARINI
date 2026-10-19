"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { User } from "@/domain/entities/user";
import { authService } from "@/application/services/auth-service";

type AuthContextValue = {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, username: string) => Promise<string>;
  signOut: () => void;
  refreshUser: () => Promise<void>;
  setUser: (user: User | null) => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    authService
      .restoreSession()
      .then((session) => {
        if (!session) return;
        setToken(session.token);
        setUser(session.user);
      })
      .catch(() => authService.signOut())
      .finally(() => setIsLoading(false));
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const session = await authService.login(email, password);
    setToken(session.token);
    setUser(session.user);
  }, []);

  const register = useCallback(async (email: string, password: string, username: string) => {
    return authService.register(email, password, username);
  }, []);

  const signOut = useCallback(() => {
    authService.signOut();
    setToken(null);
    setUser(null);
  }, []);

  const refreshUser = useCallback(async () => {
    const session = await authService.restoreSession();
    if (!session) {
      signOut();
      return;
    }
    setToken(session.token);
    setUser(session.user);
  }, [signOut]);

  const value = useMemo(
    () => ({ user, token, isLoading, login, register, signOut, refreshUser, setUser }),
    [user, token, isLoading, login, register, signOut, refreshUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
