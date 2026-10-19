"use client";

import { useEffect, useState } from "react";
import type { MembershipPlan } from "@/domain/entities/membership-plan";
import { MembershipType } from "@/domain/enums";
import { membershipsService } from "@/application/services/memberships-service";
import { Button } from "@/presentation/components/ui/button";
import { PageLoader } from "@/presentation/components/ui/page-loader";
import { useAuth } from "@/presentation/providers/auth-provider";

const tierMeta: Record<string, {
  label: string;
  color: string;
  bg: string;
  border: string;
  gradient: string;
  features: string[];
}> = {
  [MembershipType.DEFAULT]: {
    label: "Free",
    color: "var(--muted)",
    bg: "rgba(15, 23, 42, 0.03)",
    border: "var(--line)",
    gradient: "linear-gradient(135deg, rgba(100, 116, 139, 0.07), rgba(100, 116, 139, 0.02))",
    features: ["Standard courses", "Exercises", "Magazine downloads"],
  },
  [MembershipType.SILVER]: {
    label: "Silver",
    color: "var(--silver)",
    bg: "var(--silver-soft)",
    border: "rgba(71, 85, 105, 0.2)",
    gradient: "linear-gradient(135deg, rgba(71, 85, 105, 0.08), rgba(71, 85, 105, 0.02))",
    features: ["Everything in Free", "Priority content access", "Early exercise releases"],
  },
  [MembershipType.GOLD]: {
    label: "Gold",
    color: "var(--gold)",
    bg: "var(--gold-soft)",
    border: "rgba(217, 119, 6, 0.25)",
    gradient: "linear-gradient(135deg, rgba(217, 119, 6, 0.1), rgba(245, 158, 11, 0.03))",
    features: ["Everything in Silver", "Live archive access", "Exclusive content"],
  },
  [MembershipType.PLATINUM]: {
    label: "Platinum",
    color: "var(--platinum)",
    bg: "var(--platinum-soft)",
    border: "rgba(37, 99, 235, 0.25)",
    gradient: "linear-gradient(135deg, rgba(37, 99, 235, 0.1), rgba(99, 102, 241, 0.04))",
    features: ["Everything in Gold", "Full live archive", "Premium support", "Early feature access"],
  },
};

export function MembershipPlansView() {
  const { token, user, refreshUser } = useAuth();
  const [plans, setPlans] = useState<MembershipPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyPlan, setBusyPlan] = useState<string | null>(null);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) return;
    membershipsService
      .listPlans(token)
      .then(setPlans)
      .catch((err) => setError(err instanceof Error ? err.message : "Could not load plans."))
      .finally(() => setLoading(false));
  }, [token]);

  async function purchase(membership: string) {
    if (!token) return;
    setBusyPlan(membership);
    setError("");
    setNotice("");
    try {
      const result = await membershipsService.purchase(token, membership);
      await refreshUser();
      setNotice(`You are now on the ${result.membership} plan! 🎉`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Purchase failed.");
    } finally {
      setBusyPlan(null);
    }
  }

  if (loading) return <PageLoader label="Loading membership plans…" />;

  return (
    <div>
      {/* Current plan info */}
      {user ? (
        <div
          className="glass-card mb-8 flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between animate-fade-in"
        >
          <div className="flex items-center gap-3">
            <div
              className="flex h-10 w-10 items-center justify-center rounded-xl text-lg"
              style={{
                background: tierMeta[user.membership]?.bg ?? "var(--accent-glow)",
                border: `1px solid ${tierMeta[user.membership]?.border ?? "var(--line)"}`,
              }}
            >
              {user.membership === MembershipType.PLATINUM ? "💎" :
               user.membership === MembershipType.GOLD ? "⭐" :
               user.membership === MembershipType.SILVER ? "🥈" : "📚"}
            </div>
            <div>
              <p className="text-sm font-medium" style={{ color: "var(--ink)" }}>
                Current plan: <span style={{ color: tierMeta[user.membership]?.color ?? "var(--ink)" }}>
                  {tierMeta[user.membership]?.label ?? user.membership}
                </span>
              </p>
              <p className="text-xs" style={{ color: "var(--muted)" }}>
                {user.credits} credits available
              </p>
            </div>
          </div>
          <span className="badge badge-accent">
            Active
          </span>
        </div>
      ) : null}

      {/* Alerts */}
      {notice ? (
        <p className="alert-success mb-6 animate-fade-in" role="status">{notice}</p>
      ) : null}
      {error ? (
        <p className="alert-error mb-6 animate-fade-in" role="alert">{error}</p>
      ) : null}

      {/* Plans grid */}
      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
        {plans.map((plan, i) => {
          const isCurrent = user?.membership === plan.membership;
          const isDefault = plan.membership === MembershipType.DEFAULT;
          const meta = tierMeta[plan.membership] ?? tierMeta[MembershipType.DEFAULT];

          return (
            <article
              key={plan.id}
              className={`relative flex flex-col rounded-[20px] p-6 transition-all duration-300 animate-fade-in-up stagger-${i + 1}`}
              style={{
                background: isCurrent ? meta.gradient : "var(--glass)",
                border: `1px solid ${isCurrent ? meta.border : "var(--line)"}`,
                boxShadow: "var(--card-shadow)",
                backdropFilter: "blur(24px)",
                transform: isCurrent ? "scale(1.02)" : "scale(1)",
              }}
              onMouseEnter={(e) => {
                if (!isCurrent) {
                  (e.currentTarget as HTMLElement).style.borderColor = meta.border;
                  (e.currentTarget as HTMLElement).style.transform = "translateY(-4px)";
                }
              }}
              onMouseLeave={(e) => {
                if (!isCurrent) {
                  (e.currentTarget as HTMLElement).style.borderColor = "var(--line)";
                  (e.currentTarget as HTMLElement).style.transform = "translateY(0)";
                }
              }}
            >
              {/* Current badge */}
              {isCurrent && (
                <span
                  className="absolute -top-3 left-1/2 -translate-x-1/2 badge"
                  style={{
                    background: "var(--paper-card)",
                    borderColor: meta.border,
                    color: meta.color,
                    fontSize: "0.7rem",
                  }}
                >
                  Current plan
                </span>
              )}

              {/* Tier name */}
              <p
                className="text-xs font-semibold uppercase tracking-[0.18em]"
                style={{ color: meta.color }}
              >
                {meta.label}
              </p>

              {/* Price */}
              <h3 className="mt-4 font-serif text-4xl" style={{ color: "var(--ink)" }}>
                {plan.priceCredits}
                <span className="ml-1 text-base font-sans font-normal" style={{ color: "var(--muted)" }}>
                  credits
                </span>
              </h3>

              {/* Features */}
              <ul className="mt-5 flex-1 space-y-2.5">
                {meta.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm" style={{ color: "var(--ink-soft)" }}>
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke={meta.color}
                      strokeWidth="2.5"
                      className="mt-0.5 shrink-0"
                    >
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    {f}
                  </li>
                ))}
              </ul>

              {/* Button */}
              <div className="mt-6">
                {isCurrent ? (
                  <span
                    className="block w-full rounded-xl py-2.5 text-center text-sm font-medium"
                    style={{ color: meta.color, background: `${meta.color}15` }}
                  >
                    ✓ Active
                  </span>
                ) : (
                  <Button
                    type="button"
                    variant={isDefault ? "ghost" : "secondary"}
                    className="w-full"
                    disabled={isDefault || busyPlan !== null}
                    onClick={() => purchase(plan.membership)}
                  >
                    {isDefault
                      ? "Included"
                      : busyPlan === plan.membership
                        ? "Processing…"
                        : `Upgrade to ${meta.label}`}
                  </Button>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
