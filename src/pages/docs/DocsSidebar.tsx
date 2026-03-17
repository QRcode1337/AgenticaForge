interface DocsSidebarProps {
  activeSectionId: string
  onSectionChange: (id: string) => void
}

const SECTIONS = [
  { id: 'getting-started', label: 'Getting Started' },
  { id: 'architecture', label: 'Architecture' },
  { id: 'memory-engine', label: 'Memory Engine' },
  { id: 'swarm-simulator', label: 'Swarm Simulator' },
  { id: 'panel-guide', label: 'Panel Guide' },
  { id: 'api-reference', label: 'API Reference' },
]

export default function DocsSidebar({ activeSectionId, onSectionChange }: DocsSidebarProps) {
  return (
    <aside className="w-60 fixed left-0 top-16 h-[calc(100vh-4rem)] bg-forge-bg border-r border-forge-border overflow-y-auto">
      <nav className="flex flex-col py-6">
        {SECTIONS.map((section) => {
          const isActive = activeSectionId === section.id
          return (
            <button
              key={section.id}
              onClick={() => onSectionChange(section.id)}
              className={`
                text-left px-6 py-3 font-mono text-xs uppercase tracking-wider
                transition-colors duration-150 cursor-pointer
                ${isActive
                  ? 'border-l-2 border-forge-cta text-forge-text'
                  : 'border-l-2 border-transparent text-forge-dim hover:text-forge-text'
                }
              `}
            >
              {section.label}
            </button>
          )
        })}
      </nav>
    </aside>
  )
}
