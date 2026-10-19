"use client";

import { useEffect, useState } from "react";
import type { MembershipPlan } from "@/domain/entities/membership-plan";
import { MembershipType } from "@/domain/enums";
import { membershipsService } from "@/application/services/memberships-service";
import { Button } from "@/presentation/components/ui/button";
import { PageLoader } from "@/presentation/components/ui/page-loader";
import { useAuth } from "@/presentation/providers/auth-provider";

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
      setNotice(`You are now on the ${result.membership} plan.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Purchase failed.");
    } finally {
      setBusyPlan(null);
    }
  }

  if (loading) return <PageLoader label="Loading membership plans…" />;

  return (
    <div>
      {user ? (
        <p className="mb-6 text-sm text-[var(--muted)]">
          Current plan: <strong className="text-[var(--ink)]">{user.membership}</strong> ·{" "}
          {user.credits} credits available
        </p>
      ) : null}

      {notice ? (
        <p className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800" role="status">
          {notice}
        </p>
      ) : null}
      {error ? (
        <p className="mb-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
          {error}
        </p>
      ) : null}

      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
        {plans.map((plan) => {
          const isCurrent = user?.membership === plan.membership;
          const isDefault = plan.membership === MembershipType.DEFAULT;

          return (
            <article
              key={plan.id}
              className={`rounded-2xl border p-5 ${isCurrent ? "border-[var(--ink)] bg-white" : "border-[var(--line)] bg-white/60"}`}
            >
              <p className="text-xs uppercase tracking-[0.16em] text-[var(--muted)]">{plan.membership}</p>
              <h3 className="mt-3 font-serif text-3xl">
                {plan.priceCredits}
                <span className="text-base font-sans text-[var(--muted)]"> credits</span>
              </h3>
              <p className="mt-3 text-sm text-[var(--muted)]">
                {plan.membership === MembershipType.GOLD || plan.membership === MembershipType.PLATINUM
                  ? "Includes live archive access."
                  : "Access to standard learning content."}
              </p>
              <div className="mt-5">
                {isCurrent ? (
                  <span className="text-sm font-medium">Your current plan</span>
                ) : (
                  <Button
                    type="button"
                    variant="secondary"
                    className="w-full"
                    disabled={isDefault || busyPlan !== null}
                    onClick={() => purchase(plan.membership)}
                  >
                    {isDefault ? "Included" : busyPlan === plan.membership ? "Processing…" : "Choose plan"}
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
