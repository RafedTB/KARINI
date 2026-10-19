import Link from "next/link";
import { env } from "@/infrastructure/config/env";

const highlights = [
  {
    title: "Courses & exercises",
    copy: "Structured video lessons and practice material for students, instructors, and admins.",
  },
  {
    title: "Magazine library",
    copy: "PDF magazines open securely through authenticated downloads from the NestJS backend.",
  },
  {
    title: "Membership tiers",
    copy: "Silver, gold, and platinum unlock deeper access — including live archives for top tiers.",
  },
];

export default function HomePage() {
  return (
    <div>
      <section className="grid gap-10 lg:grid-cols-[1.2fr_0.8fr] lg:items-end">
        <div>
          <p className="text-xs uppercase tracking-[0.22em] text-[var(--muted)]">Karini e-learning</p>
          <h1 className="mt-3 max-w-2xl font-serif text-4xl leading-tight md:text-5xl">
            Learn with clarity across courses, practice, and membership.
          </h1>
          <p className="mt-4 max-w-xl text-[var(--muted)]">
            This frontend mirrors your first backend sprint: authentication, course library, and credit-based
            memberships — organized with clean, layered architecture.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/library"
              className="rounded-full bg-[var(--ink)] px-5 py-2.5 text-sm text-[var(--paper)]"
            >
              Open library
            </Link>
            <Link
              href="/membership"
              className="rounded-full border border-[var(--line)] bg-white/50 px-5 py-2.5 text-sm"
            >
              View membership
            </Link>
          </div>
          <p className="mt-6 text-xs text-[var(--muted)]">
            API: {env.apiUrl.replace(/^https?:\/\//, "")}
          </p>
        </div>

        <div className="rounded-3xl border border-[var(--line)] bg-white/50 p-6">
          <p className="text-xs uppercase tracking-[0.16em] text-[var(--muted)]">Sprint scope</p>
          <ul className="mt-4 space-y-3 text-sm">
            <li>Register, verify, login, and load the current user</li>
            <li>Browse courses filtered by membership (e.g. live archive gating)</li>
            <li>List plans and purchase membership with credits</li>
          </ul>
        </div>
      </section>

      <section className="mt-16 grid gap-5 md:grid-cols-3">
        {highlights.map((item) => (
          <article key={item.title} className="rounded-2xl border border-[var(--line)] bg-white/40 p-5">
            <h2 className="font-serif text-xl">{item.title}</h2>
            <p className="mt-2 text-sm text-[var(--muted)]">{item.copy}</p>
          </article>
        ))}
      </section>
    </div>
  );
}
