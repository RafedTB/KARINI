import type { User } from "@/domain/entities/user";
import { authRepository } from "@/infrastructure/repositories/auth-repository";
import { authTokenStorage } from "@/infrastructure/storage/auth-token-storage";

export type AuthSession = {
  token: string;
  user: User;
};

export const authService = {
  async restoreSession(): Promise<AuthSession | null> {
    const token = authTokenStorage.get();
    if (!token) return null;

    const user = await authRepository.getCurrentUser(token);
    return { token, user };
  },

  async login(email: string, password: string): Promise<AuthSession> {
    const response = await authRepository.login(email, password);
    if (!response.accessToken) {
      throw new Error(response.message ?? "Your account must be verified before you can sign in.");
    }

    authTokenStorage.set(response.accessToken);
    const user = await authRepository.getCurrentUser(response.accessToken);
    return { token: response.accessToken, user };
  },

  async register(email: string, password: string, username: string): Promise<string> {
    const response = await authRepository.register(email, password, username);
    return response.message;
  },

  signOut(): void {
    authTokenStorage.clear();
  },
};
