"use client";

import { useEffect, useState, useMemo } from "react";
import { useAuth } from "@/presentation/providers/auth-provider";
import { adminService } from "@/application/services/admin-service";
import { subjectsService } from "@/application/services/subjects-service";
import type { User } from "@/domain/entities/user";
import type { Subject } from "@/domain/entities/subject";
import { UserType, MembershipType } from "@/domain/enums";
import { SubjectIcon } from "@/presentation/features/courses/subject-icons";
import { PageLoader } from "@/presentation/components/ui/page-loader";
import { Button } from "@/presentation/components/ui/button";

export function AdminBoardView() {
  const { token, user: currentUser } = useAuth();

  // State
  const [activeTab, setActiveTab] = useState<"users" | "subjects">("users");
  const [users, setUsers] = useState<User[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [filieres, setFilieres] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Filter state for users
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [userSearch, setUserSearch] = useState<string>("");

  // Filter state for subjects
  const [filiereFilter, setFiliereFilter] = useState<string>("all");
  const [subjectSearch, setSubjectSearch] = useState<string>("");

  // Modals
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [showAddSubjectModal, setShowAddSubjectModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);

  // Form states
  const [newUserForm, setNewUserForm] = useState({
    username: "",
    email: "",
    password: "",
    userType: UserType.STUDENT,
    membership: MembershipType.DEFAULT,
    credits: 0,
    firstname: "",
    lastname: "",
  });

  const [newSubjectForm, setNewSubjectForm] = useState({
    name: "",
    code: "",
    filiere: "2ème Informatique",
    customFiliere: "",
    category: "Sciences & Tech",
    description: "",
    icon: "math",
    color: "#4f46e5",
    topics: "",
  });

  const [submitting, setSubmitting] = useState(false);

  // Load data
  const fetchData = async () => {
    if (!token) return;
    try {
      setLoading(true);
      setError("");
      const [usersData, subjectsData, filieresData] = await Promise.all([
        adminService.getAllUsers(token),
        subjectsService.list(token),
        subjectsService.getFilieres(token),
      ]);
      setUsers(usersData);
      setSubjects(subjectsData);
      setFilieres(filieresData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur de chargement des données d'administration.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [token]);

  const showNotification = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(""), 4000);
  };

  // User handlers
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    try {
      setSubmitting(true);
      setError("");
      await adminService.createUser(token, newUserForm);
      setShowAddUserModal(false);
      setNewUserForm({
        username: "",
        email: "",
        password: "",
        userType: UserType.STUDENT,
        membership: MembershipType.DEFAULT,
        credits: 0,
        firstname: "",
        lastname: "",
      });
      showNotification(`Utilisateur créé avec succès en tant que ${newUserForm.userType} !`);
      fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Échec de création de l'utilisateur.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !editingUser) return;
    try {
      setSubmitting(true);
      setError("");
      await adminService.updateUser(token, editingUser.id, {
        username: editingUser.username || "",
        email: editingUser.email,
        userType: editingUser.userType as string,
        membership: editingUser.membership as string,
        credits: Number(editingUser.credits),
        firstname: editingUser.firstname || "",
        lastname: editingUser.lastname || "",
      });
      setEditingUser(null);
      showNotification("Utilisateur mis à jour avec succès !");
      fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors de la mise à jour.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteUser = async (id: number, username?: string | null) => {
    if (!token) return;
    if (!confirm(`Êtes-vous sûr de vouloir supprimer l'utilisateur "${username || id}" ?`)) return;
    try {
      await adminService.deleteUser(token, id);
      showNotification("Utilisateur supprimé avec succès.");
      setUsers((prev) => prev.filter((u) => u.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors de la suppression.");
    }
  };

  // Subject handlers
  const handleCreateSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    try {
      setSubmitting(true);
      setError("");
      const resolvedFiliere =
        newSubjectForm.filiere === "custom"
          ? newSubjectForm.customFiliere.trim()
          : newSubjectForm.filiere;

      if (!resolvedFiliere) {
        throw new Error("Veuillez renseigner la filière.");
      }

      await subjectsService.create(token, {
        name: newSubjectForm.name,
        code: newSubjectForm.code,
        filiere: resolvedFiliere,
        category: newSubjectForm.category,
        description: newSubjectForm.description,
        icon: newSubjectForm.icon,
        color: newSubjectForm.color,
        topics: newSubjectForm.topics,
      });

      setShowAddSubjectModal(false);
      setNewSubjectForm({
        name: "",
        code: "",
        filiere: "2ème Informatique",
        customFiliere: "",
        category: "Sciences & Tech",
        description: "",
        icon: "math",
        color: "#4f46e5",
        topics: "",
      });
      showNotification(`Matière "${newSubjectForm.name}" ajoutée pour la filière ${resolvedFiliere} !`);
      fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors de la création de la matière.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !editingSubject) return;
    try {
      setSubmitting(true);
      setError("");
      await subjectsService.update(token, editingSubject.id, {
        name: editingSubject.name,
        code: editingSubject.code,
        filiere: editingSubject.filiere,
        category: editingSubject.category,
        description: editingSubject.description || "",
        icon: editingSubject.icon,
        color: editingSubject.color,
        topics: editingSubject.topics || "",
      });
      setEditingSubject(null);
      showNotification("Matière mise à jour avec succès !");
      fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors de la modification de la matière.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteSubject = async (id: number, name: string) => {
    if (!token) return;
    if (!confirm(`Êtes-vous sûr de vouloir supprimer la matière "${name}" ?`)) return;
    try {
      await subjectsService.delete(token, id);
      showNotification(`Matière "${name}" supprimée.`);
      setSubjects((prev) => prev.filter((s) => s.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors de la suppression.");
    }
  };

  // Filtered views
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const matchesRole = roleFilter === "all" || u.userType === roleFilter;
      const search = userSearch.toLowerCase();
      const matchesSearch =
        !search ||
        (u.username && u.username.toLowerCase().includes(search)) ||
        u.email.toLowerCase().includes(search) ||
        (u.firstname && u.firstname.toLowerCase().includes(search)) ||
        (u.lastname && u.lastname.toLowerCase().includes(search));
      return matchesRole && matchesSearch;
    });
  }, [users, roleFilter, userSearch]);

  const filteredSubjects = useMemo(() => {
    return subjects.filter((s) => {
      const matchesFiliere = filiereFilter === "all" || s.filiere === filiereFilter;
      const search = subjectSearch.toLowerCase();
      const matchesSearch =
        !search ||
        s.name.toLowerCase().includes(search) ||
        s.code.toLowerCase().includes(search) ||
        s.filiere.toLowerCase().includes(search);
      return matchesFiliere && matchesSearch;
    });
  }, [subjects, filiereFilter, subjectSearch]);

  const stats = useMemo(() => {
    const rolesCount: Record<string, number> = {};
    for (const u of users) {
      rolesCount[u.userType] = (rolesCount[u.userType] || 0) + 1;
    }
    const filieresCount = new Set(subjects.map((s) => s.filiere)).size;
    return {
      totalUsers: users.length,
      rolesCount,
      totalSubjects: subjects.length,
      filieresCount,
    };
  }, [users, subjects]);

  if (loading) {
    return <PageLoader label="Chargement du tableau d'administration…" />;
  }

  return (
    <div className="space-y-8 animate-fade-in-up">
      {/* Top Banner Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider bg-rose-500/10 text-rose-600 border border-rose-500/20">
            <span>👑</span> Espace Superadministrateur
          </div>
          <h1 className="mt-2 font-serif text-3xl sm:text-4xl font-bold" style={{ color: "var(--ink)" }}>
            Tableau de bord <span className="gradient-text">Superadmin</span>
          </h1>
          <p className="mt-1 text-sm" style={{ color: "var(--muted)" }}>
            Gérez les utilisateurs (Finance, Instructeur, Étudiant, Modérateur, Parent) et configurez les matières par filière (2ème Info, 2ème Math, etc.).
          </p>
        </div>

        {/* Global Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          <Button
            type="button"
            onClick={() => setShowAddUserModal(true)}
            className="flex items-center gap-2 rounded-xl text-xs sm:text-sm font-semibold"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="8.5" cy="7" r="4" />
              <line x1="20" y1="8" x2="20" y2="14" />
              <line x1="23" y1="11" x2="17" y2="11" />
            </svg>
            + Ajouter Utilisateur
          </Button>

          <Button
            type="button"
            variant="secondary"
            onClick={() => setShowAddSubjectModal(true)}
            className="flex items-center gap-2 rounded-xl text-xs sm:text-sm font-semibold"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
              <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
              <line x1="12" y1="6" x2="12" y2="12" />
              <line x1="9" y1="9" x2="15" y2="9" />
            </svg>
            + Nouvelle Matière
          </Button>
        </div>
      </div>

      {/* Notifications */}
      {successMsg && (
        <div className="rounded-2xl bg-emerald-500/10 border border-emerald-500/20 px-4 py-3 text-sm font-medium text-emerald-600 flex items-center gap-2 animate-fade-in-up">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
            <polyline points="22 4 12 14.01 9 11.01" />
          </svg>
          {successMsg}
        </div>
      )}

      {error && (
        <div className="alert-error" role="alert">
          {error}
        </div>
      )}

      {/* Metric Cards Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Users */}
        <div className="glass-card p-5 rounded-2xl flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs font-semibold" style={{ color: "var(--muted)" }}>
            <span>Utilisateurs Totaux</span>
            <span className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-600">👥</span>
          </div>
          <div className="mt-3">
            <span className="font-serif text-3xl font-bold gradient-text">{stats.totalUsers}</span>
            <div className="mt-2 flex flex-wrap gap-1 text-[10px]">
              <span className="px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-600 font-mono">
                {stats.rolesCount[UserType.STUDENT] || 0} Étudiants
              </span>
              <span className="px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-600 font-mono">
                {stats.rolesCount[UserType.INSTRUCTOR] || 0} Profs
              </span>
              <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 font-mono">
                {stats.rolesCount[UserType.FINANCE] || 0} Finance
              </span>
            </div>
          </div>
        </div>

        {/* Total Subjects */}
        <div className="glass-card p-5 rounded-2xl flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs font-semibold" style={{ color: "var(--muted)" }}>
            <span>Matières Actives</span>
            <span className="p-1.5 rounded-lg bg-purple-500/10 text-purple-600">📚</span>
          </div>
          <div className="mt-3">
            <span className="font-serif text-3xl font-bold text-purple-600">{stats.totalSubjects}</span>
            <p className="mt-1 text-xs" style={{ color: "var(--muted)" }}>
              Réparties sur {stats.filieresCount} filières scolaires
            </p>
          </div>
        </div>

        {/* Roles Distribution */}
        <div className="glass-card p-5 rounded-2xl flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs font-semibold" style={{ color: "var(--muted)" }}>
            <span>Modérateurs & Parents</span>
            <span className="p-1.5 rounded-lg bg-amber-500/10 text-amber-600">🛡️</span>
          </div>
          <div className="mt-3">
            <span className="font-serif text-3xl font-bold text-amber-600">
              {(stats.rolesCount[UserType.MODERATOR] || 0) + (stats.rolesCount[UserType.PARENT] || 0)}
            </span>
            <p className="mt-1 text-xs" style={{ color: "var(--muted)" }}>
              {stats.rolesCount[UserType.MODERATOR] || 0} modérateurs • {stats.rolesCount[UserType.PARENT] || 0} parents
            </p>
          </div>
        </div>

        {/* Filières Total */}
        <div className="glass-card p-5 rounded-2xl flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs font-semibold" style={{ color: "var(--muted)" }}>
            <span>Filières Disponibles</span>
            <span className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-600">🎓</span>
          </div>
          <div className="mt-3">
            <span className="font-serif text-3xl font-bold text-cyan-600">{filieres.length}</span>
            <p className="mt-1 text-xs" style={{ color: "var(--muted)" }}>
              2ème Info, 2ème Math, Bac, etc.
            </p>
          </div>
        </div>
      </div>

      {/* Main Board Tabs Navigation */}
      <div
        className="flex items-center gap-2 border-b pb-1"
        style={{ borderColor: "var(--line)" }}
      >
        <button
          type="button"
          onClick={() => setActiveTab("users")}
          className="flex items-center gap-2 px-5 py-3 text-sm font-semibold border-b-2 transition-all cursor-pointer"
          style={{
            borderColor: activeTab === "users" ? "var(--accent)" : "transparent",
            color: activeTab === "users" ? "var(--accent)" : "var(--muted)",
          }}
        >
          <span>👥</span>
          Gestion des Utilisateurs ({users.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("subjects")}
          className="flex items-center gap-2 px-5 py-3 text-sm font-semibold border-b-2 transition-all cursor-pointer"
          style={{
            borderColor: activeTab === "subjects" ? "var(--accent)" : "transparent",
            color: activeTab === "subjects" ? "var(--accent)" : "var(--muted)",
          }}
        >
          <span>📐</span>
          Matières & Filières ({subjects.length})
        </button>
      </div>

      {/* TAB 1: USERS MANAGEMENT */}
      {activeTab === "users" && (
        <div className="space-y-6">
          {/* Controls bar */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            {/* Search */}
            <div className="relative flex-1 max-w-sm">
              <svg
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                type="text"
                placeholder="Rechercher par nom, username, email..."
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                className="w-full rounded-xl border bg-white/70 pl-9 pr-3 py-2 text-sm outline-none transition-all focus:border-indigo-500 focus:bg-white"
                style={{ borderColor: "var(--line)", color: "var(--ink)" }}
              />
            </div>

            {/* Role Filter Pills */}
            <div className="flex flex-wrap items-center gap-1">
              {[
                { key: "all", label: "Tous" },
                { key: UserType.FINANCE, label: "Finance" },
                { key: UserType.INSTRUCTOR, label: "Instructeur" },
                { key: UserType.STUDENT, label: "Étudiant" },
                { key: UserType.MODERATOR, label: "Modérateur" },
                { key: UserType.PARENT, label: "Parent" },
                { key: UserType.SUPERADMIN, label: "Superadmin" },
              ].map((r) => {
                const active = roleFilter === r.key;
                return (
                  <button
                    key={r.key}
                    type="button"
                    onClick={() => setRoleFilter(r.key)}
                    className="rounded-lg px-2.5 py-1 text-xs font-medium transition-all"
                    style={{
                      background: active ? "var(--accent-glow)" : "var(--paper-card)",
                      color: active ? "var(--accent)" : "var(--muted)",
                      border: active ? "1px solid rgba(99,102,241,0.3)" : "1px solid var(--line)",
                      fontWeight: active ? 700 : 500,
                    }}
                  >
                    {r.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Users Table */}
          <div
            className="overflow-x-auto rounded-2xl"
            style={{
              background: "var(--paper-card)",
              border: "1px solid var(--line)",
              boxShadow: "0 4px 20px -2px rgba(15,23,42,0.03)",
            }}
          >
            <table className="w-full text-left text-sm">
              <thead className="border-b text-xs uppercase" style={{ borderColor: "var(--line)", color: "var(--muted)" }}>
                <tr>
                  <th className="px-5 py-3.5 font-semibold">Utilisateur</th>
                  <th className="px-5 py-3.5 font-semibold">Email</th>
                  <th className="px-5 py-3.5 font-semibold">Rôle</th>
                  <th className="px-5 py-3.5 font-semibold">Membership</th>
                  <th className="px-5 py-3.5 font-semibold">Crédits</th>
                  <th className="px-5 py-3.5 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y" style={{ borderColor: "var(--line)" }}>
                {filteredUsers.map((u) => {
                  const roleColor = getRoleBadgeColor(u.userType as string);
                  return (
                    <tr key={u.id} className="transition-colors hover:bg-black/[0.02]">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div
                            className="flex h-9 w-9 items-center justify-center rounded-xl font-bold uppercase text-xs"
                            style={{
                              backgroundColor: `${roleColor}18`,
                              color: roleColor,
                              border: `1px solid ${roleColor}30`,
                            }}
                          >
                            {(u.username || u.email).slice(0, 2)}
                          </div>
                          <div>
                            <span className="font-semibold block" style={{ color: "var(--ink)" }}>
                              {u.username || "Sans nom"}
                            </span>
                            {(u.firstname || u.lastname) && (
                              <span className="text-xs" style={{ color: "var(--muted)" }}>
                                {u.firstname} {u.lastname}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="px-5 py-3.5 font-mono text-xs" style={{ color: "var(--ink)" }}>
                        {u.email}
                      </td>

                      <td className="px-5 py-3.5">
                        <span
                          className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold uppercase font-mono"
                          style={{
                            backgroundColor: `${roleColor}15`,
                            color: roleColor,
                            border: `1px solid ${roleColor}30`,
                          }}
                        >
                          {u.userType}
                        </span>
                      </td>

                      <td className="px-5 py-3.5">
                        <span className="rounded-md px-2 py-0.5 text-xs font-medium uppercase font-mono bg-slate-100 text-slate-700">
                          {u.membership || "default"}
                        </span>
                      </td>

                      <td className="px-5 py-3.5">
                        <span className="font-mono font-bold text-xs" style={{ color: "var(--accent)" }}>
                          {u.credits} pts
                        </span>
                      </td>

                      <td className="px-5 py-3.5 text-right space-x-2">
                        <button
                          type="button"
                          onClick={() => setEditingUser(u)}
                          className="rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors bg-indigo-50 text-indigo-600 hover:bg-indigo-100"
                        >
                          Modifier
                        </button>
                        {u.id !== currentUser?.id && (
                          <button
                            type="button"
                            onClick={() => handleDeleteUser(u.id, u.username)}
                            className="rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors bg-rose-50 text-rose-600 hover:bg-rose-100"
                          >
                            Supprimer
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {filteredUsers.length === 0 && (
              <div className="p-8 text-center" style={{ color: "var(--muted)" }}>
                Aucun utilisateur correspondant à votre recherche.
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: SUBJECTS & FILIÈRES MANAGEMENT */}
      {activeTab === "subjects" && (
        <div className="space-y-6">
          {/* Controls bar */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            {/* Search */}
            <div className="relative flex-1 max-w-sm">
              <svg
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                type="text"
                placeholder="Rechercher une matière ou code..."
                value={subjectSearch}
                onChange={(e) => setSubjectSearch(e.target.value)}
                className="w-full rounded-xl border bg-white/70 pl-9 pr-3 py-2 text-sm outline-none transition-all focus:border-indigo-500 focus:bg-white"
                style={{ borderColor: "var(--line)", color: "var(--ink)" }}
              />
            </div>

            {/* Filière Filter Dropdown / Pills */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold" style={{ color: "var(--muted)" }}>
                Filière :
              </span>
              <select
                value={filiereFilter}
                onChange={(e) => setFiliereFilter(e.target.value)}
                className="rounded-xl border bg-white/80 px-3 py-1.5 text-xs font-medium outline-none transition-all focus:border-indigo-500 cursor-pointer"
                style={{ borderColor: "var(--line)", color: "var(--ink)" }}
              >
                <option value="all">Toutes les filières ({subjects.length})</option>
                {filieres.map((f) => {
                  const count = subjects.filter((s) => s.filiere === f).length;
                  return (
                    <option key={f} value={f}>
                      {f} ({count})
                    </option>
                  );
                })}
              </select>
            </div>
          </div>

          {/* Square Format Subjects Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
            {filteredSubjects.map((s) => {
              return (
                <div
                  key={s.id}
                  className="group relative flex flex-col justify-between aspect-square rounded-3xl p-5 transition-all duration-300 hover:shadow-lg"
                  style={{
                    background: "var(--paper-card)",
                    border: `1px solid ${s.color}35`,
                    boxShadow: "0 4px 16px -2px rgba(15,23,42,0.04)",
                  }}
                >
                  {/* Top: Icon + Code + Filière */}
                  <div className="flex items-start justify-between">
                    <div
                      className="flex h-12 w-12 items-center justify-center rounded-2xl"
                      style={{
                        backgroundColor: `${s.color}15`,
                        border: `1px solid ${s.color}30`,
                      }}
                    >
                      <SubjectIcon subjectId={s.icon || s.code} size={24} color={s.color} />
                    </div>

                    <div className="flex flex-col items-end gap-1">
                      <span
                        className="rounded-full px-2 py-0.5 text-[10px] font-bold tracking-wider font-mono uppercase"
                        style={{
                          backgroundColor: `${s.color}15`,
                          color: s.color,
                          border: `1px solid ${s.color}30`,
                        }}
                      >
                        {s.code}
                      </span>
                      <span className="text-[10px] font-medium text-slate-500 max-w-[120px] truncate">
                        {s.filiere}
                      </span>
                    </div>
                  </div>

                  {/* Middle: Name & description */}
                  <div className="my-auto pt-2">
                    <h3 className="font-serif text-lg font-bold line-clamp-1" style={{ color: "var(--ink)" }}>
                      {s.name}
                    </h3>
                    <p className="mt-1 text-xs line-clamp-2 leading-relaxed" style={{ color: "var(--muted)" }}>
                      {s.description || "Aucune description renseignée."}
                    </p>
                  </div>

                  {/* Bottom: Action buttons */}
                  <div className="pt-3 border-t flex items-center justify-between" style={{ borderColor: "var(--line)" }}>
                    <span className="text-[10px] font-semibold text-slate-400 uppercase">
                      {s.category}
                    </span>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setEditingSubject(s)}
                        className="rounded-lg px-2 py-1 text-[11px] font-semibold bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition-colors"
                      >
                        Modifier
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteSubject(s.id, s.name)}
                        className="rounded-lg px-2 py-1 text-[11px] font-semibold bg-rose-50 text-rose-600 hover:bg-rose-100 transition-colors"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {filteredSubjects.length === 0 && (
            <div className="glass-card p-12 text-center rounded-3xl" style={{ borderStyle: "dashed" }}>
              <p className="font-serif text-lg" style={{ color: "var(--ink)" }}>
                Aucune matière trouvée pour cette filière ou ce filtre.
              </p>
              <Button
                type="button"
                onClick={() => setShowAddSubjectModal(true)}
                className="mt-4 text-xs font-semibold"
              >
                + Ajouter une matière pour {filiereFilter !== "all" ? filiereFilter : "cette filière"}
              </Button>
            </div>
          )}
        </div>
      )}

      {/* MODAL 1: AJOUTER UTILISATEUR */}
      {showAddUserModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-fade-in-up">
          <div
            className="w-full max-w-lg rounded-3xl p-6 sm:p-8"
            style={{
              background: "var(--paper-card)",
              border: "1px solid var(--line)",
              boxShadow: "0 20px 40px -10px rgba(0,0,0,0.2)",
            }}
          >
            <div className="flex items-center justify-between pb-4 border-b" style={{ borderColor: "var(--line)" }}>
              <div>
                <h2 className="font-serif text-2xl font-bold" style={{ color: "var(--ink)" }}>
                  Ajouter un nouvel utilisateur
                </h2>
                <p className="text-xs" style={{ color: "var(--muted)" }}>
                  Créer un compte Finance, Instructeur, Étudiant, Modérateur ou Parent.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowAddUserModal(false)}
                className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-black/5 text-slate-400"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="mt-5 space-y-4">
              {/* Role selection */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider mb-1" style={{ color: "var(--muted)" }}>
                  Rôle de l&apos;utilisateur *
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { role: UserType.FINANCE, label: "Finance", icon: "💰" },
                    { role: UserType.INSTRUCTOR, label: "Instructeur", icon: "👨‍🏫" },
                    { role: UserType.STUDENT, label: "Étudiant", icon: "🎓" },
                    { role: UserType.MODERATOR, label: "Modérateur", icon: "🛡️" },
                    { role: UserType.PARENT, label: "Parent", icon: "👨‍👩‍👦" },
                  ].map((r) => {
                    const isSelected = newUserForm.userType === r.role;
                    return (
                      <button
                        key={r.role}
                        type="button"
                        onClick={() => setNewUserForm({ ...newUserForm, userType: r.role })}
                        className="flex items-center gap-1.5 rounded-xl p-2.5 text-xs font-semibold transition-all text-left"
                        style={{
                          background: isSelected ? "var(--accent-glow)" : "rgba(15,23,42,0.03)",
                          color: isSelected ? "var(--accent)" : "var(--ink)",
                          border: isSelected ? "1.5px solid var(--accent)" : "1px solid var(--line)",
                        }}
                      >
                        <span>{r.icon}</span>
                        <span>{r.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Username & Email */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold mb-1" style={{ color: "var(--ink)" }}>
                    Nom d&apos;utilisateur *
                  </label>
                  <input
                    type="text"
                    required
                    value={newUserForm.username}
                    onChange={(e) => setNewUserForm({ ...newUserForm, username: e.target.value })}
                    placeholder="ex: prof_math"
                    className="w-full rounded-xl border px-3 py-2 text-sm outline-none focus:border-indigo-500"
                    style={{ borderColor: "var(--line)" }}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1" style={{ color: "var(--ink)" }}>
                    Adresse Email *
                  </label>
                  <input
                    type="email"
                    required
                    value={newUserForm.email}
                    onChange={(e) => setNewUserForm({ ...newUserForm, email: e.target.value })}
                    placeholder="utilisateur@karini.tn"
                    className="w-full rounded-xl border px-3 py-2 text-sm outline-none focus:border-indigo-500"
                    style={{ borderColor: "var(--line)" }}
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: "var(--ink)" }}>
                  Mot de passe provisoire *
                </label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={newUserForm.password}
                  onChange={(e) => setNewUserForm({ ...newUserForm, password: e.target.value })}
                  placeholder="Minimum 6 caractères"
                  className="w-full rounded-xl border px-3 py-2 text-sm outline-none focus:border-indigo-500"
                  style={{ borderColor: "var(--line)" }}
                />
              </div>

              {/* Firstname & Lastname */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold mb-1" style={{ color: "var(--ink)" }}>
                    Prénom (optionnel)
                  </label>
                  <input
                    type="text"
                    value={newUserForm.firstname}
                    onChange={(e) => setNewUserForm({ ...newUserForm, firstname: e.target.value })}
                    placeholder="Prénom"
                    className="w-full rounded-xl border px-3 py-2 text-sm outline-none focus:border-indigo-500"
                    style={{ borderColor: "var(--line)" }}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1" style={{ color: "var(--ink)" }}>
                    Nom (optionnel)
                  </label>
                  <input
                    type="text"
                    value={newUserForm.lastname}
                    onChange={(e) => setNewUserForm({ ...newUserForm, lastname: e.target.value })}
                    placeholder="Nom de famille"
                    className="w-full rounded-xl border px-3 py-2 text-sm outline-none focus:border-indigo-500"
                    style={{ borderColor: "var(--line)" }}
                  />
                </div>
              </div>

              {/* If student: Membership & credits */}
              {newUserForm.userType === UserType.STUDENT && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 rounded-2xl bg-indigo-50/50 border border-indigo-100">
                  <div>
                    <label className="block text-xs font-semibold mb-1 text-indigo-900">
                      Formule d&apos;abonnement
                    </label>
                    <select
                      value={newUserForm.membership}
                      onChange={(e) => setNewUserForm({ ...newUserForm, membership: e.target.value as MembershipType })}
                      className="w-full rounded-lg border bg-white px-2.5 py-1.5 text-xs font-medium"
                    >
                      <option value={MembershipType.DEFAULT}>Default (Gratuit)</option>
                      <option value={MembershipType.SILVER}>Silver</option>
                      <option value={MembershipType.GOLD}>Gold (Accès Archives)</option>
                      <option value={MembershipType.PLATINUM}>Platinum</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1 text-indigo-900">
                      Crédits initiaux
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={newUserForm.credits}
                      onChange={(e) => setNewUserForm({ ...newUserForm, credits: parseInt(e.target.value) || 0 })}
                      className="w-full rounded-lg border bg-white px-2.5 py-1.5 text-xs font-mono"
                    />
                  </div>
                </div>
              )}

              {/* Modal buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t" style={{ borderColor: "var(--line)" }}>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setShowAddUserModal(false)}
                  className="text-xs"
                >
                  Annuler
                </Button>
                <Button type="submit" disabled={submitting} className="text-xs font-bold">
                  {submitting ? "Création en cours…" : "Créer le compte"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: MODIFIER UTILISATEUR */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-fade-in-up">
          <div
            className="w-full max-w-lg rounded-3xl p-6 sm:p-8"
            style={{
              background: "var(--paper-card)",
              border: "1px solid var(--line)",
              boxShadow: "0 20px 40px -10px rgba(0,0,0,0.2)",
            }}
          >
            <div className="flex items-center justify-between pb-4 border-b" style={{ borderColor: "var(--line)" }}>
              <div>
                <h2 className="font-serif text-2xl font-bold" style={{ color: "var(--ink)" }}>
                  Modifier l&apos;utilisateur #{editingUser.id}
                </h2>
                <p className="text-xs" style={{ color: "var(--muted)" }}>
                  Ajuster le rôle, les crédits ou le statut du compte.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingUser(null)}
                className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-black/5 text-slate-400"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleUpdateUser} className="mt-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold mb-1" style={{ color: "var(--ink)" }}>
                    Nom d&apos;utilisateur
                  </label>
                  <input
                    type="text"
                    value={editingUser.username || ""}
                    onChange={(e) => setEditingUser({ ...editingUser, username: e.target.value })}
                    className="w-full rounded-xl border px-3 py-2 text-sm outline-none focus:border-indigo-500"
                    style={{ borderColor: "var(--line)" }}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1" style={{ color: "var(--ink)" }}>
                    Email
                  </label>
                  <input
                    type="email"
                    value={editingUser.email}
                    onChange={(e) => setEditingUser({ ...editingUser, email: e.target.value })}
                    className="w-full rounded-xl border px-3 py-2 text-sm outline-none focus:border-indigo-500"
                    style={{ borderColor: "var(--line)" }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold mb-1" style={{ color: "var(--ink)" }}>
                    Rôle
                  </label>
                  <select
                    value={editingUser.userType}
                    onChange={(e) => setEditingUser({ ...editingUser, userType: e.target.value })}
                    className="w-full rounded-xl border px-3 py-2 text-sm outline-none focus:border-indigo-500"
                    style={{ borderColor: "var(--line)" }}
                  >
                    <option value={UserType.STUDENT}>Étudiant</option>
                    <option value={UserType.INSTRUCTOR}>Instructeur</option>
                    <option value={UserType.FINANCE}>Finance</option>
                    <option value={UserType.MODERATOR}>Modérateur</option>
                    <option value={UserType.PARENT}>Parent</option>
                    <option value={UserType.SUPERADMIN}>Superadmin</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1" style={{ color: "var(--ink)" }}>
                    Membership
                  </label>
                  <select
                    value={editingUser.membership}
                    onChange={(e) => setEditingUser({ ...editingUser, membership: e.target.value })}
                    className="w-full rounded-xl border px-3 py-2 text-sm outline-none focus:border-indigo-500"
                    style={{ borderColor: "var(--line)" }}
                  >
                    <option value={MembershipType.DEFAULT}>Default</option>
                    <option value={MembershipType.SILVER}>Silver</option>
                    <option value={MembershipType.GOLD}>Gold</option>
                    <option value={MembershipType.PLATINUM}>Platinum</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: "var(--ink)" }}>
                  Solde de crédits
                </label>
                <input
                  type="number"
                  value={editingUser.credits}
                  onChange={(e) => setEditingUser({ ...editingUser, credits: parseInt(e.target.value) || 0 })}
                  className="w-full rounded-xl border px-3 py-2 text-sm outline-none focus:border-indigo-500 font-mono"
                  style={{ borderColor: "var(--line)" }}
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t" style={{ borderColor: "var(--line)" }}>
                <Button type="button" variant="secondary" onClick={() => setEditingUser(null)} className="text-xs">
                  Annuler
                </Button>
                <Button type="submit" disabled={submitting} className="text-xs font-bold">
                  {submitting ? "Enregistrement…" : "Enregistrer les modifications"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: AJOUTER MATIÈRE */}
      {showAddSubjectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-fade-in-up">
          <div
            className="w-full max-w-lg rounded-3xl p-6 sm:p-8"
            style={{
              background: "var(--paper-card)",
              border: "1px solid var(--line)",
              boxShadow: "0 20px 40px -10px rgba(0,0,0,0.2)",
            }}
          >
            <div className="flex items-center justify-between pb-4 border-b" style={{ borderColor: "var(--line)" }}>
              <div>
                <h2 className="font-serif text-2xl font-bold" style={{ color: "var(--ink)" }}>
                  Ajouter une nouvelle matière
                </h2>
                <p className="text-xs" style={{ color: "var(--muted)" }}>
                  Définissez une matière spécifique pour une filière (ex: 2ème Info, 2ème Math).
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowAddSubjectModal(false)}
                className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-black/5 text-slate-400"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateSubject} className="mt-5 space-y-4">
              {/* Filière Selection */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider mb-1" style={{ color: "var(--muted)" }}>
                  Filière d&apos;enseignement *
                </label>
                <select
                  value={newSubjectForm.filiere}
                  onChange={(e) => setNewSubjectForm({ ...newSubjectForm, filiere: e.target.value })}
                  className="w-full rounded-xl border px-3 py-2 text-sm outline-none focus:border-indigo-500 font-medium"
                  style={{ borderColor: "var(--line)" }}
                >
                  <option value="2ème Informatique">2ème Informatique</option>
                  <option value="2ème Math">2ème Math</option>
                  <option value="2ème Sciences">2ème Sciences</option>
                  <option value="2ème Économie & Services">2ème Économie & Services</option>
                  <option value="3ème Informatique">3ème Informatique</option>
                  <option value="3ème Math">3ème Math</option>
                  <option value="3ème Sciences Expérimentales">3ème Sciences Expérimentales</option>
                  <option value="Bac Informatique">Bac Informatique</option>
                  <option value="Bac Math">Bac Math</option>
                  <option value="Bac Sciences">Bac Sciences</option>
                  <option value="Tronc Commun">Tronc Commun</option>
                  <option value="custom">+ Autre filière personnalisée...</option>
                </select>

                {newSubjectForm.filiere === "custom" && (
                  <input
                    type="text"
                    required
                    placeholder="Saisissez le nom de la nouvelle filière (ex: 1ère Année)"
                    value={newSubjectForm.customFiliere}
                    onChange={(e) => setNewSubjectForm({ ...newSubjectForm, customFiliere: e.target.value })}
                    className="mt-2 w-full rounded-xl border px-3 py-2 text-sm outline-none focus:border-indigo-500"
                    style={{ borderColor: "var(--line)" }}
                  />
                )}
              </div>

              {/* Subject Name & Short Code */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold mb-1" style={{ color: "var(--ink)" }}>
                    Nom de la matière *
                  </label>
                  <input
                    type="text"
                    required
                    value={newSubjectForm.name}
                    onChange={(e) => setNewSubjectForm({ ...newSubjectForm, name: e.target.value })}
                    placeholder="ex: Algorithmique & Programmation"
                    className="w-full rounded-xl border px-3 py-2 text-sm outline-none focus:border-indigo-500"
                    style={{ borderColor: "var(--line)" }}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1" style={{ color: "var(--ink)" }}>
                    Code court *
                  </label>
                  <input
                    type="text"
                    required
                    value={newSubjectForm.code}
                    onChange={(e) => setNewSubjectForm({ ...newSubjectForm, code: e.target.value.toUpperCase() })}
                    placeholder="ex: ALGO"
                    className="w-full rounded-xl border px-3 py-2 text-sm outline-none focus:border-indigo-500 uppercase font-mono"
                    style={{ borderColor: "var(--line)" }}
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: "var(--ink)" }}>
                  Description du programme
                </label>
                <textarea
                  rows={2}
                  value={newSubjectForm.description}
                  onChange={(e) => setNewSubjectForm({ ...newSubjectForm, description: e.target.value })}
                  placeholder="Objectifs et notions clés abordées..."
                  className="w-full rounded-xl border px-3 py-2 text-sm outline-none focus:border-indigo-500"
                  style={{ borderColor: "var(--line)" }}
                />
              </div>

              {/* Icon & Color selector */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold mb-1" style={{ color: "var(--ink)" }}>
                    Icône illustrative
                  </label>
                  <select
                    value={newSubjectForm.icon}
                    onChange={(e) => setNewSubjectForm({ ...newSubjectForm, icon: e.target.value })}
                    className="w-full rounded-xl border px-3 py-2 text-sm outline-none focus:border-indigo-500"
                    style={{ borderColor: "var(--line)" }}
                  >
                    <option value="informatique">💻 Informatique / Code</option>
                    <option value="math">📐 Mathématiques</option>
                    <option value="physique">⚡ Physique - Chimie</option>
                    <option value="science">🧬 Sciences (SVT)</option>
                    <option value="francais">📖 Français</option>
                    <option value="anglais">🌍 Anglais</option>
                    <option value="arabe">📜 Arabe</option>
                    <option value="philosophie">💡 Philosophie</option>
                    <option value="economie">📈 Économie & Gestion</option>
                    <option value="histoire_geo">🧭 Histoire - Géo</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1" style={{ color: "var(--ink)" }}>
                    Couleur d&apos;accent
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={newSubjectForm.color}
                      onChange={(e) => setNewSubjectForm({ ...newSubjectForm, color: e.target.value })}
                      className="h-9 w-12 cursor-pointer rounded-lg border p-0.5"
                    />
                    <input
                      type="text"
                      value={newSubjectForm.color}
                      onChange={(e) => setNewSubjectForm({ ...newSubjectForm, color: e.target.value })}
                      className="w-full rounded-xl border px-3 py-2 text-xs font-mono uppercase"
                      style={{ borderColor: "var(--line)" }}
                    />
                  </div>
                </div>
              </div>

              {/* Topics tags */}
              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: "var(--ink)" }}>
                  Mots-clés / Chapitres (séparés par des virgules)
                </label>
                <input
                  type="text"
                  value={newSubjectForm.topics}
                  onChange={(e) => setNewSubjectForm({ ...newSubjectForm, topics: e.target.value })}
                  placeholder="ex: Python, Tableaux, Récursivité"
                  className="w-full rounded-xl border px-3 py-2 text-sm outline-none focus:border-indigo-500"
                  style={{ borderColor: "var(--line)" }}
                />
              </div>

              {/* Modal buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t" style={{ borderColor: "var(--line)" }}>
                <Button type="button" variant="secondary" onClick={() => setShowAddSubjectModal(false)} className="text-xs">
                  Annuler
                </Button>
                <Button type="submit" disabled={submitting} className="text-xs font-bold">
                  {submitting ? "Ajout en cours…" : "Ajouter la matière"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: MODIFIER MATIÈRE */}
      {editingSubject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-fade-in-up">
          <div
            className="w-full max-w-lg rounded-3xl p-6 sm:p-8"
            style={{
              background: "var(--paper-card)",
              border: "1px solid var(--line)",
              boxShadow: "0 20px 40px -10px rgba(0,0,0,0.2)",
            }}
          >
            <div className="flex items-center justify-between pb-4 border-b" style={{ borderColor: "var(--line)" }}>
              <div>
                <h2 className="font-serif text-2xl font-bold" style={{ color: "var(--ink)" }}>
                  Modifier la matière #{editingSubject.id}
                </h2>
                <p className="text-xs" style={{ color: "var(--muted)" }}>
                  Mettre à jour le nom, la filière ou la configuration.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingSubject(null)}
                className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-black/5 text-slate-400"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleUpdateSubject} className="mt-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold mb-1" style={{ color: "var(--ink)" }}>
                    Nom de la matière
                  </label>
                  <input
                    type="text"
                    required
                    value={editingSubject.name}
                    onChange={(e) => setEditingSubject({ ...editingSubject, name: e.target.value })}
                    className="w-full rounded-xl border px-3 py-2 text-sm outline-none focus:border-indigo-500"
                    style={{ borderColor: "var(--line)" }}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1" style={{ color: "var(--ink)" }}>
                    Code court
                  </label>
                  <input
                    type="text"
                    required
                    value={editingSubject.code}
                    onChange={(e) => setEditingSubject({ ...editingSubject, code: e.target.value.toUpperCase() })}
                    className="w-full rounded-xl border px-3 py-2 text-sm outline-none focus:border-indigo-500 font-mono"
                    style={{ borderColor: "var(--line)" }}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: "var(--ink)" }}>
                  Filière
                </label>
                <input
                  type="text"
                  required
                  value={editingSubject.filiere}
                  onChange={(e) => setEditingSubject({ ...editingSubject, filiere: e.target.value })}
                  className="w-full rounded-xl border px-3 py-2 text-sm outline-none focus:border-indigo-500"
                  style={{ borderColor: "var(--line)" }}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: "var(--ink)" }}>
                  Description
                </label>
                <textarea
                  rows={2}
                  value={editingSubject.description || ""}
                  onChange={(e) => setEditingSubject({ ...editingSubject, description: e.target.value })}
                  className="w-full rounded-xl border px-3 py-2 text-sm outline-none focus:border-indigo-500"
                  style={{ borderColor: "var(--line)" }}
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t" style={{ borderColor: "var(--line)" }}>
                <Button type="button" variant="secondary" onClick={() => setEditingSubject(null)} className="text-xs">
                  Annuler
                </Button>
                <Button type="submit" disabled={submitting} className="text-xs font-bold">
                  {submitting ? "Enregistrement…" : "Enregistrer les modifications"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function getRoleBadgeColor(role: string): string {
  switch (role) {
    case UserType.SUPERADMIN:
      return "#e11d48"; // Rose/Red
    case UserType.FINANCE:
      return "#059669"; // Emerald
    case UserType.INSTRUCTOR:
      return "#4f46e5"; // Indigo
    case UserType.MODERATOR:
      return "#d97706"; // Amber
    case UserType.PARENT:
      return "#0d9488"; // Teal
    case UserType.STUDENT:
    default:
      return "#0284c7"; // Sky
  }
}
