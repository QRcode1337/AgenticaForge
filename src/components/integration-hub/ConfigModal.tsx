import { useState } from 'react'
import type { IntegrationState } from '../../engine/integration-manager.ts'

// ── Sensitive key detection ──────────────────────────────────

const SENSITIVE_KEYS = ['token', 'apikey', 'api_key', 'secret', 'password', 'key']

function isSensitive(key: string): boolean {
  const lower = key.toLowerCase()
  return SENSITIVE_KEYS.some((s) => lower.includes(s))
}

// ── Read-only keys (auto-populated by adapters) ──────────────

const READONLY_KEYS = ['version', 'models', 'purpose', 'downloads', 'status', 'agents']

function isReadOnly(key: string, integrationId: string): boolean {
  if (integrationId === 'agentdb') return true
  return READONLY_KEYS.includes(key.toLowerCase())
}

// ── Format key label ─────────────────────────────────────────

function formatKey(key: string): string {
  return key
    .replace(/([A-Z])/g, '_$1')
    .toUpperCase()
    .replace(/^_/, '')
}

// ── Component ────────────────────────────────────────────────

interface ConfigModalProps {
  integration: IntegrationState
  onSave: (config: Record<string, string>) => void
  onClose: () => void
}

export default function ConfigModal({ integration, onSave, onClose }: ConfigModalProps) {
  const [draft, setDraft] = useState<Record<string, string>>({ ...integration.config })

  const handleChange = (key: string, value: string) => {
    setDraft((prev) => ({ ...prev, [key]: value }))
  }

  const handleSave = () => {
    onSave(draft)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md border border-[#252830] bg-[#0f1117] font-mono"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#252830] px-5 py-3">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-[#e2e4e9]">
            CONFIGURE: {integration.name}
          </h3>
          <button
            onClick={onClose}
            className="text-[#484c58] transition-colors hover:text-[#e2e4e9]"
          >
            &times;
          </button>
        </div>

        {/* Fields */}
        <div className="space-y-3 px-5 py-4">
          {Object.entries(draft).map(([key, value]) => {
            const readOnly = isReadOnly(key, integration.id)
            const sensitive = isSensitive(key)

            return (
              <div key={key}>
                <label className="mb-1 block text-[10px] uppercase tracking-wider text-[#484c58]">
                  {formatKey(key)}
                </label>
                <input
                  type={sensitive ? 'password' : 'text'}
                  value={value}
                  onChange={(e) => handleChange(key, e.target.value)}
                  readOnly={readOnly}
                  className={`w-full border bg-[#080a0f] px-3 py-2 text-xs text-[#e2e4e9] outline-none ${
                    readOnly
                      ? 'border-[#1a1d27] text-[#484c58]'
                      : 'border-[#252830] focus:border-forge-accent'
                  }`}
                />
              </div>
            )
          })}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 border-t border-[#252830] px-5 py-3">
          <button
            onClick={onClose}
            className="border border-[#252830] bg-transparent px-4 py-1.5 text-xs uppercase tracking-wider text-[#7a7f8d] transition-colors hover:bg-[#1a1d27]"
          >
            CANCEL
          </button>
          <button
            onClick={handleSave}
            className="border border-forge-cta bg-transparent px-4 py-1.5 text-xs uppercase tracking-wider text-forge-cta transition-colors hover:bg-forge-cta/10"
          >
            SAVE
          </button>
        </div>
      </div>
    </div>
  )
}
