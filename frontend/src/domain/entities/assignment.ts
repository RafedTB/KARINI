export type Assignment = {
  id: number;
  title: string;
  description?: string | null;
  dueDate: string;
  maxScore: number;
  subject?: string | null;
  instructionsFileName?: string | null;
  instructionsOriginalFileName?: string | null;
  courseId: number;
  course?: { id: number; title: string };
  createdById?: number;
  createdAt: string;
  updatedAt?: string;
};

export type AssignmentSubmission = {
  id: number;
  assignmentId: number;
  studentId: number;
  answerText?: string | null;
  fileName?: string | null;
  originalFileName?: string | null;
  submittedAt: string;
  score?: number | null;
  feedback?: string | null;
  gradedAt?: string | null;
  student?: {
    id: number;
    username?: string | null;
    firstname?: string | null;
    lastname?: string | null;
  };
  assignment?: Assignment;
};
