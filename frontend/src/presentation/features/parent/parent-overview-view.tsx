"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { ParentChild, WeeklySummary } from "@/domain/entities/parent-dashboard";
import { parentService } from "@/application/services/parent-service";
import { useAuth } from "@/presentation/providers/auth-provider";
import { PageLoader } from "@/presentation/components/ui/page-loader";
import { StatCard } from "@/presentation/components/ui/stat-card";
import { StudentGroup, UserType } from "@/domain/enums";

const CHILD_KEY = "karini-parent-selected-child";

const groupStyles: Record<string, string> = {
  [StudentGroup.DABA_DABA]: "bg-emerald-50 text-emerald-700 border-emerald-200",
  [StudentGroup.STANDARD]: "bg-blue-50 text-blue-700 border-blue-200",
  [StudentGroup.EXCELLENT]: "bg-purple-50 text-purple-700 border-purple-200",
  [StudentGroup.TOP]: "bg-amber-50 text-amber-700 border-amber-200",
};

function childName(child: ParentChild): string {
  return [child.firstname, child.lastname].filter(Boolean).join(" ") || child.username || "Votre enfant";
}

function trend(current: number, previous: number | undefined): { arrow: string; label: string; color: string } {
  if (previous === undefined || current === previous) return { arrow: "→", label: "Stable", color: "text-slate-500" };
  const percentage = previous === 0 ? 100 : Math.round(((current - previous) / previous) * 100);
  return {
    arrow: percentage > 0 ? "↗" : "↘",
    label: `${Math.abs(percentage)}%`,
    color: percentage > 0 ? "text-emerald-600" : "text-rose-600",
  };
}

function SummaryCard({
  label,
  value,
  previous,
  icon,
  suffix = "",
}: {
  label: string;
  value: number;
  previous?: number;
  icon: string;
  suffix?: string;
}) {
  const direction = trend(value, previous);
  return (
    <StatCard
      label={label}
      value={`${value}${suffix}`}
      icon={icon}
      iconBg="var(--accent-glow)"
      iconColor="var(--accent)"
      footer={
        <span className={`text-xs font-semibold ${direction.color}`}>
          {direction.arrow} {direction.label} <span className="font-normal text-slate-400">vs semaine dernière</span>
        </span>
      }
    />
  );
}

function SummarySkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4" aria-label="Chargement des statistiques">
      {Array.from({ length: 4 }, (_, index) => (
        <div key={index} className="glass-card h-32 animate-pulse rounded-2xl bg-slate-200/40" />
      ))}
    </div>
  );
}

export function ParentOverviewView() {
  const { token, user } = useAuth();
  const [children, setChildren] = useState<ParentChild[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [summary, setSummary] = useState<WeeklySummary | null>(null);
  const [loadingChildren, setLoadingChildren] = useState(true);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token || user?.userType !== UserType.PARENT) return;
    parentService
      .listChildren(token)
      .then((result) => {
        setChildren(result);
        const savedId = Number(window.localStorage.getItem(CHILD_KEY));
        const savedChild = result.find((child) => child.id === savedId);
        setSelectedId(savedChild?.id ?? result[0]?.id ?? null);
      })
      .catch((cause: unknown) => setError(cause instanceof Error ? cause.message : "Impossible de charger vos enfants."))
      .finally(() => setLoadingChildren(false));
  }, [token, user?.userType]);

  useEffect(() => {
    if (!token || selectedId === null) return;
    window.localStorage.setItem(CHILD_KEY, String(selectedId));
    Promise.resolve()
      .then(() => {
        setLoadingSummary(true);
        setError(null);
        return parentService.getWeeklySummary(token, selectedId);
      })
      .then(setSummary)
      .catch((cause: unknown) => {
        setSummary(null);
        setError(cause instanceof Error ? cause.message : "Impossible de charger le résumé hebdomadaire.");
      })
      .finally(() => setLoadingSummary(false));
  }, [selectedId, token]);

  const selectedChild = useMemo(
    () => children.find((child) => child.id === selectedId) ?? null,
    [children, selectedId],
  );

  if (loadingChildren) return <PageLoader label="Chargement de votre espace parent…" />;

  if (error && children.length === 0) {
    return (
      <section className="glass-card mx-auto max-w-xl rounded-3xl p-8 text-center" role="alert">
        <p className="text-3xl">⚠️</p>
        <h1 className="mt-3 font-serif text-2xl font-bold" style={{ color: "var(--ink)" }}>Espace indisponible</h1>
        <p className="mt-2 text-sm" style={{ color: "var(--muted)" }}>{error}</p>
        <button type="button" onClick={() => window.location.reload()} className="btn-primary mt-5 rounded-xl text-sm">
          Réessayer
        </button>
      </section>
    );
  }

  if (children.length === 0) {
    return (
      <section className="glass-card mx-auto max-w-xl rounded-3xl p-8 text-center">
        <p className="text-4xl">👨‍👩‍👧</p>
        <h1 className="mt-3 font-serif text-2xl font-bold" style={{ color: "var(--ink)" }}>Aucun enfant lié</h1>
        <p className="mt-2 text-sm" style={{ color: "var(--muted)" }}>
          Aucun compte élève n&apos;est encore associé à votre compte parent.
        </p>
      </section>
    );
  }

  if (!selectedChild) return null;
  const previous = summary?.previousWeek;
  const group = selectedChild.studentGroup || StudentGroup.STANDARD;
  const groupClass = groupStyles[group] ?? groupStyles[StudentGroup.STANDARD];

  return (
    <div className="animate-fade-in-up space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <span className="badge badge-accent text-xs font-bold uppercase tracking-wider">Espace Parent</span>
          <h1 className="mt-3 font-serif text-3xl font-bold sm:text-4xl" style={{ color: "var(--ink)" }}>
            Bonjour, {user?.firstname || user?.username || "parent"} 👋
          </h1>
          <p className="mt-2 text-sm" style={{ color: "var(--muted)" }}>
            Suivez les progrès et la régularité de votre enfant.
          </p>
        </div>
        <Link href="/parent/messages" className="btn-secondary inline-flex w-fit items-center gap-2 rounded-xl text-sm font-semibold">
          💬 Messages
        </Link>
      </header>

      {children.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1" role="tablist" aria-label="Sélectionner un enfant">
          {children.map((child) => (
            <button
              key={child.id}
              type="button"
              role="tab"
              aria-selected={child.id === selectedId}
              onClick={() => setSelectedId(child.id)}
              className={`shrink-0 rounded-xl border px-4 py-2 text-sm font-semibold transition-colors ${
                child.id === selectedId ? "border-indigo-300 bg-indigo-50 text-indigo-700" : "border-transparent bg-black/5"
              }`}
              style={{ color: child.id === selectedId ? undefined : "var(--muted)" }}
            >
              {childName(child)}
            </button>
          ))}
        </div>
      )}

      <section className="glass-card-strong relative overflow-hidden rounded-3xl p-6 sm:p-8">
        <div className="relative z-10 flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--accent)" }}>Suivi de l&apos;élève</p>
            <h2 className="mt-2 font-serif text-2xl font-bold" style={{ color: "var(--ink)" }}>{childName(selectedChild)}</h2>
            <p className="mt-1 text-sm" style={{ color: "var(--muted)" }}>{selectedChild.studentClass || "Classe non renseignée"}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <span className="badge badge-accent text-[10px] font-bold uppercase">{selectedChild.membership || "Standard"}</span>
              <span className={`rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase ${groupClass}`}>{group}</span>
            </div>
          </div>
          <Link href={`/parent/children/${selectedChild.id}`} className="btn-primary w-fit rounded-xl text-sm">
            Voir le détail →
          </Link>
        </div>
      </section>

      {error && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700" role="alert">
          {error}
        </div>
      )}
      {loadingSummary ? <SummarySkeleton /> : summary ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <SummaryCard label="Leçons terminées" value={summary.lessonsCompleted} previous={previous?.lessonsCompleted} icon="✓" />
          <SummaryCard label="Minutes regardées" value={summary.minutesWatched} previous={previous?.minutesWatched} icon="◷" suffix=" min" />
          <SummaryCard label="Moyenne des quiz" value={summary.averageQuizScore} previous={previous?.averageQuizScore} icon="★" suffix="%" />
          <SummaryCard label="Sessions suivies" value={summary.liveSessionsAttended} previous={previous?.liveSessionsAttended} icon="▶" />
        </div>
      ) : null}
    </div>
  );
}
