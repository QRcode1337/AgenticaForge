import type { ActionType } from './types.ts'
import { ACTION_REGISTRY } from './schemas.ts'

const TXT = {
  fg4:    '#a89984',
  gray:   '#928374',
  aqua:   '#8ec07c',
  purple: '#d3869b',
  blue:   '#83a598',
}

// Actions that have required fields → open form
const FORM_ACTIONS = new Set<ActionType>([
  'MEMORY_STORE',
  'MEMORY_SEARCH',
  'MEMORY_DELETE',
  'DB_EXPORT',
  'AGENTICA_CATALOG',
])

interface ActionButton {
  action: ActionType
  label: string
}

interface ActionGroup {
  title: string
  accent: string
  buttons: ActionButton[]
}

const GROUPS: ActionGroup[] = [
  {
    title: 'MEMORY OPERATIONS',
    accent: TXT.aqua,
    buttons: [
      { action: 'MEMORY_STORE', label: 'STORE' },
      { action: 'MEMORY_SEARCH', label: 'SEARCH' },
      { action: 'MEMORY_STATS', label: 'STATS' },
      { action: 'MEMORY_TIERS', label: 'TIERS' },
      { action: 'MEMORY_NAMESPACES', label: 'NAMESPACES' },
      { action: 'MEMORY_PURGE_COLD', label: 'PURGE COLD' },
    ],
  },
  {
    title: 'SWARM ORCHESTRATION',
    accent: TXT.purple,
    buttons: [
      { action: 'SWARM_START', label: 'START' },
      { action: 'SWARM_STOP', label: 'STOP' },
      { action: 'SWARM_STATUS', label: 'STATUS' },
      { action: 'SWARM_AGENTS', label: 'AGENTS' },
    ],
  },
  {
    title: 'AGENTDB ENGINE',
    accent: TXT.blue,
    buttons: [
      { action: 'DB_STATS', label: 'STATS' },
      { action: 'DB_PATTERNS', label: 'PATTERNS' },
      { action: 'DB_EXPORT', label: 'EXPORT' },
    ],
  },
  {
    title: 'AGENTICA',
    accent: '#F97316',
    buttons: [
      { action: 'AGENTICA_CATALOG', label: 'CATALOG' },
      { action: 'AGENTICA_STATUS', label: 'STATUS' },
      { action: 'AGENTICA_PROVIDERS', label: 'PROVIDERS' },
    ],
  },
]

interface QuickActionsProps {
  onFormAction: (action: ActionType) => void
  onDirectAction: (action: ActionType) => void
}

export default function QuickActions({ onFormAction, onDirectAction }: QuickActionsProps) {
  const handleClick = (action: ActionType) => {
    if (FORM_ACTIONS.has(action)) {
      onFormAction(action)
    } else {
      onDirectAction(action)
    }
  }

  return (
    <>
      {/* Header */}
      <div
        className="flex flex-shrink-0 items-center px-4 py-2"
        style={{ borderBottom: '1px solid rgba(60, 56, 54, 0.4)' }}
      >
        <span className="font-mono text-xs font-bold uppercase tracking-wider" style={{ color: '#ebdbb2' }}>
          QUICK_ACTIONS
        </span>
        <div className="flex-1" />
        <button
          onClick={() => onDirectAction('UTILITY_HELP')}
          className="font-mono text-[10px] uppercase tracking-wider transition-colors hover:underline"
          style={{ color: TXT.gray }}
        >
          HELP
        </button>
      </div>

      {/* Action panels */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5">
        {GROUPS.map((group) => (
          <div key={group.title}>
            <div className="flex items-center gap-2 mb-2">
              <span className="inline-block h-1.5 w-1.5" style={{ backgroundColor: group.accent }} />
              <span
                className="font-mono text-[10px] font-bold uppercase tracking-wider"
                style={{ color: group.accent }}
              >
                {group.title}
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {group.buttons.map((btn) => {
                const schema = ACTION_REGISTRY.get(btn.action)
                const hasForm = FORM_ACTIONS.has(btn.action)
                return (
                  <button
                    key={btn.action}
                    onClick={() => handleClick(btn.action)}
                    title={schema?.description}
                    className="border px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider transition-colors hover:bg-forge-elevated"
                    style={{ borderColor: 'rgba(60, 56, 54, 0.5)', color: TXT.fg4 }}
                  >
                    {btn.label}{hasForm ? '\u2026' : ''}
                  </button>
                )
              })}
            </div>
          </div>
        ))}

        {/* Utility */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="inline-block h-1.5 w-1.5" style={{ backgroundColor: TXT.gray }} />
            <span className="font-mono text-[10px] font-bold uppercase tracking-wider" style={{ color: TXT.gray }}>
              UTILITY
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            <button
              onClick={() => onDirectAction('UTILITY_CLEAR')}
              className="border px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider transition-colors hover:bg-forge-elevated"
              style={{ borderColor: 'rgba(60, 56, 54, 0.5)', color: TXT.fg4 }}
            >
              CLEAR
            </button>
            <button
              onClick={() => onDirectAction('UTILITY_HELP')}
              className="border px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider transition-colors hover:bg-forge-elevated"
              style={{ borderColor: 'rgba(60, 56, 54, 0.5)', color: TXT.fg4 }}
            >
              HELP
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
