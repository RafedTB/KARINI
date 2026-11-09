import type { Quiz, QuizStudentResults, QuizSubmissionResult } from "@/domain/entities/quiz";
import { apiClient } from "@/infrastructure/http/api-client";

export const quizzesRepository = {
  create(token: string, data: { title: string; courseId?: number; lessonId?: number; durationMinutes?: number; maxAttempts?: number }) {
    return apiClient<Quiz>("/api/quizzes", {
      token,
      method: "POST",
      json: data,
    });
  },
  listManaged(token: string, courseId: number) {
    return apiClient<Quiz[]>(`/api/quizzes/courses/${courseId}`, { token });
  },
  listResults(token: string, quizId: number) {
    return apiClient<QuizStudentResults[]>(`/api/quizzes/${quizId}/results`, { token });
  },
  update(token: string, quizId: number, data: { title?: string; durationMinutes?: number; maxAttempts?: number }) {
    return apiClient<Quiz>(`/api/quizzes/${quizId}`, { token, method: "PATCH", json: data });
  },
  remove(token: string, quizId: number) {
    return apiClient<{ message: string }>(`/api/quizzes/${quizId}`, { token, method: "DELETE" });
  },
  addQuestion(token: string, quizId: number, data: {
    prompt: string;
    options: string[];
    correctOption: number;
    points: number;
  }) {
    return apiClient(`/api/quizzes/${quizId}/questions`, {
      token,
      method: "POST",
      json: data,
    });
  },
  addQuestions(token: string, quizId: number, questions: Array<{
    prompt: string;
    options: string[];
    correctOption: number;
    points: number;
  }>) {
    return apiClient(`/api/quizzes/${quizId}/questions/bulk`, {
      token,
      method: "POST",
      json: { questions },
    });
  },
  updateQuestion(token: string, questionId: number, data: Partial<{ prompt: string; options: string[]; correctOption: number; points: number }>) {
    return apiClient(`/api/quizzes/questions/${questionId}`, { token, method: "PATCH", json: data });
  },
  removeQuestion(token: string, questionId: number) {
    return apiClient<{ message: string }>(`/api/quizzes/questions/${questionId}`, { token, method: "DELETE" });
  },
  listForCourse(token: string, courseId: number) {
    return apiClient<Quiz[]>(`/api/student/quizzes/courses/${courseId}`, { token });
  },
  submitAnswers(token: string, quizId: number, answers: Array<{ questionId: number; selectedOption: number }>) {
    return apiClient<QuizSubmissionResult>(`/api/student/quizzes/${quizId}/submit`, {
      token,
      method: "POST",
      json: { answers },
    });
  },
};
