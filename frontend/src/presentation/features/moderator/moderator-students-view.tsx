"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/presentation/providers/auth-provider";
import { StudentGroup, UserType } from "@/domain/enums";
import type { User } from "@/domain/entities/user";
import { moderatorService } from "@/application/services/moderator-service";
import { subjectsService } from "@/application/services/subjects-service";
import { PageLoader } from "@/presentation/components/ui/page-loader";
import { Button } from "@/presentation/components/ui/button";

const GROUPS = [
  { key: StudentGroup.DABA_DABA, label: "DabaDaba", color: "text-emerald-700 bg-emerald-50 border-emerald-300", badge: "🟢 DabaDaba" },
  { key: StudentGroup.STANDARD, label: "Standard", color: "text-blue-700 bg-blue-50 border-blue-300", badge: "🔵 Standard" },
  { key: StudentGroup.EXCELLENT, label: "Excellent", color: "text-purple-700 bg-purple-50 border-purple-300", badge: "🟣 Excellent" },
  { key: StudentGroup.TOP, label: "Top", color: "text-amber-700 bg-amber-50 border-amber-300", badge: "🟡 Top" },
];

export function ModeratorStudentsView() {
  const { user, token } = useAuth();
  const [students, setStudents] = useState<User[]>([]);
  const [classes, setClasses] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterClass, setFilterClass] = useState("all");
  const [filterGroup, setFilterGroup] = useState("all");
  const [savingId, setSavingId] = useState<number | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Load students & classes from database
  const loadData = async () => {
    if (!token) return;
    try {
      setError(null);
      const [studentsData, classesData] = await Promise.all([
        moderatorService.getStudents(token),
        subjectsService.getFilieres(token).catch(() => []),
      ]);
      setStudents(Array.isArray(studentsData) ? studentsData : []);
      setClasses(Array.isArray(classesData) ? classesData.filter(Boolean) : []);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Impossible de charger les élèves depuis la base de données.");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [token]);

  // Handle changing class or group
  const handleAssign = async (studentId: number, studentClass?: string, studentGroup?: string) => {
    if (!token) return;
    setSavingId(studentId);
    setError(null);
    setNotice(null);

    try {
      const updated = await moderatorService.assignStudentClassAndGroup(token, studentId, {
        studentClass,
        studentGroup,
      });

      // Update local state
      setStudents((prev) =>
        prev.map((s) => (s.id === studentId ? { ...s, studentClass: updated.studentClass, studentGroup: updated.studentGroup } : s))
      );
      setNotice(`Assignation mise à jour pour ${updated.firstname || updated.username || "l'élève"} ! ✓`);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Erreur lors de l'assignation de l'élève.");
      }
    } finally {
      setSavingId(null);
    }
  };

  // Group statistics
  const stats = useMemo(() => {
    const total = students.length;
    let dabadaba = 0;
    let standard = 0;
    let excellent = 0;
    let top = 0;
    let platinum = 0;

    students.forEach((s) => {
      const g = (s.studentGroup || "Standard").toLowerCase();
      if (g === "dabadaba") dabadaba++;
      else if (g === "excellent") excellent++;
      else if (g === "top") top++;
      else standard++;

      if (String(s.membership).toLowerCase() === "platinum") {
        platinum++;
      }
    });

    return { total, dabadaba, standard, excellent, top, platinum };
  }, [students]);

  // Filtered students
  const filteredStudents = useMemo(() => {
    return students.filter((s) => {
      // Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const fullName = `${s.firstname || ""} ${s.lastname || ""}`.toLowerCase();
        const email = (s.email || "").toLowerCase();
        const username = (s.username || "").toLowerCase();
        const sClass = (s.studentClass || "").toLowerCase();
        if (!fullName.includes(q) && !email.includes(q) && !username.includes(q) && !sClass.includes(q)) {
          return false;
        }
      }

      // Class filter
      if (filterClass !== "all") {
        if (filterClass === "unassigned") {
          if (s.studentClass) return false;
        } else if ((s.studentClass || "").toLowerCase() !== filterClass.toLowerCase()) {
          return false;
        }
      }

      // Group filter
      if (filterGroup !== "all") {
        const currentGroup = (s.studentGroup || "Standard").toLowerCase();
        if (currentGroup !== filterGroup.toLowerCase()) {
          return false;
        }
      }

      return true;
    });
  }, [students, searchQuery, filterClass, filterGroup]);

  const isModeratorOrAdmin = user?.userType === UserType.MODERATOR || user?.userType === UserType.SUPERADMIN;

  if (!isModeratorOrAdmin) {
    return (
      <div className="p-8 text-center glass-card rounded-3xl max-w-lg mx-auto mt-12">
        <span className="text-4xl block mb-3">🔒</span>
        <h2 className="font-serif text-xl font-bold text-slate-800">Accès Réservé aux Modérateurs & Superadmins</h2>
        <p className="text-xs text-slate-500 mt-2">
          Cet espace permet d&apos;attacher les élèves à une classe et de leur affecter un groupe Live (DabaDaba, Standard, Excellent, Top).
        </p>
        <Link href="/" className="btn-primary mt-6 inline-block text-xs px-6 py-2.5 rounded-xl">
          Retour au Dashboard
        </Link>
      </div>
    );
  }

  if (loading) return <PageLoader label="Chargement des élèves et des classes depuis la base de données…" />;

  return (
    <div className="space-y-8 animate-fade-in-up">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider text-indigo-700 bg-indigo-50 border border-indigo-200">
              Espace Modérateur
            </span>
            <span className="text-xs text-slate-400">•</span>
            <span className="text-xs font-semibold text-slate-500">
              4 Groupes Live : DabaDaba • Standard • Excellent • Top
            </span>
          </div>
          <h1 className="mt-3 font-serif text-3xl md:text-4xl font-bold text-slate-900">
            Assignation des <span className="gradient-text">Classes & Groupes Live</span>
          </h1>
          <p className="mt-1 text-sm text-slate-600 max-w-2xl leading-relaxed">
            En tant que modérateur ou administrateur, affectez chaque élève à sa classe d&apos;étude et à son groupe de niveau Live. Les élèves Platinum verront uniquement les sessions Live correspondant à leur groupe et classe.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start md:self-auto">
          <Link href="/live" className="btn-secondary text-xs px-4 py-2.5 rounded-xl flex items-center gap-2 shadow-xs">
            <span>🎥</span>
            <span>Ouvrir Calendrier Live</span>
          </Link>
        </div>
      </div>

      {/* Alerts */}
      {notice && (
        <div className="p-4 rounded-2xl border border-emerald-200 bg-emerald-50 text-emerald-800 text-sm flex items-center justify-between gap-3 animate-fade-in" role="status">
          <span>{notice}</span>
          <button type="button" onClick={() => setNotice(null)} className="font-bold text-emerald-700 text-xs">
            ✕
          </button>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-2xl border border-rose-200 bg-rose-50 text-rose-800 text-sm flex items-center justify-between gap-3 animate-fade-in" role="alert">
          <span>{error}</span>
          <button type="button" onClick={() => setError(null)} className="font-bold text-rose-700 text-xs">
            ✕
          </button>
        </div>
      )}

      {/* Summary KPI Cards */}
      <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-6">
        <div className="glass-card p-4 rounded-2xl border border-slate-200">
          <span className="text-xs uppercase font-semibold text-slate-500">Total Élèves</span>
          <p className="font-serif text-2xl font-bold text-slate-900 mt-1">{stats.total}</p>
        </div>

        <div className="glass-card p-4 rounded-2xl border border-emerald-200 bg-emerald-50/30">
          <span className="text-xs uppercase font-bold text-emerald-700">🟢 DabaDaba</span>
          <p className="font-serif text-2xl font-bold text-emerald-800 mt-1">{stats.dabadaba}</p>
        </div>

        <div className="glass-card p-4 rounded-2xl border border-blue-200 bg-blue-50/30">
          <span className="text-xs uppercase font-bold text-blue-700">🔵 Standard</span>
          <p className="font-serif text-2xl font-bold text-blue-800 mt-1">{stats.standard}</p>
        </div>

        <div className="glass-card p-4 rounded-2xl border border-purple-200 bg-purple-50/30">
          <span className="text-xs uppercase font-bold text-purple-700">🟣 Excellent</span>
          <p className="font-serif text-2xl font-bold text-purple-800 mt-1">{stats.excellent}</p>
        </div>

        <div className="glass-card p-4 rounded-2xl border border-amber-200 bg-amber-50/30">
          <span className="text-xs uppercase font-bold text-amber-700">🟡 Top</span>
          <p className="font-serif text-2xl font-bold text-amber-800 mt-1">{stats.top}</p>
        </div>

        <div className="glass-card p-4 rounded-2xl border border-indigo-200 bg-indigo-50/30">
          <span className="text-xs uppercase font-bold text-indigo-700">💎 Platinum</span>
          <p className="font-serif text-2xl font-bold text-indigo-800 mt-1">{stats.platinum}</p>
        </div>
      </div>

      {/* Filter and Search Toolbar */}
      <div className="glass-card p-4 rounded-2xl border border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        {/* Search */}
        <div className="flex-1 max-w-md">
          <input
            type="text"
            placeholder="Rechercher par nom, prénom, email ou classe…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl px-3.5 py-2 text-xs border border-slate-200 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        {/* Filter Dropdowns */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Class filter */}
          <div className="flex items-center gap-1.5 text-xs">
            <span className="font-semibold text-slate-500">Classe :</span>
            <select
              value={filterClass}
              onChange={(e) => setFilterClass(e.target.value)}
              className="rounded-xl px-2.5 py-1.5 text-xs border border-slate-200 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">Toutes les classes</option>
              <option value="unassigned">Non assignée</option>
              {classes.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {/* Group filter */}
          <div className="flex items-center gap-1.5 text-xs">
            <span className="font-semibold text-slate-500">Groupe :</span>
            <select
              value={filterGroup}
              onChange={(e) => setFilterGroup(e.target.value)}
              className="rounded-xl px-2.5 py-1.5 text-xs border border-slate-200 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">Tous les groupes</option>
              <option value="DabaDaba">DabaDaba</option>
              <option value="Standard">Standard</option>
              <option value="Excellent">Excellent</option>
              <option value="Top">Top</option>
            </select>
          </div>
        </div>
      </div>

      {/* Students Table */}
      <div className="glass-card rounded-3xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/70 text-[11px] uppercase tracking-wider font-bold text-slate-500">
                <th className="py-3.5 px-5">Élève</th>
                <th className="py-3.5 px-4">Formule</th>
                <th className="py-3.5 px-4 min-w-[200px]">Classe / Filière</th>
                <th className="py-3.5 px-4 min-w-[240px]">Groupe Live (4 Niveaux)</th>
                <th className="py-3.5 px-4 text-right">Statut</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400">
                    <span className="text-3xl block mb-2">🔍</span>
                    Aucun élève ne correspond à votre recherche.
                  </td>
                </tr>
              ) : (
                filteredStudents.map((s) => {
                  const currentGroup = s.studentGroup || "Standard";
                  const isPlatinumStudent = String(s.membership).toLowerCase() === "platinum";
                  const isSavingThis = savingId === s.id;

                  return (
                    <tr key={s.id} className="hover:bg-slate-50/50 transition-colors">
                      {/* Élève info */}
                      <td className="py-3.5 px-5">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-100 text-indigo-700 text-sm font-bold shrink-0">
                            {(s.firstname ? s.firstname[0] : s.username ? s.username[0] : "E").toUpperCase()}
                          </div>
                          <div>
                            <p className="font-bold text-slate-900">
                              {[s.firstname, s.lastname].filter(Boolean).join(" ") || s.username || "Élève sans nom"}
                            </p>
                            <p className="text-[11px] text-slate-500">{s.email}</p>
                          </div>
                        </div>
                      </td>

                      {/* Membership */}
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                            isPlatinumStudent
                              ? "badge-platinum text-indigo-800"
                              : "bg-slate-100 text-slate-600 border border-slate-200"
                          }`}
                        >
                          {isPlatinumStudent ? "💎 Platinum" : s.membership || "Standard"}
                        </span>
                      </td>

                      {/* Class assignment dropdown */}
                      <td className="py-3.5 px-4">
                        <select
                          value={s.studentClass || ""}
                          disabled={isSavingThis}
                          onChange={(e) => handleAssign(s.id, e.target.value, s.studentGroup || "Standard")}
                          className="w-full rounded-xl px-2.5 py-1.5 text-xs border border-slate-200 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-60"
                        >
                          <option value="">Sélectionner une classe…</option>
                          {classes.map((c) => (
                            <option key={c} value={c}>
                              🎓 {c}
                            </option>
                          ))}
                        </select>
                      </td>

                      {/* Group radio buttons */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1 flex-wrap">
                          {GROUPS.map((g) => {
                            const isSelected = currentGroup.toLowerCase() === g.key.toLowerCase();
                            return (
                              <button
                                key={g.key}
                                type="button"
                                disabled={isSavingThis}
                                onClick={() => handleAssign(s.id, s.studentClass || undefined, g.key)}
                                className={`rounded-lg px-2 py-1 text-[10px] font-bold transition-all border ${
                                  isSelected
                                    ? `${g.color} ring-2 ring-indigo-500 shadow-xs font-extrabold scale-105`
                                    : "bg-white text-slate-500 border-slate-200 hover:bg-slate-100"
                                } disabled:opacity-50`}
                              >
                                {g.label}
                              </button>
                            );
                          })}
                        </div>
                      </td>

                      {/* Save Status */}
                      <td className="py-3.5 px-4 text-right">
                        {isSavingThis ? (
                          <span className="text-[11px] font-semibold text-indigo-600 animate-pulse">
                            Enregistrement…
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] text-emerald-600 font-bold">
                            ✓ Actif
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

