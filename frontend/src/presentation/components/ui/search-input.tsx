type SearchInputProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
};

export function SearchInput({
  value,
  onChange,
  placeholder = "Rechercher...",
  className = "",
}: SearchInputProps) {
  return (
    <div className={`relative flex-1 max-w-sm ${className}`}>
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
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border bg-white/70 pl-9 pr-3 py-2 text-sm outline-none transition-all focus:border-indigo-500 focus:bg-white"
        style={{ borderColor: "var(--line)", color: "var(--ink)" }}
      />
    </div>
  );
}
