import { useMemo } from "react";
import type { Subject } from "@/domain/entities/subject";
import { SubjectIcon } from "@/presentation/features/courses/subject-icons";
import { SearchInput } from "@/presentation/components/ui/search-input";
import { Button } from "@/presentation/components/ui/button";

type AdminSubjectsTabProps = {
  subjects: Subject[];
  filieres: string[];
  filiereFilter: string;
  setFiliereFilter: (v: string) => void;
  subjectSearch: string;
  setSubjectSearch: (v: string) => void;
  onEdit: (subject: Subject) => void;
  onDelete: (id: number, name: string) => void;
  onAddNew: () => void;
};

export function AdminSubjectsTab({
  subjects,
  filieres,
  filiereFilter,
  setFiliereFilter,
  subjectSearch,
  setSubjectSearch,
  onEdit,
  onDelete,
  onAddNew,
}: AdminSubjectsTabProps) {
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

  return (
    <div className="space-y-6">
      {/* Controls bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <SearchInput
          value={subjectSearch}
          onChange={setSubjectSearch}
          placeholder="Rechercher une matière ou code..."
        />

        {/* Filière Filter Dropdown */}
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
        {filteredSubjects.map((s) => (
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
              <span className="text-[10px] font-semibold text-slate-400 uppercase">{s.category}</span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => onEdit(s)}
                  className="rounded-lg px-2 py-1 text-[11px] font-semibold bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition-colors"
                >
                  Modifier
                </button>
                <button
                  type="button"
                  onClick={() => onDelete(s.id, s.name)}
                  className="rounded-lg px-2 py-1 text-[11px] font-semibold bg-rose-50 text-rose-600 hover:bg-rose-100 transition-colors"
                >
                  ✕
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredSubjects.length === 0 && (
        <div className="glass-card p-12 text-center rounded-3xl" style={{ borderStyle: "dashed" }}>
          <p className="font-serif text-lg" style={{ color: "var(--ink)" }}>
            Aucune matière trouvée pour cette filière ou ce filtre.
          </p>
          <Button type="button" onClick={onAddNew} className="mt-4 text-xs font-semibold">
            + Ajouter une matière pour {filiereFilter !== "all" ? filiereFilter : "cette filière"}
          </Button>
        </div>
      )}
    </div>
  );
}
