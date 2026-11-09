"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/presentation/providers/auth-provider";
import { displayName } from "@/shared/utils/display-name";
import { MembershipType, UserType } from "@/domain/enums";
import { BookOpenIcon, CrownIcon, RulerIcon } from "@/presentation/components/ui/icons";

type AppSidebarProps = {
  isOpenMobile?: boolean;
  onCloseMobile?: () => void;
  unreadMessageCount?: number;
};

export function AppSidebar({ isOpenMobile, onCloseMobile, unreadMessageCount = 0 }: AppSidebarProps) {
  const pathname = usePathname();
  const { user, signOut } = useAuth();

  if (!user) return null;

  const isSuperadmin = user.userType === UserType.SUPERADMIN;
  const isInstructor = user.userType === UserType.INSTRUCTOR;
  const isModerator = user.userType === UserType.MODERATOR;
  const isStudent = user.userType === UserType.STUDENT;
  const isParent = user.userType === UserType.PARENT;

  // Build role-tailored navigation items
  const navLinks = [
    {
      href: isParent ? "/parent" : "/",
      label: "Dashboard",
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="3" width="7" height="7" rx="1" />
          <rect x="14" y="3" width="7" height="7" rx="1" />
          <rect x="14" y="14" width="7" height="7" rx="1" />
          <rect x="3" y="14" width="7" height="7" rx="1" />
        </svg>
      ),
      exact: true,
    },
    ...(isSuperadmin
      ? [
          {
            href: "/admin",
            label: "Panneau Superadmin",
            icon: (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
              </svg>
            ),
            exact: false,
          },
        ]
      : []),
    ...(isModerator || isSuperadmin
      ? [
          {
            href: "/moderator",
            label: "Gestion Élèves & Groupes",
            icon: (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
            ),
            exact: false,
          },
        ]
      : []),
    ...(isInstructor || isSuperadmin
      ? [
          {
            href: "/teacher",
            label: "Studio Enseignant",
            icon: (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
                <path d="M6 12v5c3 3 9 3 12 0v-5" />
              </svg>
            ),
            exact: false,
          },
        ]
      : []),
    ...(isInstructor
      ? [{
          href: "/teacher/messages",
          label: "Messages Parents",
          unreadCount: unreadMessageCount,
          icon: (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 11.5a8.38 8.38 0 0 1-9 8.5 9.5 9.5 0 0 1-4-.8L3 21l1.8-4.3A8.5 8.5 0 1 1 21 11.5Z" />
            </svg>
          ),
          exact: false,
        }]
      : []),
    ...(isParent
      ? [
          {
            href: "/parent/messages",
            label: "Messages",
            unreadCount: unreadMessageCount,
            icon: (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 11.5a8.38 8.38 0 0 1-9 8.5 9.5 9.5 0 0 1-4-.8L3 21l1.8-4.3A8.5 8.5 0 1 1 21 11.5Z" />
              </svg>
            ),
            exact: false,
          },
        ]
      : []),
    // Moderator does NOT have "Mes Cours"
    ...(!isModerator && !isParent
      ? [
          {
            href: "/courses",
            label: isInstructor ? "Catalogue des Cours" : isSuperadmin ? "Tous les Cours" : "Mes Cours",
            icon: (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
              </svg>
            ),
            exact: false,
          },
        ]
      : []),
    ...(!isParent ? [{
      href: "/live",
      label: "Sessions Live",
      badge: isStudent && user.membership !== MembershipType.PLATINUM ? "VIP" : "LIVE",
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10" />
          <polygon points="10 8 16 12 10 16 10 8" />
        </svg>
      ),
      exact: false,
    }] : []),
    // Membership link is ONLY for students
    ...(isStudent
      ? [
          {
            href: "/membership",
            label: "Formules & Crédits",
            icon: (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 2L15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2z" />
              </svg>
            ),
            exact: false,
          },
        ]
      : []),
  ];

  const isBacInfo = Boolean(
    user.studentClass &&
      (/bac.*info/i.test(user.studentClass) ||
        user.studentClass.toLowerCase() === "bac informatique")
  );

  const subjectQuickLinks = isStudent && isBacInfo
    ? [
        {
          label: "Algorithmique Avancée",
          href: "/courses/algo-bac-info",
          icon: (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="16 18 22 12 16 6" />
              <polyline points="8 6 2 12 8 18" />
            </svg>
          ),
        },
        {
          label: "Bases de Données (SQL)",
          href: "/courses/bdd-bac-info",
          icon: (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <ellipse cx="12" cy="5" rx="9" ry="3" />
              <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
              <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
            </svg>
          ),
        },
        {
          label: "Mathématiques",
          href: "/courses/math-bac-info",
          icon: <RulerIcon size={14} />,
        },
        {
          label: "Physique - Chimie",
          href: "/courses/physique-bac-info",
          icon: (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
            </svg>
          ),
        },
        {
          label: "Toutes les matières",
          href: "/courses",
          icon: <BookOpenIcon size={14} />,
        },
      ]
    : [
        {
          label: "Mathématiques",
          href: "/courses/math",
          icon: <RulerIcon size={14} />,
        },
        {
          label: "Physique - Chimie",
          href: "/courses/physique",
          icon: (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
            </svg>
          ),
        },
        {
          label: "Sciences (SVT)",
          href: "/courses/science",
          icon: (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M10 2v7.31M14 2v7.31M8.5 2h7M14 9.3a6.5 6.5 0 1 1-4 0" />
            </svg>
          ),
        },
        {
          label: "Informatique",
          href: "/courses/informatique",
          icon: (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="16 18 22 12 16 6" />
              <polyline points="8 6 2 12 8 18" />
            </svg>
          ),
        },
        {
          label: "Toutes les matières",
          href: "/courses",
          icon: <BookOpenIcon size={14} />,
        },
      ];

  const isLinkActive = (href: string, exact: boolean) => {
    if (exact) return pathname === href;
    return pathname === href || pathname.startsWith(href + "/");
  };

  const membershipTier = user.membership ? String(user.membership).toLowerCase() : "default";

  const sidebarContent = (
    <div className="flex h-full flex-col justify-between p-5 overflow-y-auto">
      {/* Top brand header */}
      <div>
        <div className="flex items-center justify-between pb-6 border-b" style={{ borderColor: "var(--line)" }}>
          <Link
            href="/"
            onClick={onCloseMobile}
            className="flex items-center gap-2 font-serif text-2xl tracking-tight transition-transform hover:scale-[1.02]"
            style={{ color: "var(--ink)" }}
          >
            <span>karini<span className="gradient-text">.</span></span>
            <span
              className="rounded-full px-2 py-0.5 text-[10px] font-sans font-medium uppercase tracking-wider"
              style={{
                color: "var(--accent)",
                background: "var(--accent-glow)",
                border: "1px solid rgba(99, 102, 241, 0.2)",
              }}
            >
              {user.userType}
            </span>
          </Link>

          {/* Close mobile button */}
          {onCloseMobile && (
            <button
              type="button"
              onClick={onCloseMobile}
              className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-black/5 md:hidden"
              aria-label="Close menu"
              style={{ color: "var(--muted)" }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* Navigation list */}
        <div className="mt-6">
          <p className="px-3 text-[11px] font-semibold uppercase tracking-wider" style={{ color: "var(--muted)" }}>
            Main Menu
          </p>
          <nav className="mt-2 space-y-1">
            {navLinks.map((item) => {
              const active = isLinkActive(item.href, item.exact);
              const unreadCount = "unreadCount" in item ? item.unreadCount ?? 0 : 0;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onCloseMobile}
                  className="group flex items-center justify-between rounded-xl px-3.5 py-2.5 text-sm font-medium transition-all duration-200"
                  style={{
                    color: active ? "var(--ink)" : "var(--muted)",
                    background: active ? "var(--accent-glow)" : "transparent",
                    border: active ? "1px solid rgba(99, 102, 241, 0.18)" : "1px solid transparent",
                  }}
                >
                  <div className="flex items-center gap-3">
                    <span
                      style={{
                        color: active ? "var(--accent)" : "var(--muted)",
                      }}
                      className="transition-colors group-hover:text-[var(--accent)]"
                    >
                      {item.icon}
                    </span>
                    <span>{item.label}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {"badge" in item && item.badge && (
                      <span
                        className={`rounded-md px-1.5 py-0.5 text-[9px] font-bold ${
                          typeof item.badge === "string" && item.badge.includes("VIP")
                            ? "bg-amber-100 text-amber-800 border border-amber-300"
                            : "bg-rose-100 text-rose-700 border border-rose-200 animate-pulse"
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                    {unreadCount > 0 && (
                      <span
                        className="flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white"
                        aria-label={`${unreadCount} message(s) non lu(s)`}
                      >
                        {unreadCount > 99 ? "99+" : unreadCount}
                      </span>
                    )}
                    {active && (
                      <span
                        className="h-2 w-2 rounded-full"
                        style={{ background: "var(--accent)" }}
                      />
                    )}
                  </div>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Quick learning sections */}
        {!isParent && (
          <div className="mt-6">
            <p className="px-3 text-[11px] font-semibold uppercase tracking-wider" style={{ color: "var(--muted)" }}>
              {isStudent && isBacInfo ? "Matières (Bac Info)" : "Matières"}
            </p>
            <div className="mt-2 space-y-0.5">
              {subjectQuickLinks.map((sub) => {
                const active = pathname === sub.href;
                return (
                  <Link
                    key={sub.href}
                    href={sub.href}
                    onClick={onCloseMobile}
                    className="flex items-center gap-2.5 rounded-lg px-3.5 py-1.5 text-xs transition-colors hover:bg-black/5 hover:text-slate-900"
                    style={{
                      color: active ? "var(--ink)" : "var(--muted)",
                      fontWeight: active ? 600 : 400,
                    }}
                  >
                    <span>{sub.icon}</span>
                    <span>{sub.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {/* Role-specific bottom card */}
        {isStudent && (
          <div
            className="mt-6 rounded-2xl p-4 transition-all"
            style={{
              background: "linear-gradient(135deg, rgba(99, 102, 241, 0.08), rgba(6, 182, 212, 0.08))",
              border: "1px solid rgba(99, 102, 241, 0.16)",
            }}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold" style={{ color: "var(--ink)" }}>
                Solde de Crédits
              </span>
              <span
                className="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase"
                style={{
                  background: "rgba(99, 102, 241, 0.15)",
                  color: "var(--accent)",
                }}
              >
                {membershipTier}
              </span>
            </div>
            <div className="mt-2 flex items-baseline gap-1.5">
              <span className="font-serif text-3xl font-bold gradient-text">{user.credits}</span>
              <span className="text-xs" style={{ color: "var(--muted)" }}>crédits</span>
            </div>
            <Link
              href="/membership"
              onClick={onCloseMobile}
              className="mt-3 block text-center rounded-xl py-1.5 text-xs font-medium transition-colors"
              style={{
                background: "#ffffff",
                color: "var(--accent)",
                border: "1px solid rgba(99, 102, 241, 0.2)",
              }}
            >
              Gérer mon abonnement →
            </Link>
          </div>
        )}

        {isInstructor && (
          <div
            className="mt-6 rounded-2xl p-4 transition-all"
            style={{
              background: "linear-gradient(135deg, rgba(79, 70, 229, 0.08), rgba(124, 58, 237, 0.08))",
              border: "1px solid rgba(79, 70, 229, 0.2)",
            }}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-indigo-900 flex items-center gap-1.5">
                <BookOpenIcon size={14} /> Espace Enseignant
              </span>
              <span className="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase bg-indigo-100 text-indigo-700">
                Studio
              </span>
            </div>
            <p className="mt-2 text-xs text-slate-600 leading-relaxed">
              {user.teachingSubjects && user.teachingSubjects.length > 0
                ? `${user.teachingSubjects.length} matière(s) assignée(s)`
                : "Toutes matières autorisées"}
            </p>
            <Link
              href="/teacher"
              onClick={onCloseMobile}
              className="mt-3 block text-center rounded-xl py-1.5 text-xs font-bold transition-all bg-indigo-600 text-white shadow-xs hover:bg-indigo-700"
            >
              + Nouvelle ressource
            </Link>
          </div>
        )}

        {isSuperadmin && (
          <div
            className="mt-6 rounded-2xl p-4 transition-all"
            style={{
              background: "linear-gradient(135deg, rgba(225, 29, 72, 0.08), rgba(99, 102, 241, 0.08))",
              border: "1px solid rgba(225, 29, 72, 0.2)",
            }}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-rose-950 flex items-center gap-1.5">
                <CrownIcon size={14} /> Superadmin
              </span>
              <span className="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase bg-rose-100 text-rose-700">
                Actif
              </span>
            </div>
            <p className="mt-2 text-xs text-slate-600 leading-relaxed">
              Contrôle total sur les comptes, les matières et les accès.
            </p>
            <Link
              href="/admin"
              onClick={onCloseMobile}
              className="mt-3 block text-center rounded-xl py-1.5 text-xs font-bold transition-all bg-slate-900 text-white shadow-xs hover:bg-slate-800"
            >
              Panneau d&apos;administration →
            </Link>
          </div>
        )}
      </div>

      {/* Bottom user card */}
      <div className="mt-6 pt-4 border-t" style={{ borderColor: "var(--line)" }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 overflow-hidden">
            <div
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white shadow-xs"
              style={{
                background: "linear-gradient(135deg, var(--gradient-start), var(--gradient-end))",
              }}
            >
              {displayName(user).charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold" style={{ color: "var(--ink)" }}>
                {displayName(user)}
              </p>
              <p className="truncate text-[11px]" style={{ color: "var(--muted)" }}>
                {user.email}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={signOut}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors hover:bg-red-50 hover:text-red-600"
            style={{ color: "var(--muted)" }}
            title="Sign out"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar (Left side) */}
      <aside
        className="hidden md:flex md:w-64 lg:w-72 md:flex-col md:fixed md:inset-y-0 md:left-0 z-40 border-r"
        style={{
          background: "var(--glass-strong)",
          backdropFilter: "blur(20px) saturate(1.4)",
          WebkitBackdropFilter: "blur(20px) saturate(1.4)",
          borderColor: "var(--line)",
        }}
      >
        {sidebarContent}
      </aside>

      {/* Mobile Drawer Backdrop */}
      {isOpenMobile && (
        <div
          className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs transition-opacity md:hidden"
          onClick={onCloseMobile}
        />
      )}

      {/* Mobile Drawer (Left side) */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-72 transform transition-transform duration-300 ease-in-out md:hidden border-r ${
          isOpenMobile ? "translate-x-0" : "-translate-x-full"
        }`}
        style={{
          background: "#ffffff",
          borderColor: "var(--line)",
          boxShadow: "var(--card-shadow)",
        }}
      >
        {sidebarContent}
      </aside>
    </>
  );
}
