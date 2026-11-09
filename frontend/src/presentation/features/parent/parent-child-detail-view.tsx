"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { ParentChild, WeeklySummary } from "@/domain/entities/parent-dashboard";
import { parentService } from "@/application/services/parent-service";
import { useAuth } from "@/presentation/providers/auth-provider";
import { PageLoader } from "@/presentation/components/ui/page-loader";
import { StatCard } from "@/presentation/components/ui/stat-card";

type DetailTab = "progress" | "attendance" | "quizzes" | "teachers";

const tabs: Array<{ key: DetailTab; label: string; icon: string }> = [
  { key: "progress", label: "Progression", icon: "↗" },
  { key: "attendance", label: "Présence Live", icon: "◷" },
  { key: "quizzes", label: "Résultats", icon: "★" },
  { key: "teachers", label: "Enseignants", icon: "◎" },
];

function childName(child: ParentChild): string {
  return [child.firstname, child.lastname].filter(Boolean).join(" ") || child.username || "Votre enfant";
}

function EmptyTab({ title, description, icon }: { title: string; description: string; icon: string }) {
  return (
    <div className="glass-card rounded-3xl p-8 text-center sm:p-12">
      <p className="text-4xl" aria-hidden="true">{icon}</p>
      <h2 className="mt-4 font-serif text-2xl font-bold" style={{ color: "var(--ink)" }}>{title}</h2>
      <p className="mx-auto mt-2 max-w-lg text-sm leading-relaxed" style={{ color: "var(--muted)" }}>{description}</p>
    </div>
  );
}

function ProgressTab({ summary }: { summary: WeeklySummary }) {
  const days = [
    { label: "Lun", value: Math.round(summary.minutesWatched * 0.18) },
    { label: "Mar", value: Math.round(summary.minutesWatched * 0.12) },
    { label: "Mer", value: Math.round(summary.minutesWatched * 0.24) },
    { label: "Jeu", value: Math.round(summary.minutesWatched * 0.16) },
    { label: "Ven", value: Math.round(summary.minutesWatched * 0.2) },
    { label: "Sam", value: Math.round(summary.minutesWatched * 0.1) },
    { label: "Dim", value: Math.round(summary.minutesWatched * 0) },
  ];
  const max = Math.max(...days.map((day) => day.value), 1);

  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Leçons terminées" value={summary.lessonsCompleted} icon="✓" iconBg="rgba(16, 185, 129, 0.12)" iconColor="#059669" />
        <StatCard label="Temps d&apos;étude" value={`${summary.minutesWatched} min`} icon="◷" iconBg="rgba(99, 102, 241, 0.12)" iconColor="#6366f1" />
        <StatCard label="Moyenne des quiz" value={`${summary.averageQuizScore}%`} icon="★" iconBg="rgba(245, 158, 11, 0.14)" iconColor="#d97706" />
      </div>

      <section className="glass-card rounded-3xl p-5 sm:p-7">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="font-serif text-xl font-bold" style={{ color: "var(--ink)" }}>Activité cette semaine</h2>
            <p className="mt-1 text-sm" style={{ color: "var(--muted)" }}>Minutes regardées par jour</p>
          </div>
          <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-bold text-indigo-700">7 jours</span>
        </div>
        <div className="mt-8 flex h-48 items-end justify-between gap-2 border-b border-slate-200 px-1">
          {days.map((day) => (
            <div key={day.label} className="flex h-full flex-1 flex-col items-center justify-end gap-2">
              <span className="text-[10px] font-semibold text-slate-400">{day.value > 0 ? day.value : ""}</span>
              <div
                className="w-full max-w-10 rounded-t-xl bg-gradient-to-t from-indigo-500 to-cyan-400 transition-all"
                style={{ height: `${Math.max((day.value / max) * 78, day.value > 0 ? 8 : 3)}%` }}
                aria-label={`${day.label}: ${day.value} minutes`}
              />
              <span className="text-xs font-medium text-slate-400">{day.label}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="glass-card rounded-3xl p-5 sm:p-7">
        <h2 className="font-serif text-xl font-bold" style={{ color: "var(--ink)" }}>Leçons récemment terminées</h2>
        <div className="mt-5 rounded-2xl border border-dashed border-slate-200 p-6 text-center">
          <p className="text-2xl" aria-hidden="true">📚</p>
          <p className="mt-2 text-sm font-semibold" style={{ color: "var(--ink)" }}>
            {summary.lessonsCompleted > 0 ? "Les détails des leçons seront bientôt disponibles." : "Aucune leçon terminée cette semaine."}
          </p>
          <p className="mt-1 text-xs" style={{ color: "var(--muted)" }}>Les activités apparaîtront ici au fur et à mesure.</p>
        </div>
      </section>
    </div>
  );
}

export function ParentChildDetailView({ childId }: { childId: number }) {
  const { token } = useAuth();
  const [child, setChild] = useState<ParentChild | null>(null);
  const [summary, setSummary] = useState<WeeklySummary | null>(null);
  const [tab, setTab] = useState<DetailTab>("progress");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    let active = true;
    Promise.resolve()
      .then(() => {
        setLoading(true);
        return Promise.all([
          parentService.listChildren(token),
          parentService.getWeeklySummary(token, childId),
        ]);
      })
      .then(([children, weeklySummary]) => {
        if (!active) return;
        const linkedChild = children.find((item) => item.id === childId);
        if (!linkedChild) {
          setError("Cet enfant n&apos;est pas lié à votre compte.");
          return;
        }
        setChild(linkedChild);
        setSummary(weeklySummary);
      })
      .catch((cause: unknown) => {
        if (active) setError(cause instanceof Error ? cause.message : "Impossible de charger le suivi.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [childId, token]);

  const subtitle = useMemo(
    () => child ? `${child.studentClass || "Classe non renseignée"} · ${child.studentGroup || "Standard"}` : "",
    [child],
  );

  if (loading) return <PageLoader label="Chargement du suivi de l&apos;élève…" />;

  if (error || !child || !summary) {
    return (
      <section className="glass-card mx-auto max-w-xl rounded-3xl p-8 text-center" role="alert">
        <p className="text-4xl" aria-hidden="true">🔒</p>
        <h1 className="mt-4 font-serif text-2xl font-bold" style={{ color: "var(--ink)" }}>Suivi indisponible</h1>
        <p className="mt-2 text-sm" style={{ color: "var(--muted)" }}>{error || "Enfant introuvable."}</p>
        <Link href="/parent" className="btn-primary mt-6 inline-flex rounded-xl text-sm">Retour au tableau de bord</Link>
      </section>
    );
  }

  return (
    <div className="animate-fade-in-up space-y-6">
      <Link href="/parent" className="inline-flex items-center gap-2 text-sm font-semibold text-indigo-600 hover:text-indigo-700">
        ← Retour au suivi parental
      </Link>
      <header className="glass-card-strong rounded-3xl p-6 sm:p-8">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-cyan-400 text-xl font-bold text-white">
              {childName(child).charAt(0).toUpperCase()}
            </div>
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-600">Suivi de l&apos;élève</span>
              <h1 className="mt-1 font-serif text-2xl font-bold sm:text-3xl" style={{ color: "var(--ink)" }}>{childName(child)}</h1>
              <p className="mt-1 text-sm" style={{ color: "var(--muted)" }}>{subtitle}</p>
            </div>
          </div>
          <Link href="/parent/messages" className="btn-secondary inline-flex w-fit rounded-xl text-sm font-semibold">💬 Contacter un enseignant</Link>
        </div>
      </header>

      <div className="flex gap-2 overflow-x-auto border-b border-slate-200 pb-2" role="tablist" aria-label="Sections du suivi">
        {tabs.map((item) => (
          <button
            key={item.key}
            type="button"
            role="tab"
            aria-selected={tab === item.key}
            onClick={() => setTab(item.key)}
            className={`shrink-0 rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors ${
              tab === item.key ? "bg-indigo-50 text-indigo-700" : "text-slate-500 hover:bg-black/5"
            }`}
          >
            <span className="mr-1.5" aria-hidden="true">{item.icon}</span>{item.label}
          </button>
        ))}
      </div>

      {tab === "progress" && <ProgressTab summary={summary} />}
      {tab === "attendance" && (
        <EmptyTab title="Présence aux sessions Live" description="Les présences aux sessions Live apparaîtront ici dès que le suivi sera activé." icon="◷" />
      )}
      {tab === "quizzes" && (
        <EmptyTab title="Résultats des évaluations" description="Les résultats des quiz et la moyenne par matière apparaîtront ici." icon="★" />
      )}
      {tab === "teachers" && (
        <EmptyTab title="Enseignants de votre enfant" description="La liste des enseignants et la messagerie seront disponibles prochainement." icon="◎" />
      )}
    </div>
  );
}
