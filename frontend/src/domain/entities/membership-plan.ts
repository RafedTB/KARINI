import type { MembershipType } from "@/domain/enums";

export type MembershipPlan = {
  id: number;
  membership: MembershipType | string;
  priceCredits: number;
};

export type PurchaseMembershipResult = {
  membership: string;
  credits: number;
  paidCredits: number;
};
