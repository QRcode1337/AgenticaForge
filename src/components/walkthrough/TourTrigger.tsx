// src/components/walkthrough/TourTrigger.tsx

interface TourTriggerProps {
  onRestart: () => void
  expanded: boolean
}

export default function TourTrigger({ onRestart, expanded }: TourTriggerProps) {
  return (
    <button
      onClick={(e) => {
        e.stopPropagation()
        onRestart()
      }}
      className="flex items-center gap-2 px-3 py-1.5 text-forge-dim hover:text-forge-cta transition-colors cursor-pointer"
      title="Replay tour"
      aria-label="Replay walkthrough tour"
    >
      <svg
        width="14"
        height="14"
        viewBox="0 0 14 14"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="7" cy="7" r="5.5" />
        <text
          x="7"
          y="10"
          textAnchor="middle"
          fill="currentColor"
          stroke="none"
          fontSize="8"
          fontFamily="monospace"
          fontWeight="bold"
        >
          ?
        </text>
      </svg>
      {expanded && (
        <span className="text-[10px] font-mono uppercase tracking-wider whitespace-nowrap overflow-hidden">
          TOUR
        </span>
      )}
    </button>
  )
}
