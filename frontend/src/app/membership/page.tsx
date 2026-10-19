import { RequireAuth } from "@/presentation/components/auth/require-auth";
import { MembershipPlansView } from "@/presentation/features/memberships/membership-plans-view";

export default function MembershipPage() {
  return (
    <RequireAuth>
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">Membership</p>
        <h1 className="mt-2 font-serif text-3xl">Choose your plan</h1>
        <p className="mt-2 max-w-2xl text-sm text-[var(--muted)]">
          Students purchase tiers with credits. Gold and platinum unlock live archive content.
        </p>
        <div className="mt-8">
          <MembershipPlansView />
        </div>
      </div>
    </RequireAuth>
  );
}
