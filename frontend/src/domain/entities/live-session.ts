export type LiveSession = {
  id: number;
  title: string;
  description?: string | null;
  classFiliere: string;
  subjectName: string;
  subjectId?: number | null;
  teacherId: number;
  teacherName: string;
  startTime: string;
  endTime: string;
  meetingUrl: string;
  targetGroup?: string;
  status: "scheduled" | "live" | "completed" | "cancelled" | string;
  createdById?: number | null;
  createdAt?: string;
  updatedAt?: string;
};

export type LiveTeacher = {
  id: number;
  username: string;
  firstname?: string | null;
  lastname?: string | null;
  email: string;
  teachingSubjects?: string[] | null;
  teachingClasses?: string[] | null;
};

export type CreateLiveSessionInput = {
  title: string;
  description?: string;
  classFiliere: string;
  subjectName: string;
  subjectId?: number;
  teacherId: number;
  teacherName?: string;
  startTime: string;
  endTime: string;
  meetingUrl: string;
  targetGroup?: string;
  status?: string;
};

export type UpdateLiveSessionInput = Partial<CreateLiveSessionInput>;

