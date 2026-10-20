export type Subject = {
  id: number;
  name: string;
  code: string;
  slug: string;
  filiere: string;
  category: string;
  description?: string | null;
  icon: string;
  color: string;
  topics?: string | null;
  createdById?: number | null;
  createdAt: string;
  updatedAt?: string;
};
