interface BulkActionsProps {
  onSeed: () => void
  onClearAll: () => void
  onExport: () => void
  entryCount: number
}

export default function BulkActions({ onSeed, onClearAll, onExport, entryCount }: BulkActionsProps) {
  const handleClearAll = () => {
    if (!window.confirm(`Delete all ${entryCount} entries? This cannot be undone.`)) return
    onClearAll()
  }

  return (
    <div className="flex items-center gap-2 border border-[#252830] bg-[#0f1117] px-4 py-3">
      <span className="text-[10px] font-bold uppercase tracking-wider text-[#484c58]">
        BULK:
      </span>

      <button
        onClick={onSeed}
        className="border border-[#22C55E] bg-transparent px-3 py-1 text-[10px] uppercase tracking-wider text-[#22C55E] transition-colors hover:bg-[#22C55E]/10"
      >
        SEED 25
      </button>

      <button
        onClick={handleClearAll}
        disabled={entryCount === 0}
        className="border border-[#EF4444] bg-transparent px-3 py-1 text-[10px] uppercase tracking-wider text-[#EF4444] transition-colors hover:bg-[#EF4444]/10 disabled:opacity-30"
      >
        CLEAR ALL
      </button>

      <button
        onClick={onExport}
        disabled={entryCount === 0}
        className="border border-[#A855F7] bg-transparent px-3 py-1 text-[10px] uppercase tracking-wider text-[#A855F7] transition-colors hover:bg-[#A855F7]/10 disabled:opacity-30"
      >
        EXPORT JSON
      </button>

      <div className="flex-1" />

      <span className="text-[10px] text-[#484c58]">
        {entryCount} total entries
      </span>
    </div>
  )
}
