import type { ActionType } from './types.ts'

const TXT = {
  fg:     '#ebdbb2',
  fg4:    '#a89984',
  gray:   '#928374',
  red:    '#fb4934',
  yellow: '#fabd2f',
  orange: '#fe8019',
}

interface ConfirmDialogProps {
  action: ActionType
  description: string
  onConfirm: () => void
  onCancel: () => void
}

export default function ConfirmDialog({ action, description, onConfirm, onCancel }: ConfirmDialogProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-md border font-mono"
        style={{ borderColor: TXT.red, backgroundColor: '#0f1117' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="flex items-center gap-2 px-5 py-3"
          style={{ borderBottom: `1px solid ${TXT.red}40` }}
        >
          <span style={{ color: TXT.red }} className="text-sm font-bold">
            &#9888;
          </span>
          <span className="text-sm font-bold uppercase tracking-wider" style={{ color: TXT.red }}>
            CONFIRM DESTRUCTIVE ACTION
          </span>
        </div>

        {/* Body */}
        <div className="space-y-3 px-5 py-4">
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase tracking-wider" style={{ color: TXT.gray }}>
              Action:
            </span>
            <span className="text-xs font-bold" style={{ color: TXT.orange }}>
              {action}
            </span>
          </div>
          <p className="text-xs leading-relaxed" style={{ color: TXT.fg4 }}>
            {description}
          </p>
          <p className="text-xs" style={{ color: TXT.yellow }}>
            This action cannot be undone.
          </p>
        </div>

        {/* Footer */}
        <div
          className="flex items-center justify-end gap-2 px-5 py-3"
          style={{ borderTop: '1px solid rgba(60, 56, 54, 0.4)' }}
        >
          <button
            onClick={onCancel}
            className="border bg-transparent px-4 py-1.5 text-xs uppercase tracking-wider transition-colors hover:bg-[#1a1d27]"
            style={{ borderColor: 'rgba(60, 56, 54, 0.5)', color: TXT.fg4 }}
          >
            CANCEL
          </button>
          <button
            onClick={onConfirm}
            className="border bg-transparent px-4 py-1.5 text-xs uppercase tracking-wider transition-colors hover:bg-red-500/10"
            style={{ borderColor: TXT.red, color: TXT.red }}
          >
            CONFIRM
          </button>
        </div>
      </div>
    </div>
  )
}
