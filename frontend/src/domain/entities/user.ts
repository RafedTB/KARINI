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
  phoneNumber?: string | null;
  gender?: string | null;
  studentClass?: string | null;
  age?: number | null;
  cin?: string | null;
  parentEmail?: string | null;
  parentPhone?: string | null;
  parentId?: number | null;
  createdAt?: string;
  updatedAt?: string;
};
