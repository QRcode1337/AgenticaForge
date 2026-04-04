import { useState, useCallback } from 'react'
import type { PanelId } from '../types'

export interface HighlightContext {
  panelId: PanelId
  itemId?: string
  source?: string
}

export function usePanelNavigation(setActivePanel: (panel: PanelId) => void) {
  const [highlight, setHighlight] = useState<HighlightContext | null>(null)

  const navigateTo = useCallback(
    (panelId: PanelId, itemId?: string, source?: string) => {
      setHighlight({ panelId, itemId, source })
      setActivePanel(panelId)
    },
    [setActivePanel],
  )

  const consumeHighlight = useCallback(
    (panelId: PanelId): HighlightContext | null => {
      if (highlight && highlight.panelId === panelId) {
        const ctx = highlight
        setHighlight(null)
        return ctx
      }
      return null
    },
    [highlight],
  )

  return { navigateTo, consumeHighlight, highlight }
}
