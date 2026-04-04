// src/components/walkthrough/CoachMark.tsx
import { getVisitedPanels } from '../../hooks/use-tour'
import { useState, useEffect } from 'react'
import type { PanelId } from '../../types'

interface CoachMarkProps {
  panelId: PanelId
  tourActive: boolean
}

export default function CoachMark({ panelId, tourActive }: CoachMarkProps) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (tourActive) {
      setVisible(false)
      return
    }
    const visited = getVisitedPanels()
    setVisible(!visited.includes(panelId))
  }, [panelId, tourActive])

  // Listen for storage changes (when panel gets visited)
  useEffect(() => {
    const handler = () => {
      const visited = getVisitedPanels()
      if (visited.includes(panelId)) {
        setVisible(false)
      }
    }
    window.addEventListener('storage', handler)
    // Also poll on a short interval since same-tab storage events don't fire
    const interval = setInterval(handler, 1000)
    return () => {
      window.removeEventListener('storage', handler)
      clearInterval(interval)
    }
  }, [panelId])

  if (!visible) return null

  return (
    <span
      className="absolute top-1 right-1 w-[6px] h-[6px] rounded-full bg-forge-cta"
      style={{ animation: 'coach-dot-pulse 2s ease-in-out infinite' }}
    />
  )
}

export function CoachMarkStyles() {
  return (
    <style>{`
      @keyframes coach-dot-pulse {
        0%, 100% { opacity: 0.4; transform: scale(1); }
        50% { opacity: 1; transform: scale(1.3); }
      }
    `}</style>
  )
}
