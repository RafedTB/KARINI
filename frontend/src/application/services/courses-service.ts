import { coursesRepository } from "@/infrastructure/repositories/courses-repository";

export const coursesService = {
  list(token: string, filters?: { subject?: string; section?: string }) {
    return coursesRepository.list(token, filters);
  },

  async openMagazine(token: string, fileName: string): Promise<void> {
    const blob = await coursesRepository.downloadMagazine(token, fileName);
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    link.target = "_blank";
    link.rel = "noopener,noreferrer";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
  },
};
