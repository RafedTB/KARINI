"use client";

import Link from "next/link";
import { useAuth } from "@/presentation/providers/auth-provider";
import { displayName } from "@/shared/utils/display-name";

const platformFeatures = [
  {
    title: "Structured Video Courses",
    description: "In-depth, multi-chapter video courses designed by subject matter experts to take you from fundamentals to mastery.",
    icon: (
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="5 3 19 12 5 21 5 3" />
      </svg>
    ),
    badge: "Courses",
    gradient: "linear-gradient(135deg, #6366f1, #4ecdc4)",
    href: "/courses?section=course",
  },
  {
    title: "Interactive Practice & Exercises",
    description: "Hands-on exercises and quizzes to challenge your understanding and solidify your skills with instant feedback.",
    icon: (
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
        <polyline points="10 9 9 9 8 9" />
      </svg>
    ),
    badge: "Practice",
    gradient: "linear-gradient(135deg, #3b82f6, #06b6d4)",
    href: "/courses?section=exercise",
  },
  {
    title: "Secure PDF Magazines & Papers",
    description: "Curated learning magazines and research papers served securely with authenticated on-demand downloads.",
    icon: (
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
        <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
      </svg>
    ),
    badge: "Publications",
    gradient: "linear-gradient(135deg, #ec4899, #f43f5e)",
    href: "/courses?section=magazine",
  },
  {
    title: "Live Masterclass Archives",
    description: "Replay past live streams, webinars, and interactive Q&A sessions at your own convenience.",
    icon: (
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <polygon points="10 8 16 12 10 16 10 8" />
      </svg>
    ),
    badge: "Archives",
    gradient: "linear-gradient(135deg, #f59e0b, #ef4444)",
    href: "/courses?section=oldlive",
  },
];

const tiers = [
  {
    name: "Standard",
    desc: "Essential access for newcomers and self-directed learners.",
    perks: ["Access to free course materials", "Credit-based unlocks", "Standard support"],
    badgeClass: "badge-accent",
  },
  {
    name: "Silver",
    desc: "Expanded access to supplementary exercises and resources.",
    perks: ["Discounted credit rates", "Exercise solution guides", "Priority updates"],
    badgeClass: "badge-silver",
  },
  {
    name: "Gold",
    desc: "Full access including exclusive live masterclass recordings.",
    perks: ["Full live archive access", "All magazine downloads", "Community forum access"],
    badgeClass: "badge-gold",
  },
  {
    name: "Platinum",
    desc: "The ultimate VIP pass for ambitious students and professionals.",
    perks: ["Unlimited access to all material", "Direct instructor Q&A", "Verified completion certificates"],
    badgeClass: "badge-platinum",
  },
];

export default function HomePage() {
  const { user, isLoading } = useAuth();

  // If student is logged in, show student dashboard hub
  if (!isLoading && user) {
    return (
      <div className="space-y-8 animate-fade-in-up">
        {/* Welcome Header */}
        <div
          className="glass-card-strong relative overflow-hidden p-6 sm:p-8"
          style={{
            background: "linear-gradient(135deg, rgba(99, 102, 241, 0.08), rgba(6, 182, 212, 0.06))",
            border: "1px solid rgba(99, 102, 241, 0.18)",
          }}
        >
          <div className="relative z-10 max-w-2xl">
            <span
              className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wider"
              style={{
                color: "var(--accent)",
                background: "var(--accent-glow)",
                border: "1px solid rgba(99, 102, 241, 0.25)",
              }}
            >
              <span className="h-2 w-2 rounded-full" style={{ background: "var(--accent)" }} />
              Student Portal
            </span>
            <h1 className="mt-4 font-serif text-3xl font-bold md:text-4xl" style={{ color: "var(--ink)" }}>
              Welcome back, <span className="gradient-text">{displayName(user)}</span>
            </h1>
            <p className="mt-2 text-sm leading-relaxed" style={{ color: "var(--muted)" }}>
              Continue your learning journey. Browse video lessons, practice exercises, secure magazines, and live lecture archives using the navigation menu on your left.
            </p>

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <Link href="/courses" className="btn-primary">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polygon points="5 3 19 12 5 21 5 3" />
                </svg>
                Go to Courses
              </Link>
              <Link href="/membership" className="btn-secondary">
                Manage Membership & Credits
              </Link>
            </div>
          </div>
        </div>

        {/* Quick Stats Grid */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="glass-card p-5">
            <p className="text-xs uppercase tracking-wider" style={{ color: "var(--muted)" }}>Available Credits</p>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="font-serif text-3xl font-bold gradient-text">{user.credits}</span>
              <span className="text-xs" style={{ color: "var(--muted)" }}>credits</span>
            </div>
            <p className="mt-1 text-xs text-slate-500">Spend credits to unlock premium lessons & exercises.</p>
          </div>

          <div className="glass-card p-5">
            <p className="text-xs uppercase tracking-wider" style={{ color: "var(--muted)" }}>Membership Tier</p>
            <div className="mt-2 flex items-center gap-2">
              <span className="font-serif text-2xl font-bold capitalize" style={{ color: "var(--ink)" }}>
                {user.membership || "Standard"}
              </span>
            </div>
            <p className="mt-1 text-xs text-slate-500">Upgrade to Gold or Platinum for full archive access.</p>
          </div>

          <div className="glass-card p-5">
            <p className="text-xs uppercase tracking-wider" style={{ color: "var(--muted)" }}>Account Status</p>
            <div className="mt-2 flex items-center gap-2">
              <span
                className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold"
                style={{
                  background: user.isAccountVerified ? "rgba(5, 150, 105, 0.1)" : "rgba(217, 119, 6, 0.1)",
                  color: user.isAccountVerified ? "var(--success)" : "var(--gold)",
                }}
              >
                <span
                  className="h-1.5 w-1.5 rounded-full"
                  style={{ background: user.isAccountVerified ? "var(--success)" : "var(--gold)" }}
                />
                {user.isAccountVerified ? "Verified Account" : "Active Learner"}
              </span>
            </div>
            <p className="mt-1 text-xs text-slate-500">{user.email}</p>
          </div>
        </div>

        {/* Learning Categories Grid */}
        <div>
          <h2 className="font-serif text-2xl" style={{ color: "var(--ink)" }}>
            Explore Content Categories
          </h2>
          <p className="mt-1 text-xs" style={{ color: "var(--muted)" }}>
            Select a category to jump directly into your courses library.
          </p>

          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {platformFeatures.map((feat) => (
              <Link
                key={feat.title}
                href={feat.href}
                className="glass-card group flex flex-col justify-between p-5 transition-all duration-200 hover:-translate-y-1 hover:border-indigo-400"
              >
                <div>
                  <div
                    className="flex h-11 w-11 items-center justify-center rounded-xl text-white shadow-xs"
                    style={{ background: feat.gradient }}
                  >
                    {feat.icon}
                  </div>
                  <h3 className="mt-4 font-semibold text-sm" style={{ color: "var(--ink)" }}>
                    {feat.title}
                  </h3>
                  <p className="mt-1.5 text-xs leading-relaxed" style={{ color: "var(--muted)" }}>
                    {feat.description}
                  </p>
                </div>
                <div className="mt-4 flex items-center gap-1 text-xs font-medium text-indigo-600 group-hover:underline">
                  Browse category →
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // When student is NOT logged in: Show Platform Information Landing Page
  return (
    <div className="space-y-20">
      {/* Hero Section */}
      <section className="relative grid gap-12 lg:grid-cols-[1.3fr_0.7fr] lg:items-center">
        <div className="animate-fade-in-up">
          <p
            className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.22em]"
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
            Karini E-Learning Platform
          </p>

          <h1
            className="mt-6 max-w-2xl font-serif text-4xl leading-[1.15] md:text-5xl lg:text-6xl"
            style={{ color: "var(--ink)" }}
          >
            Learn with <span className="gradient-text">mastery</span> across courses, practice & archives.
          </h1>

          <p className="mt-5 max-w-xl text-base leading-relaxed" style={{ color: "var(--muted)" }}>
            Karini is an all-in-one digital education platform built for serious students. Access curated video courses, practice exercises, downloadable magazines, and recorded live sessions powered by a transparent credit system.
          </p>

          {/* Login and Register CTAs */}
          <div className="mt-8 flex flex-wrap items-center gap-4">
            <Link href="/register" className="btn-primary">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="8.5" cy="7" r="4" />
                <line x1="20" y1="8" x2="20" y2="14" />
                <line x1="23" y1="11" x2="17" y2="11" />
              </svg>
              Create free account
            </Link>
            <Link href="/login" className="btn-secondary">
              Sign in to platform →
            </Link>
          </div>

          {/* Quick Platform Stats */}
          <div className="mt-10 flex gap-8">
            <div>
              <p className="font-serif text-2xl font-bold gradient-text">4</p>
              <p className="text-xs" style={{ color: "var(--muted)" }}>Content types</p>
            </div>
            <div>
              <p className="font-serif text-2xl font-bold gradient-text">4</p>
              <p className="text-xs" style={{ color: "var(--muted)" }}>Membership tiers</p>
            </div>
            <div>
              <p className="font-serif text-2xl font-bold gradient-text">100%</p>
              <p className="text-xs" style={{ color: "var(--muted)" }}>Self-paced learning</p>
            </div>
          </div>
        </div>

        {/* Platform Information Card */}
        <div className="glass-card p-7 animate-fade-in-up stagger-2">
          <p
            className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em]"
            style={{ color: "var(--muted)" }}
          >
            <span
              className="inline-block h-1.5 w-1.5 rounded-full"
              style={{ background: "var(--success)" }}
            />
            What Karini Provides
          </p>
          <ul className="mt-6 space-y-4 text-sm" style={{ color: "var(--ink-soft)" }}>
            {[
              "High quality video courses organized in step-by-step modules",
              "Interactive practice exercises to test your comprehension",
              "Authenticated PDF magazine downloads and research material",
              "Exclusive access to recorded masterclasses and live archives",
              "Transparent credit-based economy for flexible content unlocking",
              "Tiered memberships (Silver, Gold, Platinum) with VIP benefits",
            ].map((item) => (
              <li key={item} className="flex items-start gap-3">
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="var(--accent)"
                  strokeWidth="2.5"
                  className="mt-0.5 shrink-0"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                <span>{item}</span>
              </li>
            ))}
          </ul>

          <div className="mt-8 rounded-xl p-4 bg-slate-50 border border-slate-100">
            <p className="text-xs font-semibold text-slate-800">Ready to join our student community?</p>
            <p className="mt-1 text-xs text-slate-500">Sign up takes under 30 seconds. Get immediate access to your student dashboard.</p>
            <Link href="/register" className="mt-3 block text-center text-xs font-semibold text-indigo-600 hover:underline">
              Register now →
            </Link>
          </div>
        </div>
      </section>

      {/* Content Pillars */}
      <section>
        <div className="text-center max-w-2xl mx-auto">
          <p className="text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: "var(--muted)" }}>
            Platform Offerings
          </p>
          <h2 className="mt-2 font-serif text-3xl md:text-4xl" style={{ color: "var(--ink)" }}>
            Everything you need for <span className="gradient-text">academic & skill growth</span>
          </h2>
          <p className="mt-3 text-sm text-slate-500">
            Karini consolidates multiple formats of education into a cohesive experience.
          </p>
        </div>

        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {platformFeatures.map((item, i) => (
            <article
              key={item.title}
              className={`glass-card p-6 transition-all duration-300 hover:border-[rgba(99,102,241,0.3)] hover:-translate-y-1 animate-fade-in-up stagger-${i + 2}`}
            >
              <div
                className="flex h-12 w-12 items-center justify-center rounded-2xl text-white shadow-xs"
                style={{ background: item.gradient }}
              >
                {item.icon}
              </div>
              <h3 className="mt-5 font-serif text-xl" style={{ color: "var(--ink)" }}>
                {item.title}
              </h3>
              <p className="mt-2 text-xs leading-relaxed" style={{ color: "var(--muted)" }}>
                {item.description}
              </p>
            </article>
          ))}
        </div>
      </section>

      {/* Membership Tiers Overview */}
      <section>
        <div className="text-center max-w-2xl mx-auto">
          <p className="text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: "var(--gold)" }}>
            Flexible Memberships
          </p>
          <h2 className="mt-2 font-serif text-3xl md:text-4xl" style={{ color: "var(--ink)" }}>
            Designed to fit your <span className="gradient-text-warm">budget and goals</span>
          </h2>
          <p className="mt-3 text-sm text-slate-500">
            Start on the standard tier and unlock deeper content as your needs expand.
          </p>
        </div>

        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {tiers.map((t) => (
            <div key={t.name} className="glass-card flex flex-col justify-between p-6">
              <div>
                <span className={`badge ${t.badgeClass} text-xs font-semibold uppercase`}>
                  {t.name}
                </span>
                <p className="mt-3 text-xs leading-relaxed text-slate-500">{t.desc}</p>
                <div className="my-4 h-px bg-slate-100" />
                <ul className="space-y-2 text-xs text-slate-600">
                  {t.perks.map((p) => (
                    <li key={p} className="flex items-center gap-2">
                      <span className="text-indigo-500 font-bold">✓</span>
                      <span>{p}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <Link
                href="/register"
                className="mt-6 block text-center rounded-xl py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors"
              >
                Join with {t.name}
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* Bottom CTA Card */}
      <section
        className="glass-card-strong p-10 text-center animate-fade-in-up"
        style={{
          background: "linear-gradient(135deg, rgba(99, 102, 241, 0.06), rgba(6, 182, 212, 0.06))",
          border: "1px solid rgba(99, 102, 241, 0.2)",
        }}
      >
        <h2 className="font-serif text-3xl md:text-4xl" style={{ color: "var(--ink)" }}>
          Ready to unlock your full potential?
        </h2>
        <p className="mx-auto mt-3 max-w-lg text-sm" style={{ color: "var(--muted)" }}>
          Create an account in moments, explore video lessons and practice problems, or sign in to resume where you left off.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-4">
          <Link href="/register" className="btn-primary">
            Create account
          </Link>
          <Link href="/login" className="btn-secondary">
            Sign in
          </Link>
        </div>
      </section>
    </div>
  );
}
