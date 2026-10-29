type NotificationBannerProps = {
  successMsg?: string;
  errorMsg?: string;
};

export function NotificationBanner({ successMsg, errorMsg }: NotificationBannerProps) {
  return (
    <>
      {successMsg && (
        <div className="rounded-2xl bg-emerald-500/10 border border-emerald-500/20 px-4 py-3 text-sm font-medium text-emerald-600 flex items-center gap-2 animate-fade-in-up">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
            <polyline points="22 4 12 14.01 9 11.01" />
          </svg>
          {successMsg}
        </div>
      )}
      {errorMsg && (
        <div className="alert-error" role="alert">
          {errorMsg}
        </div>
      )}
    </>
  );
}
