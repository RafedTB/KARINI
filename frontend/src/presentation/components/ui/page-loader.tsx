export function PageLoader({ label }: { label: string }) {
  return (
    <div className="flex min-h-[40vh] items-center justify-center animate-fade-in">
      <div className="flex flex-col items-center gap-4">
        <div className="relative h-10 w-10">
          <div
            className="absolute inset-0 rounded-full border-2 border-transparent"
            style={{
              borderTopColor: "var(--accent)",
              animation: "spin 0.8s linear infinite",
            }}
          />
          <div
            className="absolute inset-1 rounded-full border-2 border-transparent"
            style={{
              borderBottomColor: "var(--gradient-end)",
              animation: "spin 1.2s linear infinite reverse",
            }}
          />
        </div>
        <p className="text-sm" style={{ color: "var(--muted)" }}>{label}</p>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
