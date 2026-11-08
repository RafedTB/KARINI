import { MembershipPlansView } from "@/presentation/features/memberships/membership-plans-view";

export default function MembershipPage() {
  return (
    <div className="animate-fade-in-up">
      <div className="max-w-3xl">
        <p
          className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs uppercase tracking-[0.2em] font-medium"
          style={{
            color: "var(--gold)",
            background: "var(--gold-soft)",
            border: "1px solid rgba(217, 119, 6, 0.25)",
          }}
        >
          Formules d&apos;adhésion & Crédits
        </p>
        <h1 className="mt-4 font-serif text-3xl md:text-4xl" style={{ color: "var(--ink)" }}>
          Choisissez votre <span className="gradient-text-warm">formule Karini</span>
        </h1>
        <p className="mt-2 text-sm leading-relaxed" style={{ color: "var(--muted)" }}>
          Accédez aux cours premium, leçons vidéo, exercices interactifs corrigés et archives en direct grâce à vos crédits d&apos;apprentissage.
        </p>
      </div>

      <div className="mt-8">
        <MembershipPlansView />
      </div>
    </div>
  );
}
