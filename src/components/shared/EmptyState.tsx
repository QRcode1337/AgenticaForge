interface EmptyStateProps {
  icon: string
  status: string
  copy: string
  ctaLabel: string
  onCta: () => void
}

export default function EmptyState({ icon, status, copy, ctaLabel, onCta }: EmptyStateProps) {
  return (
    <div className="flex flex-1 items-center justify-center">
      <div className="flex flex-col items-center">
        <span className="text-[32px] opacity-30 mb-4">{icon}</span>
        <span className="text-forge-muted text-[11px] uppercase tracking-[0.15em] mb-2">
          {status}
        </span>
        <span className="text-forge-dim text-xs mb-5">{copy}</span>
        <button
          onClick={onCta}
          className="border border-forge-cta/25 text-forge-cta px-5 py-2 text-[11px] uppercase tracking-[0.1em] font-mono cursor-pointer hover:border-forge-cta/50 transition-colors"
        >
          {ctaLabel}
        </button>
      </div>
    </div>
  )
}
