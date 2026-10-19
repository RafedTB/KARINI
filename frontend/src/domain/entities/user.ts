import type { MembershipType, UserType } from "@/domain/enums";

export type User = {
  id: number;
  username?: string | null;
  firstname?: string | null;
  lastname?: string | null;
  email: string;
  userType: UserType | string;
  membership: MembershipType | string;
  credits: number;
  isAccountVerified: boolean;
  profileImage?: string | null;
  createdAt?: string;
  updatedAt?: string;
};
