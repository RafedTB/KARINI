import type { ButtonHTMLAttributes } from "react";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost";
};

const variantClass: Record<NonNullable<ButtonProps["variant"]>, string> = {
  primary:
    "bg-[var(--ink)] text-[var(--paper)] hover:bg-[#2a3531] disabled:opacity-60",
  secondary:
    "border border-[var(--line)] bg-white/40 hover:border-[var(--ink)]/30",
  ghost: "text-[var(--muted)] hover:text-[var(--ink)]",
};

export function Button({ variant = "primary", className = "", ...props }: ButtonProps) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-full px-5 py-2.5 text-sm font-medium transition ${variantClass[variant]} ${className}`}
      {...props}
    />
  );
}
