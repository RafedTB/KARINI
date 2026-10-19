import { coursesRepository } from "@/infrastructure/repositories/courses-repository";

export const coursesService = {
  list(token: string) {
    return coursesRepository.list(token);
  },

  async openMagazine(token: string, fileName: string): Promise<void> {
    const blob = await coursesRepository.downloadMagazine(token, fileName);
    const url = URL.createObjectURL(blob);
    window.open(url, "_blank", "noopener,noreferrer");
    window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
  },
};
