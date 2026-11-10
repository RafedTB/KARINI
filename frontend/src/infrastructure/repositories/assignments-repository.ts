import type { Assignment, AssignmentSubmission } from "@/domain/entities/assignment";
import { env } from "@/infrastructure/config/env";
import { apiClient } from "@/infrastructure/http/api-client";

export type CreateAssignmentInput = {
  title: string;
  description?: string;
  dueDate: string;
  maxScore: number;
  subject: string;
  targetClass: string;
};

export const assignmentsRepository = {
  list(token: string) {
    return apiClient<Assignment[]>("/api/assignments", { token });
  },

  async create(token: string, input: CreateAssignmentInput, instructionsFile?: File) {
    const formData = new FormData();
    formData.append("title", input.title);
    formData.append("description", input.description || "");
    formData.append("dueDate", input.dueDate);
    formData.append("maxScore", String(input.maxScore));
    formData.append("subject", input.subject);
    formData.append("targetClass", input.targetClass);
    if (instructionsFile) formData.append("instructionsFile", instructionsFile);

    const response = await fetch(`${env.apiUrl}/api/assignments`, {
      method: "POST",
      headers: { Authorization: "Bearer " + token },
      body: formData,
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(body?.message || "Impossible de créer le devoir");
    return body as Assignment;
  },

  async openPdf(token: string, path: string) {
    const response = await fetch(`${env.apiUrl}${path}`, {
      headers: { Authorization: "Bearer " + token },
    });
    if (!response.ok) throw new Error("Impossible d'ouvrir le PDF");
    const url = URL.createObjectURL(await response.blob());
    window.open(url, "_blank", "noopener,noreferrer");
    window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
  },

  listSubmissions(token: string, assignmentId: number) {
    return apiClient<AssignmentSubmission[]>(`/api/assignments/${assignmentId}/submissions`, { token });
  },

  listMySubmissions(token: string) {
    return apiClient<AssignmentSubmission[]>("/api/assignments/my-submissions", { token });
  },

  async submit(token: string, assignmentId: number, answerText: string, file?: File) {
    const formData = new FormData();
    if (answerText.trim()) formData.append("answerText", answerText.trim());
    if (file) formData.append("file", file);

    const response = await fetch(`${env.apiUrl}/api/assignments/${assignmentId}/submissions`, {
      method: "POST",
      headers: { Authorization: "Bearer " + token },
      body: formData,
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(body?.message || "Impossible d'envoyer le rendu");
    return body as AssignmentSubmission;
  },

  grade(token: string, submissionId: number, score: number, feedback: string) {
    return apiClient<AssignmentSubmission>(`/api/assignments/submissions/${submissionId}/grade`, {
      token,
      method: "PATCH",
      json: { score, feedback },
    });
  },
};
