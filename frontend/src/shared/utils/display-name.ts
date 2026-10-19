import type { User } from "@/domain/entities/user";

export function displayName(user: User): string {
  if (user.username?.trim()) return user.username.trim();
  if (user.firstname?.trim()) return user.firstname.trim();
  return user.email.split("@")[0] ?? "Learner";
}
