import type { ReactNode } from "react";

type ModalWrapperProps = {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: ReactNode;
  maxWidth?: string;
};

export function ModalWrapper({
  title,
  subtitle,
  onClose,
  children,
  maxWidth = "max-w-lg",
}: ModalWrapperProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-fade-in-up">
      <div
        className={`w-full ${maxWidth} rounded-3xl p-6 sm:p-8 max-h-[92vh] overflow-y-auto`}
        style={{
          background: "var(--paper-card)",
          border: "1px solid var(--line)",
          boxShadow: "0 20px 40px -10px rgba(0,0,0,0.2)",
        }}
      >
        <div
          className="flex items-center justify-between pb-4 border-b"
          style={{ borderColor: "var(--line)" }}
        >
          <div>
            <h2
              className="font-serif text-2xl font-bold"
              style={{ color: "var(--ink)" }}
            >
              {title}
            </h2>
            {subtitle && (
              <p className="text-xs" style={{ color: "var(--muted)" }}>
                {subtitle}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-black/5 text-slate-400"
          >
            ✕
          </button>
        </div>
        <div className="mt-5">{children}</div>
      </div>
    </div>
  );
}
