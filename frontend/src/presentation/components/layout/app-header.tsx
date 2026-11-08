"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/presentation/providers/auth-provider";
import { displayName } from "@/shared/utils/display-name";
import { UserType } from "@/domain/enums";

type AppHeaderProps = {
  onToggleMobileNav?: () => void;
};

export function AppHeader({ onToggleMobileNav }: AppHeaderProps) {
  const pathname = usePathname();
  const { user, signOut } = useAuth();

  if (!user) return null;

  const isStudent = user.userType === UserType.STUDENT;
  const isInstructor = user.userType === UserType.INSTRUCTOR;
  const isSuperadmin = user.userType === UserType.SUPERADMIN;

  // Breadcrumb / page title derived from current route & role
  const getPageTitle = () => {
    if (pathname.startsWith("/courses")) return "Cours & Programmes";
    if (pathname.startsWith("/teacher")) return "Studio Pédagogique Enseignant";
    if (pathname.startsWith("/admin")) return "Administration Karini";
    if (pathname.startsWith("/membership")) return "Formules & Abonnements";
    if (pathname.startsWith("/live")) return "Sessions Live & Masterclasses";
    if (pathname.startsWith("/moderator")) return "Gestion des Élèves & Groupes Live";
    if (pathname === "/") {
      if (isSuperadmin) return "Console Superadmin";
      if (isInstructor) return "Espace Enseignant";
      return "Espace Élève";
    }
    return "Portail Karini";
  };

  const membershipTier = user.membership ? String(user.membership).toLowerCase() : "default";

  const getTierBadgeClass = () => {
    switch (membershipTier) {
      case "platinum":
        return "badge-platinum";
      case "gold":
        return "badge-gold";
      case "silver":
        return "badge-silver";
      default:
        return "badge-accent";
    }
  };

  return (
    <header
      className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b px-4 md:px-8"
      style={{
        background: "var(--glass-header)",
        backdropFilter: "blur(20px) saturate(1.4)",
        WebkitBackdropFilter: "blur(20px) saturate(1.4)",
        borderColor: "var(--line)",
      }}
    >
      {/* Left: Mobile hamburger + breadcrumb title */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onToggleMobileNav}
          className="flex h-10 w-10 items-center justify-center rounded-xl transition-colors hover:bg-black/5 md:hidden"
          aria-label="Toggle navigation menu"
          style={{ color: "var(--ink)" }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        <div className="flex items-center gap-2">
          <span className="font-serif text-lg font-semibold tracking-tight md:text-xl" style={{ color: "var(--ink)" }}>
            {getPageTitle()}
          </span>
        </div>
      </div>

      {/* Right: Role-specific Badges & Actions, User info & Sign out */}
      <div className="flex items-center gap-2.5 sm:gap-3">
        {/* Only STUDENTS have credits and membership badges */}
        {isStudent && (
          <>
            <Link
              href="/membership"
              className="badge badge-accent group flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-all hover:scale-105"
              title="Gérer les crédits"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                className="transition-transform group-hover:rotate-12"
              >
                <circle cx="12" cy="12" r="9" />
                <path d="M12 7v10M9 10h6M9 14h6" />
              </svg>
              <span className="font-semibold">{user.credits}</span>
              <span className="hidden sm:inline">crédits</span>
            </Link>

            <span className={`badge ${getTierBadgeClass()} hidden text-xs font-semibold uppercase tracking-wider sm:inline-flex`}>
              {user.membership || "Standard"}
            </span>
          </>
        )}

        {/* INSTRUCTORS: Direct shortcut & Teacher role badge */}
        {isInstructor && (
          <>
            <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider bg-indigo-50 text-indigo-700 border border-indigo-200">
              <span>👨‍🏫</span> Enseignant
            </span>
            <Link
              href="/teacher"
              className="hidden sm:inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold bg-indigo-600 text-white shadow-xs hover:bg-indigo-700 transition-colors"
            >
              <span>+</span> Nouvelle ressource
            </Link>
          </>
        )}

        {/* SUPERADMIN: Role badge & Quick admin board link */}
        {isSuperadmin && (
          <>
            <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider bg-rose-50 text-rose-700 border border-rose-200">
              <span>👑</span> Superadmin
            </span>
            <Link
              href="/admin"
              className="hidden sm:inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold bg-slate-900 text-white shadow-xs hover:bg-slate-800 transition-colors"
            >
              <span>⚙️</span> Panneau Admin
            </Link>
          </>
        )}

        {/* User display */}
        <div className="hidden items-center gap-2 md:flex">
          <div
            className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold text-white shadow-xs"
            style={{
              background: isSuperadmin
                ? "linear-gradient(135deg, #e11d48, #4f46e5)"
                : isInstructor
                ? "linear-gradient(135deg, #4f46e5, #06b6d4)"
                : "linear-gradient(135deg, var(--gradient-start), var(--gradient-end))",
            }}
          >
            {displayName(user).charAt(0).toUpperCase()}
          </div>
          <span className="text-sm font-medium" style={{ color: "var(--ink-soft)" }}>
            {displayName(user)}
          </span>
        </div>

        {/* Sign out button */}
        <button
          type="button"
          onClick={signOut}
          className="btn-ghost flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-xs transition-colors hover:text-red-500"
          style={{ color: "var(--muted)" }}
          title="Déconnexion"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
          <span className="hidden sm:inline">Quitter</span>
        </button>
      </div>
    </header>
  );
}
