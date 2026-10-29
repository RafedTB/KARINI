import type { ReactNode } from "react";

type StatCardProps = {
  label: string;
  value: string | number;
  icon: string;
  iconBg: string;
  iconColor: string;
  valueColor?: string;
  footer?: ReactNode;
};

export function StatCard({
  label,
  value,
  icon,
  iconBg,
  iconColor,
  valueColor,
  footer,
}: StatCardProps) {
  return (
    <div className="glass-card p-5 rounded-2xl flex flex-col justify-between">
      <div
        className="flex items-center justify-between text-xs font-semibold"
        style={{ color: "var(--muted)" }}
      >
        <span>{label}</span>
        <span
          className="p-1.5 rounded-lg"
          style={{ backgroundColor: iconBg, color: iconColor }}
        >
          {icon}
        </span>
      </div>
      <div className="mt-3">
        <span
          className={`font-serif text-3xl font-bold ${!valueColor ? "gradient-text" : ""}`}
          style={valueColor ? { color: valueColor } : undefined}
        >
          {value}
        </span>
        {footer && <div className="mt-1">{footer}</div>}
      </div>
    </div>
  );
}
