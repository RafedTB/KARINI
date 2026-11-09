"use client";

import { useMemo, useState } from "react";
import type { Filiere } from "@/domain/entities/filiere";
import { subjectsService } from "@/application/services/subjects-service";
import { SearchInput } from "@/presentation/components/ui/search-input";
import { Button } from "@/presentation/components/ui/button";
import {
  SchoolIcon,
  GraduationCapIcon,
  BookOpenIcon,
} from "@/presentation/components/ui/icons";

type AdminFilieresTabProps = {
  filieresDetailed: Filiere[];
  token: string;
  onRefresh: () => void;
  showNotification: (msg: string) => void;
  onSelectFiliereForCourses?: (filiereName: string) => void;
  onSelectFiliereForSubjects?: (filiereName: string) => void;
};

const PRESET_CYCLES = [
  "Baccalauréat (4ème Année)",
  "3ème Année Secondaire",
  "2ème Année Secondaire",
  "1ère Année Secondaire",
  "Collège (Enseignement de Base)",
  "Enseignement Supérieur",
  "Autre Formation",
];

export function AdminFilieresTab({
  filieresDetailed,
  token,
  onRefresh,
  showNotification,
  onSelectFiliereForCourses,
  onSelectFiliereForSubjects,
}: AdminFilieresTabProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [cycleFilter, setCycleFilter] = useState("all");

  // Modals state
  const [showModal, setShowModal] = useState(false);
  const [editingFiliere, setEditingFiliere] = useState<Filiere | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Form state
  const [form, setForm] = useState({
    name: "",
    cycle: "Baccalauréat (4ème Année)",
    customCycle: "",
    description: "",
  });

  const availableCycles = useMemo(() => {
    const set = new Set<string>();
    filieresDetailed.forEach((f) => {
      if (f.cycle) set.add(f.cycle.trim());
    });
    return Array.from(set).sort();
  }, [filieresDetailed]);

  const filteredFilieres = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return filieresDetailed.filter((f) => {
      const matchesCycle =
        cycleFilter === "all" ||
        (f.cycle && f.cycle.toLowerCase().includes(cycleFilter.toLowerCase()));

      const matchesSearch =
        !q ||
        f.name.toLowerCase().includes(q) ||
        (f.cycle && f.cycle.toLowerCase().includes(q)) ||
        (f.description && f.description.toLowerCase().includes(q));

      return matchesCycle && matchesSearch;
    });
  }, [filieresDetailed, cycleFilter, searchQuery]);

  const handleOpenAdd = () => {
    setEditingFiliere(null);
    setForm({
      name: "",
      cycle: "Baccalauréat (4ème Année)",
      customCycle: "",
      description: "",
    });
    setErrorMsg("");
    setShowModal(true);
  };

  const handleOpenEdit = (f: Filiere) => {
    setEditingFiliere(f);
    const isPreset = PRESET_CYCLES.includes(f.cycle || "");
    setForm({
      name: f.name,
      cycle: isPreset ? f.cycle || "Baccalauréat (4ème Année)" : "Autre",
      customCycle: isPreset ? "" : f.cycle || "",
      description: f.description || "",
    });
    setErrorMsg("");
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    if (!form.name.trim()) {
      setErrorMsg("Le nom de la filière est requis.");
      return;
    }

    const finalCycle =
      form.cycle === "Autre" ? form.customCycle.trim() || "Secondaire" : form.cycle;

    try {
      setSubmitting(true);
      setErrorMsg("");

      if (editingFiliere) {
        await subjectsService.updateFiliere(token, editingFiliere.id, {
          name: form.name.trim(),
          cycle: finalCycle,
          description: form.description.trim() || undefined,
        });
        showNotification(`Filière "${form.name}" mise à jour avec succès dans la base de données !`);
      } else {
        await subjectsService.createFiliere(token, {
          name: form.name.trim(),
          cycle: finalCycle,
          description: form.description.trim() || undefined,
        });
        showNotification(`Nouvelle filière "${form.name}" enregistrée dans la base de données !`);
      }

      setShowModal(false);
      onRefresh();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Erreur lors de l'enregistrement de la filière.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (filiere: Filiere) => {
    if (!token) return;
    const warning = filiere.subjectsCount && filiere.subjectsCount > 0
      ? `Attention: Cette filière contient ${filiere.subjectsCount} matière(s) et ${filiere.coursesCount || 0} cours. Supprimer définitivement "${filiere.name}" ?`
      : `Supprimer définitivement la filière "${filiere.name}" de la base de données ?`;

    if (!confirm(warning)) return;

    try {
      await subjectsService.deleteFiliere(token, filiere.id);
      showNotification(`La filière "${filiere.name}" a été supprimée de la base de données.`);
      onRefresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Erreur lors de la suppression.");
    }
  };

  const getCycleBadgeColor = (cycle?: string | null) => {
    const c = (cycle || "").toLowerCase();
    if (c.includes("bac")) return "bg-rose-50 text-rose-700 border-rose-200";
    if (c.includes("3ème") || c.includes("3eme")) return "bg-purple-50 text-purple-700 border-purple-200";
    if (c.includes("2ème") || c.includes("2eme")) return "bg-indigo-50 text-indigo-700 border-indigo-200";
    if (c.includes("1ère") || c.includes("1ere")) return "bg-blue-50 text-blue-700 border-blue-200";
    if (c.includes("collège") || c.includes("base")) return "bg-amber-50 text-amber-700 border-amber-200";
    return "bg-slate-100 text-slate-700 border-slate-200";
  };

  return (
    <div className="space-y-6">
      {/* Top Controls Bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 flex-wrap items-center gap-3">
          <SearchInput
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Rechercher une filière ou niveau..."
          />

          {/* Cycle Filter */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold" style={{ color: "var(--muted)" }}>
              Cycle :
            </span>
            <select
              value={cycleFilter}
              onChange={(e) => setCycleFilter(e.target.value)}
              className="rounded-xl border bg-white/90 px-3 py-1.5 text-xs font-semibold outline-none transition-all focus:border-indigo-500 cursor-pointer shadow-xs"
              style={{ borderColor: "var(--line)", color: "var(--ink)" }}
            >
              <option value="all">Tous les cycles ({filieresDetailed.length})</option>
              {availableCycles.map((cycle) => (
                <option key={cycle} value={cycle}>
                  {cycle}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Add Filière Button */}
        <Button
          type="button"
          onClick={handleOpenAdd}
          className="flex items-center gap-2 rounded-xl text-xs sm:text-sm font-bold shadow-md cursor-pointer shrink-0"
          style={{ background: "linear-gradient(135deg, #059669, #0284c7)" }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          + Ajouter une Filière
        </Button>
      </div>

      {/* Grid of Filières */}
      {filteredFilieres.length === 0 ? (
        <div
          className="glass-card px-8 py-16 text-center rounded-3xl"
          style={{ borderStyle: "dashed" }}
        >
          <div
            className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl mb-4 bg-emerald-50 text-emerald-600"
          >
            <SchoolIcon size={28} />
          </div>
          <h3 className="font-serif text-xl font-bold" style={{ color: "var(--ink)" }}>
            Aucune filière trouvée
          </h3>
          <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">
            Aucune filière ne correspond aux filtres de recherche actuels.
          </p>
          <div className="mt-5">
            <Button type="button" onClick={handleOpenAdd} className="text-xs font-semibold">
              + Ajouter une nouvelle filière
            </Button>
          </div>
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {filteredFilieres.map((f) => {
            const cycleColor = getCycleBadgeColor(f.cycle);

            return (
              <div
                key={f.id}
                className="glass-card group flex flex-col justify-between rounded-3xl p-5 border transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5"
                style={{
                  background: "var(--paper-card)",
                  borderColor: "var(--line)",
                }}
              >
                <div>
                  {/* Cycle Badge & Emoji */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider border ${cycleColor}`}
                    >
                      <SchoolIcon size={12} />
                      <span>{f.cycle || "Cycle Secondaire"}</span>
                    </span>

                    <span className="text-[11px] font-mono text-slate-400">
                      ID #{f.id}
                    </span>
                  </div>

                  {/* Filière Name */}
                  <h4 className="font-serif text-lg font-bold text-slate-900 leading-snug">
                    {f.name}
                  </h4>

                  {/* Description */}
                  <p className="mt-1.5 text-xs text-slate-500 line-clamp-2 leading-relaxed">
                    {f.description || "Filière académique officielle inscrite dans la base de données."}
                  </p>

                  {/* Statistics Badges */}
                  <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-50 font-bold text-indigo-700 border border-indigo-100">
                      <BookOpenIcon size={12} className="text-indigo-600" />
                      <span>{f.subjectsCount || 0} {f.subjectsCount === 1 ? "matière" : "matières"}</span>
                    </span>
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 font-bold text-emerald-700 border border-emerald-100">
                      <GraduationCapIcon size={12} className="text-emerald-600" />
                      <span>{f.coursesCount || 0} {f.coursesCount === 1 ? "cours" : "cours"}</span>
                    </span>
                  </div>
                </div>

                {/* Card Actions Footer */}
                <div className="mt-5 pt-3 border-t flex items-center justify-between gap-2" style={{ borderColor: "var(--line)" }}>
                  <div className="flex items-center gap-1">
                    {onSelectFiliereForCourses && (
                      <button
                        type="button"
                        onClick={() => onSelectFiliereForCourses(f.name)}
                        className="px-2 py-1 text-xs font-semibold text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                        title="Voir et ajouter des cours pour cette filière"
                      >
                        Cours →
                      </button>
                    )}
                    {onSelectFiliereForSubjects && (
                      <button
                        type="button"
                        onClick={() => onSelectFiliereForSubjects(f.name)}
                        className="px-2 py-1 text-xs font-semibold text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                        title="Voir et ajouter des matières pour cette filière"
                      >
                        Matières →
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleOpenEdit(f)}
                      title="Modifier la filière"
                      className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                    >
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(f)}
                      title="Supprimer la filière de la base de données"
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                    >
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* =========================================================================
          MODAL: AJOUTER / MODIFIER FILIÈRE
          ========================================================================= */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-lg rounded-3xl bg-white p-6 sm:p-8 shadow-2xl border border-slate-100 animate-scale-up">
            <div className="flex items-center justify-between border-b pb-4 mb-5">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-600">
                  {editingFiliere ? "Édition de Filière" : "Nouvelle Filière Direct Base de Données"}
                </span>
                <h3 className="font-serif text-2xl font-bold text-slate-900">
                  {editingFiliere ? `Modifier ${editingFiliere.name}` : "Ajouter une Filière"}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {errorMsg && (
                <div className="rounded-xl bg-rose-50 border border-rose-200 px-3.5 py-2 text-xs font-medium text-rose-700">
                  {errorMsg}
                </div>
              )}

              {/* Nom de la filière */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Nom de la filière / classe *
                </label>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Ex: Bac Informatique, 4ème Sciences, etc."
                  className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 focus:border-emerald-600 focus:outline-none"
                />
              </div>

              {/* Cycle scolaire */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Cycle Scolaire *
                </label>
                <select
                  value={form.cycle}
                  onChange={(e) => setForm({ ...form, cycle: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm font-semibold text-slate-900 focus:border-emerald-600 focus:outline-none"
                >
                  {PRESET_CYCLES.map((cycle) => (
                    <option key={cycle} value={cycle}>
                      {cycle}
                    </option>
                  ))}
                  <option value="Autre">Autre cycle (personnalisé)...</option>
                </select>

                {form.cycle === "Autre" && (
                  <input
                    type="text"
                    required
                    value={form.customCycle}
                    onChange={(e) => setForm({ ...form, customCycle: e.target.value })}
                    placeholder="Saisissez le nom du cycle..."
                    className="mt-2 w-full rounded-xl border border-slate-300 px-3.5 py-2 text-xs text-slate-900 focus:border-emerald-600 focus:outline-none"
                  />
                )}
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Description / Spécificités
                </label>
                <textarea
                  rows={3}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Description du programme et des compétences visées..."
                  className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm text-slate-900 focus:border-emerald-600 focus:outline-none"
                />
              </div>

              {/* Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setShowModal(false)}
                  disabled={submitting}
                  className="text-xs"
                >
                  Annuler
                </Button>
                <Button
                  type="submit"
                  disabled={submitting}
                  className="text-xs font-bold"
                  style={{ background: "linear-gradient(135deg, #059669, #0284c7)" }}
                >
                  {submitting
                    ? "Enregistrement..."
                    : editingFiliere
                    ? "Mettre à jour"
                    : "Créer dans la base"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

