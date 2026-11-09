export type Quiz = {
  id: number;
  title: string;
  courseId?: number | null;
  lessonId?: number | null;
  createdAt: string;
  durationMinutes?: number;
  maxAttempts?: number;
  questions?: QuizQuestion[];
};

export type QuizQuestion = {
  id: number;
  quizId: number;
  prompt: string;
  options: string[];
  correctOption: number;
  points: number;
  createdAt: string;
};

export type QuizSubmissionResult = {
  score: number;
  maxScore: number;
  percentage: number;
  answers: Array<{ questionId: number; selectedOption: number | null; correctOption: number; correct: boolean }>;
};

export type QuizResult = {
  id: number;
  studentId: number;
  studentName: string;
  score: number;
  maxScore: number;
  percentage: number;
  takenAt: string;
};

export type QuizStudentResults = {
  studentId: number;
  studentName: string;
  attempts: QuizResult[];
  attemptCount: number;
  bestPercentage: number;
};
