import { useEffect } from 'react'

interface ShortcutHandlers {
  onTogglePalette: () => void
  onPanelSwitch: (index: number) => void
  onToggleSidebar: () => void
  onEscape: () => void
  disabled?: boolean
}

export function useKeyboardShortcuts({
  onTogglePalette,
  onPanelSwitch,
  onToggleSidebar,
  onEscape,
  disabled = false,
}: ShortcutHandlers) {
  useEffect(() => {
    if (disabled) return

    const handler = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey

      // Cmd/Ctrl+K — toggle command palette
      if (mod && e.key === 'k') {
        e.preventDefault()
        onTogglePalette()
        return
      }

      // Cmd/Ctrl+B — toggle sidebar
      if (mod && e.key === 'b') {
        e.preventDefault()
        onToggleSidebar()
        return
      }

      // Cmd/Ctrl+1-7 — switch panels
      if (mod && e.key >= '1' && e.key <= '7') {
        e.preventDefault()
        onPanelSwitch(parseInt(e.key, 10) - 1)
        return
      }

      // Escape — close palette (only if not modified)
      if (e.key === 'Escape' && !mod) {
        e.preventDefault()
        onEscape()
        return
      }
    }

    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [disabled, onTogglePalette, onPanelSwitch, onToggleSidebar, onEscape])
}
