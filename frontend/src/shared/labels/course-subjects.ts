import { CourseSubject } from "@/domain/enums";

export type SubjectInfo = {
  id: string;
  name: string;
  shortCode: string;
  category: string;
  description: string;
  accentColor: string;
  lightBg: string;
  gradient: string;
  topics: string[];
};

export const SUBJECTS: SubjectInfo[] = [
  {
    id: CourseSubject.MATH,
    name: "Mathématiques",
    shortCode: "MATH",
    category: "Sciences Exactes",
    description: "Analyse fonctionnelle, calcul intégral, suites, nombres complexes, géométrie spatiale et probabilités.",
    accentColor: "#4f46e5",
    lightBg: "rgba(79, 70, 229, 0.08)",
    gradient: "linear-gradient(135deg, rgba(79, 70, 229, 0.15) 0%, rgba(99, 102, 241, 0.05) 100%)",
    topics: ["Analyse", "Algèbre", "Géométrie", "Probabilités"],
  },
  {
    id: CourseSubject.PHYSIQUE,
    name: "Physique - Chimie",
    shortCode: "PHYSIQUE",
    category: "Sciences Physiques",
    description: "Circuits RLC, ondes mécaniques et électromagnétiques, mécanique newtonienne, cinétique et chimie organique.",
    accentColor: "#7c3aed",
    lightBg: "rgba(124, 58, 237, 0.08)",
    gradient: "linear-gradient(135deg, rgba(124, 58, 237, 0.15) 0%, rgba(168, 85, 247, 0.05) 100%)",
    topics: ["Électricité", "Mécanique", "Ondes", "Chimie Organique"],
  },
  {
    id: CourseSubject.SCIENCE,
    name: "Sciences de la Vie & Terre",
    shortCode: "SVT",
    category: "Sciences Naturelles",
    description: "Génétique humaine et formelle, neurophysiologie, immunologie et régulation de la pression artérielle.",
    accentColor: "#059669",
    lightBg: "rgba(5, 150, 105, 0.08)",
    gradient: "linear-gradient(135deg, rgba(5, 150, 105, 0.15) 0%, rgba(16, 185, 129, 0.05) 100%)",
    topics: ["Génétique", "Immunité", "Neurophysiologie", "Écologie"],
  },
  {
    id: CourseSubject.INFORMATIQUE,
    name: "Informatique",
    shortCode: "INFO",
    category: "Technologies",
    description: "Algorithmique avancée, structures de données, récursivité, bases de données relationnelles et programmation web.",
    accentColor: "#0284c7",
    lightBg: "rgba(2, 132, 199, 0.08)",
    gradient: "linear-gradient(135deg, rgba(2, 132, 199, 0.15) 0%, rgba(56, 189, 248, 0.05) 100%)",
    topics: ["Algorithmique", "Python", "SQL & BDD", "Web"],
  },
  {
    id: CourseSubject.FRANCAIS,
    name: "Français",
    shortCode: "FRANÇAIS",
    category: "Lettres & Langues",
    description: "Analyse littéraire, étude de texte, argumentation critique, synthèse et perfectionnement de la dissertation.",
    accentColor: "#e11d48",
    lightBg: "rgba(225, 29, 72, 0.08)",
    gradient: "linear-gradient(135deg, rgba(225, 29, 72, 0.15) 0%, rgba(244, 63, 94, 0.05) 100%)",
    topics: ["Essai & Synthèse", "Littérature", "Grammaire", "Vocabulaire"],
  },
  {
    id: CourseSubject.ANGLAIS,
    name: "Anglais",
    shortCode: "ENGLISH",
    category: "Langues Vivantes",
    description: "Reading comprehension, essay writing, advanced grammar, vocabulary in context and oral mastery.",
    accentColor: "#d97706",
    lightBg: "rgba(217, 119, 6, 0.08)",
    gradient: "linear-gradient(135deg, rgba(217, 119, 6, 0.15) 0%, rgba(245, 158, 11, 0.05) 100%)",
    topics: ["Comprehension", "Writing Tasks", "Grammar", "Listening"],
  },
  {
    id: CourseSubject.ARABE,
    name: "العربية",
    shortCode: "ARABE",
    category: "اللغة والأدب",
    description: "الإنشاء الأدبي، دراسة النصوص وتحليل القضايا الفكرية واللغوية المعاصرة.",
    accentColor: "#0d9488",
    lightBg: "rgba(13, 148, 136, 0.08)",
    gradient: "linear-gradient(135deg, rgba(13, 148, 136, 0.15) 0%, rgba(20, 184, 166, 0.05) 100%)",
    topics: ["الإنشاء", "النصوص", "قضايا فكرية", "البلاغة"],
  },
  {
    id: CourseSubject.PHILOSOPHIE,
    name: "Philosophie",
    shortCode: "PHILO",
    category: "Sciences Humaines",
    description: "L'État, la souveraineté, la liberté, la justice, la science et la condition humaine à travers les grands penseurs.",
    accentColor: "#64748b",
    lightBg: "rgba(100, 116, 139, 0.08)",
    gradient: "linear-gradient(135deg, rgba(100, 116, 139, 0.15) 0%, rgba(148, 163, 184, 0.05) 100%)",
    topics: ["Pouvoir & État", "Science & Vérité", "Morale & Devoir", "Liberté"],
  },
  {
    id: CourseSubject.ECONOMIE,
    name: "Économie & Gestion",
    shortCode: "ÉCO-GESTION",
    category: "Sciences Économiques",
    description: "Croissance économique, mondialisation, flux monétaires, politiques budgétaires et gestion comptable.",
    accentColor: "#2563eb",
    lightBg: "rgba(37, 99, 235, 0.08)",
    gradient: "linear-gradient(135deg, rgba(37, 99, 235, 0.15) 0%, rgba(59, 130, 246, 0.05) 100%)",
    topics: ["Croissance", "Mondialisation", "Politiques Éco", "Comptabilité"],
  },
  {
    id: CourseSubject.HISTOIRE_GEO,
    name: "Histoire - Géographie",
    shortCode: "HIST-GÉO",
    category: "Sciences Humaines",
    description: "Relations internationales d'après-guerre, décolonisation, monde bipolaire et mondialisation territoriale.",
    accentColor: "#ca8a04",
    lightBg: "rgba(202, 138, 4, 0.08)",
    gradient: "linear-gradient(135deg, rgba(202, 138, 4, 0.15) 0%, rgba(234, 179, 8, 0.05) 100%)",
    topics: ["Guerre Froide", "Monde Multipolaire", "Mondialisation", "Maghreb"],
  },
];

export function getSubjectById(subjectId?: string | null): SubjectInfo {
  if (!subjectId) return SUBJECTS[0];
  const normalized = subjectId.toLowerCase().trim();
  const found = SUBJECTS.find(
    (s) => s.id === normalized || s.shortCode.toLowerCase() === normalized
  );
  if (found) return found;

  // Fallback for unknown subjects
  return {
    id: normalized,
    name: subjectId.charAt(0).toUpperCase() + subjectId.slice(1),
    shortCode: subjectId.toUpperCase().slice(0, 8),
    category: "Matière",
    description: "Contenus pédagogiques et ressources associées.",
    accentColor: "#6366f1",
    lightBg: "rgba(99, 102, 241, 0.08)",
    gradient: "linear-gradient(135deg, rgba(99, 102, 241, 0.15) 0%, rgba(139, 92, 246, 0.05) 100%)",
    topics: ["Cours", "Exercices", "Magazines", "Directs"],
  };
}
