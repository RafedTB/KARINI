export type Filiere = {
  id: number;
  name: string;
  cycle?: string | null;
  description?: string | null;
  createdAt: string;
  updatedAt?: string;
  subjectsCount?: number;
  coursesCount?: number;
};

