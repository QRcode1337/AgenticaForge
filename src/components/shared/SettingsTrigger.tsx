interface SettingsTriggerProps {
  onOpen: () => void
  expanded: boolean
}

export default function SettingsTrigger({ onOpen, expanded }: SettingsTriggerProps) {
  return (
    <button
      onClick={(e) => {
        e.stopPropagation()
        onOpen()
      }}
      className="flex items-center gap-2 px-3 py-1.5 text-forge-dim hover:text-forge-cta transition-colors cursor-pointer"
      title="Settings"
      aria-label="Open settings"
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
        <circle cx="7" cy="7" r="2.5" />
        <path d="M7 1v1.5M7 11.5V13M1 7h1.5M11.5 7H13M2.8 2.8l1.06 1.06M10.14 10.14l1.06 1.06M2.8 11.2l1.06-1.06M10.14 3.86l1.06-1.06" />
      </svg>
      {expanded && (
        <span className="text-[10px] font-mono uppercase tracking-wider whitespace-nowrap overflow-hidden">
          SETTINGS
        </span>
      )}
    </button>
  )
}
