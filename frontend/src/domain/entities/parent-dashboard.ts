import type { MembershipType, StudentGroup } from "@/domain/enums";

export type ParentChild = {
  id: number;
  firstname?: string | null;
  lastname?: string | null;
  username?: string | null;
  studentClass?: string | null;
  membership?: MembershipType | string | null;
  studentGroup?: StudentGroup | string | null;
};

export type WeeklySummary = {
  lessonsCompleted: number;
  minutesWatched: number;
  averageQuizScore: number;
  liveSessionsAttended: number;
  previousWeek?: {
    lessonsCompleted?: number;
    minutesWatched?: number;
    averageQuizScore?: number;
    liveSessionsAttended?: number;
  } | null;
};

export type ParentTeacher = {
  id: number;
  name: string;
  subject: string;
};
