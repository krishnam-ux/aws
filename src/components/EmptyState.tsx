interface EmptyStateProps {
  title: string;
  description: string;
  badgeText?: string;
  actionHref?: string;
  actionLabel?: string;
}

export default function EmptyState({
  title,
  description,
  badgeText = 'Notice',
  actionHref,
  actionLabel
}: EmptyStateProps) {
  return (
    <div className="tech-card rounded-lg p-8 sm:p-12 text-center max-w-xl mx-auto border border-slate-200 bg-white shadow-sm">
      <div className="mx-auto h-12 w-12 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center mb-6">
        <svg
          className="h-5 w-5 text-slate-500"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth="2"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M9.813 15.904L9 21L14.907 18m5.254-4.83a9.003 9.003 0 11-13.805-5.2a9.003 9.003 0 0113.805 5.2z"
          />
        </svg>
      </div>
      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 border border-slate-200 text-slate-600 mb-4 tracking-wider uppercase font-sans">
        {badgeText}
      </span>
      <h3 className="font-display font-bold text-base text-slate-900 mb-2">{title}</h3>
      <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed mb-6">{description}</p>
      {actionHref && actionLabel && (
        <a
          href={actionHref}
          className="btn-secondary py-2 text-xs"
        >
          {actionLabel}
        </a>
      )}
    </div>
  );
}
