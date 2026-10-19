import Link from "next/link";

const highlights = [
  {
    title: "Courses & exercises",
    copy: "Structured video lessons and practice material crafted by expert instructors.",
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="5 3 19 12 5 21 5 3" />
      </svg>
    ),
    gradient: "linear-gradient(135deg, #7c6afc, #4ecdc4)",
  },
  {
    title: "Magazine library",
    copy: "PDF magazines served securely through authenticated downloads.",
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
        <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
      </svg>
    ),
    gradient: "linear-gradient(135deg, #f093fb, #f5576c)",
  },
  {
    title: "Membership tiers",
    copy: "Silver, gold, and platinum unlock deeper access — including live archives.",
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2L15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2z" />
      </svg>
    ),
    gradient: "linear-gradient(135deg, #f5c842, #ff9a44)",
  },
];

const stats = [
  { value: "4", label: "Course types" },
  { value: "3", label: "Membership tiers" },
  { value: "∞", label: "Learning potential" },
];

export default function HomePage() {
  return (
    <div>
      {/* Hero */}
      <section className="relative grid gap-12 lg:grid-cols-[1.3fr_0.7fr] lg:items-center">
        <div className="animate-fade-in-up">
          <p
            className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs uppercase tracking-[0.22em]"
            style={{
              color: "var(--accent)",
              background: "var(--accent-glow)",
              border: "1px solid rgba(99, 102, 241, 0.2)",
            }}
          >
            <span
              className="inline-block h-1.5 w-1.5 rounded-full"
              style={{ background: "var(--accent)" }}
            />
            Karini e-learning
          </p>

          <h1
            className="mt-6 max-w-2xl font-serif text-4xl leading-[1.15] md:text-5xl lg:text-6xl"
            style={{ color: "var(--ink)" }}
          >
            Learn with{" "}
            <span className="gradient-text">clarity</span>{" "}
            across courses, practice & membership.
          </h1>

          <p className="mt-5 max-w-xl text-base leading-relaxed" style={{ color: "var(--muted)" }}>
            Your complete e-learning destination — authentication, course library, credit-based
            memberships, and live archives organized in clean, layered architecture.
          </p>

          <div className="mt-8 flex flex-wrap gap-4">
            <Link href="/library" className="btn-primary">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
                <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
              </svg>
              Open library
            </Link>
            <Link href="/membership" className="btn-secondary">
              View membership →
            </Link>
          </div>

          {/* Stats row */}
          <div className="mt-10 flex gap-8">
            {stats.map((s) => (
              <div key={s.label}>
                <p className="font-serif text-2xl gradient-text">{s.value}</p>
                <p className="text-xs" style={{ color: "var(--muted)" }}>{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Right card */}
        <div className="glass-card p-6 animate-fade-in-up stagger-2">
          <p
            className="flex items-center gap-2 text-xs uppercase tracking-[0.16em]"
            style={{ color: "var(--muted)" }}
          >
            <span
              className="inline-block h-1.5 w-1.5 rounded-full"
              style={{ background: "var(--success)" }}
            />
            Platform features
          </p>
          <ul className="mt-5 space-y-4 text-sm" style={{ color: "var(--ink-soft)" }}>
            {[
              "Register, verify, login and manage your profile",
              "Browse courses filtered by membership tier",
              "Purchase memberships with a credit-based system",
              "Access live archives with Gold or Platinum",
              "Download magazines securely with authentication",
            ].map((item) => (
              <li key={item} className="flex items-start gap-3">
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="var(--accent)"
                  strokeWidth="2.5"
                  className="mt-0.5 shrink-0"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                {item}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Divider */}
      <div className="section-divider my-16" />

      {/* Highlights */}
      <section>
        <p
          className="text-xs uppercase tracking-[0.2em]"
          style={{ color: "var(--muted)" }}
        >
          What&apos;s inside
        </p>
        <h2
          className="mt-2 font-serif text-3xl md:text-4xl"
          style={{ color: "var(--ink)" }}
        >
          Everything you need to <span className="gradient-text">learn</span>
        </h2>

        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {highlights.map((item, i) => (
            <article
              key={item.title}
              className={`group glass-card p-6 transition-all duration-300 hover:border-[rgba(99,102,241,0.3)] hover:-translate-y-1 animate-fade-in-up stagger-${i + 2}`}
              style={{ cursor: "default" }}
            >
              <div
                className="flex h-12 w-12 items-center justify-center rounded-2xl transition-transform duration-300 group-hover:scale-110"
                style={{ background: item.gradient, color: "#fff" }}
              >
                {item.icon}
              </div>
              <h3
                className="mt-5 font-serif text-xl"
                style={{ color: "var(--ink)" }}
              >
                {item.title}
              </h3>
              <p className="mt-3 text-sm leading-relaxed" style={{ color: "var(--muted)" }}>
                {item.copy}
              </p>
            </article>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section
        className="mt-16 glass-card-strong p-10 text-center animate-fade-in-up"
        style={{
          background: "linear-gradient(135deg, rgba(99, 102, 241, 0.05), rgba(6, 182, 212, 0.05))",
          border: "1px solid rgba(99, 102, 241, 0.15)",
        }}
      >
        <h2 className="font-serif text-3xl" style={{ color: "var(--ink)" }}>
          Ready to start your journey?
        </h2>
        <p className="mx-auto mt-3 max-w-md text-sm" style={{ color: "var(--muted)" }}>
          Create an account, explore the library, and unlock premium content with membership credits.
        </p>
        <div className="mt-6 flex justify-center gap-4">
          <Link href="/register" className="btn-primary">
            Get started free
          </Link>
          <Link href="/library" className="btn-secondary">
            Browse library
          </Link>
        </div>
      </section>
    </div>
  );
}
