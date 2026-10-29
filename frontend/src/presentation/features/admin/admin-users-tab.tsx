import { useMemo } from "react";
import type { User } from "@/domain/entities/user";
import { UserType } from "@/domain/enums";
import { SearchInput } from "@/presentation/components/ui/search-input";

type AdminUsersTabProps = {
  users: User[];
  roleFilter: string;
  setRoleFilter: (v: string) => void;
  userSearch: string;
  setUserSearch: (v: string) => void;
  currentUserId?: number;
  onEdit: (user: User) => void;
  onDelete: (id: number, username?: string | null) => void;
};

const ROLE_FILTERS = [
  { key: "all", label: "Tous" },
  { key: UserType.FINANCE, label: "Finance" },
  { key: UserType.INSTRUCTOR, label: "Instructeur" },
  { key: UserType.STUDENT, label: "Étudiant" },
  { key: UserType.MODERATOR, label: "Modérateur" },
  { key: UserType.PARENT, label: "Parent" },
  { key: UserType.SUPERADMIN, label: "Superadmin" },
];

export function AdminUsersTab({
  users,
  roleFilter,
  setRoleFilter,
  userSearch,
  setUserSearch,
  currentUserId,
  onEdit,
  onDelete,
}: AdminUsersTabProps) {
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const matchesRole = roleFilter === "all" || u.userType === roleFilter;
      const search = userSearch.toLowerCase();
      const matchesSearch =
        !search ||
        (u.username && u.username.toLowerCase().includes(search)) ||
        u.email.toLowerCase().includes(search) ||
        (u.firstname && u.firstname.toLowerCase().includes(search)) ||
        (u.lastname && u.lastname.toLowerCase().includes(search));
      return matchesRole && matchesSearch;
    });
  }, [users, roleFilter, userSearch]);

  return (
    <div className="space-y-6">
      {/* Controls bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <SearchInput
          value={userSearch}
          onChange={setUserSearch}
          placeholder="Rechercher par nom, username, email..."
        />

        {/* Role Filter Pills */}
        <div className="flex flex-wrap items-center gap-1">
          {ROLE_FILTERS.map((r) => {
            const active = roleFilter === r.key;
            return (
              <button
                key={r.key}
                type="button"
                onClick={() => setRoleFilter(r.key)}
                className="rounded-lg px-2.5 py-1 text-xs font-medium transition-all"
                style={{
                  background: active ? "var(--accent-glow)" : "var(--paper-card)",
                  color: active ? "var(--accent)" : "var(--muted)",
                  border: active ? "1px solid rgba(99,102,241,0.3)" : "1px solid var(--line)",
                  fontWeight: active ? 700 : 500,
                }}
              >
                {r.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Users Table */}
      <div
        className="overflow-x-auto rounded-2xl"
        style={{
          background: "var(--paper-card)",
          border: "1px solid var(--line)",
          boxShadow: "0 4px 20px -2px rgba(15,23,42,0.03)",
        }}
      >
        <table className="w-full text-left text-sm">
          <thead className="border-b text-xs uppercase" style={{ borderColor: "var(--line)", color: "var(--muted)" }}>
            <tr>
              <th className="px-5 py-3.5 font-semibold">Utilisateur</th>
              <th className="px-5 py-3.5 font-semibold">Email</th>
              <th className="px-5 py-3.5 font-semibold">Rôle</th>
              <th className="px-5 py-3.5 font-semibold">Membership</th>
              <th className="px-5 py-3.5 font-semibold">Crédits</th>
              <th className="px-5 py-3.5 font-semibold text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y" style={{ borderColor: "var(--line)" }}>
            {filteredUsers.map((u) => {
              const roleColor = getRoleBadgeColor(u.userType as string);
              return (
                <tr key={u.id} className="transition-colors hover:bg-black/[0.02]">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <div
                        className="flex h-9 w-9 items-center justify-center rounded-xl font-bold uppercase text-xs"
                        style={{
                          backgroundColor: `${roleColor}18`,
                          color: roleColor,
                          border: `1px solid ${roleColor}30`,
                        }}
                      >
                        {(u.username || u.email).slice(0, 2)}
                      </div>
                      <div>
                        <span className="font-semibold block" style={{ color: "var(--ink)" }}>
                          {u.username || "Sans nom"}
                        </span>
                        {(u.firstname || u.lastname) && (
                          <span className="text-xs" style={{ color: "var(--muted)" }}>
                            {u.firstname} {u.lastname}
                          </span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 font-mono text-xs" style={{ color: "var(--ink)" }}>
                    {u.email}
                  </td>
                  <td className="px-5 py-3.5">
                    <span
                      className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold uppercase font-mono"
                      style={{
                        backgroundColor: `${roleColor}15`,
                        color: roleColor,
                        border: `1px solid ${roleColor}30`,
                      }}
                    >
                      {u.userType}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className="rounded-md px-2 py-0.5 text-xs font-medium uppercase font-mono bg-slate-100 text-slate-700">
                      {u.membership || "default"}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className="font-mono font-bold text-xs" style={{ color: "var(--accent)" }}>
                      {u.credits} pts
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-right space-x-2">
                    <button
                      type="button"
                      onClick={() => onEdit(u)}
                      className="rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors bg-indigo-50 text-indigo-600 hover:bg-indigo-100"
                    >
                      Modifier
                    </button>
                    {u.id !== currentUserId && (
                      <button
                        type="button"
                        onClick={() => onDelete(u.id, u.username)}
                        className="rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors bg-rose-50 text-rose-600 hover:bg-rose-100"
                      >
                        Supprimer
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {filteredUsers.length === 0 && (
          <div className="p-8 text-center" style={{ color: "var(--muted)" }}>
            Aucun utilisateur correspondant à votre recherche.
          </div>
        )}
      </div>
    </div>
  );
}

function getRoleBadgeColor(role: string): string {
  switch (role) {
    case UserType.SUPERADMIN:
      return "#e11d48";
    case UserType.FINANCE:
      return "#059669";
    case UserType.INSTRUCTOR:
      return "#4f46e5";
    case UserType.MODERATOR:
      return "#d97706";
    case UserType.PARENT:
      return "#0d9488";
    case UserType.STUDENT:
    default:
      return "#0284c7";
  }
}
