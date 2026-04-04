import { useState, useEffect, useRef, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

export interface PaletteCommand {
  id: string
  label: string
  category: 'Panels' | 'Actions'
  action: () => void
}

interface CommandPaletteProps {
  open: boolean
  onClose: () => void
  commands: PaletteCommand[]
}

export default function CommandPalette({ open, onClose, commands }: CommandPaletteProps) {
  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  // Reset state when opening
  useEffect(() => {
    if (open) {
      setQuery('')
      setSelectedIndex(0)
      requestAnimationFrame(() => inputRef.current?.focus())
    }
  }, [open])

  const filtered = useMemo(() => {
    if (!query) return commands
    const q = query.toLowerCase()
    const prefix: PaletteCommand[] = []
    const substring: PaletteCommand[] = []
    for (const cmd of commands) {
      const label = cmd.label.toLowerCase()
      if (label.startsWith(q)) prefix.push(cmd)
      else if (label.includes(q)) substring.push(cmd)
    }
    return [...prefix, ...substring]
  }, [query, commands])

  // Group by category
  const groups = useMemo(() => {
    const map = new Map<string, PaletteCommand[]>()
    for (const cmd of filtered) {
      const list = map.get(cmd.category) ?? []
      list.push(cmd)
      map.set(cmd.category, list)
    }
    return map
  }, [filtered])

  // Clamp selected index
  useEffect(() => {
    if (selectedIndex >= filtered.length) {
      setSelectedIndex(Math.max(0, filtered.length - 1))
    }
  }, [filtered.length, selectedIndex])

  // Keyboard navigation
  useEffect(() => {
    if (!open) return

    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelectedIndex((i) => Math.min(i + 1, filtered.length - 1))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelectedIndex((i) => Math.max(i - 1, 0))
      } else if (e.key === 'Enter' && filtered.length > 0) {
        e.preventDefault()
        filtered[selectedIndex]?.action()
        onClose()
      }
    }

    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, filtered, selectedIndex, onClose])

  // Build flat index for highlighting
  let flatIndex = 0

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
            className="fixed inset-0 z-[9998] bg-black/50"
            onClick={onClose}
          />

          {/* Palette */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.15 }}
            className="fixed top-[20%] left-1/2 -translate-x-1/2 z-[9998] w-[90vw] max-w-[480px] border border-forge-border bg-[#0f1117] font-mono shadow-2xl"
          >
            {/* Search input */}
            <div className="border-b border-forge-border px-4 py-3 flex items-center gap-3">
              <span className="text-forge-dim text-xs">&gt;</span>
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value)
                  setSelectedIndex(0)
                }}
                placeholder="Type a command..."
                className="flex-1 bg-transparent text-sm text-forge-text placeholder:text-forge-dim outline-none"
              />
              <kbd className="text-[9px] text-forge-dim border border-forge-border px-1.5 py-0.5">ESC</kbd>
            </div>

            {/* Results */}
            <div className="max-h-[320px] overflow-y-auto">
              {filtered.length === 0 && (
                <div className="px-4 py-6 text-center text-xs text-forge-dim">
                  No matching commands
                </div>
              )}
              {Array.from(groups.entries()).map(([category, cmds]) => (
                <div key={category}>
                  <div className="px-4 pt-3 pb-1 text-[9px] uppercase tracking-[0.2em] text-forge-muted">
                    {category}
                  </div>
                  {cmds.map((cmd) => {
                    const idx = flatIndex++
                    const isSelected = idx === selectedIndex
                    return (
                      <button
                        key={cmd.id}
                        onClick={() => {
                          cmd.action()
                          onClose()
                        }}
                        className={`w-full text-left px-4 py-2 text-xs flex items-center gap-3 cursor-pointer transition-colors ${
                          isSelected
                            ? 'bg-forge-cta/10 text-forge-text'
                            : 'text-forge-soft hover:bg-forge-surface'
                        }`}
                      >
                        {cmd.label}
                      </button>
                    )
                  })}
                </div>
              ))}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
