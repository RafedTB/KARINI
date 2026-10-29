/**
 * Centralized filière (academic track) options for the Tunisian curriculum.
 * Used across admin board, teacher studio, and course forms.
 */
export type ClassGroup = {
  group: string;
  classes: readonly string[];
};

export const TUNISIAN_CLASS_GROUPS: readonly ClassGroup[] = [
  {
    group: "Collège (Enseignement de Base)",
    classes: [
      "7ème Année de Base",
      "8ème Année de Base",
      "9ème Année de Base",
    ],
  },
  {
    group: "1ère Année Secondaire",
    classes: [
      "1ère Année Secondaire (Tronc Commun)",
    ],
  },
  {
    group: "2ème Année Secondaire",
    classes: [
      "2ème Informatique",
      "2ème Sciences",
      "2ème Économie & Services",
      "2ème Lettres",
    ],
  },
  {
    group: "3ème Année Secondaire",
    classes: [
      "3ème Informatique",
      "3ème Mathématiques",
      "3ème Sciences Expérimentales",
      "3ème Sciences Techniques",
      "3ème Économie & Gestion",
      "3ème Lettres",
      "3ème Sport",
    ],
  },
  {
    group: "Baccalauréat (4ème Année)",
    classes: [
      "Bac Informatique",
      "Bac Mathématiques",
      "Bac Sciences Expérimentales",
      "Bac Sciences Techniques",
      "Bac Économie & Gestion",
      "Bac Lettres",
      "Bac Sport",
    ],
  },
] as const;

export const ALL_TUNISIAN_CLASSES = TUNISIAN_CLASS_GROUPS.flatMap((g) => g.classes);

export const FILIERE_OPTIONS = [
  "7ème Année de Base",
  "8ème Année de Base",
  "9ème Année de Base",
  "1ère Année Secondaire (Tronc Commun)",
  "Tronc Commun",
  "2ème Informatique",
  "2ème Math",
  "2ème Sciences",
  "2ème Économie & Services",
  "2ème Lettres",
  "3ème Informatique",
  "3ème Math",
  "3ème Mathématiques",
  "3ème Sciences Expérimentales",
  "3ème Sciences Techniques",
  "3ème Économie & Gestion",
  "3ème Lettres",
  "3ème Sport",
  "Bac Informatique",
  "Bac Math",
  "Bac Mathématiques",
  "Bac Sciences",
  "Bac Sciences Expérimentales",
  "Bac Sciences Techniques",
  "Bac Économie & Gestion",
  "Bac Lettres",
  "Bac Sport",
] as const;

export const ICON_OPTIONS = [
  { value: "informatique", label: "💻 Informatique / Code" },
  { value: "math", label: "📐 Mathématiques" },
  { value: "physique", label: "⚡ Physique - Chimie" },
  { value: "science", label: "🧬 Sciences (SVT)" },
  { value: "francais", label: "📖 Français" },
  { value: "anglais", label: "🌍 Anglais" },
  { value: "arabe", label: "📜 Arabe" },
  { value: "philosophie", label: "💡 Philosophie" },
  { value: "economie", label: "📈 Économie & Gestion" },
  { value: "histoire_geo", label: "🧭 Histoire - Géo" },
] as const;

export const DEFAULT_FILIERE = "2ème Informatique";
export const DEFAULT_SUBJECT = "math";
