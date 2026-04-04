interface PanelHeaderProps {
  panelNumber: number
  title: string
  stats?: string
}

export default function PanelHeader({ panelNumber, title, stats }: PanelHeaderProps) {
  const num = String(panelNumber).padStart(2, '0')

  return (
    <div className="shrink-0 px-5 pt-4 pb-3 border-b border-forge-border">
      <div className="text-forge-cta text-[9px] uppercase tracking-[0.2em] mb-1">
        // PANEL {num}
      </div>
      <div className="flex items-baseline gap-3">
        <span className="text-forge-text text-sm uppercase tracking-[0.12em]">
          {title}
        </span>
        {stats && (
          <span className="text-forge-dim text-[10px]">{stats}</span>
        )}
      </div>
    </div>
  )
}
