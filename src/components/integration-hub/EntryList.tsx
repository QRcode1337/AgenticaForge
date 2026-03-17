import type { MemoryEntry } from '../../engine/types.ts'

const TIER_COLORS: Record<string, string> = {
  hot: '#EF4444',
  warm: '#F59E0B',
  cold: '#3B82F6',
}

interface EntryListProps {
  entries: MemoryEntry[]
  onDelete: (id: string) => void
}

export default function EntryList({ entries, onDelete }: EntryListProps) {
  if (entries.length === 0) {
    return (
      <div className="border border-[#252830] bg-[#0f1117] p-6 text-center">
        <span className="font-mono text-xs uppercase tracking-wider text-[#484c58]">
          No entries stored yet
        </span>
      </div>
    )
  }

  return (
    <div className="border border-[#252830] bg-[#0f1117]">
      <div className="flex items-center gap-2 border-b border-[#252830] px-4 py-2">
        <span className="inline-block h-1.5 w-1.5 bg-[#F59E0B]" />
        <span className="text-[10px] font-bold uppercase tracking-wider text-[#F59E0B]">
          MY ENTRIES
        </span>
        <span className="text-[10px] text-[#484c58]">
          ({entries.length})
        </span>
      </div>

      <div className="max-h-[300px] overflow-y-auto">
        {entries.map((entry) => (
          <div
            key={entry.id}
            className="flex items-center gap-3 border-b border-[#1a1d27] px-4 py-2 last:border-b-0"
          >
            {/* Content (truncated) */}
            <p className="min-w-0 flex-1 truncate text-[11px] text-[#e2e4e9]">
              {entry.content}
            </p>

            {/* Namespace */}
            <span className="shrink-0 bg-[#1a1d27] px-1.5 py-0.5 text-[9px] uppercase tracking-wider text-[#7a7f8d]">
              {entry.namespace}
            </span>

            {/* Tier badge */}
            <span
              className="shrink-0 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider"
              style={{
                color: TIER_COLORS[entry.tier] ?? '#7a7f8d',
                backgroundColor: `${TIER_COLORS[entry.tier] ?? '#7a7f8d'}15`,
              }}
            >
              {entry.tier}
            </span>

            {/* Score bar */}
            <div className="flex w-12 shrink-0 items-center gap-1">
              <div className="h-1 flex-1 overflow-hidden bg-[#252830]">
                <div
                  className="h-full"
                  style={{
                    width: `${entry.score * 100}%`,
                    backgroundColor: TIER_COLORS[entry.tier] ?? '#7a7f8d',
                  }}
                />
              </div>
            </div>

            {/* Delete button */}
            <button
              onClick={() => onDelete(entry.id)}
              className="shrink-0 border border-[#252830] px-2 py-0.5 text-[9px] uppercase tracking-wider text-[#EF4444] transition-colors hover:border-[#EF4444] hover:bg-[#EF4444]/10"
            >
              DEL
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
