import { RequireAuth } from "@/presentation/components/auth/require-auth";
import { MembershipPlansView } from "@/presentation/features/memberships/membership-plans-view";

export default function MembershipPage() {
  return (
    <RequireAuth>
      <div className="animate-fade-in-up">
        <p
          className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs uppercase tracking-[0.2em]"
          style={{
            color: "var(--gold)",
            background: "var(--gold-soft)",
            border: "1px solid rgba(217, 119, 6, 0.25)",
          }}
        >
          Membership
        </p>
        <h1 className="mt-4 font-serif text-3xl md:text-4xl" style={{ color: "var(--ink)" }}>
          Choose your <span className="gradient-text-warm">plan</span>
        </h1>
        <p className="mt-2 max-w-2xl text-sm" style={{ color: "var(--muted)" }}>
          Upgrade with credits to unlock premium content. Gold and platinum tiers include full live archive access.
        </p>
        <div className="mt-8">
          <MembershipPlansView />
        </div>
      </div>
    </RequireAuth>
  );
}
