import type { MembershipPlan, PurchaseMembershipResult } from "@/domain/entities/membership-plan";
import { apiClient } from "@/infrastructure/http/api-client";

export const membershipsRepository = {
  listPlans(token: string) {
    return apiClient<MembershipPlan[]>("/api/memberships/prices", { token });
  },

  purchase(token: string, membership: string) {
    return apiClient<PurchaseMembershipResult>("/api/memberships/purchase", {
      method: "POST",
      token,
      json: { membership },
    });
  },
};
