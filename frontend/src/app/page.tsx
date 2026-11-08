"use client";

import Link from "next/link";
import { useAuth } from "@/presentation/providers/auth-provider";
import { displayName } from "@/shared/utils/display-name";
import { UserType } from "@/domain/enums";

const platformFeatures = [
  {
    title: "Structured Video Courses",
    description: "In-depth, multi-chapter video courses designed by subject matter experts to take you from fundamentals to mastery.",
    icon: (
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="5 3 19 12 5 21 5 3" />
      </svg>
    ),
    badge: "Courses",
    gradient: "linear-gradient(135deg, #6366f1, #4ecdc4)",
    href: "/courses?section=course",
  },
  {
    title: "Interactive Practice & Exercises",
    description: "Hands-on exercises and quizzes to challenge your understanding and solidify your skills with instant feedback.",
    icon: (
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
        <polyline points="10 9 9 9 8 9" />
      </svg>
    ),
    badge: "Practice",
    gradient: "linear-gradient(135deg, #3b82f6, #06b6d4)",
    href: "/courses?section=exercise",
  },
  {
    title: "Secure PDF Magazines & Papers",
    description: "Curated learning magazines and research papers served securely with authenticated on-demand downloads.",
    icon: (
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
        <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
      </svg>
    ),
    badge: "Publications",
    gradient: "linear-gradient(135deg, #ec4899, #f43f5e)",
    href: "/courses?section=magazine",
  },
  {
    title: "Live Masterclass Archives",
    description: "Replay past live streams, webinars, and interactive Q&A sessions at your own convenience.",
    icon: (
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <polygon points="10 8 16 12 10 16 10 8" />
      </svg>
    ),
    badge: "Archives",
    gradient: "linear-gradient(135deg, #f59e0b, #ef4444)",
    href: "/courses?section=oldlive",
  },
];

const tiers = [
  {
    name: "Standard",
    desc: "Essential access for newcomers and self-directed learners.",
    perks: ["Access to free course materials", "Credit-based unlocks", "Standard support"],
    badgeClass: "badge-accent",
  },
  {
    name: "Silver",
    desc: "Expanded access to supplementary exercises and resources.",
    perks: ["Discounted credit rates", "Exercise solution guides", "Priority updates"],
    badgeClass: "badge-silver",
  },
  {
    name: "Gold",
    desc: "Full access including exclusive live masterclass recordings.",
    perks: ["Full live archive access", "All magazine downloads", "Community forum access"],
    badgeClass: "badge-gold",
  },
  {
    name: "Platinum",
    desc: "The ultimate VIP pass for ambitious students and professionals.",
    perks: ["Unlimited access to all material", "Direct instructor Q&A", "Verified completion certificates"],
    badgeClass: "badge-platinum",
  },
];

export default function HomePage() {
  const { user, isLoading } = useAuth();

  // If a user is logged in, show their role-tailored dashboard hub
  if (!isLoading && user) {
    // =========================================================================
    // 1. SUPERADMIN DASHBOARD HUB
    // =========================================================================
    if (user.userType === UserType.SUPERADMIN) {
      return (
        <div className="space-y-8 animate-fade-in-up">
          {/* Superadmin Hero Header */}
          <div
            className="glass-card-strong relative overflow-hidden p-6 sm:p-8 rounded-3xl"
            style={{
              background: "linear-gradient(135deg, rgba(225, 29, 72, 0.08), rgba(99, 102, 241, 0.08))",
              border: "1px solid rgba(225, 29, 72, 0.2)",
            }}
          >
            <div className="relative z-10 max-w-3xl">
              <span
                className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider bg-rose-50 text-rose-700 border border-rose-200"
              >
                <span>👑</span> Console Superadministrateur
              </span>
              <h1 className="mt-4 font-serif text-3xl font-bold sm:text-4xl" style={{ color: "var(--ink)" }}>
                Bienvenue, <span className="gradient-text">{displayName(user)}</span>
              </h1>
              <p className="mt-2 text-sm leading-relaxed" style={{ color: "var(--muted)" }}>
                Centre de commandement Karini. Pilotez l&apos;ensemble de la plateforme : gérez les comptes élèves et enseignants, configurez les matières et filières scolaires tunisiennes, et supervisez les publications.
              </p>

              <div className="mt-6 flex flex-wrap items-center gap-3">
                <Link
                  href="/admin"
                  className="btn-primary text-xs sm:text-sm font-bold shadow-md rounded-xl"
                  style={{ background: "linear-gradient(135deg, #e11d48, #4f46e5)" }}
                >
                  <span>⚙️</span> Panneau d&apos;Administration
                </Link>
                <Link
                  href="/teacher"
                  className="btn-secondary text-xs sm:text-sm font-semibold rounded-xl"
                >
                  <span>👨‍🏫</span> Studio Enseignant
                </Link>
                <Link
                  href="/courses"
                  className="btn-secondary text-xs sm:text-sm font-semibold rounded-xl"
                >
                  <span>📚</span> Explorer tous les cours
                </Link>
              </div>
            </div>
          </div>

          {/* Quick Management Cards Grid */}
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            <Link
              href="/admin"
              className="glass-card group p-6 rounded-3xl transition-all duration-300 hover:-translate-y-1 hover:shadow-lg border"
              style={{ borderColor: "rgba(99, 102, 241, 0.2)" }}
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 text-xl font-bold">
                👥
              </div>
              <h3 className="mt-4 font-serif text-lg font-bold" style={{ color: "var(--ink)" }}>
                Gestion des Utilisateurs
              </h3>
              <p className="mt-1 text-xs leading-relaxed" style={{ color: "var(--muted)" }}>
                Créer des élèves, assigner des classes, configurer les matières et classes autorisées pour chaque enseignant.
              </p>
              <span className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 group-hover:translate-x-1 transition-transform">
                Gérer les comptes →
              </span>
            </Link>

            <Link
              href="/admin"
              className="glass-card group p-6 rounded-3xl transition-all duration-300 hover:-translate-y-1 hover:shadow-lg border"
              style={{ borderColor: "rgba(168, 85, 247, 0.2)" }}
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-purple-50 text-purple-600 text-xl font-bold">
                📚
              </div>
              <h3 className="mt-4 font-serif text-lg font-bold" style={{ color: "var(--ink)" }}>
                Catalogue des Matières & Filières
              </h3>
              <p className="mt-1 text-xs leading-relaxed" style={{ color: "var(--muted)" }}>
                Ajouter, renommer ou supprimer dynamiquement les matières pour chaque filière (2ème Info, 2ème Math, Bac Info, etc.).
              </p>
              <span className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-purple-600 group-hover:translate-x-1 transition-transform">
                Configurer les programmes →
              </span>
            </Link>

            <Link
              href="/teacher"
              className="glass-card group p-6 rounded-3xl transition-all duration-300 hover:-translate-y-1 hover:shadow-lg border"
              style={{ borderColor: "rgba(6, 182, 212, 0.2)" }}
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-50 text-cyan-600 text-xl font-bold">
                🎓
              </div>
              <h3 className="mt-4 font-serif text-lg font-bold" style={{ color: "var(--ink)" }}>
                Studio Pédagogique
              </h3>
              <p className="mt-1 text-xs leading-relaxed" style={{ color: "var(--muted)" }}>
                Publier de nouveaux cours, ajouter des vidéos interactives et des documents PDF pour toutes les classes.
              </p>
              <span className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-cyan-600 group-hover:translate-x-1 transition-transform">
                Ouvrir le studio →
              </span>
            </Link>
          </div>
        </div>
      );
    }

    // =========================================================================
    // 2. INSTRUCTOR DASHBOARD HUB
    // =========================================================================
    if (user.userType === UserType.INSTRUCTOR) {
      return (
        <div className="space-y-8 animate-fade-in-up">
          {/* Instructor Hero Header */}
          <div
            className="glass-card-strong relative overflow-hidden p-6 sm:p-8 rounded-3xl"
            style={{
              background: "linear-gradient(135deg, rgba(79, 70, 229, 0.08), rgba(6, 182, 212, 0.06))",
              border: "1px solid rgba(79, 70, 229, 0.2)",
            }}
          >
            <div className="relative z-10 max-w-3xl">
              <span
                className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider bg-indigo-50 text-indigo-700 border border-indigo-200"
              >
                <span>👨‍🏫</span> Espace Pédagogique Enseignant
              </span>
              <h1 className="mt-4 font-serif text-3xl font-bold sm:text-4xl" style={{ color: "var(--ink)" }}>
                Bienvenue, Professeur <span className="gradient-text">{displayName(user)}</span>
              </h1>
              <p className="mt-2 text-sm leading-relaxed" style={{ color: "var(--muted)" }}>
                Publiez des cours captivants et des leçons structurées pour vos élèves. En tant qu&apos;enseignant, vous disposez d&apos;un accès complet aux outils de création et de diffusion pédagogique.
              </p>

              <div className="mt-6 flex flex-wrap items-center gap-3">
                <Link
                  href="/teacher"
                  className="btn-primary text-xs sm:text-sm font-bold shadow-md rounded-xl"
                >
                  <span>+</span> Créer un nouveau cours
                </Link>
                <Link
                  href="/teacher"
                  className="btn-secondary text-xs sm:text-sm font-semibold rounded-xl"
                >
                  <span>🎬</span> Gérer mes leçons
                </Link>
                <Link
                  href="/courses"
                  className="btn-secondary text-xs sm:text-sm font-semibold rounded-xl"
                >
                  <span>📖</span> Consulter les cours publiés
                </Link>
              </div>
            </div>
          </div>

          {/* Teaching Assignment Details */}
          <div className="glass-card p-6 rounded-3xl border" style={{ borderColor: "var(--line)" }}>
            <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-950 flex items-center gap-2">
              <span>📋</span> Vos Affectations d&apos;Enseignement
            </h3>
            <p className="mt-1 text-xs" style={{ color: "var(--muted)" }}>
              Ces affectations sont configurées par le Superadministrateur et déterminent les matières et filières dans lesquelles vous pouvez publier.
            </p>

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div className="p-4 rounded-2xl bg-indigo-50/50 border border-indigo-100">
                <span className="text-xs font-bold text-indigo-950 block mb-2">Matières autorisées :</span>
                {user.teachingSubjects && user.teachingSubjects.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {user.teachingSubjects.map((s) => (
                      <span key={s} className="rounded-lg px-2.5 py-1 text-xs font-bold uppercase bg-white text-indigo-700 border border-indigo-200 shadow-xs">
                        {s}
                      </span>
                    ))}
                  </div>
                ) : (
                  <span className="text-xs text-amber-700 font-medium">Toutes les matières (aucune restriction)</span>
                )}
              </div>

              <div className="p-4 rounded-2xl bg-indigo-50/50 border border-indigo-100">
                <span className="text-xs font-bold text-indigo-950 block mb-2">Classes / Niveaux pris en charge :</span>
                {user.teachingClasses && user.teachingClasses.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {user.teachingClasses.map((c) => (
                      <span key={c} className="rounded-lg px-2.5 py-1 text-xs font-semibold bg-white text-slate-800 border border-slate-200 shadow-xs">
                        {c}
                      </span>
                    ))}
                  </div>
                ) : (
                  <span className="text-xs text-slate-600 font-medium">Toutes les classes de la plateforme</span>
                )}
              </div>
            </div>
          </div>

          {/* Action cards for Teacher */}
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            <Link
              href="/teacher"
              className="glass-card group p-6 rounded-3xl transition-all duration-300 hover:-translate-y-1 hover:shadow-lg border"
              style={{ borderColor: "rgba(79, 70, 229, 0.2)" }}
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 text-xl font-bold">
                ✍️
              </div>
              <h3 className="mt-4 font-serif text-lg font-bold" style={{ color: "var(--ink)" }}>
                Studio de Création
              </h3>
              <p className="mt-1 text-xs leading-relaxed" style={{ color: "var(--muted)" }}>
                Ajoutez de nouveaux modules de cours structurés pour vos matières autorisées.
              </p>
              <span className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 group-hover:translate-x-1 transition-transform">
                Ouvrir le studio →
              </span>
            </Link>

            <Link
              href="/teacher"
              className="glass-card group p-6 rounded-3xl transition-all duration-300 hover:-translate-y-1 hover:shadow-lg border"
              style={{ borderColor: "rgba(6, 182, 212, 0.2)" }}
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-50 text-cyan-600 text-xl font-bold">
                🎥
              </div>
              <h3 className="mt-4 font-serif text-lg font-bold" style={{ color: "var(--ink)" }}>
                Leçons Multimédia
              </h3>
              <p className="mt-1 text-xs leading-relaxed" style={{ color: "var(--muted)" }}>
                Enrichissez vos cours avec des liens vidéo YouTube, des documents PDF de cours et des synthèses écrites.
              </p>
              <span className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-cyan-600 group-hover:translate-x-1 transition-transform">
                Gérer les leçons →
              </span>
            </Link>

            <Link
              href="/courses"
              className="glass-card group p-6 rounded-3xl transition-all duration-300 hover:-translate-y-1 hover:shadow-lg border"
              style={{ borderColor: "rgba(168, 85, 247, 0.2)" }}
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-purple-50 text-purple-600 text-xl font-bold">
                📖
              </div>
              <h3 className="mt-4 font-serif text-lg font-bold" style={{ color: "var(--ink)" }}>
                Vue Apprenant
              </h3>
              <p className="mt-1 text-xs leading-relaxed" style={{ color: "var(--muted)" }}>
                Consultez vos cours exactement tels qu&apos;ils sont affichés aux élèves de vos classes.
              </p>
              <span className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-purple-600 group-hover:translate-x-1 transition-transform">
                Consulter les cours →
              </span>
            </Link>
          </div>
        </div>
      );
    }

    // =========================================================================
    // 3. STUDENT DASHBOARD HUB
    // =========================================================================
    return (
      <div className="space-y-8 animate-fade-in-up">
        {/* Welcome Header */}
        <div
          className="glass-card-strong relative overflow-hidden p-6 sm:p-8 rounded-3xl"
          style={{
            background: "linear-gradient(135deg, rgba(99, 102, 241, 0.08), rgba(6, 182, 212, 0.06))",
            border: "1px solid rgba(99, 102, 241, 0.18)",
          }}
        >
          <div className="relative z-10 max-w-2xl">
            <span
              className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wider"
              style={{
                color: "var(--accent)",
                background: "var(--accent-glow)",
                border: "1px solid rgba(99, 102, 241, 0.25)",
              }}
            >
              <span className="h-2 w-2 rounded-full" style={{ background: "var(--accent)" }} />
              Espace Élève
            </span>
            <h1 className="mt-4 font-serif text-3xl font-bold md:text-4xl" style={{ color: "var(--ink)" }}>
              Bienvenue, <span className="gradient-text">{displayName(user)}</span>
            </h1>
            <p className="mt-2 text-sm leading-relaxed" style={{ color: "var(--muted)" }}>
              Poursuivez votre apprentissage. Accédez aux cours vidéo, exercices interactifs, magazines sécurisés et archives pédagogiques de votre programme.
            </p>

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <Link href="/courses" className="btn-primary">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polygon points="5 3 19 12 5 21 5 3" />
                </svg>
                Accéder à mes cours
              </Link>
              <Link href="/membership" className="btn-secondary">
                Gérer mon abonnement & crédits
              </Link>
            </div>
          </div>
        </div>

        {/* Quick Stats Grid */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="glass-card p-5 rounded-2xl">
            <p className="text-xs uppercase tracking-wider" style={{ color: "var(--muted)" }}>Classe Scolaire</p>
            <div className="mt-2 flex items-center gap-2">
              <span className="font-serif text-2xl font-bold text-indigo-600">
                {user.studentClass ? `🎓 ${user.studentClass}` : "Non assignée"}
              </span>
            </div>
            <p className="mt-1 text-xs text-slate-500">
              {user.studentClass
                ? "Vos cours sont automatiquement adaptés à cette filière."
                : "Demandez à l'administrateur d'assigner votre classe."}
            </p>
          </div>

          <div className="glass-card p-5 rounded-2xl">
            <p className="text-xs uppercase tracking-wider" style={{ color: "var(--muted)" }}>Crédits Disponibles</p>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="font-serif text-3xl font-bold gradient-text">{user.credits}</span>
              <span className="text-xs" style={{ color: "var(--muted)" }}>crédits</span>
            </div>
            <p className="mt-1 text-xs text-slate-500">Utilisez vos crédits pour débloquer les exercices et supports.</p>
          </div>

          <div className="glass-card p-5 rounded-2xl">
            <p className="text-xs uppercase tracking-wider" style={{ color: "var(--muted)" }}>Formule d&apos;Abonnement</p>
            <div className="mt-2 flex items-center gap-2">
              <span className="font-serif text-2xl font-bold capitalize" style={{ color: "var(--ink)" }}>
                {user.membership || "Standard"}
              </span>
            </div>
            <p className="mt-1 text-xs text-slate-500">Abonnement actif sur la plateforme.</p>
          </div>
        </div>

        {/* Learning Categories Grid */}
        <div>
          <h2 className="font-serif text-2xl" style={{ color: "var(--ink)" }}>
            Catégories d&apos;Apprentissage
          </h2>
          <p className="mt-1 text-xs" style={{ color: "var(--muted)" }}>
            Sélectionnez une catégorie pour accéder directement à vos ressources.
          </p>

          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {platformFeatures.map((feat) => (
              <Link
                key={feat.title}
                href={feat.href}
                className="glass-card group flex flex-col justify-between p-5 transition-all duration-200 hover:-translate-y-1 hover:border-indigo-400 rounded-2xl"
              >
                <div>
                  <div
                    className="flex h-11 w-11 items-center justify-center rounded-xl text-white shadow-xs"
                    style={{ background: feat.gradient }}
                  >
                    {feat.icon}
                  </div>
                  <h3 className="mt-4 font-semibold text-sm" style={{ color: "var(--ink)" }}>
                    {feat.title}
                  </h3>
                  <p className="mt-1.5 text-xs leading-relaxed" style={{ color: "var(--muted)" }}>
                    {feat.description}
                  </p>
                </div>
                <div className="mt-4 flex items-center gap-1 text-xs font-medium text-indigo-600 group-hover:underline">
                  Explorer la catégorie →
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // When student is NOT logged in: Show Platform Information Landing Page
  return (
    <div className="space-y-20">
      {/* Hero Section */}
      <section className="relative grid gap-12 lg:grid-cols-[1.3fr_0.7fr] lg:items-center">
        <div className="animate-fade-in-up">
          <p
            className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.22em]"
            style={{
              color: "var(--accent)",
              background: "var(--accent-glow)",
              border: "1px solid rgba(99, 102, 241, 0.2)",
            }}
          >
            <span
              className="inline-block h-1.5 w-1.5 rounded-full"
              style={{ background: "var(--accent)" }}
            />
            Karini E-Learning Platform
          </p>

          <h1
            className="mt-6 max-w-2xl font-serif text-4xl leading-[1.15] md:text-5xl lg:text-6xl"
            style={{ color: "var(--ink)" }}
          >
            Learn with <span className="gradient-text">mastery</span> across courses, practice & archives.
          </h1>

          <p className="mt-5 max-w-xl text-base leading-relaxed" style={{ color: "var(--muted)" }}>
            Karini is an all-in-one digital education platform built for serious students. Access curated video courses, practice exercises, downloadable magazines, and recorded live sessions powered by a transparent credit system.
          </p>

          {/* Login and Register CTAs */}
          <div className="mt-8 flex flex-wrap items-center gap-4">
            <Link href="/register" className="btn-primary">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="8.5" cy="7" r="4" />
                <line x1="20" y1="8" x2="20" y2="14" />
                <line x1="23" y1="11" x2="17" y2="11" />
              </svg>
              Create free account
            </Link>
            <Link href="/login" className="btn-secondary">
              Sign in to platform →
            </Link>
          </div>

          {/* Quick Platform Stats */}
          <div className="mt-10 flex gap-8">
            <div>
              <p className="font-serif text-2xl font-bold gradient-text">4</p>
              <p className="text-xs" style={{ color: "var(--muted)" }}>Content types</p>
            </div>
            <div>
              <p className="font-serif text-2xl font-bold gradient-text">4</p>
              <p className="text-xs" style={{ color: "var(--muted)" }}>Membership tiers</p>
            </div>
            <div>
              <p className="font-serif text-2xl font-bold gradient-text">100%</p>
              <p className="text-xs" style={{ color: "var(--muted)" }}>Self-paced learning</p>
            </div>
          </div>
        </div>

        {/* Platform Information Card */}
        <div className="glass-card p-7 animate-fade-in-up stagger-2">
          <p
            className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em]"
            style={{ color: "var(--muted)" }}
          >
            <span
              className="inline-block h-1.5 w-1.5 rounded-full"
              style={{ background: "var(--success)" }}
            />
            What Karini Provides
          </p>
          <ul className="mt-6 space-y-4 text-sm" style={{ color: "var(--ink-soft)" }}>
            {[
              "High quality video courses organized in step-by-step modules",
              "Interactive practice exercises to test your comprehension",
              "Authenticated PDF magazine downloads and research material",
              "Exclusive access to recorded masterclasses and live archives",
              "Transparent credit-based economy for flexible content unlocking",
              "Tiered memberships (Silver, Gold, Platinum) with VIP benefits",
            ].map((item) => (
              <li key={item} className="flex items-start gap-3">
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="var(--accent)"
                  strokeWidth="2.5"
                  className="mt-0.5 shrink-0"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                <span>{item}</span>
              </li>
            ))}
          </ul>

          <div className="mt-8 rounded-xl p-4 bg-slate-50 border border-slate-100">
            <p className="text-xs font-semibold text-slate-800">Ready to join our student community?</p>
            <p className="mt-1 text-xs text-slate-500">Sign up takes under 30 seconds. Get immediate access to your student dashboard.</p>
            <Link href="/register" className="mt-3 block text-center text-xs font-semibold text-indigo-600 hover:underline">
              Register now →
            </Link>
          </div>
        </div>
      </section>

      {/* Content Pillars */}
      <section>
        <div className="text-center max-w-2xl mx-auto">
          <p className="text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: "var(--muted)" }}>
            Platform Offerings
          </p>
          <h2 className="mt-2 font-serif text-3xl md:text-4xl" style={{ color: "var(--ink)" }}>
            Everything you need for <span className="gradient-text">academic & skill growth</span>
          </h2>
          <p className="mt-3 text-sm text-slate-500">
            Karini consolidates multiple formats of education into a cohesive experience.
          </p>
        </div>

        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {platformFeatures.map((item, i) => (
            <article
              key={item.title}
              className={`glass-card p-6 transition-all duration-300 hover:border-[rgba(99,102,241,0.3)] hover:-translate-y-1 animate-fade-in-up stagger-${i + 2}`}
            >
              <div
                className="flex h-12 w-12 items-center justify-center rounded-2xl text-white shadow-xs"
                style={{ background: item.gradient }}
              >
                {item.icon}
              </div>
              <h3 className="mt-5 font-serif text-xl" style={{ color: "var(--ink)" }}>
                {item.title}
              </h3>
              <p className="mt-2 text-xs leading-relaxed" style={{ color: "var(--muted)" }}>
                {item.description}
              </p>
            </article>
          ))}
        </div>
      </section>

      {/* Membership Tiers Overview */}
      <section>
        <div className="text-center max-w-2xl mx-auto">
          <p className="text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: "var(--gold)" }}>
            Flexible Memberships
          </p>
          <h2 className="mt-2 font-serif text-3xl md:text-4xl" style={{ color: "var(--ink)" }}>
            Designed to fit your <span className="gradient-text-warm">budget and goals</span>
          </h2>
          <p className="mt-3 text-sm text-slate-500">
            Start on the standard tier and unlock deeper content as your needs expand.
          </p>
        </div>

        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {tiers.map((t) => (
            <div key={t.name} className="glass-card flex flex-col justify-between p-6">
              <div>
                <span className={`badge ${t.badgeClass} text-xs font-semibold uppercase`}>
                  {t.name}
                </span>
                <p className="mt-3 text-xs leading-relaxed text-slate-500">{t.desc}</p>
                <div className="my-4 h-px bg-slate-100" />
                <ul className="space-y-2 text-xs text-slate-600">
                  {t.perks.map((p) => (
                    <li key={p} className="flex items-center gap-2">
                      <span className="text-indigo-500 font-bold">✓</span>
                      <span>{p}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <Link
                href="/register"
                className="mt-6 block text-center rounded-xl py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors"
              >
                Join with {t.name}
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* Bottom CTA Card */}
      <section
        className="glass-card-strong p-10 text-center animate-fade-in-up"
        style={{
          background: "linear-gradient(135deg, rgba(99, 102, 241, 0.06), rgba(6, 182, 212, 0.06))",
          border: "1px solid rgba(99, 102, 241, 0.2)",
        }}
      >
        <h2 className="font-serif text-3xl md:text-4xl" style={{ color: "var(--ink)" }}>
          Ready to unlock your full potential?
        </h2>
        <p className="mx-auto mt-3 max-w-lg text-sm" style={{ color: "var(--muted)" }}>
          Create an account in moments, explore video lessons and practice problems, or sign in to resume where you left off.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-4">
          <Link href="/register" className="btn-primary">
            Create account
          </Link>
          <Link href="/login" className="btn-secondary">
            Sign in
          </Link>
        </div>
      </section>
    </div>
  );
}
