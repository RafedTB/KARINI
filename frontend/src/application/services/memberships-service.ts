import { membershipsRepository } from "@/infrastructure/repositories/memberships-repository";

export const membershipsService = {
  listPlans(token: string) {
    return membershipsRepository.listPlans(token);
  },

  purchase(token: string, membership: string) {
    return membershipsRepository.purchase(token, membership);
  },
};
