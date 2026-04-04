import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface SettingsDrawerProps {
  open: boolean
  onClose: () => void
}

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label className="flex items-center justify-between py-2 cursor-pointer">
      <span className="text-xs text-forge-soft">{label}</span>
      <button
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative w-8 h-4 rounded-full transition-colors cursor-pointer ${
          checked ? 'bg-forge-cta/40' : 'bg-forge-border'
        }`}
      >
        <span
          className={`absolute top-0.5 left-0.5 h-3 w-3 rounded-full transition-transform ${
            checked ? 'translate-x-4 bg-forge-cta' : 'bg-forge-dim'
          }`}
        />
      </button>
    </label>
  )
}

function SectionLabel({ children }: { children: string }) {
  return (
    <div className="text-[9px] uppercase tracking-[0.2em] text-forge-muted mt-6 mb-3 first:mt-0">
      {children}
    </div>
  )
}

function ActionButton({ label, onClick, variant = 'default' }: { label: string; onClick: () => void; variant?: 'default' | 'danger' }) {
  const colors = variant === 'danger'
    ? 'border-red-500/25 text-red-400 hover:border-red-500/50'
    : 'border-forge-border text-forge-soft hover:border-forge-cta/50 hover:text-forge-text'
  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-3 py-2 text-xs font-mono border ${colors} transition-colors cursor-pointer mb-2`}
    >
      {label}
    </button>
  )
}

export default function SettingsDrawer({ open, onClose }: SettingsDrawerProps) {
  const [reduceMotion, setReduceMotion] = useState(() => {
    return localStorage.getItem('agentforge-reduce-motion') === 'true'
  })
  const [sidebarDefault, setSidebarDefault] = useState(() => {
    return localStorage.getItem('agentforge-sidebar-default') ?? 'collapsed'
  })
  const [confirmClear, setConfirmClear] = useState(false)

  const handleReduceMotion = (val: boolean) => {
    setReduceMotion(val)
    localStorage.setItem('agentforge-reduce-motion', String(val))
  }

  const handleSidebarDefault = (val: string) => {
    setSidebarDefault(val)
    localStorage.setItem('agentforge-sidebar-default', val)
  }

  const handleClearTour = () => {
    localStorage.removeItem('agentforge-tour-completed')
    localStorage.removeItem('agentforge-visited-panels')
  }

  const handleClearAll = () => {
    if (!confirmClear) {
      setConfirmClear(true)
      return
    }
    const keys = Object.keys(localStorage).filter((k) => k.startsWith('agentforge-'))
    for (const key of keys) localStorage.removeItem(key)
    setConfirmClear(false)
  }

  const handleExport = () => {
    const data: Record<string, string> = {}
    for (const key of Object.keys(localStorage)) {
      if (key.startsWith('agentforge-')) {
        data[key] = localStorage.getItem(key) ?? ''
      }
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `agentforge-settings-${Date.now()}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleImport = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json'
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return
      const reader = new FileReader()
      reader.onload = () => {
        try {
          const data = JSON.parse(reader.result as string)
          for (const [key, value] of Object.entries(data)) {
            if (key.startsWith('agentforge-') && typeof value === 'string') {
              localStorage.setItem(key, value)
            }
          }
        } catch { /* invalid json */ }
      }
      reader.readAsText(file)
    }
    input.click()
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-[9997] bg-black/40"
            onClick={onClose}
          />

          {/* Drawer */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            className="fixed top-0 right-0 bottom-0 z-[9997] w-80 max-w-full bg-[#0f1117] border-l border-forge-border font-mono overflow-y-auto"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-forge-border">
              <span className="text-xs uppercase tracking-[0.15em] text-forge-text">SETTINGS</span>
              <button
                onClick={onClose}
                className="text-forge-dim hover:text-forge-text transition-colors cursor-pointer"
                aria-label="Close settings"
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M3 3l8 8M11 3l-8 8" />
                </svg>
              </button>
            </div>

            {/* Content */}
            <div className="px-5 py-4">
              <SectionLabel>Display</SectionLabel>
              <Toggle
                checked={reduceMotion}
                onChange={handleReduceMotion}
                label="Reduce motion"
              />
              <div className="flex items-center justify-between py-2">
                <span className="text-xs text-forge-soft">Sidebar default</span>
                <div className="flex gap-1">
                  {['collapsed', 'expanded'].map((opt) => (
                    <button
                      key={opt}
                      onClick={() => handleSidebarDefault(opt)}
                      className={`px-2 py-1 text-[10px] uppercase tracking-wider cursor-pointer transition-colors ${
                        sidebarDefault === opt
                          ? 'bg-forge-cta/15 text-forge-cta border border-forge-cta/25'
                          : 'text-forge-dim border border-forge-border hover:text-forge-soft'
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>

              <SectionLabel>Data</SectionLabel>
              <ActionButton label="Clear tour progress" onClick={handleClearTour} />
              <ActionButton
                label={confirmClear ? 'Confirm: clear ALL local data' : 'Clear all local data'}
                onClick={handleClearAll}
                variant={confirmClear ? 'danger' : 'default'}
              />
              <ActionButton label="Export state as JSON" onClick={handleExport} />
              <ActionButton label="Import state from JSON" onClick={handleImport} />

              <SectionLabel>About</SectionLabel>
              <div className="space-y-2 text-xs text-forge-dim">
                <div>AgentForge <span className="text-forge-soft">v0.1.0</span></div>
                <a
                  href="https://github.com/QRcode1337/AgenticaForge"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block text-forge-muted hover:text-forge-cta transition-colors"
                >
                  GitHub →
                </a>
                <button
                  onClick={() => { location.hash = '#/docs'; onClose() }}
                  className="block text-forge-muted hover:text-forge-cta transition-colors cursor-pointer"
                >
                  Documentation →
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
