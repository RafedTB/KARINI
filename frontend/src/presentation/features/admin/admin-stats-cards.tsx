import { UserType } from "@/domain/enums";
import type { User } from "@/domain/entities/user";
import type { Subject } from "@/domain/entities/subject";
import { StatCard } from "@/presentation/components/ui/stat-card";

type AdminStatsCardsProps = {
  users: User[];
  subjects: Subject[];
  filieres: string[];
};

export function AdminStatsCards({ users, subjects, filieres }: AdminStatsCardsProps) {
  const rolesCount: Record<string, number> = {};
  for (const u of users) {
    rolesCount[u.userType] = (rolesCount[u.userType] || 0) + 1;
  }
  const filieresCount = new Set(subjects.map((s) => s.filiere)).size;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <StatCard
        label="Utilisateurs Totaux"
        value={users.length}
        icon="👥"
        iconBg="rgba(99,102,241,0.1)"
        iconColor="#4f46e5"
        footer={
          <div className="mt-2 flex flex-wrap gap-1 text-[10px]">
            <span className="px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-600 font-mono">
              {rolesCount[UserType.STUDENT] || 0} Étudiants
            </span>
            <span className="px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-600 font-mono">
              {rolesCount[UserType.INSTRUCTOR] || 0} Profs
            </span>
            <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 font-mono">
              {rolesCount[UserType.FINANCE] || 0} Finance
            </span>
          </div>
        }
      />

      <StatCard
        label="Matières Actives"
        value={subjects.length}
        icon="📚"
        iconBg="rgba(168,85,247,0.1)"
        iconColor="#9333ea"
        valueColor="#9333ea"
        footer={
          <p className="text-xs" style={{ color: "var(--muted)" }}>
            Réparties sur {filieresCount} filières scolaires
          </p>
        }
      />

      <StatCard
        label="Modérateurs & Parents"
        value={(rolesCount[UserType.MODERATOR] || 0) + (rolesCount[UserType.PARENT] || 0)}
        icon="🛡️"
        iconBg="rgba(245,158,11,0.1)"
        iconColor="#d97706"
        valueColor="#d97706"
        footer={
          <p className="text-xs" style={{ color: "var(--muted)" }}>
            {rolesCount[UserType.MODERATOR] || 0} modérateurs • {rolesCount[UserType.PARENT] || 0} parents
          </p>
        }
      />

      <StatCard
        label="Filières Disponibles"
        value={filieres.length}
        icon="🎓"
        iconBg="rgba(6,182,212,0.1)"
        iconColor="#0891b2"
        valueColor="#0891b2"
        footer={
          <p className="text-xs" style={{ color: "var(--muted)" }}>
            2ème Info, 2ème Math, Bac, etc.
          </p>
        }
      />
    </div>
  );
}
