import {
  adminRepository,
  type AdminCreateUserData,
  type AdminUpdateUserData,
} from "@/infrastructure/repositories/admin-repository";

export const adminService = {
  getAllUsers(token: string) {
    return adminRepository.getAllUsers(token);
  },

  createUser(token: string, data: AdminCreateUserData) {
    return adminRepository.createUser(token, data);
  },

  updateUser(token: string, id: number, data: AdminUpdateUserData) {
    return adminRepository.updateUser(token, id, data);
  },

  deleteUser(token: string, id: number) {
    return adminRepository.deleteUser(token, id);
  },

  addCredits(token: string, id: number, credits: number) {
    return adminRepository.addCredits(token, id, credits);
  },

  updateMembership(token: string, id: number, membership: string) {
    return adminRepository.updateMembership(token, id, membership);
  },
};
