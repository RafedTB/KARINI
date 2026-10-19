export function PageLoader({ label }: { label: string }) {
  return (
    <div className="flex min-h-[40vh] items-center justify-center">
      <p className="text-sm text-[var(--muted)]">{label}</p>
    </div>
  );
}
