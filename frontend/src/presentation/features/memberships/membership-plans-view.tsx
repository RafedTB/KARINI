"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import type { MembershipPlan } from "@/domain/entities/membership-plan";
import { MembershipType, UserType } from "@/domain/enums";
import { membershipsService } from "@/application/services/memberships-service";
import { Button } from "@/presentation/components/ui/button";
import { PageLoader } from "@/presentation/components/ui/page-loader";
import { useAuth } from "@/presentation/providers/auth-provider";

const tierMeta: Record<string, {
  label: string;
  badge: string;
  tagline: string;
  periodLabel: string;
  periodSuffix: string;
  billingNote: string;
  color: string;
  bg: string;
  border: string;
  gradient: string;
  icon: string;
  features: string[];
}> = {
  [MembershipType.DEFAULT]: {
    label: "Standard",
    badge: "Gratuit",
    tagline: "L'essentiel pour démarrer l'apprentissage",
    periodLabel: "Mensuel (Inclus)",
    periodSuffix: "/ mois",
    billingNote: "Accès automatique mensuel inclus à l'inscription",
    color: "var(--muted)",
    bg: "rgba(15, 23, 42, 0.03)",
    border: "var(--line)",
    gradient: "linear-gradient(135deg, rgba(100, 116, 139, 0.08), rgba(100, 116, 139, 0.02))",
    icon: "📚",
    features: [
      "Abonnement mensuel de base inclus",
      "Accès aux cours standards ouverts",
      "Exercices d'entraînement basiques",
      "Téléchargement des magazines publics",
      "Suivi de progression personnel",
    ],
  },
  [MembershipType.SILVER]: {
    label: "Silver",
    badge: "Abonnement Mensuel",
    tagline: "Pour consolider vos révisions au mois le mois",
    periodLabel: "Abonnement Mensuel",
    periodSuffix: "/ mois",
    billingNote: "Renouvellement mensuel (30 jours) via solde de crédits",
    color: "var(--silver)",
    bg: "var(--silver-soft)",
    border: "rgba(71, 85, 105, 0.25)",
    gradient: "linear-gradient(135deg, rgba(71, 85, 105, 0.1), rgba(71, 85, 105, 0.02))",
    icon: "🥈",
    features: [
      "Abonnement mensuel (30 jours de validité)",
      "Accès complet aux cours vidéo & leçons",
      "Séries d'exercices d'entraînement et corrigés",
      "Téléchargement et lecture des magazines PDF",
      "Suivi de progression personnel",
    ],
  },
  [MembershipType.GOLD]: {
    label: "Gold",
    badge: "Abonnement Mensuel",
    tagline: "La formule d'excellence avec accès aux archives des directs",
    periodLabel: "Abonnement Mensuel",
    periodSuffix: "/ mois",
    billingNote: "Renouvellement mensuel (30 jours) via solde de crédits",
    color: "var(--gold)",
    bg: "var(--gold-soft)",
    border: "rgba(217, 119, 6, 0.3)",
    gradient: "linear-gradient(135deg, rgba(217, 119, 6, 0.12), rgba(245, 158, 11, 0.04))",
    icon: "⭐",
    features: [
      "Abonnement mensuel (30 jours de validité)",
      "Tout ce qui est inclus dans Silver (cours vidéo, exercices, magazines)",
      "⭐ Exclusivité totale : Accès complet aux Archives des directs (Live Archive)",
      "Contenus et exercices exclusifs Karini",
      "Téléchargement illimité de tous les magazines",
    ],
  },
  [MembershipType.PLATINUM]: {
    label: "Platinum",
    badge: "Souscription Annuelle (Fin au 15 Juin)",
    tagline: "L'expérience pédagogique totale valable pour l'année scolaire (jusqu'au 15 juin)",
    periodLabel: "Abonnement Annuel (Fin au 15 Juin)",
    periodSuffix: "/ an",
    billingNote: "Souscription annuelle scolaire — Valable jusqu'au 15 juin (fin d'année)",
    color: "var(--platinum)",
    bg: "var(--platinum-soft)",
    border: "rgba(37, 99, 235, 0.3)",
    gradient: "linear-gradient(135deg, rgba(37, 99, 235, 0.12), rgba(99, 102, 241, 0.05))",
    icon: "💎",
    features: [
      "Souscription annuelle scolaire (se termine le 15 juin)",
      "💎 Exclusivité totale : Calendrier des Sessions Live en temps réel",
      "Séances directes interactives avec les meilleurs professeurs",
      "Accès illimité aux cours vidéo, exercices et magazines PDF",
      "Certificats officiels de validation d'acquis",
      "Accès anticipé à toutes les nouveautés",
    ],
  },
};

export function MembershipPlansView() {
  const { token, user, refreshUser } = useAuth();
  const [plans, setPlans] = useState<MembershipPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyPlan, setBusyPlan] = useState<string | null>(null);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [fetchError, setFetchError] = useState<string | null>(null);

  const fetchPlans = useCallback(async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const data = await membershipsService.listPlans(token || undefined);
      if (Array.isArray(data) && data.length > 0) {
        const order = [
          MembershipType.DEFAULT,
          MembershipType.SILVER,
          MembershipType.GOLD,
          MembershipType.PLATINUM,
        ];
        const sorted = [...data].sort((a, b) => {
          const indexA = order.indexOf(a.membership as MembershipType);
          const indexB = order.indexOf(b.membership as MembershipType);
          return (indexA === -1 ? 99 : indexA) - (indexB === -1 ? 99 : indexB);
        });
        setPlans(sorted);
      } else {
        setPlans([]);
      }
    } catch (err) {
      console.error("Failed to load membership plans from DB:", err);
      setFetchError("Impossible de charger les tarifs des formules depuis la base de données. Veuillez vérifier la connexion au serveur.");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchPlans();
  }, [fetchPlans]);

  async function purchase(membership: string) {
    if (!token) return;
    setBusyPlan(membership);
    setError("");
    setNotice("");
    try {
      const result = await membershipsService.purchase(token, membership);
      await refreshUser();
      const isYearly = membership === MembershipType.PLATINUM;
      setNotice(
        `Félicitations ! Vous avez activé votre ${
          isYearly ? "souscription annuelle (valable jusqu'au 15 juin)" : "abonnement mensuel"
        } ${result.membership.toUpperCase()} ! 🎉`
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Échec de l'activation du forfait.");
    } finally {
      setBusyPlan(null);
    }
  }

  const isStudent = user?.userType === UserType.STUDENT;

  if (loading) return <PageLoader label="Chargement des formules d'abonnement…" />;

  return (
    <div className="space-y-8">
      {/* 1. Header Banner based on auth state */}
      {!user ? (
        <div className="glass-card p-5 sm:p-6 rounded-3xl border border-amber-200/70 bg-gradient-to-r from-amber-50/70 via-orange-50/40 to-yellow-50/50 shadow-sm animate-fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500 text-white text-xl shadow-xs shrink-0">
                ✨
              </div>
              <div>
                <h2 className="font-serif text-lg font-bold text-slate-900">
                  Formules Mensuelles & Souscription Annuelle Platinum (Fin au 15 Juin)
                </h2>
                <p className="text-xs text-slate-600 mt-0.5 max-w-xl leading-relaxed">
                  Les formules Standard, Silver et Gold sont des abonnements <strong>mensuels</strong>. La formule d&apos;excellence <strong>Platinum</strong> est une souscription <strong>annuelle scolaire se terminant le 15 juin</strong>, incluant l&apos;accès complet aux séances en direct (Live).
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
              <Link href="/login" className="btn-secondary text-xs py-2 px-4">
                Se connecter
              </Link>
              <Link href="/register" className="btn-primary text-xs py-2 px-4 shadow-sm">
                Créer un compte
              </Link>
            </div>
          </div>
        </div>
      ) : !isStudent ? (
        <div className="glass-card p-6 rounded-3xl border border-indigo-200 bg-gradient-to-r from-indigo-50/80 via-purple-50/50 to-pink-50/40 animate-fade-in shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-600 text-white text-xl shadow-sm shrink-0">
                {user.userType === UserType.SUPERADMIN ? "👑" : user.userType === UserType.MODERATOR ? "🛡️" : "👨‍🏫"}
              </div>
              <div>
                <h2 className="font-serif text-lg font-bold text-slate-900">
                  Accès Professionnel Illimité ({user.userType.toUpperCase()})
                </h2>
                <p className="text-xs text-slate-600 mt-0.5 max-w-xl leading-relaxed">
                  Les abonnements mensuels et annuels sont réservés aux comptes élèves. En tant que {user.userType}, vous disposez déjà d&apos;un accès permanent et sans restriction à tous les cours, leçons, exercices et archives en direct de Karini.
                </p>
              </div>
            </div>
            <Link
              href={user.userType === UserType.SUPERADMIN ? "/admin" : user.userType === UserType.MODERATOR ? "/moderator" : "/teacher"}
              className="btn-primary text-xs font-bold rounded-xl whitespace-nowrap self-start sm:self-auto shadow-sm"
            >
              {user.userType === UserType.SUPERADMIN ? "Ouvrir Panneau Admin →" : user.userType === UserType.MODERATOR ? "Ouvrir Gestion Modérateur →" : "Ouvrir Studio Enseignant →"}
            </Link>
          </div>
        </div>
      ) : (
        <div className="glass-card flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between animate-fade-in rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center gap-3.5">
            <div
              className="flex h-12 w-12 items-center justify-center rounded-2xl text-xl shadow-xs shrink-0"
              style={{
                background: tierMeta[user.membership]?.bg ?? "var(--accent-glow)",
                border: `1px solid ${tierMeta[user.membership]?.border ?? "var(--line)"}`,
              }}
            >
              {tierMeta[user.membership]?.icon ?? "📚"}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500">Votre formule actuelle :</span>
                <span
                  className="font-serif font-bold text-base"
                  style={{ color: tierMeta[user.membership]?.color ?? "var(--ink)" }}
                >
                  {tierMeta[user.membership]?.label ?? user.membership}
                </span>
                <span className="badge badge-accent text-[10px]">
                  {user.membership === MembershipType.PLATINUM ? "Souscription Scolaire (Fin au 15 Juin)" : "Abonnement Mensuel"}
                </span>
              </div>
              <p className="text-xs text-slate-600 mt-1">
                Solde de crédits : <strong className="text-indigo-600 font-bold text-sm">{user.credits}</strong> crédits disponibles
              </p>
              {user.membershipExpiresAt && (
                <p className="text-xs text-emerald-700 mt-1 font-medium">
                  Validité active jusqu&apos;au{" "}
                  <strong>
                    {new Date(user.membershipExpiresAt).toLocaleDateString("fr-FR", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </strong>{" "}
                  ({user.membership === MembershipType.PLATINUM ? "Fin au 15 Juin" : "Renouvellement Mensuel"})
                </p>
              )}
            </div>
          </div>
          <div className="text-xs text-slate-500 max-w-xs text-right hidden sm:block">
            {user.membership === MembershipType.PLATINUM
              ? "Vous bénéficiez du pass annuel complet avec accès illimité aux cours et directs."
              : "Passez à Platinum pour transformer votre accès en souscription annuelle avec lives inclus."}
          </div>
        </div>
      )}

      {/* Alerts */}
      {notice ? (
        <div className="alert-success p-4 rounded-2xl border border-emerald-200 bg-emerald-50 text-emerald-800 text-sm flex items-center justify-between gap-3 animate-fade-in" role="status">
          <span>{notice}</span>
          <button
            type="button"
            onClick={() => setNotice("")}
            className="text-emerald-600 hover:text-emerald-900 font-bold text-xs"
          >
            Fermer ✕
          </button>
        </div>
      ) : null}

      {error ? (
        <div className="alert-error p-4 rounded-2xl border border-rose-200 bg-rose-50 text-rose-800 text-sm flex items-center justify-between gap-3 animate-fade-in" role="alert">
          <span>{error}</span>
          <button
            type="button"
            onClick={() => setError("")}
            className="text-rose-600 hover:text-rose-900 font-bold text-xs"
          >
            Fermer ✕
          </button>
        </div>
      ) : null}

      {fetchError ? (
        <div className="alert-error p-5 rounded-2xl border border-rose-300 bg-rose-50/90 text-rose-900 text-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 animate-fade-in" role="alert">
          <div>
            <p className="font-bold">Erreur de chargement</p>
            <p className="text-xs text-rose-700 mt-0.5">{fetchError}</p>
          </div>
          <button
            type="button"
            onClick={() => fetchPlans()}
            className="btn-primary text-xs py-2 px-4 whitespace-nowrap self-start sm:self-auto"
          >
            🔄 Réessayer
          </button>
        </div>
      ) : null}

      {/* Plans grid */}
      {!fetchError && plans.length === 0 ? (
        <div className="glass-card p-8 rounded-3xl text-center border border-dashed border-slate-300">
          <p className="text-sm font-semibold text-slate-700">Aucun tarif configuré</p>
          <p className="text-xs text-slate-500 mt-1">
            Les tarifs des formules d&apos;adhésion sont en cours de synchronisation avec la base de données.
          </p>
          <button
            type="button"
            onClick={() => fetchPlans()}
            className="btn-secondary text-xs mt-4 py-2 px-4"
          >
            Actualiser
          </button>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {plans.map((plan, i) => {
          const isCurrent = user?.membership === plan.membership;
          const isDefault = plan.membership === MembershipType.DEFAULT;
          const isPlatinumTier = plan.membership === MembershipType.PLATINUM;
          const meta = tierMeta[plan.membership] ?? tierMeta[MembershipType.DEFAULT];
          const hasEnoughCredits = user ? user.credits >= plan.priceCredits : false;

          return (
            <article
              key={plan.id ?? plan.membership}
              className={`relative flex flex-col rounded-3xl p-6 transition-all duration-300 animate-fade-in-up stagger-${i + 1}`}
              style={{
                background: isCurrent ? meta.gradient : "var(--glass)",
                border: `1.5px solid ${isCurrent ? meta.border : isPlatinumTier ? "rgba(37, 99, 235, 0.4)" : "var(--line)"}`,
                boxShadow: isCurrent
                  ? "0 12px 30px -10px rgba(99, 102, 241, 0.2)"
                  : isPlatinumTier
                  ? "0 10px 25px -10px rgba(37, 99, 235, 0.15)"
                  : "var(--card-shadow)",
                backdropFilter: "blur(20px)",
                transform: isCurrent ? "translateY(-4px)" : "none",
              }}
            >
              {/* Top Badge */}
              <div className="flex items-center justify-between gap-2 mb-3">
                <span
                  className="rounded-full px-2.5 py-0.5 text-[11px] font-semibold tracking-wide"
                  style={{
                    background: `${meta.color}18`,
                    color: meta.color,
                    border: `1px solid ${meta.border}`,
                  }}
                >
                  {meta.badge}
                </span>

                {isCurrent && (
                  <span
                    className="badge text-[10px] font-bold"
                    style={{
                      background: "var(--paper-card)",
                      borderColor: meta.border,
                      color: meta.color,
                    }}
                  >
                    Formule active
                  </span>
                )}
              </div>

              {/* Title & Icon */}
              <div className="flex items-center gap-2.5 mt-1">
                <span className="text-2xl">{meta.icon}</span>
                <div>
                  <h3 className="font-serif text-xl font-bold text-slate-900">
                    {meta.label}
                  </h3>
                </div>
              </div>

              <p className="mt-2 text-xs text-slate-500 min-h-[32px] leading-relaxed">
                {meta.tagline}
              </p>

              {/* Price & Billing Period */}
              <div className="mt-4 pt-4 border-t border-slate-100">
                <div className="flex items-baseline gap-1.5">
                  <span className="font-serif text-3xl font-bold" style={{ color: "var(--ink)" }}>
                    {plan.priceCredits}
                  </span>
                  <span className="text-xs uppercase tracking-wider font-semibold text-slate-500">
                    {plan.priceCredits === 0 ? "crédit" : "crédits"}{" "}
                    <span className="text-indigo-600 font-bold lowercase">
                      {isPlatinumTier ? "/ an" : "/ mois"}
                    </span>
                  </span>
                </div>

                {/* Duration Badge */}
                <div className="mt-1.5 flex items-center gap-1.5">
                  <span
                    className={`inline-block rounded-md px-2 py-0.5 text-[10px] font-bold ${
                      isPlatinumTier
                        ? "bg-indigo-100 text-indigo-800 border border-indigo-200"
                        : "bg-slate-100 text-slate-600 border border-slate-200"
                    }`}
                  >
                    {isPlatinumTier ? "📅 Souscription Annuelle (Fin au 15 Juin)" : "🗓️ Abonnement Mensuel"}
                  </span>
                </div>

                <p className="text-[11px] text-slate-400 mt-1">
                  {meta.billingNote}
                </p>
              </div>

              {/* Features list */}
              <div className="mt-6 flex-1 space-y-3">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Ce qui est inclus :
                </p>
                <ul className="space-y-2.5">
                  {meta.features.map((f) => (
                    <li key={f} className="flex items-start gap-2.5 text-xs text-slate-700 leading-snug">
                      <svg
                        width="15"
                        height="15"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke={meta.color}
                        strokeWidth="2.5"
                        className="mt-0.5 shrink-0"
                      >
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Call to action button */}
              <div className="mt-6 pt-4 border-t border-slate-100">
                {!user ? (
                  isDefault ? (
                    <Link
                      href="/register"
                      className="btn-secondary block w-full text-center text-xs py-2.5 font-bold rounded-xl"
                    >
                      Commencer gratuitement
                    </Link>
                  ) : (
                    <Link
                      href="/login"
                      className="btn-primary block w-full text-center text-xs py-2.5 font-bold rounded-xl shadow-xs"
                    >
                      {isPlatinumTier ? "Souscrire pour 1 An" : "S'abonner au mois"}
                    </Link>
                  )
                ) : !isStudent ? (
                  <Button
                    type="button"
                    variant="ghost"
                    className="w-full text-xs text-slate-400 cursor-not-allowed bg-slate-50 border border-slate-200 rounded-xl"
                    disabled
                  >
                    Accès permanent inclus
                  </Button>
                ) : isCurrent ? (
                  <div
                    className="block w-full rounded-xl py-2.5 text-center text-xs font-bold border"
                    style={{
                      color: meta.color,
                      background: `${meta.color}15`,
                      borderColor: `${meta.color}35`,
                    }}
                  >
                    ✓ Votre formule active
                  </div>
                ) : isDefault ? (
                  <Button
                    type="button"
                    variant="ghost"
                    className="w-full text-xs text-slate-400 cursor-not-allowed bg-slate-50 rounded-xl"
                    disabled
                  >
                    Inclus d&apos;office
                  </Button>
                ) : (
                  <Button
                    type="button"
                    variant={hasEnoughCredits ? "primary" : "secondary"}
                    className="w-full text-xs font-bold rounded-xl shadow-xs"
                    disabled={busyPlan !== null}
                    onClick={() => {
                      if (!hasEnoughCredits) {
                        setError(
                          `Crédits insuffisants : vous avez ${user.credits} crédits, or la formule ${meta.label} (${
                            isPlatinumTier ? "Annuelle" : "Mensuelle"
                          }) requiert ${plan.priceCredits} crédits.`
                        );
                        return;
                      }
                      purchase(plan.membership);
                    }}
                  >
                    {busyPlan === plan.membership
                      ? "Activation en cours…"
                      : isPlatinumTier
                      ? `Souscrire jusqu'au 15 Juin (${plan.priceCredits} cr.)`
                      : `S'abonner 1 Mois (${plan.priceCredits} cr.)`}
                  </Button>
                )}
              </div>
            </article>
          );
        })}
      </div>
      )}

      {/* 2. Platform Perks & FAQ Section */}
      <section className="glass-card p-7 sm:p-8 rounded-3xl border border-slate-200/80 mt-12">
        <h2 className="font-serif text-xl sm:text-2xl font-bold text-slate-900">
          Questions fréquentes sur les <span className="gradient-text">durées d&apos;abonnement</span>
        </h2>
        <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-2xl p-5 bg-slate-50/70 border border-slate-100">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <span className="text-base">📅</span> Quelle est la durée de validité des forfaits ?
            </h3>
            <p className="mt-2 text-xs text-slate-600 leading-relaxed">
              Les formules <strong>Standard, Silver et Gold</strong> sont des forfaits <strong>mensuels</strong> (validité de 30 jours renouvelable). La formule <strong>Platinum</strong> est une souscription annuelle pour l&apos;année scolaire qui <strong>prend fin le 15 juin</strong> (clôture des examens du Bac).
            </p>
          </div>

          <div className="rounded-2xl p-5 bg-slate-50/70 border border-slate-100">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <span className="text-base">💎</span> Pourquoi Platinum se termine le 15 juin ?
            </h3>
            <p className="mt-2 text-xs text-slate-600 leading-relaxed">
              Le pass Platinum est structuré pour l&apos;année scolaire complète jusqu&apos;aux épreuves finales du Baccalauréat fixées au 15 juin. Peu importe le moment de l&apos;inscription durant l&apos;année, il garantit l&apos;accès continu aux Live et cours jusqu&apos;au 15 juin.
            </p>
          </div>

          <div className="rounded-2xl p-5 bg-slate-50/70 border border-slate-100">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <span className="text-base">💳</span> Comment fonctionne le renouvellement ?
            </h3>
            <p className="mt-2 text-xs text-slate-600 leading-relaxed">
              L&apos;activation se fait en un clic via votre solde de crédits d&apos;apprentissage. Pour Platinum, la souscription reste active sans interruption jusqu&apos;au 15 juin de l&apos;année scolaire en cours.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
