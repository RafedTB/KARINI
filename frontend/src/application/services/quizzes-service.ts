import type { Quiz, QuizStudentResults } from "@/domain/entities/quiz";
import { quizzesRepository } from "@/infrastructure/repositories/quizzes-repository";

export const quizzesService = {
  create(token: string, data: { title: string; courseId?: number; lessonId?: number; durationMinutes?: number; maxAttempts?: number }): Promise<Quiz> {
    return quizzesRepository.create(token, data);
  },
  listManaged(token: string, courseId: number): Promise<Quiz[]> {
    return quizzesRepository.listManaged(token, courseId);
  },
  listResults(token: string, quizId: number): Promise<QuizStudentResults[]> {
    return quizzesRepository.listResults(token, quizId);
  },
  update(token: string, quizId: number, data: { title?: string; durationMinutes?: number; maxAttempts?: number }) {
    return quizzesRepository.update(token, quizId, data);
  },
  remove(token: string, quizId: number) {
    return quizzesRepository.remove(token, quizId);
  },
  addQuestion(token: string, quizId: number, data: {
    prompt: string;
    options: string[];
    correctOption: number;
    points: number;
  }) {
    return quizzesRepository.addQuestion(token, quizId, data);
  },
  addQuestions(token: string, quizId: number, questions: Array<{
    prompt: string;
    options: string[];
    correctOption: number;
    points: number;
  }>) {
    return quizzesRepository.addQuestions(token, quizId, questions);
  },
  updateQuestion(token: string, questionId: number, data: Partial<{ prompt: string; options: string[]; correctOption: number; points: number }>) {
    return quizzesRepository.updateQuestion(token, questionId, data);
  },
  removeQuestion(token: string, questionId: number) {
    return quizzesRepository.removeQuestion(token, questionId);
  },
  listForCourse(token: string, courseId: number): Promise<Quiz[]> {
    return quizzesRepository.listForCourse(token, courseId);
  },
  submitAnswers(token: string, quizId: number, answers: Array<{ questionId: number; selectedOption: number }>) {
    return quizzesRepository.submitAnswers(token, quizId, answers);
  },
};
